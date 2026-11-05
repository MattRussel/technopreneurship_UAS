import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowRight, FiChevronRight } from 'react-icons/fi';
import './Onboarding.css';

/* ------------------------------------------------------------------ */
/*  Inline SVG Illustrations                                          */
/* ------------------------------------------------------------------ */

const ParkingIllustration = () => (
  <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Ground */}
    <rect x="20" y="180" width="200" height="6" rx="3" fill="rgba(255,255,255,0.15)" />
    {/* Parking lines */}
    <rect x="50" y="150" width="4" height="30" rx="2" fill="rgba(255,255,255,0.25)" />
    <rect x="100" y="150" width="4" height="30" rx="2" fill="rgba(255,255,255,0.25)" />
    <rect x="150" y="150" width="4" height="30" rx="2" fill="rgba(255,255,255,0.25)" />
    <rect x="200" y="150" width="4" height="30" rx="2" fill="rgba(255,255,255,0.25)" />
    {/* Car body */}
    <rect x="65" y="128" width="60" height="28" rx="6" fill="#FFFFFF" />
    <path d="M72 128 L78 110 Q80 106 84 106 L106 106 Q110 106 112 110 L118 128" fill="rgba(255,255,255,0.85)" stroke="#FFFFFF" strokeWidth="2" />
    {/* Windows */}
    <path d="M80 126 L84 112 Q85 110 87 110 L95 110 L95 126 Z" fill="rgba(27,42,74,0.6)" />
    <path d="M97 126 L97 110 L103 110 Q105 110 106 112 L110 126 Z" fill="rgba(27,42,74,0.6)" />
    {/* Wheels */}
    <circle cx="80" cy="158" r="9" fill="rgba(255,255,255,0.9)" />
    <circle cx="80" cy="158" r="4" fill="rgba(27,42,74,0.5)" />
    <circle cx="112" cy="158" r="9" fill="rgba(255,255,255,0.9)" />
    <circle cx="112" cy="158" r="4" fill="rgba(27,42,74,0.5)" />
    {/* Headlights */}
    <rect x="63" y="136" width="6" height="4" rx="2" fill="#FFD700" opacity="0.8" />
    <rect x="121" y="136" width="6" height="4" rx="2" fill="#FF4444" opacity="0.6" />
    {/* P Sign */}
    <rect x="155" y="70" width="50" height="60" rx="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
    <text x="180" y="112" textAnchor="middle" fill="#FFFFFF" fontSize="36" fontWeight="800" fontFamily="Arial, sans-serif">P</text>
    {/* Signal waves from P sign */}
    <path d="M210 85 Q220 90 210 100" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M216 80 Q230 90 216 105" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Location pin */}
    <path d="M95 50 C95 35 75 35 75 50 C75 60 85 70 85 70 C85 70 95 60 95 50Z" fill="rgba(59,130,246,0.8)" />
    <circle cx="85" cy="49" r="5" fill="#FFFFFF" />
    {/* Stars / sparkles */}
    <circle cx="40" cy="60" r="2" fill="rgba(255,255,255,0.4)" />
    <circle cx="190" cy="45" r="2.5" fill="rgba(255,255,255,0.3)" />
    <circle cx="155" cy="55" r="1.5" fill="rgba(255,255,255,0.35)" />
  </svg>
);

