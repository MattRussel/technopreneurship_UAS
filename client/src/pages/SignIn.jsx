import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiX } from 'react-icons/fi';
import { FaCar } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const SignIn = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const validate = useCallback(() => {
    const errs = {};
    if (!form.email.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = 'Enter a valid email address';
    }
    if (!form.password) {
      errs.password = 'Password is required';
    } else if (form.password.length < 6) {
      errs.password = 'Password must be at least 6 characters';
    }
    return errs;
  }, [form]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(form.email.trim(), form.password);

      if (error) {
        setToast({ type: 'error', message: error.message || 'Invalid email or password' });
        return;
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background shapes */}
      <div className="auth-page__bg-shape auth-page__bg-shape--top" />
      <div className="auth-page__bg-shape auth-page__bg-shape--bottom" />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`auth-toast${toast.type === 'success' ? ' auth-toast--success' : ''}`}
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <FiAlertCircle />
            {toast.message}
            <button className="auth-toast__close" onClick={() => setToast(null)}>
              <FiX />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Brand */}
        <div className="auth-card__brand">
          <div className="auth-card__logo">
            <FaCar />
          </div>
          <h1 className="auth-card__brand-name">
            Smart<span>Park</span>
          </h1>
          <p className="auth-card__subtitle">Sign in to your account</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <div className="auth-form__group">
            <label className="auth-form__label" htmlFor="signin-email">
              Email Address
            </label>
            <div className="auth-form__input-wrapper">
              <FiMail className="auth-form__input-icon" />
              <input
                id="signin-email"
                className={`auth-form__input${errors.email ? ' auth-form__input--error' : ''}`}
                type="email"
                name="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <motion.span
                className="auth-form__error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <FiAlertCircle /> {errors.email}
              </motion.span>
            )}
          </div>

          {/* Password */}
          <div className="auth-form__group">
            <label className="auth-form__label" htmlFor="signin-password">
              Password
            </label>
            <div className="auth-form__input-wrapper">
              <FiLock className="auth-form__input-icon" />
              <input
                id="signin-password"
                className={`auth-form__input${errors.password ? ' auth-form__input--error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-form__toggle-password"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && (
              <motion.span
                className="auth-form__error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <FiAlertCircle /> {errors.password}
              </motion.span>
            )}
          </div>

          {/* Forgot password */}
          <div className="auth-form__forgot">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>

          {/* Submit */}
          <button className="auth-form__submit" type="submit" disabled={loading}>
            {loading ? <span className="auth-form__spinner" /> : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <p className="auth-card__footer">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default SignIn;
