import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiStar, FiSend, FiCheck, FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import './Feedback.css';

const CATEGORIES = [
  'Parking Experience',
  'App Usability',
  'Customer Service',
  'Facilities',
  'Other',
];

const statusColors = {
  pending: '#F59E0B',
  reviewed: '#3B82F6',
  resolved: '#10B981',
};

export default function Feedback() {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pastFeedback, setPastFeedback] = useState([]);

  useEffect(() => {
    const loadFeedback = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const targetUserId = user?.id || currentUser?.id;

        if (targetUserId) {
          // Only fetch feedback submitted by the current user
          const { data, error } = await supabase
            .from('feedback')
            .select('*')
            .eq('user_id', targetUserId)
            .order('created_at', { ascending: false });

          if (!error && data) {
            setPastFeedback(data.map((fb) => ({
              id: fb.id,
              rating: fb.rating,
              category: fb.category,
              subject: fb.subject,
              message: fb.message,
              status: fb.status,
              createdAt: fb.created_at,
            })));
            return;
          }
        }
      } catch (err) {
        console.error('Error loading feedback:', err);
      }

      // Fallback to user-scoped localStorage
      const userKey = user?.id ? `smartpark_feedback_${user.id}` : 'smartpark_feedback';
      const stored = JSON.parse(localStorage.getItem(userKey) || '[]');
      setPastFeedback(stored);
    };

    loadFeedback();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error('Please select a rating');
    if (!category) return toast.error('Please select a category');
    if (!subject.trim()) return toast.error('Please enter a subject');
    if (message.trim().length < 10) return toast.error('Feedback must be at least 10 characters');

    setLoading(true);

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      const newFeedback = {
        id: `FB-${Date.now()}`,
        rating,
        category,
        subject,
        message,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      // Save to Supabase
      if (currentUser) {
        // Ensure profile row exists to prevent foreign key violation
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
        }, { onConflict: 'id' });

        const { error } = await supabase.from('feedback').insert({
          user_id: currentUser.id,
          rating,
          category,
          subject,
          message,
          status: 'pending',
        });
        if (error) {
          console.error('Supabase feedback error:', error);
        }
      }

      // Also save to user-scoped localStorage as backup
      const userKey = currentUser?.id ? `smartpark_feedback_${currentUser.id}` : 'smartpark_feedback';
      const updated = [newFeedback, ...pastFeedback];
      localStorage.setItem(userKey, JSON.stringify(updated));
      setPastFeedback(updated);

      setSubmitted(true);
      toast.success('Feedback submitted! Thank you.');

      setTimeout(() => {
        setSubmitted(false);
        setRating(0);
        setCategory('');
        setSubject('');
        setMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-page">
      <div className="feedback-header">
        <h1>Share Your Feedback</h1>
        <p>Help us improve your parking experience</p>
      </div>

      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="success"
            className="feedback-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="success-icon">
              <FiCheck size={48} />
            </div>
            <h2>Thank You!</h2>
            <p>Your feedback has been submitted successfully.</p>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            className="feedback-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Star Rating */}
            <div className="form-section">
              <label>How was your experience?</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`star-btn${(hoverRating || rating) >= star ? ' star-btn--active' : ''}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                  >
                    <FiStar
                      size={32}
                      fill={(hoverRating || rating) >= star ? '#F59E0B' : 'none'}
                      stroke={(hoverRating || rating) >= star ? '#F59E0B' : '#CBD5E1'}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <span className="rating-label">
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
                </span>
              )}
            </div>

            {/* Category */}
            <div className="form-section">
              <label>Category</label>
              <div className="category-chips">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`category-chip${category === cat ? ' category-chip--active' : ''}`}
                    onClick={() => setCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="form-section">
              <label htmlFor="fb-subject">Subject</label>
              <input
                id="fb-subject"
                type="text"
                className="feedback-input"
                placeholder="Brief summary of your feedback"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Message */}
            <div className="form-section">
              <label htmlFor="fb-message">Your Feedback</label>
              <textarea
                id="fb-message"
                className="feedback-textarea"
                placeholder="Tell us more about your experience..."
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <span className="char-count">{message.length} characters (min 10)</span>
            </div>

            <button type="submit" className="feedback-submit" disabled={loading}>
              {loading ? (
                <span className="submit-spinner" />
              ) : (
                <>
                  <FiSend size={16} /> Submit Feedback
                </>
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Past Feedback */}
      {pastFeedback.length > 0 && (
        <div className="past-feedback">
          <h2><FiMessageSquare size={18} /> Previous Feedback</h2>
          <div className="past-feedback-list">
            {pastFeedback.map((fb) => (
              <div className="past-feedback-item" key={fb.id}>
                <div className="pfb-top">
                  <div className="pfb-stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <FiStar
                        key={s}
                        size={14}
                        fill={s <= fb.rating ? '#F59E0B' : 'none'}
                        stroke={s <= fb.rating ? '#F59E0B' : '#CBD5E1'}
                      />
                    ))}
                  </div>
                  <span
                    className="pfb-status"
                    style={{
                      color: statusColors[fb.status],
                      background: `${statusColors[fb.status]}18`,
                    }}
                  >
                    {fb.status.charAt(0).toUpperCase() + fb.status.slice(1)}
                  </span>
                </div>
                <div className="pfb-subject">{fb.subject}</div>
                <div className="pfb-meta">
                  <span className="pfb-category">{fb.category}</span>
                  <span className="pfb-date">
                    {new Date(fb.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

