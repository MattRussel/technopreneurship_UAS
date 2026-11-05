import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLogOut, FiTrash2, FiSave, FiTruck, FiEdit3 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import './Profile.css';

export default function Profile() {
  const { user, profile, updateProfile, deleteAccount, signOut } = useAuth();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    vehicle_plates: '',
    preferred_floor: '',
  });
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [userReservations, setUserReservations] = useState([]);

  // Keep form in sync when profile loads
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        vehicle_plates: profile.vehicle_plates?.join(', ') || '',
        preferred_floor: profile.preferred_floor || '',
      });
    }
  }, [profile]);

  // Load reservations from Supabase or fallback to localStorage
  useEffect(() => {
    const fetchUserReservations = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const targetUserId = user?.id || currentUser?.id;

        if (targetUserId) {
          const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .eq('user_id', targetUserId);

          if (!error && data) {
            setUserReservations(data);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching reservations in profile:', err);
      }
      const local = JSON.parse(localStorage.getItem('smartpark_reservations') || '[]');
      setUserReservations(local);
    };

    fetchUserReservations();
  }, [user]);

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        full_name: form.full_name,
        phone: form.phone,
        vehicle_plates: form.vehicle_plates
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean),
        preferred_floor: form.preferred_floor,
      };
      const { error } = await updateProfile(updates);
      if (error) {
        toast.error(error.message || 'Failed to update profile');
      } else {
        toast.success('Profile updated successfully');
        setEditing(false);
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        toast.error(error.message || 'Failed to delete account');
      } else {
        toast.success('Account deleted');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out');
  };

  // Stats (from Supabase or local reservations)
  const totalReservations = userReservations.length;
  const totalHours = userReservations.reduce((sum, r) => sum + (Number(r.duration_hours || r.duration) || 0), 0);
  const favFloor =
    userReservations.length > 0
      ? Object.entries(
          userReservations.reduce((acc, r) => {
            acc[r.floor] = (acc[r.floor] || 0) + 1;
            return acc;
          }, {})
        ).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
      : 'N/A';

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <motion.div
        className="profile-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="profile-avatar">{initials}</div>
        <div className="profile-info">
          <h1>{profile?.full_name || 'User'}</h1>
          <p>{user?.email || ''}</p>
          <span className="member-since">Member since {memberSince}</span>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="profile-stats">
        <div className="stat-item">
          <div className="stat-value">{totalReservations}</div>
          <div className="stat-label">Reservations</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{totalHours}h</div>
          <div className="stat-label">Total Hours</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{favFloor}</div>
          <div className="stat-label">Favorite Floor</div>
        </div>
      </div>

      {/* Personal Information */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="section-header">
          <h2>Personal Information</h2>
          {!editing && (
            <button className="edit-btn" onClick={() => setEditing(true)}>
              <FiEdit3 size={14} /> Edit
            </button>
          )}
        </div>
        <div className="profile-fields">
          <div className="field-group">
            <label><FiUser size={14} /> Full Name</label>
            {editing ? (
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="profile-input"
              />
            ) : (
              <p>{profile?.full_name || 'Not set'}</p>
            )}
          </div>
          <div className="field-group">
            <label><FiMail size={14} /> Email</label>
            <p>{user?.email || 'Not set'}</p>
          </div>
          <div className="field-group">
            <label><FiPhone size={14} /> Phone</label>
            {editing ? (
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                className="profile-input"
              />
            ) : (
              <p>{profile?.phone || 'Not set'}</p>
            )}
          </div>
          <div className="field-group">
            <label><FiTruck size={14} /> Vehicle Plates</label>
            {editing ? (
              <input
                type="text"
                value={form.vehicle_plates}
                onChange={(e) => setForm({ ...form, vehicle_plates: e.target.value })}
                placeholder="AB 1234 CD, EF 5678 GH"
                className="profile-input"
              />
            ) : (
              <p>{profile?.vehicle_plates?.join(', ') || 'Not set'}</p>
            )}
          </div>
          <div className="field-group">
            <label>Preferred Floor</label>
            {editing ? (
              <select
                value={form.preferred_floor}
                onChange={(e) => setForm({ ...form, preferred_floor: e.target.value })}
                className="profile-input"
              >
                <option value="">No preference</option>
                <option value="B1">Basement 1</option>
                <option value="B2">Basement 2</option>
                <option value="F1">Floor 1</option>
                <option value="F2">Floor 2</option>
              </select>
            ) : (
              <p>{profile?.preferred_floor || 'No preference'}</p>
            )}
          </div>
        </div>
        {editing && (
          <div className="edit-actions">
            <button className="btn-cancel" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn-save" onClick={handleSave} disabled={saving}>
              <FiSave size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </motion.div>

      {/* Account Actions */}
      <motion.div
        className="profile-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2>Account</h2>
        <div className="account-actions">
          <button className="action-btn action-btn--signout" onClick={handleSignOut}>
            <FiLogOut size={16} />
            Sign Out
          </button>
          <button
            className="action-btn action-btn--delete"
            onClick={() => setShowDeleteModal(true)}
          >
            <FiTrash2 size={16} />
            Delete Account
          </button>
        </div>
      </motion.div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirm('');
        }}
        title="Delete Account"
      >
        <div className="delete-modal-content">
          <div className="delete-warning">
            <span className="warning-icon">⚠️</span>
            <p>
              This action is <strong>permanent and irreversible</strong>. All your data,
              reservations, and feedback will be deleted forever.
            </p>
          </div>
          <div className="delete-confirm-input">
            <label>Type <strong>DELETE</strong> to confirm:</label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              className="profile-input"
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirm('');
              }}
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
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteConfirm !== 'DELETE' || deleting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: deleteConfirm === 'DELETE' ? '#EF4444' : '#FCA5A5',
                color: 'white',
                cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
                fontWeight: 600,
              }}
            >
              {deleting ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

