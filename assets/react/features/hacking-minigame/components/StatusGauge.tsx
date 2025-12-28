import React from 'react';

interface StatusGaugeProps {
  attack: number;
  maxAttack: number;
  coherence: number;
  maxCoherence: number;
  suppressorPenalty?: number;
  shieldTurnsRemaining?: number;
}

export const StatusGauge: React.FC<StatusGaugeProps> = ({
  attack,
  maxAttack,
  coherence,
  maxCoherence,
  suppressorPenalty = 0,
  shieldTurnsRemaining = 0,
}) => {
  const attackPercent = Math.min(attack / maxAttack, 1);
  const coherencePercent = Math.min(coherence / maxCoherence, 1);
  const isSuppressed = suppressorPenalty > 0;

  // Circular HUD dimensions
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
        <defs>
          {/* Center fill gradient - dark top to red bottom */}
          <linearGradient id="centerFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#2a1515" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4a1515" stopOpacity="0.85" />
          </linearGradient>

          {/* Outer frame gradient */}
          <linearGradient id="outerFrameGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="50%" stopColor="#252525" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>

          {/* Vignette for outer ring */}
          <radialGradient id="vignetteGradient" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.4)" />
          </radialGradient>
        </defs>

        {/* Outer dark frame ring */}
        <circle cx={cx} cy={cy} r={85} fill="url(#outerFrameGradient)" />

        {/* Inner frame border */}
        <circle cx={cx} cy={cy} r={78} fill="none" stroke="#0f0f0f" strokeWidth="3" />

        {/* Center fill - horizontal band */}
        <ellipse cx={cx} cy={cy} rx={72} ry={40} fill="url(#centerFillGradient)" />

        {/* Left gauge segments (Attack) - angle 210° to 330° */}
        <SegmentedArcGauge
          cx={cx}
          cy={cy}
          radius={72}
          startAngle={210}
          endAngle={330}
          percent={attackPercent}
          baseColor={isSuppressed ? '#6b21a8' : '#92400e'}
          activeColor={isSuppressed ? '#a855f7' : '#d97706'}
          segmentCount={12}
          segmentThickness={8}
          segmentGap={3}
        />

        {/* Right gauge segments (Coherence) - angle 30° to 150° */}
        <SegmentedArcGauge
          cx={cx}
          cy={cy}
          radius={72}
          startAngle={30}
          endAngle={150}
          percent={coherencePercent}
          baseColor="#7f1d1d"
          activeColor="#dc2626"
          segmentCount={12}
          segmentThickness={8}
          segmentGap={3}
        />

        {/* Center particle effect */}
        <g transform={`translate(${cx}, ${cy})`}>
          <ParticleEffect />
        </g>

        {/* Shield indicator */}
        {shieldTurnsRemaining > 0 && (
          <g transform={`translate(${cx}, ${cy - 32})`}>
            <ShieldIndicator turns={shieldTurnsRemaining} />
          </g>
        )}

        {/* Vignette overlay */}
        <circle cx={cx} cy={cy} r={85} fill="url(#vignetteGradient)" />

        {/* Horizontal tick marks near top value */}
        <line x1={cx - 35} y1={22} x2={cx - 25} y2={22} stroke="#555" strokeWidth="1" />
        <line x1={cx + 25} y1={22} x2={cx + 35} y2={22} stroke="#555" strokeWidth="1" />
      </svg>

      {/* Top Value - Attack (pale yellow, lighter weight) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 font-mono flex items-center gap-0.5 ${
          isSuppressed ? 'text-purple-300' : 'text-amber-200'
        }`}
        style={{ top: '12px', fontSize: '14px', fontWeight: 400 }}
      >
        <span style={{ fontSize: '11px', opacity: 0.7 }}>*</span>
        <span>{attack}</span>
      </div>

      {/* Bottom Value - Coherence with red chevron */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 font-mono" style={{ bottom: '12px' }}>
        <ChevronIcon />
        <span
          className={`${
            coherencePercent > 0.5
              ? 'text-slate-200'
              : coherencePercent > 0.25
                ? 'text-amber-200'
                : 'text-red-400 animate-pulse'
          }`}
          style={{ fontSize: '14px', fontWeight: 400 }}
        >
          {coherence}
        </span>
      </div>
    </div>
  );
};

