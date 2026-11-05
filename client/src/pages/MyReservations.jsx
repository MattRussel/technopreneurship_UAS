import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiClock, FiMapPin, FiX, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calculateReservationStatus, computeReservationTimes } from '../utils/parkingSimulator';
import Modal from '../components/Modal';
import './MyReservations.css';

const TABS = ['All', 'Active', 'Upcoming', 'Completed', 'Cancelled'];

const statusColors = {
  active: '#10B981',
  upcoming: '#3B82F6',
  completed: '#64748B',
  cancelled: '#EF4444',
};

function generateDemoReservations() {
  const now = new Date();
  return [
    {
      id: 'demo-1',
      code: 'SP-K8M2XL',
      slotId: 'B1-012',
      floor: 'B1',
      slotNumber: 12,
      slotType: 'regular',
      vehiclePlate: 'KL4521AB',
      date: now.toISOString().split('T')[0],
      startTime: '09:00',
      duration: 3,
      cost: 2,
      status: 'active',
      createdAt: new Date(now - 3600000).toISOString(),
    },
    {
      id: 'demo-2',
      code: 'SP-J7N1WP',
      slotId: 'F1-005',
      floor: 'F1',
      slotNumber: 5,
      slotType: 'ev-charging',
      vehiclePlate: 'WP8832CD',
      date: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
      startTime: '14:00',
      duration: 2,
      cost: 0,
      status: 'upcoming',
      createdAt: now.toISOString(),
    },
    {
      id: 'demo-3',
      code: 'SP-H5Q9RT',
      slotId: 'B2-028',
      floor: 'B2',
      slotNumber: 28,
      slotType: 'regular',
      vehiclePlate: 'JH1122EF',
      date: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
      startTime: '10:30',
      duration: 4,
      cost: 4,
      status: 'completed',
      createdAt: new Date(now - 86400000 * 2).toISOString(),
    },
  ];
}

