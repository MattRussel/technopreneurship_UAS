import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Fallback to client/.env if server/.env is missing Supabase keys
if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) {
  dotenv.config({ path: '../client/.env' });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (supabase) {
  console.log('  🔗 Supabase client connected for real-time reservation sync');
} else {
  console.warn('  ⚠️ Supabase credentials not found in server/.env or client/.env');
}

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
//  PARKING SIMULATION (IoT Sensor Replacement)
//  Simulates realistic parking occupancy with IoT sensors.
//  Syncs with Supabase so slots reserved by any user in the DB
//  are detected, locked as 'reserved', and never overwritten.
// ============================================================

const FLOORS = [
  { id: 'B1', name: 'Basement 1', totalSlots: 40 },
  { id: 'B2', name: 'Basement 2', totalSlots: 40 },
  { id: 'F1', name: 'Floor 1', totalSlots: 30 },
  { id: 'F2', name: 'Floor 2', totalSlots: 30 },
];

function generatePlate() {
  const letters = 'ABCDEFGHIJKLMNPRSTUVWXYZ';
  const regions = ['KL', 'WP', 'JH', 'PH', 'NS', 'ML', 'SB'];
  const r = regions[Math.floor(Math.random() * regions.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  return `${r}${n}${l1}${l2}`;
}

function randomTimestamp() {
  const now = new Date();
  const hoursAgo = Math.floor(Math.random() * 8);
  return new Date(now - hoursAgo * 3600000).toISOString();
}

function generateParkingData() {
  const hour = new Date().getHours();
  const baseOccupancy = hour >= 8 && hour <= 21 ? 0.65 : 0.25;

  const data = {};
  FLOORS.forEach((floor) => {
    data[floor.id] = [];
    for (let i = 1; i <= floor.totalSlots; i++) {
      const slotNum = String(i).padStart(3, '0');
      let type = 'regular';
      if (i <= 4) type = 'disabled';
      else if (i <= 8) type = 'ev-charging';
      else if (i <= 10 && floor.totalSlots === 40) type = 'vip';

      const isOccupied = Math.random() < baseOccupancy;
      data[floor.id].push({
        id: `${floor.id}-${slotNum}`,
        floor: floor.id,
        number: slotNum,
        type,
        status: isOccupied ? 'occupied' : 'available',
        vehiclePlate: isOccupied ? generatePlate() : null,
        occupiedSince: isOccupied ? randomTimestamp() : null,
        sensorId: `SENSOR-${floor.id}-${slotNum}`,
        lastPing: new Date().toISOString(),
        isDatabaseReserved: false,
      });
    }
  });
  return data;
}

// In-memory parking state (IoT simulated sensors)
let parkingData = generateParkingData();

// ============================================================
//  SUPABASE RESERVATION SYNC
//  Pulls active/upcoming reservations from Supabase and
//  overlays them directly onto the parking slot state.
// ============================================================
async function syncDatabaseReservations() {
  if (!supabase) return;
  try {
    // Run automated database cleanup for all expired reservations across all users
    try {
      await supabase.rpc('complete_expired_reservations');
    } catch {
      // Ignore if function not yet added in Supabase
    }

    const { data: reservations, error } = await supabase
      .from('reservations')
      .select('*')
      .in('status', ['active', 'upcoming']);

    if (error) {
      console.error('[Supabase Sync Error]', error.message);
      return;
    }

    if (!reservations) return;

    const now = new Date();
    const expiredIds = [];
    const activatedIds = [];
    const validReservations = [];

    reservations.forEach((r) => {
      const isExpired = r.end_time && new Date(r.end_time) <= now;
      if (isExpired) {
        expiredIds.push(r.id);
      } else {
        if (r.status === 'upcoming' && r.start_time && new Date(r.start_time) <= now) {
          activatedIds.push(r.id);
        }
        validReservations.push(r);
      }
    });

    // Mark expired reservations as completed in Supabase
    if (expiredIds.length > 0) {
      try {
        await supabase
          .from('reservations')
          .update({ status: 'completed', updated_at: now.toISOString() })
          .in('id', expiredIds);
      } catch (err) {
        console.error('[Supabase Sync] Error updating completed reservations:', err.message);
      }
    }

    // Mark upcoming reservations whose start time has arrived as active in Supabase
    if (activatedIds.length > 0) {
      try {
        await supabase
          .from('reservations')
          .update({ status: 'active', updated_at: now.toISOString() })
          .in('id', activatedIds);
      } catch (err) {
        console.error('[Supabase Sync] Error activating reservations:', err.message);
      }
    }

    const dbMap = new Map();
    validReservations.forEach((r) => {
      dbMap.set(r.slot_id, r);
    });

    // Merge into parkingData
    Object.keys(parkingData).forEach((floorId) => {
      parkingData[floorId].forEach((slot) => {
        if (dbMap.has(slot.id)) {
          const res = dbMap.get(slot.id);
          slot.status = 'reserved';
          slot.vehiclePlate = res.vehicle_plate || 'RESERVED';
          slot.reservationCode = res.reservation_code;
          slot.reservationId = res.id;
          slot.reservationUser = res.user_id;
          slot.isDatabaseReserved = true;
          slot.lastPing = new Date().toISOString();
        } else if (slot.isDatabaseReserved) {
          // Previously reserved in DB, but no longer in active/upcoming list (e.g. cancelled or completed)
          slot.status = 'available';
          slot.vehiclePlate = null;
          slot.reservationCode = null;
          slot.reservationId = null;
          slot.isDatabaseReserved = false;
        }
      });
    });
  } catch (err) {
    console.error('[Supabase Sync Exception]', err.message);
  }
}

// Initial sync with database
syncDatabaseReservations();

// Periodically sync with Supabase every 5 seconds to catch reservations from other users
setInterval(syncDatabaseReservations, 5000);

// Simulate real-time IoT sensor updates every 15 seconds
// (Changes occupancy for non-reserved slots)
setInterval(() => {
  const floorIds = Object.keys(parkingData);
  const changes = Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < changes; i++) {
    const floorId = floorIds[Math.floor(Math.random() * floorIds.length)];
    const slots = parkingData[floorId];
    const slotIndex = Math.floor(Math.random() * slots.length);
    const slot = slots[slotIndex];

    // NEVER overwrite slots reserved by users!
    if (slot.status === 'reserved' || slot.isDatabaseReserved) continue;

    if (slot.status === 'occupied') {
      slot.status = 'available';
      slot.vehiclePlate = null;
      slot.occupiedSince = null;
    } else if (slot.status === 'available') {
      slot.status = 'occupied';
      slot.vehiclePlate = generatePlate();
      slot.occupiedSince = new Date().toISOString();
    }
    slot.lastPing = new Date().toISOString();
  }
}, 15000);

// ============ API ROUTES ============

// Get all parking data with statistics (always syncs DB first)
app.get('/api/parking/status', async (req, res) => {
  await syncDatabaseReservations();

  let totalAvailable = 0, totalOccupied = 0, totalReserved = 0, total = 0;
  const flatSlots = [];

  const byFloor = FLOORS.map((floor) => {
    const slots = parkingData[floor.id] || [];
    slots.forEach((s) => flatSlots.push(s));

    const floorAvailable = slots.filter((s) => s.status === 'available').length;
    const floorOccupied = slots.filter((s) => s.status === 'occupied').length;
    const floorReserved = slots.filter((s) => s.status === 'reserved').length;

    totalAvailable += floorAvailable;
    totalOccupied += floorOccupied;
    totalReserved += floorReserved;
    total += slots.length;

    return {
      floor: floor.id,
      name: floor.name,
      total: slots.length,
      available: floorAvailable,
      occupied: floorOccupied,
      reserved: floorReserved,
    };
  });

  res.json({
    floors: parkingData,
    slots: flatSlots,
    statistics: {
      total,
      available: totalAvailable,
      occupied: totalOccupied,
      reserved: totalReserved,
      occupancyRate: total > 0 ? Math.round(((totalOccupied + totalReserved) / total) * 100) : 0,
      byFloor,
    },
    lastUpdated: new Date().toISOString(),
    sensorStatus: {
      totalSensors: total,
      online: total - Math.floor(Math.random() * 2),
      offline: Math.floor(Math.random() * 2),
    },
  });
});

// Get specific floor data
app.get('/api/parking/floor/:floorId', async (req, res) => {
  await syncDatabaseReservations();
  const { floorId } = req.params;
  if (!parkingData[floorId]) {
    return res.status(404).json({ error: 'Floor not found' });
  }
  res.json({ floor: floorId, slots: parkingData[floorId], lastUpdated: new Date().toISOString() });
});

// Reserve a slot (persists in memory and forwards to Supabase if credentials exist)
app.post('/api/parking/reserve', async (req, res) => {
  await syncDatabaseReservations();
  const { slotId, vehiclePlate, startTime, duration, userId } = req.body;

  let found = null;
  for (const floorId of Object.keys(parkingData)) {
    found = parkingData[floorId].find((s) => s.id === slotId);
    if (found) break;
  }

  if (!found) return res.status(404).json({ error: 'Slot not found' });
  if (found.status !== 'available') {
    return res.status(400).json({ error: 'Slot is already occupied or reserved by another user' });
  }

  const reservationCode = `SP-${Date.now().toString(36).toUpperCase()}`;

  found.status = 'reserved';
  found.vehiclePlate = vehiclePlate;
  found.reservationCode = reservationCode;
  found.isDatabaseReserved = true;

  // Insert to Supabase if user credentials provided
  if (supabase && userId) {
    try {
      const startDateTime = startTime ? new Date(startTime) : new Date();
      const endDateTime = new Date(startDateTime.getTime() + (duration || 2) * 3600000);

      await supabase.from('reservations').insert({
        user_id: userId,
        slot_id: found.id,
        floor: found.floor,
        slot_number: String(found.number),
        vehicle_plate: vehiclePlate,
        reservation_code: reservationCode,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration_hours: duration || 2,
        cost: duration > 2 ? (duration - 2) * 2 : 0,
        status: 'upcoming',
      });
    } catch (err) {
      console.error('Error writing reservation to Supabase:', err);
    }
  }

  res.json({
    success: true,
    reservation: {
      code: reservationCode,
      slotId: found.id,
      floor: found.floor,
      slotNumber: found.number,
      vehiclePlate,
      startTime,
      duration,
      createdAt: new Date().toISOString(),
    },
  });
});

// Cancel reservation
app.post('/api/parking/cancel', async (req, res) => {
  const { slotId, reservationCode } = req.body;

  // Update in Supabase
  if (supabase) {
    try {
      if (reservationCode) {
        await supabase.from('reservations').update({ status: 'cancelled' }).eq('reservation_code', reservationCode);
      } else if (slotId) {
        await supabase.from('reservations').update({ status: 'cancelled' }).eq('slot_id', slotId);
      }
    } catch (err) {
      console.error('Error cancelling in Supabase:', err);
    }
  }

  for (const floorId of Object.keys(parkingData)) {
    const slot = parkingData[floorId].find((s) => s.id === slotId || (reservationCode && s.reservationCode === reservationCode));
    if (slot && slot.status === 'reserved') {
      slot.status = 'available';
      slot.vehiclePlate = null;
      slot.reservationCode = null;
      slot.isDatabaseReserved = false;
      return res.json({ success: true });
    }
  }
  res.json({ success: true, message: 'Reservation updated' });
});

// Simulate IoT sensor update (manual trigger)
app.post('/api/parking/simulate-update', async (req, res) => {
  await syncDatabaseReservations();
  const changes = [];
  const numChanges = Math.floor(Math.random() * 5) + 1;
  const floorIds = Object.keys(parkingData);

  for (let i = 0; i < numChanges; i++) {
    const floorId = floorIds[Math.floor(Math.random() * floorIds.length)];
    const slots = parkingData[floorId];
    const slotIndex = Math.floor(Math.random() * slots.length);
    const slot = slots[slotIndex];

    if (slot.status === 'reserved' || slot.isDatabaseReserved) continue;

    const oldStatus = slot.status;
    if (slot.status === 'occupied') {
      slot.status = 'available';
      slot.vehiclePlate = null;
      slot.occupiedSince = null;
    } else {
      slot.status = 'occupied';
      slot.vehiclePlate = generatePlate();
      slot.occupiedSince = new Date().toISOString();
    }
    slot.lastPing = new Date().toISOString();
    changes.push({ slotId: slot.id, from: oldStatus, to: slot.status, timestamp: new Date().toISOString() });
  }

  res.json({ success: true, changes });
});

// Get occupancy history (simulated 24h)
app.get('/api/parking/history', (req, res) => {
  const history = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now - i * 3600000);
    const h = hour.getHours();
    let occupancy;
    if (h >= 8 && h <= 11) occupancy = 40 + Math.random() * 30;
    else if (h >= 12 && h <= 14) occupancy = 75 + Math.random() * 20;
    else if (h >= 15 && h <= 18) occupancy = 60 + Math.random() * 25;
    else if (h >= 19 && h <= 21) occupancy = 50 + Math.random() * 20;
    else occupancy = 10 + Math.random() * 20;
    history.push({ hour: h, label: `${h}:00`, occupancyRate: Math.min(100, Math.round(occupancy)), timestamp: hour.toISOString() });
  }
  res.json({ history });
});