// Segmented arc gauge component
const SegmentedArcGauge: React.FC<{
  cx: number;
  cy: number;
  radius: number;
  startAngle: number;
  endAngle: number;
  percent: number;
  baseColor: string;
  activeColor: string;
  segmentCount: number;
  segmentThickness: number;
  segmentGap: number;
}> = ({
  cx,
  cy,
  radius,
  startAngle,
  endAngle,
  percent,
  baseColor,
  activeColor,
  segmentCount,
  segmentThickness,
  segmentGap,
}) => {
  const totalAngle = endAngle - startAngle;
  const segmentAngle = (totalAngle - segmentGap * (segmentCount - 1)) / segmentCount;
  const activeSegments = Math.ceil(percent * segmentCount);

  const segments = [];

  for (let i = 0; i < segmentCount; i++) {
    const segStart = startAngle + i * (segmentAngle + segmentGap);
    const segEnd = segStart + segmentAngle;
    const isActive = i < activeSegments;

    // Convert to radians
    const startRad = (segStart * Math.PI) / 180;
    const endRad = (segEnd * Math.PI) / 180;

    // Calculate arc path
    const innerRadius = radius - segmentThickness;
    const outerRadius = radius;

    const x1Outer = cx + outerRadius * Math.cos(startRad);
    const y1Outer = cy + outerRadius * Math.sin(startRad);
    const x2Outer = cx + outerRadius * Math.cos(endRad);
    const y2Outer = cy + outerRadius * Math.sin(endRad);

    const x1Inner = cx + innerRadius * Math.cos(endRad);
    const y1Inner = cy + innerRadius * Math.sin(endRad);
    const x2Inner = cx + innerRadius * Math.cos(startRad);
    const y2Inner = cy + innerRadius * Math.sin(startRad);

    const largeArc = segmentAngle > 180 ? 1 : 0;

    const pathD = `
      M ${x1Outer} ${y1Outer}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}
      L ${x1Inner} ${y1Inner}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}
      Z
    `;

    segments.push(<path key={i} d={pathD} fill={isActive ? activeColor : baseColor} opacity={isActive ? 0.9 : 0.3} />);
  }

  return <g>{segments}</g>;
};