export default function MyReservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [cancelTarget, setCancelTarget] = useState(null);

  const loadReservations = useCallback(async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const targetUserId = user?.id || currentUser?.id;

      if (targetUserId) {
        // Load ONLY this user's reservations from Supabase
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const toUpdateInDb = [];

          const mapped = data.map((r) => {
            const currentStatus = calculateReservationStatus(r);

            // Queue status sync to Supabase if status changed (e.g. became completed or active)
            if (currentStatus !== r.status && r.status !== 'cancelled') {
              toUpdateInDb.push({ id: r.id, status: currentStatus });
            }

            const { startDate, endDate } = computeReservationTimes(r);
            const dateStr = startDate
              ? startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
              : (r.date || '');
            const startTimeStr = startDate
              ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
              : (r.startTime || '');
            const endTimeStr = endDate
              ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
              : '';

            return {
              id: r.id,
              code: r.reservation_code,
              slotId: r.slot_id,
              floor: r.floor,
              slotNumber: r.slot_number,
              vehiclePlate: r.vehicle_plate,
              date: dateStr,
              startTime: startTimeStr,
              endTime: endTimeStr,
              duration: r.duration_hours,
              cost: r.cost,
              status: currentStatus,
              createdAt: r.created_at,
            };
          });

          // Sync completed/active status back to Supabase in the background
          if (toUpdateInDb.length > 0) {
            toUpdateInDb.forEach(async (item) => {
              try {
                await supabase
                  .from('reservations')
                  .update({ status: item.status, updated_at: new Date().toISOString() })
                  .eq('id', item.id);
              } catch (err) {
                console.error('Error syncing reservation status to Supabase:', err);
              }
            });
          }

          setReservations(mapped);
          return;
        }
      }
    } catch (err) {
      console.error('Error loading from Supabase:', err);
    }

    // Fallback to localStorage only if offline / not logged in
    const stored = JSON.parse(localStorage.getItem('smartpark_reservations') || '[]');
    let localChanged = false;
    const mappedLocal = stored.map((r) => {
      const currentStatus = calculateReservationStatus(r);
      if (currentStatus !== r.status && r.status !== 'cancelled') {
        localChanged = true;
      }
      const { startDate, endDate } = computeReservationTimes(r);
      const dateStr = startDate
        ? startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : (r.date || '');
      const startTimeStr = startDate
        ? startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : (r.startTime || '');
      const endTimeStr = endDate
        ? endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : '';

      return {
        ...r,
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        status: currentStatus,
      };
    });

    if (localChanged) {
      localStorage.setItem('smartpark_reservations', JSON.stringify(mappedLocal));
    }
    setReservations(mappedLocal);
  }, [user]);

  useEffect(() => {
    loadReservations();

    // Auto-refresh every 10 seconds so expired reservations automatically move to 'Completed'
    const interval = setInterval(loadReservations, 10000);

    // Refresh when user switches back to this browser tab
    const handleFocus = () => loadReservations();
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [loadReservations]);

  const filtered = activeTab === 'All'
    ? reservations
    : reservations.filter((r) => r.status === activeTab.toLowerCase());

  const handleCancel = async () => {
    if (!cancelTarget) return;

    // Update in Supabase
    try {
      await supabase
        .from('reservations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', cancelTarget.id);
    } catch (err) {
      console.error('Error cancelling in Supabase:', err);
    }

    const updated = reservations.map((r) =>
      r.id === cancelTarget.id ? { ...r, status: 'cancelled' } : r
    );
    setReservations(updated);
    localStorage.setItem('smartpark_reservations', JSON.stringify(updated));
    setCancelTarget(null);
    toast.success('Reservation cancelled');
  };

  return (
    <div className="my-reservations">
      <div className="my-reservations__header">
        <div>
          <h1>My Reservations</h1>
          <p>{reservations.length} total reservations</p>
        </div>
        <button className="refresh-btn" onClick={loadReservations}>
          <FiRefreshCw size={18} />
        </button>
      </div>

      {/* Tabs */}
      <div className="res-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`res-tab${activeTab === tab ? ' res-tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab !== 'All' && (
              <span className="res-tab__count">
                {reservations.filter((r) =>
                  tab === 'All' ? true : r.status === tab.toLowerCase()
                ).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reservation Cards */}
      <div className="res-list">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              className="res-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="res-empty__icon">📋</div>
              <h3>No reservations found</h3>
              <p>
                {activeTab === 'All'
                  ? "You haven't made any reservations yet."
                  : `No ${activeTab.toLowerCase()} reservations.`}
              </p>
            </motion.div>
          ) : (
            filtered.map((res, i) => (
              <motion.div
                key={res.id}
                className="res-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ delay: i * 0.05 }}
                layout
              >
                <div className="res-card__top">
                  <div className="res-card__slot">
                    <FiMapPin size={16} />
                    <span>{res.slotId}</span>
                    <span className="res-card__floor">{res.floor}</span>
                  </div>
                  <span
                    className="res-card__status"
                    style={{
                      background: `${statusColors[res.status]}18`,
                      color: statusColors[res.status],
                    }}
                  >
                    {res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                  </span>
                </div>

                <div className="res-card__details">
                  <div className="res-card__detail">
                    <FiCalendar size={14} />
                    <span>{res.date}</span>
                  </div>
                  <div className="res-card__detail">
                    <FiClock size={14} />
                    <span>
                      {res.startTime}{res.endTime ? ` - ${res.endTime}` : ''} ({res.duration}h)
                    </span>
                  </div>
                </div>

                <div className="res-card__bottom">
                  <div className="res-card__info">
                    <span className="res-card__plate">🚗 {res.vehiclePlate}</span>
                    <span className="res-card__code">Code: {res.code}</span>
                  </div>
                  <div className="res-card__cost">
                    {res.cost === 0 ? 'Free' : `$${res.cost}`}
                  </div>
                </div>

                {(res.status === 'active' || res.status === 'upcoming') && (
                  <div className="res-card__actions">
                    <button
                      className="res-cancel-btn"
                      onClick={() => setCancelTarget(res)}
                    >
                      <FiX size={14} /> Cancel
                    </button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Reservation"
      >
        {cancelTarget && (
          <div>
            <p style={{ color: '#64748B', marginBottom: '16px' }}>
              Are you sure you want to cancel your reservation for slot{' '}
              <strong>{cancelTarget.slotId}</strong> on{' '}
              <strong>{cancelTarget.date}</strong>?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCancelTarget(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid #E2E8F0',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#64748B',
                }}
              >
                Keep It
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#EF4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Cancel Reservation
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