// Feedback endpoint
app.post('/api/feedback', (req, res) => {
  const { userId, rating, category, subject, message } = req.body;
  res.json({
    success: true,
    feedback: { id: `FB-${Date.now()}`, userId, rating, category, subject, message, status: 'pending', createdAt: new Date().toISOString() },
  });
});

// Advertisements endpoint (Mall Sponsor & Tenant Promotions)
app.get('/api/advertisements', async (req, res) => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json({ success: true, advertisements: data });
      }
    } catch (err) {
      console.warn('Supabase advertisements query failed:', err.message);
    }
  }

  // Default mall sponsor promotions fallback
  res.json({
    success: true,
    advertisements: [
      {
        id: 'ad-starbucks',
        title: 'Starbucks Coffee',
        tagline: 'Free Upsize with your SmartPark Parking Pass!',
        category: 'Food & Beverage',
        promo_code: 'PARKSTARBUCKS',
        discount: 'Free Upsize',
        location: 'Ground Floor, Unit G-12',
        status: 'active',
        impressions: 1240,
        clicks: 312,
      },
      {
        id: 'ad-cinema-xxi',
        title: 'Cinema XXI Mall',
        tagline: 'Buy 1 Get 1 Free Popcorn Combo with Parking Ticket',
        category: 'Entertainment',
        promo_code: 'XXIPARKFREE',
        discount: 'Buy 1 Get 1',
        location: 'Level 3, Unit 305',
        status: 'active',
        impressions: 980,
        clicks: 245,
      },
      {
        id: 'ad-hm',
        title: 'H&M Department Store',
        tagline: 'Mid-Season Sale: Extra 15% Off for Mall Parkers',
        category: 'Shopping',
        promo_code: 'HM15PARK',
        discount: 'Extra 15% OFF',
        location: 'Level 1, Unit 102-104',
        status: 'active',
        impressions: 820,
        clicks: 168,
      },
    ],
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    supabaseConnected: !!supabase,
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n  🅿️  SmartPark Mall API Server`);
  console.log(`  ➜  Running on http://localhost:${PORT}`);
  console.log(`  ➜  Supabase reservation sync: ${supabase ? 'ACTIVE' : 'OFFLINE'}`);
  console.log(`  ➜  IoT Parking sensor simulation active (updates every 15s)\n`);
});