// Animated particle effect for alien communication
const ParticleEffect: React.FC = () => {
  // Generate particles with different properties
  const particles = [
    // Core particles - center cluster
    { cx: 0, cy: 0, r: 2.5, delay: 0, duration: 2.2, type: 'core' },
    { cx: -3, cy: -2, r: 1.8, delay: 0.3, duration: 1.8, type: 'core' },
    { cx: 3, cy: 2, r: 1.8, delay: 0.6, duration: 2.0, type: 'core' },
    { cx: -2, cy: 3, r: 1.5, delay: 0.4, duration: 1.9, type: 'core' },
    { cx: 2, cy: -3, r: 1.5, delay: 0.7, duration: 2.1, type: 'core' },
    // Inner ring particles
    { cx: -8, cy: 0, r: 1.8, delay: 0.1, duration: 2.5, type: 'orbit' },
    { cx: 8, cy: 0, r: 1.8, delay: 0.4, duration: 2.3, type: 'orbit' },
    { cx: 0, cy: -8, r: 1.6, delay: 0.2, duration: 2.4, type: 'orbit' },
    { cx: 0, cy: 8, r: 1.6, delay: 0.5, duration: 2.2, type: 'orbit' },
    { cx: -6, cy: -6, r: 1.4, delay: 0.3, duration: 2.6, type: 'orbit' },
    { cx: 6, cy: 6, r: 1.4, delay: 0.6, duration: 2.1, type: 'orbit' },
    { cx: -6, cy: 6, r: 1.3, delay: 0.8, duration: 2.3, type: 'orbit' },
    { cx: 6, cy: -6, r: 1.3, delay: 0.2, duration: 2.5, type: 'orbit' },
    // Outer floating particles
    { cx: -12, cy: -4, r: 1.2, delay: 0.1, duration: 3.0, type: 'float' },
    { cx: 12, cy: 4, r: 1.2, delay: 0.5, duration: 2.8, type: 'float' },
    { cx: -10, cy: 8, r: 1.0, delay: 0.3, duration: 3.2, type: 'float' },
    { cx: 10, cy: -8, r: 1.0, delay: 0.7, duration: 2.9, type: 'float' },
    { cx: -4, cy: -12, r: 1.1, delay: 0.4, duration: 3.1, type: 'float' },
    { cx: 4, cy: 12, r: 1.1, delay: 0.9, duration: 2.7, type: 'float' },
    // Tiny sparkle particles
    { cx: -15, cy: 0, r: 0.8, delay: 0.2, duration: 2.0, type: 'spark' },
    { cx: 15, cy: 0, r: 0.8, delay: 0.6, duration: 1.8, type: 'spark' },
    { cx: 0, cy: -14, r: 0.7, delay: 0.4, duration: 2.2, type: 'spark' },
    { cx: 0, cy: 14, r: 0.7, delay: 0.8, duration: 1.9, type: 'spark' },
  ];

  return (
    <g>
      {/* Particle elements */}
      {particles.map((p, i) => (
        <circle
          key={i}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          fill="#d4d4d4"
          className={`particle-${p.type}`}
          style={{
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}

      {/* Connection lines between some particles */}
      <g className="particle-connections" stroke="#d4d4d4" strokeWidth="0.5" opacity="0.3">
        <line x1="-8" y1="0" x2="0" y2="0" />
        <line x1="0" y1="0" x2="8" y2="0" />
        <line x1="0" y1="-8" x2="0" y2="0" />
        <line x1="0" y1="0" x2="0" y2="8" />
      </g>

      {/* Animation styles */}
      <style>{`
        @keyframes particlePulseCore {
          0%, 100% {
            opacity: 0.9;
            transform: scale(1);
          }
          25% {
            opacity: 1;
            transform: scale(1.4);
          }
          50% {
            opacity: 0.6;
            transform: scale(0.8);
          }
          75% {
            opacity: 0.95;
            transform: scale(1.2);
          }
        }

        @keyframes particleOrbit {
          0%, 100% {
            opacity: 0.7;
            transform: translate(0, 0) scale(1);
          }
          25% {
            opacity: 1;
            transform: translate(2px, -2px) scale(1.3);
          }
          50% {
            opacity: 0.4;
            transform: translate(-1px, 1px) scale(0.7);
          }
          75% {
            opacity: 0.85;
            transform: translate(1px, 2px) scale(1.1);
          }
        }

        @keyframes particleFloat {
          0%, 100% {
            opacity: 0.5;
            transform: translate(0, 0) scale(1);
          }
          20% {
            opacity: 0.9;
            transform: translate(-3px, 2px) scale(1.5);
          }
          40% {
            opacity: 0.3;
            transform: translate(2px, -3px) scale(0.6);
          }
          60% {
            opacity: 0.8;
            transform: translate(-1px, -2px) scale(1.3);
          }
          80% {
            opacity: 0.4;
            transform: translate(3px, 1px) scale(0.8);
          }
        }

        @keyframes particleSpark {
          0%, 100% {
            opacity: 0.3;
            transform: scale(0.5);
          }
          15% {
            opacity: 1;
            transform: scale(2);
          }
          30% {
            opacity: 0.1;
            transform: scale(0.3);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.5);
          }
          70% {
            opacity: 0.2;
            transform: scale(0.4);
          }
          85% {
            opacity: 0.9;
            transform: scale(1.8);
          }
        }

        @keyframes connectionPulse {
          0%, 100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.5;
          }
        }

        .particle-core {
          animation: particlePulseCore ease-in-out infinite;
          transform-origin: center;
        }

        .particle-orbit {
          animation: particleOrbit ease-in-out infinite;
          transform-origin: center;
        }

        .particle-float {
          animation: particleFloat ease-in-out infinite;
          transform-origin: center;
        }

        .particle-spark {
          animation: particleSpark ease-in-out infinite;
          transform-origin: center;
        }

        .particle-connections {
          animation: connectionPulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </g>
  );
};

// Simple red chevron icon for coherence
const ChevronIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-red-500">
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Shield indicator
const ShieldIndicator: React.FC<{ turns: number }> = ({ turns }) => (
  <g>
    <path
      d="M 0 -8 L -7 -4 L -7 3 L 0 8 L 7 3 L 7 -4 Z"
      fill="rgba(34, 211, 238, 0.2)"
      stroke="rgb(34, 211, 238)"
      strokeWidth="1.5"
    />
    <text
      x="0"
      y="2"
      textAnchor="middle"
      fill="rgb(34, 211, 238)"
      fontSize="8"
      fontWeight="bold"
      fontFamily="monospace"
    >
      {turns}
    </text>
  </g>
);

export default StatusGauge;
