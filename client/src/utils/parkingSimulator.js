// SmartPark Mall - Parking Simulator & Live Sync Utility
// Combines IoT sensor simulation with real-time Supabase reservations
// so slots reserved by ANY user in the database are detected and marked.

import { supabase } from '../lib/supabase';

export const FLOORS = [
  {
    id: 'B1',
    name: 'Basement 1',
    label: 'B1',
    totalSlots: 40,
    prefix: 'B1',
    types: [
      { type: 'regular', count: 30, startIndex: 1 },
      { type: 'disabled', count: 4, startIndex: 31 },
      { type: 'ev-charging', count: 4, startIndex: 35 },
      { type: 'vip', count: 2, startIndex: 39 },
    ],
  },
  {
    id: 'B2',
    name: 'Basement 2',
    label: 'B2',
    totalSlots: 40,
    prefix: 'B2',
    types: [
      { type: 'regular', count: 30, startIndex: 1 },
      { type: 'disabled', count: 4, startIndex: 31 },
      { type: 'ev-charging', count: 4, startIndex: 35 },
      { type: 'vip', count: 2, startIndex: 39 },
    ],
  },
  {
    id: 'F1',
    name: 'Floor 1',
    label: 'F1',
    totalSlots: 30,
    prefix: 'F1',
    types: [
      { type: 'regular', count: 24, startIndex: 1 },
      { type: 'disabled', count: 3, startIndex: 25 },
      { type: 'ev-charging', count: 3, startIndex: 28 },
    ],
  },
  {
    id: 'F2',
    name: 'Floor 2',
    label: 'F2',
    totalSlots: 30,
    prefix: 'F2',
    types: [
      { type: 'regular', count: 24, startIndex: 1 },
      { type: 'disabled', count: 3, startIndex: 25 },
      { type: 'ev-charging', count: 3, startIndex: 28 },
    ],
  },
];

const PLATE_LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';
const PLATE_REGIONS = ['KL', 'WP', 'JH', 'PH', 'NS', 'ML', 'SB', 'PR', 'KD', 'TG'];

function generatePlate() {
  const region = PLATE_REGIONS[Math.floor(Math.random() * PLATE_REGIONS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const letter1 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
  const letter2 = PLATE_LETTERS[Math.floor(Math.random() * PLATE_LETTERS.length)];
  return `${region}${num}${letter1}${letter2}`;
}

function padNumber(num, length = 3) {
  return String(num).padStart(length, '0');
}

function getOccupancyRate() {
  const hour = new Date().getHours();
  // Business hours (8am-9pm): 55-75% occupancy
  if (hour >= 8 && hour <= 21) {
    if ((hour >= 11 && hour <= 14) || (hour >= 17 && hour <= 20)) {
      return 0.70 + Math.random() * 0.10;
    }
    return 0.55 + Math.random() * 0.15;
  }
  return 0.15 + Math.random() * 0.15;
}

function randomTimestampToday() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);
  const elapsed = now.getTime() - startOfDay.getTime();
  if (elapsed <= 0) {
    return new Date(now.getTime() - Math.floor(Math.random() * 3600000)).toISOString();
  }
  const randomOffset = Math.floor(Math.random() * elapsed);
  return new Date(startOfDay.getTime() + randomOffset).toISOString();
}

/**
 * Generates raw simulated parking slots.
 */
export function generateParkingData() {
  const targetRate = getOccupancyRate();
  const slots = [];

  for (const floor of FLOORS) {
    let slotNumber = 1;
    for (const typeGroup of floor.types) {
      for (let i = 0; i < typeGroup.count; i++) {
        const id = `${floor.prefix}-${padNumber(slotNumber)}`;
        const isOccupied = Math.random() < targetRate;

        slots.push({
          id,
          floor: floor.id,
          number: slotNumber,
          type: typeGroup.type,
          status: isOccupied ? 'occupied' : 'available',
          vehiclePlate: isOccupied ? generatePlate() : null,
          occupiedSince: isOccupied ? randomTimestampToday() : null,
          isDatabaseReserved: false,
        });

        slotNumber++;
      }
    }
  }

  return slots;
}

/**
 * Randomly changes 1-3 non-reserved slots to simulate cars arriving/leaving.
 */