const SensorIllustration = () => (
  <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Dashboard screen */}
    <rect x="30" y="50" width="180" height="120" rx="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
    {/* Screen inner */}
    <rect x="40" y="60" width="160" height="100" rx="8" fill="rgba(255,255,255,0.05)" />
    {/* Grid of parking spots */}
    {/* Row 1 - available */}
    <rect x="52" y="72" width="30" height="18" rx="3" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.8)" strokeWidth="1.5" />
    <rect x="88" y="72" width="30" height="18" rx="3" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.8)" strokeWidth="1.5" />
    <rect x="124" y="72" width="30" height="18" rx="3" fill="rgba(239,68,68,0.5)" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5" />
    <rect x="160" y="72" width="30" height="18" rx="3" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.8)" strokeWidth="1.5" />
    {/* Row 2 */}
    <rect x="52" y="98" width="30" height="18" rx="3" fill="rgba(239,68,68,0.5)" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5" />
    <rect x="88" y="98" width="30" height="18" rx="3" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.8)" strokeWidth="1.5" />
    <rect x="124" y="98" width="30" height="18" rx="3" fill="rgba(239,68,68,0.5)" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5" />
    <rect x="160" y="98" width="30" height="18" rx="3" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.8)" strokeWidth="1.5" />
    {/* Row 3 */}
    <rect x="52" y="124" width="30" height="18" rx="3" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.8)" strokeWidth="1.5" />
    <rect x="88" y="124" width="30" height="18" rx="3" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.8)" strokeWidth="1.5" />
    <rect x="124" y="124" width="30" height="18" rx="3" fill="rgba(34,197,94,0.6)" stroke="rgba(34,197,94,0.8)" strokeWidth="1.5" />
    <rect x="160" y="124" width="30" height="18" rx="3" fill="rgba(239,68,68,0.5)" stroke="rgba(239,68,68,0.7)" strokeWidth="1.5" />
    {/* Checkmarks in available */}
    <path d="M63 79 L66 83 L73 77" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M99 79 L102 83 L109 77" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* X in occupied */}
    <path d="M131 76 L147 86 M147 76 L131 86" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
    {/* Sensor waves on top */}
    <path d="M100 42 Q110 32 120 42" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M92 36 Q110 22 128 36" stroke="rgba(255,255,255,0.2)" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M84 30 Q110 12 136 30" stroke="rgba(255,255,255,0.12)" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* IoT sensor dot */}
    <circle cx="110" cy="46" r="4" fill="rgba(59,130,246,0.9)" />
    <circle cx="110" cy="46" r="2" fill="#FFFFFF" />
    {/* Stats bar bottom */}
    <rect x="50" y="180" width="40" height="6" rx="3" fill="rgba(34,197,94,0.6)" />
    <text x="50" y="198" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="Arial, sans-serif">Available</text>
    <rect x="110" y="180" width="25" height="6" rx="3" fill="rgba(239,68,68,0.5)" />
    <text x="110" y="198" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="Arial, sans-serif">Occupied</text>
    {/* Live dot */}
    <circle cx="190" cy="183" r="4" fill="#22C55E" />
    <text x="178" y="198" fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="Arial, sans-serif">LIVE</text>
  </svg>
);

const ReserveIllustration = () => (
  <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Phone outline */}
    <rect x="70" y="30" width="100" height="180" rx="16" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" />
    {/* Screen */}
    <rect x="78" y="50" width="84" height="140" rx="4" fill="rgba(255,255,255,0.05)" />
    {/* Notch */}
    <rect x="100" y="36" width="40" height="6" rx="3" fill="rgba(255,255,255,0.2)" />
    {/* Ticket/card on screen */}
    <rect x="86" y="62" width="68" height="80" rx="8" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
    {/* Dashed line on ticket */}
    <line x1="86" y1="110" x2="154" y2="110" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="4 3" />
    {/* Ticket content */}
    <text x="120" y="80" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="9" fontWeight="600" fontFamily="Arial, sans-serif">PARKING PASS</text>
    <rect x="96" y="86" width="48" height="4" rx="2" fill="rgba(255,255,255,0.2)" />
    <rect x="104" y="94" width="32" height="4" rx="2" fill="rgba(255,255,255,0.15)" />
    {/* QR code placeholder */}
    <rect x="106" y="116" width="28" height="28" rx="2" fill="rgba(255,255,255,0.2)" />
    <rect x="110" y="120" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="116" y="120" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="122" y="120" width="4" height="4" fill="rgba(255,255,255,0.15)" />
    <rect x="128" y="120" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="110" y="126" width="4" height="4" fill="rgba(255,255,255,0.15)" />
    <rect x="116" y="126" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="122" y="126" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="128" y="126" width="4" height="4" fill="rgba(255,255,255,0.15)" />
    <rect x="110" y="132" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="116" y="132" width="4" height="4" fill="rgba(255,255,255,0.15)" />
    <rect x="122" y="132" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="128" y="132" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="110" y="138" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="116" y="138" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    <rect x="122" y="138" width="4" height="4" fill="rgba(255,255,255,0.15)" />
    <rect x="128" y="138" width="4" height="4" fill="rgba(255,255,255,0.4)" />
    {/* Confirm button on phone */}
    <rect x="90" y="152" width="60" height="20" rx="10" fill="rgba(34,197,94,0.7)" />
    <text x="120" y="166" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="700" fontFamily="Arial, sans-serif">RESERVED</text>
    {/* Big Checkmark circle */}
    <circle cx="175" cy="60" r="26" fill="rgba(34,197,94,0.8)" />
    <path d="M163 60 L172 69 L188 52" stroke="#FFFFFF" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* Sparkles around checkmark */}
    <circle cx="205" cy="45" r="2.5" fill="rgba(255,255,255,0.4)" />
    <circle cx="198" cy="88" r="2" fill="rgba(255,255,255,0.3)" />
    <circle cx="155" cy="38" r="2" fill="rgba(255,255,255,0.35)" />
    {/* Small stars */}
    <path d="M50 80 L52 76 L54 80 L50 80Z" fill="rgba(255,255,255,0.25)" />
    <path d="M42 130 L44 126 L46 130 L42 130Z" fill="rgba(255,255,255,0.2)" />
    <path d="M190 160 L192 156 L194 160 L190 160Z" fill="rgba(255,255,255,0.2)" />
    {/* Clock */}
    <circle cx="50" cy="170" r="16" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
    <line x1="50" y1="170" x2="50" y2="160" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" />
    <line x1="50" y1="170" x2="58" y2="174" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" />
    <circle cx="50" cy="170" r="2" fill="rgba(255,255,255,0.5)" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Slide Data                                                        */
