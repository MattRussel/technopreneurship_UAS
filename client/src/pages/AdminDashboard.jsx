import React, { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiRefreshCw,
  FiActivity,
  FiDollarSign,
  FiClock,
  FiWifi,
  FiWifiOff,
  FiPlus,
  FiTrash2,
  FiEye,
  FiMousePointer,
  FiPercent,
  FiTag,
  FiPlay,
  FiPause,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchLiveParkingData,
  generateRecentActivity,
  FLOORS,
} from '../utils/parkingSimulator';
import {
  getAdvertisements,
  createAdvertisement,
  toggleAdStatus,
  deleteAdvertisement,
} from '../utils/adService';
import Modal from '../components/Modal';
import './AdminDashboard.css';

/* Simulated occupancy for past 12 hours */
function generateHourlyOccupancy() {
  const now = new Date();
  const data = [];
  for (let i = 11; i >= 0; i--) {
    const h = new Date(now - i * 3600000).getHours();
    let occ;
    if (h >= 8 && h <= 11) occ = 40 + Math.random() * 30;
    else if (h >= 12 && h <= 14) occ = 70 + Math.random() * 20;
    else if (h >= 15 && h <= 18) occ = 55 + Math.random() * 25;
    else if (h >= 19 && h <= 21) occ = 45 + Math.random() * 20;
    else occ = 10 + Math.random() * 20;
    data.push({ hour: h, label: `${String(h).padStart(2, '0')}:00`, value: Math.round(Math.min(occ, 100)) });
  }
  return data;
}

function generateDailyRevenue() {
  const data = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    data.push({
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      value: Math.round(40 + Math.random() * 120),
    });
  }
  return data;
}