export function updateSimulation(currentData) {
  if (!currentData || currentData.length === 0) {
    return generateParkingData();
  }

  const updatedData = currentData.map((slot) => ({ ...slot }));
  const changesToMake = 1 + Math.floor(Math.random() * 3);

  for (let i = 0; i < changesToMake; i++) {
    const randomIndex = Math.floor(Math.random() * updatedData.length);
    const slot = updatedData[randomIndex];

    // Never change real reservations!
    if (slot.status === 'reserved' || slot.isDatabaseReserved) continue;

    if (slot.status === 'occupied') {
      updatedData[randomIndex] = {
        ...slot,
        status: 'available',
        vehiclePlate: null,
        occupiedSince: null,
      };
    } else if (slot.status === 'available') {
      updatedData[randomIndex] = {
        ...slot,
        status: 'occupied',
        vehiclePlate: generatePlate(),
        occupiedSince: new Date().toISOString(),
      };
    }
  }

  return updatedData;
}

/**
 * Helper to compute start and end Date objects for a reservation
 * works with Supabase schema (start_time, end_time) or localStorage (date, startTime, duration).
 */
export function computeReservationTimes(r) {
  if (!r) return { startDate: null, endDate: null };

  let startDate = null;
  let endDate = null;

  if (r.start_time) {
    startDate = new Date(r.start_time);
  } else if (r.date && r.startTime) {
    startDate = new Date(`${r.date}T${r.startTime}`);
  }

  if (r.end_time) {
    endDate = new Date(r.end_time);
  } else if (r.endTime) {
    endDate = new Date(r.endTime);
  } else if (startDate && !isNaN(startDate.getTime())) {
    const dur = Number(r.duration_hours || r.duration || 1);
    endDate = new Date(startDate.getTime() + dur * 3600000);
  }

  return { startDate, endDate };
}

/**
 * Calculates real-time status of a reservation:
 * - 'cancelled' if manually cancelled
 * - 'completed' if now >= end time
 * - 'active' if now >= start time and < end time
 * - 'upcoming' if now < start time
 */
export function calculateReservationStatus(reservation) {
  if (!reservation) return 'upcoming';
  if (reservation.status === 'cancelled') return 'cancelled';

  const { startDate, endDate } = computeReservationTimes(reservation);

  if (!startDate || isNaN(startDate.getTime()) || !endDate || isNaN(endDate.getTime())) {
    return reservation.status || 'upcoming';
  }

  const now = new Date();
  if (now >= endDate) {
    return 'completed';
  }
  if (now >= startDate) {
    return 'active';
  }
  return 'upcoming';
}

/**
 * Overlays real reservations from Supabase onto an array of parking slots.
 */
export function applyDatabaseReservations(slots, dbReservations) {
  if (!slots || !Array.isArray(slots)) return [];
  if (!dbReservations || dbReservations.length === 0) return slots;

  const now = new Date();
  const resMap = new Map();
  dbReservations.forEach((r) => {
    // Only apply reservations that are currently active or upcoming (not expired / completed / cancelled)
    const status = calculateReservationStatus(r);
    if (status === 'active' || status === 'upcoming') {
      resMap.set(r.slot_id, { ...r, status });
    }
  });

  return slots.map((slot) => {
    if (resMap.has(slot.id)) {
      const res = resMap.get(slot.id);
      return {
        ...slot,
        status: 'reserved',
        vehiclePlate: res.vehicle_plate || 'RESERVED',
        reservationCode: res.reservation_code,
        reservationUser: res.user_id,
        isDatabaseReserved: true,
      };
    } else if (slot.isDatabaseReserved) {
      // Was reserved previously, now unreserved
      return {
        ...slot,
        status: 'available',
        vehiclePlate: null,
        reservationCode: null,
        reservationUser: null,
        isDatabaseReserved: false,
      };
    }
    return slot;
  });
}

/**
 * Fetches parking data with live database reservations:
 * 1. Checks backend `/api/parking/status` (proxied to server.js).
 * 2. If backend is unavailable, uses client simulator + Supabase query.
 */
