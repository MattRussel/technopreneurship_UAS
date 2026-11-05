import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheck, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { FaWheelchair } from 'react-icons/fa';
import { FiZap, FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchLiveParkingData,
  FLOORS,
} from '../utils/parkingSimulator';
import './Reserve.css';

const DURATIONS = [
  { value: 1, label: '1 Hour' },
  { value: 2, label: '2 Hours' },
  { value: 3, label: '3 Hours' },
  { value: 4, label: '4 Hours' },
  { value: 8, label: 'Full Day (8 Hours)' },
];

function calculateCost(hours) {
  if (hours <= 2) return 0;
  return (hours - 2) * 2;
}

const steps = ['Select Floor', 'Select Slot', 'Details', 'Confirm'];

export default function Reserve() {
  const navigate = useNavigate();
  const location = useLocation();

  const locationSlot = location.state?.slot || null;
  const locationFloor = location.state?.floor || locationSlot?.floor || null;

  const [step, setStep] = useState(locationSlot ? 2 : 0);
  const [parkingData, setParkingData] = useState([]);
  const [stats, setStats] = useState(null);

  // Selection state
  const [selectedFloor, setSelectedFloor] = useState(locationFloor);
  const [selectedSlot, setSelectedSlot] = useState(locationSlot);
  const [form, setForm] = useState({
    vehiclePlate: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    duration: 2,
  });
  const [reservationResult, setReservationResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listen to navigation state changes (e.g. user selects a slot from Parking Map)
  useEffect(() => {
    if (location.state?.slot) {
      const slot = location.state.slot;
      const floor = location.state.floor || slot.floor;
      setSelectedFloor(floor);
      setSelectedSlot(slot);
      setStep(2);
    }
  }, [location.state]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const res = await fetchLiveParkingData();
      if (isMounted) {
        setParkingData(res.slots);
        setStats(res.stats);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Reset scroll to top whenever user changes steps
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [step]);

  const floorSlots = parkingData.filter(
    (s) => s.floor === selectedFloor && (s.status === 'available' || s.id === selectedSlot?.id)
  );

  const cost = calculateCost(form.duration);

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const code = `SP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const startDateTime = new Date(`${form.date}T${form.startTime || '00:00'}`);
      const endDateTime = new Date(startDateTime.getTime() + form.duration * 3600000);
      const now = new Date();
      let status = 'upcoming';
      if (now >= endDateTime) {
        status = 'completed';
      } else if (now >= startDateTime) {
        status = 'active';
      }

      const newReservation = {
        code,
        slotId: selectedSlot.id,
        floor: selectedSlot.floor,
        slotNumber: selectedSlot.number,
        slotType: selectedSlot.type,
        vehiclePlate: form.vehiclePlate,
        date: form.date,
        startTime: form.startTime,
        endTime: endDateTime.toISOString(),
        duration: form.duration,
        cost,
        status,
        createdAt: new Date().toISOString(),
      };

      // Save to Supabase
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Ensure profile row exists to prevent foreign key violation
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          }, { onConflict: 'id' });

          const { error } = await supabase.from('reservations').insert({
            user_id: user.id,
            slot_id: selectedSlot.id,
            floor: selectedSlot.floor,
            slot_number: String(selectedSlot.number),
            vehicle_plate: form.vehiclePlate,
            reservation_code: code,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            duration_hours: form.duration,
            cost,
            status,
          });
          if (error) {
            console.error('Supabase reservation error:', error);
          }
        }
      } catch (err) {
        console.error('Error saving to Supabase:', err);
      }

      // Also save to localStorage as backup
      const existing = JSON.parse(localStorage.getItem('smartpark_reservations') || '[]');
      existing.push({ ...newReservation, id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}` });
      localStorage.setItem('smartpark_reservations', JSON.stringify(existing));

      setReservationResult(newReservation);
      setStep(4);
      toast.success('Reservation confirmed!');
    } catch (err) {
      console.error('Reservation exception:', err);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (isSubmitting) return false;
    if (step === 0) return selectedFloor !== null;
    if (step === 1) return selectedSlot !== null;
    if (step === 2) return form.vehiclePlate.trim().length >= 3 && form.date && form.startTime;
    return true;
  };

  const nextStep = () => {
    if (isSubmitting) return;
    if (canProceed() && step < 3) setStep(step + 1);
    if (step === 3) handleConfirm();
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  // Min date = today, max date = today + 7 days
  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  // Success screen
  if (step === 4 && reservationResult) {
    return (
      <div className="reserve-page">
        <motion.div
          className="reserve-success"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="success-checkmark">
            <FiCheck size={48} />
          </div>
          <h2>Reservation Confirmed!</h2>
          <p>Your parking spot has been reserved successfully.</p>

          <div className="reservation-ticket">
            <div className="ticket-header">SMARTPARK MALL</div>
            <div className="ticket-code">{reservationResult.code}</div>
            <div className="ticket-divider" />
            <div className="ticket-details">
              <div className="ticket-row">
                <span>Slot</span>
                <strong>{reservationResult.slotId}</strong>
              </div>
              <div className="ticket-row">
                <span>Date</span>
                <strong>{reservationResult.date}</strong>
              </div>
              <div className="ticket-row">
                <span>Time</span>
                <strong>{reservationResult.startTime}</strong>
              </div>
              <div className="ticket-row">
                <span>Duration</span>
                <strong>{reservationResult.duration}h</strong>
              </div>
              <div className="ticket-row">
                <span>Vehicle</span>
                <strong>{reservationResult.vehiclePlate}</strong>
              </div>
              <div className="ticket-row">
                <span>Cost</span>
                <strong>{reservationResult.cost === 0 ? 'Free' : `$${reservationResult.cost}`}</strong>
              </div>
            </div>
          </div>

          {/* Mall Partner Perk Ad */}
          <div className="ticket-perk-banner">
            <span className="perk-icon">🎁</span>
            <div className="perk-text">
              <strong>Exclusive Mall Perk:</strong>
              <p>
                Show this digital pass at <strong>Starbucks (Ground Floor)</strong> for a{' '}
                <strong>Free Beverage Upsize</strong> with voucher code <code>PARKSTARBUCKS</code>!
              </p>
            </div>
          </div>

          <div className="success-actions">
            <button className="btn-primary" onClick={() => navigate('/my-reservations')}>
              View My Reservations
            </button>
            <button className="btn-secondary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="reserve-page">
      <div className="reserve-header">
        <h1>Reserve a Parking Spot</h1>
      </div>

      {/* Step Progress */}
      <div className="step-progress">
        {steps.map((label, i) => (
          <div key={i} className={`step-item${i <= step ? ' step-item--active' : ''}${i < step ? ' step-item--done' : ''}`}>
            <div className="step-circle">
              {i < step ? <FiCheck size={14} /> : i + 1}
            </div>
            <span className="step-label">{label}</span>
            {i < steps.length - 1 && <div className="step-line" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          className="step-content"
        >
          {/* Step 0: Select Floor */}
          {step === 0 && (
            <div className="floor-selection">
              <h2>Select a Floor</h2>
              <p className="step-subtitle">Choose the parking floor you prefer</p>
              <div className="floor-cards">
                {(Array.isArray(stats?.byFloor)
                  ? stats.byFloor
                  : Object.entries(stats?.byFloor || {}).map(([floorId, data]) => ({
                      floor: floorId,
                      name: data.name || floorId,
                      ...data,
                    }))
                ).map((floor) => (
                  <button
                    key={floor.floor}
                    className={`floor-select-card${selectedFloor === floor.floor ? ' floor-select-card--selected' : ''}`}
                    onClick={() => setSelectedFloor(floor.floor)}
                  >
                    <div className="fsc-name">{floor.name}</div>
                    <div className="fsc-avail">
                      <span className="fsc-number">{floor.available}</span>
                      <span className="fsc-of">/ {floor.total} available</span>
                    </div>
                    <div className="fsc-bar">
                      <div
                        className="fsc-bar-fill"
                        style={{ width: `${(floor.available / floor.total) * 100}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Select Slot */}
          {step === 1 && (
            <div className="slot-selection">
              <h2>Select a Slot on {FLOORS.find(f => f.id === selectedFloor)?.name}</h2>
              <p className="step-subtitle">{floorSlots.length} slots available</p>
              <div className="slot-grid">
                {floorSlots.map((slot) => (
                  <button
                    key={slot.id}
                    className={`slot-btn${selectedSlot?.id === slot.id ? ' slot-btn--selected' : ''} slot-btn--${slot.type}`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <span className="slot-btn__num">{slot.id}</span>
                    <span className="slot-btn__type">
                      {slot.type === 'ev-charging' && <FiZap size={12} />}
                      {slot.type === 'disabled' && <FaWheelchair size={11} />}
                      {slot.type === 'vip' && <FiStar size={12} />}
                      {slot.type === 'regular' && '🅿️'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="reservation-details">
              <h2>Reservation Details</h2>
              <p className="step-subtitle">
                Selected: <strong>{selectedSlot?.id}</strong>
                {selectedFloor && ` · Floor ${selectedFloor}`}
                {selectedSlot?.type && ` · ${selectedSlot.type.replace('-', ' ')}`}
              </p>
              <div className="detail-form">
                <div className="form-group">
                  <label>Vehicle Plate Number</label>
                  <input
                    type="text"
                    placeholder="e.g. AB 1234 CD"
                    value={form.vehiclePlate}
                    onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value.toUpperCase() })}
                    className="form-input"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      min={today}
                      max={maxDate}
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <select
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                    className="form-input"
                  >
                    {DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div className="cost-display">
                  <span>Estimated Cost</span>
                  <strong>{cost === 0 ? 'Free (first 2 hours)' : `$${cost}.00`}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="reservation-confirm">
              <h2>Confirm Reservation</h2>
              <div className="confirm-summary">
                <div className="confirm-row">
                  <span>Parking Slot</span>
                  <strong>{selectedSlot?.id}</strong>
                </div>
                <div className="confirm-row">
                  <span>Slot Type</span>
                  <strong style={{ textTransform: 'capitalize' }}>{selectedSlot?.type}</strong>
                </div>
                <div className="confirm-row">
                  <span>Vehicle</span>
                  <strong>{form.vehiclePlate}</strong>
                </div>
                <div className="confirm-row">
                  <span>Date</span>
                  <strong>{form.date}</strong>
                </div>
                <div className="confirm-row">
                  <span>Start Time</span>
                  <strong>{form.startTime}</strong>
                </div>
                <div className="confirm-row">
                  <span>Duration</span>
                  <strong>{form.duration} hour{form.duration > 1 ? 's' : ''}</strong>
                </div>
                <div className="confirm-row confirm-row--total">
                  <span>Total Cost</span>
                  <strong>{cost === 0 ? 'Free' : `$${cost}.00`}</strong>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      {step < 4 && (
        <div className="step-nav">
          {step > 0 && (
            <button className="btn-back" onClick={prevStep} disabled={isSubmitting}>
              <FiChevronLeft /> Back
            </button>
          )}
          <button
            className="btn-next"
            onClick={nextStep}
            disabled={!canProceed() || isSubmitting}
            style={isSubmitting ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
          >
            {isSubmitting ? 'Confirming...' : (step === 3 ? 'Confirm Reservation' : 'Continue')}
            {!isSubmitting && step < 3 && <FiChevronRight />}
          </button>
        </div>
      )}
    </div>
  );
}