export default function AdminDashboard() {
  const { profile, loading } = useAuth();
  const [parkingData, setParkingData] = useState([]);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [hourlyOcc, setHourlyOcc] = useState([]);
  const [dailyRev, setDailyRev] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sensorStatus, setSensorStatus] = useState({});

  // Advertising management state
  const [ads, setAds] = useState([]);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adForm, setAdForm] = useState({
    title: '',
    tagline: '',
    description: '',
    category: 'Food & Beverage',
    promoCode: '',
    discount: '',
    badge: 'Featured',
    location: '',
    validUntil: 'Dec 31, 2026',
    icon: '☕',
    bgGradient: 'linear-gradient(135deg, #006241 0%, #1e3932 100%)',
  });

  useEffect(() => {
    getAdvertisements().then(setAds);
  }, []);

  const handleToggleStatus = async (ad) => {
    const nextStatus = ad.status === 'active' ? 'paused' : 'active';
    const updated = await toggleAdStatus(ad.id, nextStatus);
    setAds(updated);
    toast.success(`Campaign "${ad.title}" ${nextStatus === 'active' ? 'activated' : 'paused'}`);
  };

  const handleDeleteAd = async (adId) => {
    if (window.confirm('Delete this advertisement campaign?')) {
      const updated = await deleteAdvertisement(adId);
      setAds(updated);
      toast.success('Campaign deleted');
    }
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    if (!adForm.title.trim() || !adForm.tagline.trim()) {
      toast.error('Merchant title and promo tagline are required');
      return;
    }
    await createAdvertisement(adForm);
    const refreshed = await getAdvertisements();
    setAds(refreshed);
    setShowAdModal(false);
    toast.success('Advertisement campaign published!');
    setAdForm({
      title: '',
      tagline: '',
      description: '',
      category: 'Food & Beverage',
      promoCode: '',
      discount: '',
      badge: 'Featured',
      location: '',
      validUntil: 'Dec 31, 2026',
      icon: '🎁',
      bgGradient: 'linear-gradient(135deg, #1B2A4A 0%, #2C3E6B 100%)',
    });
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const res = await fetchLiveParkingData();
      if (isMounted) {
        setParkingData(res.slots);
        setStats(res.stats);
        setActivities(generateRecentActivity(10));
        setHourlyOcc(generateHourlyOccupancy());
        setDailyRev(generateDailyRevenue());
      }
    };

    load();

    // Simulated sensor status per floor
    const sensors = {};
    FLOORS.forEach((f) => {
      sensors[f.id] = {
        total: f.totalSlots,
        online: f.totalSlots - Math.floor(Math.random() * 2),
        lastPing: new Date().toISOString(),
      };
    });
    setSensorStatus(sensors);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setParkingData((prev) => {
        fetchLiveParkingData(prev).then((res) => {
          setParkingData(res.slots);
          setStats(res.stats);
        });
        return prev;
      });
      setActivities(generateRecentActivity(10));
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleManualRefresh = async () => {
    const res = await fetchLiveParkingData(parkingData);
    setParkingData(res.slots);
    setStats(res.stats);
    setActivities(generateRecentActivity(10));
    setHourlyOcc(generateHourlyOccupancy());
  };

  if (!loading && profile && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!stats) return null;

  const todayRevenue = dailyRev.length > 0 ? dailyRev[dailyRev.length - 1].value : 0;
  const maxOcc = Math.max(...hourlyOcc.map((h) => h.value), 1);
  const maxRev = Math.max(...dailyRev.map((d) => d.value), 1);

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>Management Dashboard</h1>
          <p className="admin-time">
            <FiActivity size={14} />
            {currentTime.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>
        <div className="admin-controls">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span>Auto-refresh</span>
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="interval-select"
          >
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
          </select>
          <button className="admin-refresh-btn" onClick={handleManualRefresh}>
            <FiRefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="admin-metrics">
        <motion.div className="metric-card metric-card--revenue" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <FiDollarSign className="metric-icon" />
          <div>
            <div className="metric-label">Revenue Today</div>
            <div className="metric-value">${todayRevenue}</div>
          </div>
        </motion.div>
        <motion.div className="metric-card metric-card--occupancy" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <FiActivity className="metric-icon" />
          <div>
            <div className="metric-label">Occupancy Rate</div>
            <div className="metric-value">{stats.occupancyRate}%</div>
          </div>
        </motion.div>
        <motion.div className="metric-card metric-card--reservations" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <FiClock className="metric-icon" />
          <div>
            <div className="metric-label">Reservations Today</div>
            <div className="metric-value">{stats.reserved + Math.floor(Math.random() * 8 + 5)}</div>
          </div>
        </motion.div>
        <motion.div className="metric-card metric-card--duration" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <FiClock className="metric-icon" />
          <div>
            <div className="metric-label">Avg Duration</div>
            <div className="metric-value">{(2 + Math.random() * 2).toFixed(1)}h</div>
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="admin-charts">
        {/* Occupancy Trend */}
        <div className="chart-card">
          <h3>Occupancy Trend (Last 12 Hours)</h3>
          <div className="bar-chart">
            {hourlyOcc.map((item, i) => (
              <div className="bar-col" key={i}>
                <div className="bar-wrapper">
                  <motion.div
                    className="bar-fill"
                    initial={{ height: 0 }}
                    animate={{ height: `${(item.value / maxOcc) * 100}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    style={{
                      background: item.value > 80 ? '#EF4444' : item.value > 60 ? '#F59E0B' : '#10B981',
                    }}
                  />
                </div>
                <span className="bar-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="chart-card">
          <h3>Daily Revenue (Last 7 Days)</h3>
          <div className="bar-chart">
            {dailyRev.map((item, i) => (
              <div className="bar-col" key={i}>
                <div className="bar-wrapper">
                  <motion.div
                    className="bar-fill bar-fill--revenue"
                    initial={{ height: 0 }}
                    animate={{ height: `${(item.value / maxRev) * 100}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                  />
                </div>
                <span className="bar-label">{item.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-Time Grid + Sensors */}
      <div className="admin-bottom-grid">
        {/* Compact Parking Grid */}
        <div className="compact-grid-card">
          <h3>Real-Time Parking Overview</h3>
          <div className="compact-floors">
            {FLOORS.map((floor) => {
              const floorSlots = parkingData.filter((s) => s.floor === floor.id);
              return (
                <div key={floor.id} className="compact-floor">
                  <div className="compact-floor__label">{floor.label}</div>
                  <div className="compact-floor__slots">
                    {floorSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`compact-slot compact-slot--${slot.status}`}
                        title={`${slot.id}: ${slot.status}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="compact-legend">
            <span><span className="compact-dot compact-dot--available" /> Available</span>
            <span><span className="compact-dot compact-dot--occupied" /> Occupied</span>
            <span><span className="compact-dot compact-dot--reserved" /> Reserved</span>
          </div>
        </div>

        {/* IoT Sensor Status */}
        <div className="sensor-card">
          <h3>IoT Sensor Status</h3>
          <div className="sensor-list">
            {FLOORS.map((floor) => {
              const s = sensorStatus[floor.id];
              if (!s) return null;
              const allOnline = s.online === s.total;
              return (
                <div key={floor.id} className="sensor-row">
                  <div className="sensor-floor">{floor.name}</div>
                  <div className="sensor-count">{s.online}/{s.total} sensors</div>
                  <div className={`sensor-indicator ${allOnline ? 'sensor-indicator--online' : 'sensor-indicator--partial'}`}>
                    {allOnline ? <FiWifi size={14} /> : <FiWifiOff size={14} />}
                    {allOnline ? 'Online' : 'Partial'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Mall Advertisements & Tenant Promotions ─── */}
      <div className="admin-ad-section">
        <div className="admin-ad-section__header">
          <div>
            <h3>Mall Partner Advertisements & Promotions</h3>
            <p>Manage promotional banners displayed on user dashboard and digital parking passes</p>
          </div>
          <button className="btn-add-ad" onClick={() => setShowAdModal(true)}>
            <FiPlus size={16} /> New Ad Campaign
          </button>
        </div>

        {/* Ad Performance KPI Mini Cards */}
        <div className="admin-ad-metrics">
          <div className="ad-kpi-card">
            <div className="ad-kpi-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
              <FiTag />
            </div>
            <div>
              <div className="ad-kpi-val">{ads.filter((a) => a.status === 'active').length}</div>
              <div className="ad-kpi-lbl">Active Campaigns</div>
            </div>
          </div>
          <div className="ad-kpi-card">
            <div className="ad-kpi-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
              <FiEye />
            </div>
            <div>
              <div className="ad-kpi-val">{ads.reduce((s, a) => s + (a.impressions || 0), 0).toLocaleString()}</div>
              <div className="ad-kpi-lbl">Total Impressions</div>
            </div>
          </div>
          <div className="ad-kpi-card">
            <div className="ad-kpi-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
              <FiMousePointer />
            </div>
            <div>
              <div className="ad-kpi-val">{ads.reduce((s, a) => s + (a.clicks || 0), 0).toLocaleString()}</div>
              <div className="ad-kpi-lbl">Promo Redemptions</div>
            </div>
          </div>
          <div className="ad-kpi-card">
            <div className="ad-kpi-icon" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              <FiPercent />
            </div>
            <div>
              <div className="ad-kpi-val">
                {ads.reduce((s, a) => s + (a.impressions || 0), 0) > 0
                  ? ((ads.reduce((s, a) => s + (a.clicks || 0), 0) / ads.reduce((s, a) => s + (a.impressions || 0), 0)) * 100).toFixed(1)
                  : '0.0'}%
              </div>
              <div className="ad-kpi-lbl">Average CTR</div>
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="events-table-wrapper">
          <table className="events-table ad-campaigns-table">
            <thead>
              <tr>
                <th>Merchant & Promo</th>
                <th>Category</th>
                <th>Discount / Code</th>
                <th>Location</th>
                <th>Performance</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => {
                const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : 0;
                return (
                  <tr key={ad.id}>
                    <td>
                      <div className="ad-table-merchant">
                        <span className="ad-table-icon">{ad.icon}</span>
                        <div>
                          <strong>{ad.title}</strong>
                          <div className="ad-table-tagline">{ad.tagline}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="event-badge">{ad.category}</span>
                    </td>
                    <td>
                      <span className="ad-discount-tag">{ad.discount}</span>
                      <div className="ad-code-text">{ad.promoCode}</div>
                    </td>
                    <td>
                      <small style={{ color: '#64748B' }}>{ad.location}</small>
                    </td>
                    <td>
                      <div className="ad-stat-box">
                        <span>{ad.impressions} views</span> · <strong>{ad.clicks} clicks</strong> ({ctr}%)
                      </div>
                    </td>
                    <td>
                      <span className={`ad-status-pill ad-status-pill--${ad.status}`}>
                        {ad.status === 'active' ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td>
                      <div className="ad-action-btns">
                        <button
                          className={`btn-ad-toggle ${ad.status === 'active' ? 'btn-ad-pause' : 'btn-ad-play'}`}
                          onClick={() => handleToggleStatus(ad)}
                          title={ad.status === 'active' ? 'Pause Campaign' : 'Activate Campaign'}
                        >
                          {ad.status === 'active' ? <FiPause size={14} /> : <FiPlay size={14} />}
                        </button>
                        <button
                          className="btn-ad-delete"
                          onClick={() => handleDeleteAd(ad.id)}
                          title="Delete Campaign"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="events-card">
        <h3>Recent Parking Events</h3>
        <div className="events-table-wrapper">
          <table className="events-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Slot</th>
                <th>Vehicle</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {activities.slice(0, 8).map((a) => (
                <tr key={a.id}>
                  <td>
                    <span className="event-badge">{a.icon} {a.label}</span>
                  </td>
                  <td>{a.slotId}</td>
                  <td>{a.vehiclePlate}</td>
                  <td>{a.minutesAgo === 0 ? 'Just now' : `${a.minutesAgo}m ago`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Advertisement Modal */}
      <Modal
        isOpen={showAdModal}
        onClose={() => setShowAdModal(false)}
        title="Create New Advertisement Campaign"
      >
        <form onSubmit={handleCreateAd} className="new-ad-form">
          <div className="form-group">
            <label>Merchant / Brand Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Uniqlo Mall, Burger King, Sephora"
              value={adForm.title}
              onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Promo Headline / Tagline *</label>
            <input
              type="text"
              required
              placeholder="e.g. Extra 10% Off for SmartPark Pass Holders"
              value={adForm.tagline}
              onChange={(e) => setAdForm({ ...adForm, tagline: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select
                value={adForm.category}
                onChange={(e) => setAdForm({ ...adForm, category: e.target.value })}
                className="form-input"
              >
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Shopping">Shopping</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Automotive">Automotive</option>
                <option value="Services">Services</option>
              </select>
            </div>
            <div className="form-group">
              <label>Discount Badge</label>
              <input
                type="text"
                placeholder="e.g. 20% OFF, Buy 1 Get 1"
                value={adForm.discount}
                onChange={(e) => setAdForm({ ...adForm, discount: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Voucher / Promo Code</label>
              <input
                type="text"
                placeholder="e.g. UNIQLO10"
                value={adForm.promoCode}
                onChange={(e) => setAdForm({ ...adForm, promoCode: e.target.value.toUpperCase() })}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>Unit Location in Mall</label>
              <input
                type="text"
                placeholder="e.g. Level 2, Unit 208"
                value={adForm.location}
                onChange={(e) => setAdForm({ ...adForm, location: e.target.value })}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Detailed Description</label>
            <textarea
              rows={3}
              placeholder="Enter details on how customers redeem this perk at your store..."
              value={adForm.description}
              onChange={(e) => setAdForm({ ...adForm, description: e.target.value })}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Icon Emoji</label>
              <div className="emoji-picker-row">
                {['☕', '🍔', '🛍️', '🎬', '⚡', '🍕', '🍰', '🚗', '🎁'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`btn-emoji ${adForm.icon === emoji ? 'active' : ''}`}
                    onClick={() => setAdForm({ ...adForm, icon: emoji })}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Banner Theme</label>
              <select
                value={adForm.bgGradient}
                onChange={(e) => setAdForm({ ...adForm, bgGradient: e.target.value })}
                className="form-input"
              >
                <option value="linear-gradient(135deg, #006241 0%, #1e3932 100%)">Emerald Green (Starbucks)</option>
                <option value="linear-gradient(135deg, #7F1D1D 0%, #991B1B 50%, #450A0A 100%)">Ruby Crimson (Cinema)</option>
                <option value="linear-gradient(135deg, #1B2A4A 0%, #2C3E6B 100%)">Classic Navy (SmartPark)</option>
                <option value="linear-gradient(135deg, #B45309 0%, #78350F 100%)">Golden Amber (EV & Luxury)</option>
                <option value="linear-gradient(135deg, #581C87 0%, #3B0764 100%)">Purple Velvet (Fashion)</option>
              </select>
            </div>
          </div>

          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowAdModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
              Publish Campaign
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