export async function fetchLiveParkingData(existingSlots = null) {
  // Try backend first
  try {
    const res = await fetch('/api/parking/status');
    if (res.ok) {
      const data = await res.json();
      let slots = [];
      if (Array.isArray(data.slots)) {
        slots = data.slots;
      } else if (data.floors) {
        slots = Object.values(data.floors).flat();
      }
      if (slots.length > 0) {
        let stats = data.statistics;
        if (!stats || !Array.isArray(stats.byFloor)) {
          stats = getStatistics(slots);
        } else {
          stats = {
            ...stats,
            occupancyRate: Math.round(Number(stats.occupancyRate)) || 0,
            total: Number(stats.total) || slots.length,
            available: Number(stats.available) || 0,
            occupied: Number(stats.occupied) || 0,
            reserved: Number(stats.reserved) || 0,
          };
        }
        return { slots, stats, source: 'server' };
      }
    }
  } catch {
    // Backend offline or unreachable, fall through to client sync
  }

  // Client-side fallback with direct Supabase reservation query
  let baseSlots = existingSlots ? updateSimulation(existingSlots) : generateParkingData();

  try {
    try {
      await supabase.rpc('complete_expired_reservations');
    } catch {
      // Ignore if RPC function not created in Supabase
    }

    const { data: dbReservations, error } = await supabase
      .from('reservations')
      .select('*')
      .in('status', ['active', 'upcoming']);

    if (!error && dbReservations) {
      baseSlots = applyDatabaseReservations(baseSlots, dbReservations);
    }
  } catch (err) {
    console.warn('[Simulator] Could not fetch Supabase reservations:', err);
  }

  const stats = getStatistics(baseSlots);
  return { slots: baseSlots, stats, source: 'client' };
}

export function getStatistics(data) {
  if (!data || data.length === 0) {
    return {
      total: 0,
      available: 0,
      occupied: 0,
      reserved: 0,
      occupancyRate: 0,
      byFloor: [],
      byType: [],
    };
  }

  const total = data.length;
  const available = data.filter((s) => s.status === 'available').length;
  const occupied = data.filter((s) => s.status === 'occupied').length;
  const reserved = data.filter((s) => s.status === 'reserved').length;
  const occupancyRate = total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;

  const byFloor = FLOORS.map((floor) => {
    const floorSlots = data.filter((s) => s.floor === floor.id);
    return {
      floor: floor.id,
      name: floor.name,
      total: floorSlots.length,
      available: floorSlots.filter((s) => s.status === 'available').length,
      occupied: floorSlots.filter((s) => s.status === 'occupied').length,
      reserved: floorSlots.filter((s) => s.status === 'reserved').length,
    };
  });

  const typeNames = ['regular', 'disabled', 'ev-charging', 'vip'];
  const byType = typeNames.map((type) => {
    const typeSlots = data.filter((s) => s.type === type);
    return {
      type,
      total: typeSlots.length,
      available: typeSlots.filter((s) => s.status === 'available').length,
      occupied: typeSlots.filter((s) => s.status === 'occupied').length,
      reserved: typeSlots.filter((s) => s.status === 'reserved').length,
    };
  });

  return { total, available, occupied, reserved, occupancyRate, byFloor, byType };
}

export function generateRecentActivity(count = 8) {
  const activities = [];
  const actions = [
    { action: 'arrived', icon: '🚗', label: 'Vehicle Arrived' },
    { action: 'departed', icon: '🚙', label: 'Vehicle Departed' },
    { action: 'reserved', icon: '📋', label: 'Spot Reserved' },
  ];

  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const actionInfo = actions[Math.floor(Math.random() * actions.length)];
    const floor = FLOORS[Math.floor(Math.random() * FLOORS.length)];
    const slotNum = Math.floor(1 + Math.random() * floor.totalSlots);
    const minutesAgo = Math.floor(Math.random() * 60);
    const timestamp = new Date(now - minutesAgo * 60000);

    activities.push({
      id: `activity-${i}-${Date.now()}`,
      ...actionInfo,
      slotId: `${floor.prefix}-${padNumber(slotNum)}`,
      floor: floor.id,
      vehiclePlate: generatePlate(),
      timestamp: timestamp.toISOString(),
      minutesAgo,
    });
  }

  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return activities;
}
