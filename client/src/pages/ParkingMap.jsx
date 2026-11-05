import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiZap, FiStar, FiInfo } from 'react-icons/fi';
import { FaWheelchair } from 'react-icons/fa';
import {
  fetchLiveParkingData,
  FLOORS,
} from '../utils/parkingSimulator';
import Modal from '../components/Modal';
import './ParkingMap.css';

const slotTypeIcons = {
  'ev-charging': <FiZap size={12} />,
  disabled: <FaWheelchair size={11} />,
  vip: <FiStar size={12} />,
  regular: null,
};

const statusColors = {
  available: '#10B981',
  occupied: '#EF4444',
  reserved: '#3B82F6',
};

export default function ParkingMap() {
  const navigate = useNavigate();
  const [parkingData, setParkingData] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeFloor, setActiveFloor] = useState('B1');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const result = await fetchLiveParkingData();
      if (isMounted) {
        setParkingData(result.slots);
        setStats(result.stats);
      }
    };

    load();
    const interval = setInterval(async () => {
      setParkingData((prev) => {
        fetchLiveParkingData(prev).then((res) => {
          if (isMounted) {
            setParkingData(res.slots);
            setStats(res.stats);
          }
        });
        return prev;
      });
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const floorSlots = parkingData.filter((s) => s.floor === activeFloor);
  const floorInfo = FLOORS.find((f) => f.id === activeFloor);

  const getFloorStat = (floorId) => {
    if (Array.isArray(stats?.byFloor)) {
      return stats.byFloor.find((f) => f.floor === floorId);
    }
    return stats?.byFloor?.[floorId];
  };

  const floorStats = getFloorStat(activeFloor);

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot);
    setShowModal(true);
  };

  const handleReserveThisSpot = () => {
    if (!selectedSlot) return;
    const targetSlot = { ...selectedSlot };
    const targetFloor = activeFloor || targetSlot.floor;
    setShowModal(false);
    navigate('/reserve', {
      state: {
        slot: targetSlot,
        floor: targetFloor,
      },
    });
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="parking-map">
      <div className="parking-map__header">
        <h1>Parking Map</h1>
        <p>Real-time parking slot availability</p>
      </div>

      {/* Floor Tabs */}
      <div className="floor-tabs">
        {FLOORS.map((floor) => {
          const fStats = getFloorStat(floor.id);
          return (
            <button
              key={floor.id}
              className={`floor-tab${activeFloor === floor.id ? ' floor-tab--active' : ''}`}
              onClick={() => setActiveFloor(floor.id)}
            >
              <span className="floor-tab__label">{floor.label}</span>
              <span className="floor-tab__avail">
                {fStats ? fStats.available : '—'} free
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats Bar */}
      {floorStats && (
        <div className="map-stats-bar">
          <div className="map-stat">
            <span className="map-stat__dot" style={{ background: '#10B981' }} />
            Available: <strong>{floorStats.available}</strong>
          </div>
          <div className="map-stat">
            <span className="map-stat__dot" style={{ background: '#EF4444' }} />
            Occupied: <strong>{floorStats.occupied}</strong>
          </div>
          <div className="map-stat">
            <span className="map-stat__dot" style={{ background: '#3B82F6' }} />
            Reserved: <strong>{floorStats.reserved}</strong>
          </div>
        </div>
      )}

      {/* Parking Grid */}
      <div className="parking-grid">
        <div className="parking-grid__aisle">
          <div className="aisle-label">↑ ENTRY</div>
        </div>
        <div className="parking-grid__slots">
          {floorSlots.map((slot, idx) => (
            <motion.button
              key={slot.id}
              className={`parking-slot parking-slot--${slot.status} parking-slot--${slot.type}`}
              onClick={() => handleSlotClick(slot)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.01 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              title={`${slot.id} - ${slot.status}`}
            >
              <span className="slot-number">{slot.number}</span>
              {slotTypeIcons[slot.type] && (
                <span className="slot-type-icon">{slotTypeIcons[slot.type]}</span>
              )}
            </motion.button>
          ))}
        </div>
        <div className="parking-grid__aisle">
          <div className="aisle-label">EXIT ↓</div>
        </div>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <h3>Legend</h3>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#10B981' }} />
            Available
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#EF4444' }} />
            Occupied
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ background: '#3B82F6' }} />
            Reserved
          </div>
          <div className="legend-item">
            <FaWheelchair size={14} style={{ color: '#64748B' }} />
            Disabled
          </div>
          <div className="legend-item">
            <FiZap size={14} style={{ color: '#F59E0B' }} />
            EV Charging
          </div>
          <div className="legend-item">
            <FiStar size={14} style={{ color: '#8B5CF6' }} />
            VIP
          </div>
        </div>
      </div>

      {/* Slot Detail Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`Slot ${selectedSlot?.id || ''}`}
      >
        {selectedSlot && (
          <div className="slot-detail">
            <div
              className="slot-detail__status"
              style={{ color: statusColors[selectedSlot.status] }}
            >
              ● {selectedSlot.status.charAt(0).toUpperCase() + selectedSlot.status.slice(1)}
            </div>
            <div className="slot-detail__info">
              <div className="detail-row">
                <span>Floor</span>
                <strong>{selectedSlot.floor}</strong>
              </div>
              <div className="detail-row">
                <span>Slot Number</span>
                <strong>{selectedSlot.number}</strong>
              </div>
              <div className="detail-row">
                <span>Type</span>
                <strong style={{ textTransform: 'capitalize' }}>{selectedSlot.type}</strong>
              </div>
              {selectedSlot.reservationCode && (
                <div className="detail-row">
                  <span>Pass Code</span>
                  <strong>{selectedSlot.reservationCode}</strong>
                </div>
              )}
              {selectedSlot.vehiclePlate && (
                <div className="detail-row">
                  <span>Vehicle</span>
                  <strong>{selectedSlot.vehiclePlate}</strong>
                </div>
              )}
              {selectedSlot.occupiedSince && (
                <div className="detail-row">
                  <span>Since</span>
                  <strong>{formatTime(selectedSlot.occupiedSince)}</strong>
                </div>
              )}
            </div>
            {selectedSlot.status === 'available' && (
              <button
                type="button"
                onClick={handleReserveThisSpot}
                className="slot-detail__reserve-btn"
              >
                Reserve This Spot
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

