import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchLiveParkingData,
  generateRecentActivity,
  FLOORS,
} from '../utils/parkingSimulator';
import AdBanner from '../components/AdBanner';
import './Dashboard.css';

/* ───── Animated Counter ───── */
function AnimatedNumber({ value, duration = 800 }) {
  const numValue = Math.round(Number(value)) || 0;
  const [display, setDisplay] = useState(numValue);
  const prev = useRef(numValue);

  useEffect(() => {
    const start = Number(prev.current) || 0;
    const target = Number(numValue) || 0;
    const diff = target - start;
    if (diff === 0 || isNaN(diff)) {
      setDisplay(target);
      prev.current = target;
      return;
    }
    const startTime = performance.now();

    let raf;
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(isNaN(current) ? target : current);
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        prev.current = target;
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [numValue, duration]);

  return <>{isNaN(display) ? numValue : display}</>;
}

/* ───── Circular Progress ───── */
function CircularProgress({ value }) {
  const numeric = Math.min(100, Math.max(0, Math.round(Number(value)) || 0));
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (numeric / 100) * circumference;

  return (
    <div className="circular-progress">
      <svg viewBox="0 0 52 52">
        <circle className="progress-bg" cx="26" cy="26" r={radius} />
        <circle
          className="progress-fill"
          cx="26"
          cy="26"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="progress-text">{numeric}%</div>
    </div>
  );
}

/* ───── Card animation variants ───── */
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: 'easeOut' },
  }),
};

/* ═══════════════════════════════════════
   Dashboard Page
   ═══════════════════════════════════════ */
export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [parkingData, setParkingData] = useState(null);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  /* --- clock tick every second --- */
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* --- live data loader & simulation sync --- */
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const res = await fetchLiveParkingData();
      if (isMounted) {
        setParkingData(res.slots);
        setStats(res.stats);
        setActivities(generateRecentActivity(8));
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
    }, 6000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  /* --- format helpers --- */
  const formatDate = useCallback((d) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const formatTime = useCallback((d) => {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || 'User';

  if (!stats) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner" />
        <p>Loading parking data…</p>
      </div>
    );
  }

  const floorProgressLevel = (occupied, total) => {
    const pct = (occupied / total) * 100;
    if (pct >= 85) return 'high';
    if (pct >= 60) return 'medium';
    return 'low';
  };

  return (
    <div className="dashboard">
        {/* ─── Header ─── */}
        <motion.div
          className="dashboard-header"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="welcome-text">
            Welcome back, <span>{firstName}</span> 👋
          </h1>
          <p className="date-text">
            <span className="live-dot" />
            {formatDate(currentTime)} &middot; {formatTime(currentTime)}
          </p>
        </motion.div>

        {/* ─── Summary Cards ─── */}
        <div className="summary-cards">
          <motion.div
            className="summary-card total"
            custom={0}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="card-icon">🅿️</div>
            <div className="card-content">
              <div className="card-label">Total Spots</div>
              <div className="card-value">
                <AnimatedNumber value={stats.total} />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="summary-card available"
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="card-icon">✅</div>
            <div className="card-content">
              <div className="card-label">Available Now</div>
              <div className="card-value">
                <AnimatedNumber value={stats.available} />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="summary-card occupied"
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="card-icon">🚗</div>
            <div className="card-content">
              <div className="card-label">Occupied</div>
              <div className="card-value">
                <AnimatedNumber value={stats.occupied} />
              </div>
            </div>
          </motion.div>

          <motion.div
            className="summary-card rate"
            custom={3}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
          >
            <CircularProgress value={stats.occupancyRate} />
            <div className="card-content">
              <div className="card-label">Occupancy Rate</div>
              <div className="card-value">
                <AnimatedNumber value={stats.occupancyRate} />%
              </div>
            </div>
          </motion.div>
        </div>

        {/* ─── Mall Promotions & Ads Banner ─── */}
        <AdBanner />

        {/* ─── Floor Overview ─── */}
        <h2 className="section-title">
          <span className="section-icon">🏢</span> Floor Overview
        </h2>
        <div className="floor-overview">
          {(Array.isArray(stats?.byFloor)
            ? stats.byFloor
            : Object.entries(stats?.byFloor || {}).map(([floorId, data]) => ({
                floor: floorId,
                name: data.name || floorId,
                ...data,
              }))
          ).map((floor, i) => {
            const total = floor.total || 1;
            const occupied = floor.occupied || 0;
            const pct = Math.round((occupied / total) * 100);
            return (
              <motion.div
                className="floor-card"
                key={floor.floor}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="floor-label">{floor.name}</div>
                <div className="floor-count">
                  {floor.available} <span>/ {floor.total} available</span>
                </div>
                <div className="floor-sublabel">
                  {floor.occupied} occupied · {floor.reserved || 0} reserved
                </div>
                <div className="floor-progress-bar">
                  <div
                    className={`floor-progress-fill ${floorProgressLevel(
                      occupied,
                      total
                    )}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ─── Quick Actions + Recent Activity ─── */}
        <div className="dashboard-content-grid">
          {/* Quick Actions */}
          <motion.div
            className="quick-actions-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="section-title">
              <span className="section-icon">⚡</span> Quick Actions
            </h2>
            <div className="quick-actions-grid">
              <Link to="/reserve" className="quick-action-btn">
                <div className="action-icon">📋</div>
                <div className="action-info">
                  <h4>Reserve a Spot</h4>
                  <p>Book your parking in advance</p>
                </div>
                <span className="action-arrow">→</span>
              </Link>
              <Link to="/parking-map" className="quick-action-btn">
                <div className="action-icon">🗺️</div>
                <div className="action-info">
                  <h4>View Parking Map</h4>
                  <p>See live floor-by-floor availability</p>
                </div>
                <span className="action-arrow">→</span>
              </Link>
              <Link to="/my-reservations" className="quick-action-btn">
                <div className="action-icon">📑</div>
                <div className="action-info">
                  <h4>My Reservations</h4>
                  <p>Manage your bookings</p>
                </div>
                <span className="action-arrow">→</span>
              </Link>
              {isAdmin && (
                <Link to="/admin" className="quick-action-btn">
                  <div className="action-icon">📊</div>
                  <div className="action-info">
                    <h4>Admin Dashboard</h4>
                    <p>Monitor IoT sensors & occupancy</p>
                  </div>
                  <span className="action-arrow">→</span>
                </Link>
              )}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            className="recent-activity-section"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <h2 className="section-title">
              <span className="section-icon">📊</span> Recent Activity
            </h2>
            <div className="activity-list">
              <AnimatePresence mode="popLayout">
                {activities.map((a) => (
                  <motion.div
                    className="activity-item"
                    key={a.id}
                    layout
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="activity-icon">{a.icon}</span>
                    <div className="activity-details">
                      <div className="activity-label">
                        {a.label} &middot; {a.slotId}
                      </div>
                      <div className="activity-meta">{a.vehiclePlate}</div>
                    </div>
                    <div className="activity-time">
                      {a.minutesAgo === 0 ? 'Just now' : `${a.minutesAgo}m ago`}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
      </div>
    </div>
  );
}
