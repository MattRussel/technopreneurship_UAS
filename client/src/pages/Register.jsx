import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle, FiX, FiUser } from 'react-icons/fi';
import { FaCar } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const getPasswordStrength = (pw) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: 'Weak', color: '#EF4444' };
    if (score <= 2) return { level: 2, label: 'Fair', color: '#F59E0B' };
    if (score <= 3) return { level: 3, label: 'Good', color: '#3B82F6' };
    return { level: 4, label: 'Strong', color: '#10B981' };
  };

  const strength = getPasswordStrength(form.password);

  const validate = useCallback(() => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
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
    if (!form.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password';
    } else if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match';
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
      const { error } = await signUp(form.email.trim(), form.password, form.fullName.trim());

      if (error) {
        setToast({ type: 'error', message: error.message || 'Registration failed' });
        return;
      }

      setToast({ type: 'success', message: 'Account created! Redirecting...' });
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page__bg-shape auth-page__bg-shape--top" />
      <div className="auth-page__bg-shape auth-page__bg-shape--bottom" />

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
          <p className="auth-card__subtitle">Create your account</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="auth-form__group">
            <label className="auth-form__label" htmlFor="reg-name">
              Full Name
            </label>
            <div className="auth-form__input-wrapper">
              <FiUser className="auth-form__input-icon" />
              <input
                id="reg-name"
                className={`auth-form__input${errors.fullName ? ' auth-form__input--error' : ''}`}
                type="text"
                name="fullName"
                placeholder="John Doe"
                value={form.fullName}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>
            {errors.fullName && (
              <motion.span className="auth-form__error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                <FiAlertCircle /> {errors.fullName}
              </motion.span>
            )}
          </div>

          {/* Email */}
          <div className="auth-form__group">
            <label className="auth-form__label" htmlFor="reg-email">
              Email Address
            </label>
            <div className="auth-form__input-wrapper">
              <FiMail className="auth-form__input-icon" />
              <input
                id="reg-email"
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
              <motion.span className="auth-form__error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                <FiAlertCircle /> {errors.email}
              </motion.span>
            )}
          </div>

          {/* Password */}
          <div className="auth-form__group">
            <label className="auth-form__label" htmlFor="reg-password">
              Password
            </label>
            <div className="auth-form__input-wrapper">
              <FiLock className="auth-form__input-icon" />
              <input
                id="reg-password"
                className={`auth-form__input${errors.password ? ' auth-form__input--error' : ''}`}
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
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
            {form.password && (
              <div className="auth-form__strength">
                <div className="auth-form__strength-bar">
                  {[1, 2, 3, 4].map((lvl) => (
                    <div
                      key={lvl}
                      className="auth-form__strength-segment"
                      style={{
                        background: lvl <= strength.level ? strength.color : '#E2E8F0',
                      }}
                    />
                  ))}
                </div>
                <span className="auth-form__strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
            {errors.password && (
              <motion.span className="auth-form__error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                <FiAlertCircle /> {errors.password}
              </motion.span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-form__group">
            <label className="auth-form__label" htmlFor="reg-confirm">
              Confirm Password
            </label>
            <div className="auth-form__input-wrapper">
              <FiLock className="auth-form__input-icon" />
              <input
                id="reg-confirm"
                className={`auth-form__input${errors.confirmPassword ? ' auth-form__input--error' : ''}`}
                type={showConfirm ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="auth-form__toggle-password"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.confirmPassword && (
              <motion.span className="auth-form__error" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                <FiAlertCircle /> {errors.confirmPassword}
              </motion.span>
            )}
          </div>

          <button className="auth-form__submit" type="submit" disabled={loading}>
            {loading ? <span className="auth-form__spinner" /> : 'Create Account'}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account? <Link to="/signin">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;

