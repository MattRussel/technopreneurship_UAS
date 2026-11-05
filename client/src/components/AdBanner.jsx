import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTag, FiCopy, FiCheck, FiX, FiChevronLeft, FiChevronRight, FiMapPin, FiCalendar, FiExternalLink } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getAdvertisements, trackAdImpression, trackAdClick } from '../utils/adService';
import Modal from './Modal';
import './AdBanner.css';

export default function AdBanner({ compact = false }) {
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAd, setSelectedAd] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getAdvertisements().then((allAds) => {
      if (isMounted) {
        const activeAds = allAds.filter((a) => a.status === 'active');
        setAds(activeAds);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Track impression when active ad changes
  useEffect(() => {
    if (ads.length > 0 && ads[currentIndex]) {
      trackAdImpression(ads[currentIndex].id);
    }
  }, [currentIndex, ads]);

  // Auto-rotate every 8 seconds if not paused
  useEffect(() => {
    if (ads.length <= 1 || isDismissed) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [ads.length, isDismissed]);

  if (ads.length === 0 || isDismissed) return null;

  const currentAd = ads[currentIndex];

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % ads.length);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + ads.length) % ads.length);
  };

  const handleOpenAd = (ad) => {
    trackAdClick(ad.id);
    setSelectedAd(ad);
    setIsCopied(false);
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    toast.success(`Promo code ${code} copied!`);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <>
      <div className={`ad-banner ${compact ? 'ad-banner--compact' : ''}`}>
        <div
          className="ad-banner__card"
          style={{ background: currentAd.bgGradient || 'linear-gradient(135deg, #1B2A4A, #2C3E6B)' }}
          onClick={() => handleOpenAd(currentAd)}
          role="button"
          tabIndex={0}
        >
          {/* Top meta tags */}
          <div className="ad-banner__meta">
            <span className="ad-sponsor-badge">
              <span className="ad-dot" /> Sponsored Promotion
            </span>
            <div className="ad-banner__controls" onClick={(e) => e.stopPropagation()}>
              <span className="ad-badge">{currentAd.badge}</span>
              <button
                className="ad-dismiss-btn"
                onClick={() => setIsDismissed(true)}
                title="Dismiss ad"
                aria-label="Dismiss ad"
              >
                <FiX size={15} />
              </button>
            </div>
          </div>

          {/* Banner Main Content */}
          <div className="ad-banner__body">
            <div className="ad-banner__icon-wrap">
              <span className="ad-banner__icon">{currentAd.icon || '🎁'}</span>
            </div>
            <div className="ad-banner__text">
              <div className="ad-banner__merchant">
                <h3>{currentAd.title}</h3>
                <span className="ad-category">{currentAd.category}</span>
              </div>
              <p className="ad-banner__tagline">{currentAd.tagline}</p>
            </div>
            <div className="ad-banner__action">
              <div className="ad-discount-pill">
                <FiTag size={13} />
                <span>{currentAd.discount}</span>
              </div>
              <button
                className="ad-claim-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAd(currentAd);
                }}
              >
                Claim Deal
              </button>
            </div>
          </div>

          {/* Carousel dots and arrows */}
          {ads.length > 1 && (
            <div className="ad-banner__nav" onClick={(e) => e.stopPropagation()}>
              <button className="ad-nav-arrow" onClick={handlePrev} aria-label="Previous ad">
                <FiChevronLeft size={16} />
              </button>
              <div className="ad-dots">
                {ads.map((_, idx) => (
                  <button
                    key={idx}
                    className={`ad-dot-item ${idx === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
              <button className="ad-nav-arrow" onClick={handleNext} aria-label="Next ad">
                <FiChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Voucher Detail Modal */}
      <Modal
        isOpen={!!selectedAd}
        onClose={() => setSelectedAd(null)}
        title="Mall Exclusive Promotion"
      >
        {selectedAd && (
          <div className="promo-modal">
            {/* Modal Header */}
            <div className="promo-modal__header">
              <div className="promo-modal__icon">{selectedAd.icon}</div>
              <div>
                <h2>{selectedAd.title}</h2>
                <span className="promo-modal__category">{selectedAd.category}</span>
              </div>
            </div>

            <p className="promo-modal__desc">{selectedAd.description}</p>

            {/* Voucher Ticket Box */}
            <div className="voucher-ticket">
              <div className="voucher-ticket__left">
                <div className="voucher-discount">{selectedAd.discount}</div>
                <div className="voucher-sub">Exclusive for SmartPark Users</div>
              </div>
              <div className="voucher-ticket__divider">
                <div className="notch notch-top" />
                <div className="dashed-line" />
                <div className="notch notch-bottom" />
              </div>
              <div className="voucher-ticket__right">
                <div className="voucher-label">Voucher Code</div>
                <div className="voucher-code">{selectedAd.promoCode}</div>
                <button
                  className="btn-copy-code"
                  onClick={() => handleCopyCode(selectedAd.promoCode)}
                >
                  {isCopied ? <><FiCheck /> Copied!</> : <><FiCopy /> Copy Code</>}
                </button>
              </div>
            </div>

            {/* Merchant Details */}
            <div className="promo-meta-list">
              <div className="promo-meta-item">
                <FiMapPin className="meta-icon" />
                <div>
                  <strong>Location:</strong>
                  <span>{selectedAd.location}</span>
                </div>
              </div>
              <div className="promo-meta-item">
                <FiCalendar className="meta-icon" />
                <div>
                  <strong>Validity:</strong>
                  <span>Until {selectedAd.validUntil}</span>
                </div>
              </div>
            </div>

            {/* How to use */}
            <div className="promo-instructions">
              <h4>💡 How to Redeem</h4>
              <ol>
                <li>Copy the voucher code above or screenshot this screen.</li>
                <li>Visit <strong>{selectedAd.title}</strong> at {selectedAd.location}.</li>
                <li>Present this code along with your active <strong>SmartPark digital pass</strong> at the cashier to claim your reward!</li>
              </ol>
            </div>

            <div className="promo-modal__footer">
              <button className="btn-done" onClick={() => setSelectedAd(null)}>
                Got It, Thanks!
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