/* ------------------------------------------------------------------ */

const slides = [
  {
    id: 'welcome',
    title: 'Welcome to SmartPark Mall',
    description: 'Find your perfect parking spot in seconds. No more circling the lot — smart parking starts here.',
    Illustration: ParkingIllustration,
  },
  {
    id: 'realtime',
    title: 'Real-Time Availability',
    description: 'See exactly which spots are open in real-time, powered by IoT sensors throughout the parking facility.',
    Illustration: SensorIllustration,
  },
  {
    id: 'reserve',
    title: 'Reserve & Go',
    description: 'Book your spot before you even arrive. Get a digital parking pass and drive straight in — hassle-free.',
    Illustration: ReserveIllustration,
  },
];

/* ------------------------------------------------------------------ */
/*  Animation variants                                                */
/* ------------------------------------------------------------------ */

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
    scale: 0.92,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
    scale: 0.92,
  }),
};

const transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

/* ------------------------------------------------------------------ */
/*  Onboarding Component                                              */
/* ------------------------------------------------------------------ */

const Onboarding = () => {
  const navigate = useNavigate();
  const [[page, direction], setPage] = useState([0, 0]);

  const paginate = useCallback(
    (newDirection) => {
      const nextPage = page + newDirection;
      if (nextPage >= 0 && nextPage < slides.length) {
        setPage([nextPage, newDirection]);
      }
    },
    [page]
  );

  const handleFinish = useCallback(() => {
    localStorage.setItem('smartpark_onboarding_seen', 'true');
    navigate('/signin');
  }, [navigate]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('smartpark_onboarding_seen', 'true');
    navigate('/signin');
  }, [navigate]);

  const isLast = page === slides.length - 1;
  const current = slides[page];

  return (
    <div className="onboarding">
      {/* Decorative background circles */}
      <div className="onboarding__bg-circles">
        <div className="onboarding__bg-circle" />
        <div className="onboarding__bg-circle" />
        <div className="onboarding__bg-circle" />
      </div>

      {/* Main slide content */}
      <div className="onboarding__content">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current.id}
            className="onboarding__slide"
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={transition}
          >
            <motion.div
              className="onboarding__illustration"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <current.Illustration />
            </motion.div>

            <motion.h1
              className="onboarding__title"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
            >
              {current.title}
            </motion.h1>

            <motion.p
              className="onboarding__description"
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              {current.description}
            </motion.p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="onboarding__controls">
        {/* Dots */}
        <div className="onboarding__dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`onboarding__dot${i === page ? ' onboarding__dot--active' : ''}`}
              onClick={() => setPage([i, i > page ? 1 : -1])}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>

        {/* Actions */}
        {isLast ? (
          <motion.button
            className="onboarding__getstarted-btn"
            onClick={handleFinish}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Get Started
            <FiArrowRight />
          </motion.button>
        ) : (
          <div className="onboarding__actions">
            <button className="onboarding__skip" onClick={handleSkip}>
              Skip
            </button>
            <motion.button
              className="onboarding__next-btn"
              onClick={() => paginate(1)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Next
              <FiChevronRight />
            </motion.button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
