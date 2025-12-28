import React from 'react';

import { HealOverTime, TargetingMode } from '../types';

import { StatusGauge } from './StatusGauge';

interface HUDProps {
  // Attack stats
  attack: number;
  maxAttack: number;
  suppressorPenalty: number;

  // Coherence stats
  coherence: number;
  maxCoherence: number;

  // Buffs
  shieldTurnsRemaining: number;
  healOverTime: HealOverTime;
  activeDoTCount: number;

  // Turn
  turnCount: number;

  // Targeting
  targetingMode: TargetingMode;
  onCancelTargeting: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  attack,
  maxAttack,
  suppressorPenalty,
  coherence,
  maxCoherence,
  shieldTurnsRemaining,
  healOverTime,
  activeDoTCount,
  turnCount,
  targetingMode,
  onCancelTargeting,
}) => {
  const effectiveAttack = Math.max(5, attack - suppressorPenalty);

  return (
    <div className="relative">
      {/* Targeting Mode Banner */}
      {targetingMode !== 'none' && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex items-center gap-3 px-3 py-1.5 bg-[#ff00ff]/20 border border-[#ff00ff] rounded-lg animate-pulse z-10">
          <span className="text-[#ff00ff] font-mono text-xs whitespace-nowrap">
            {targetingMode === 'secondary_vector'
              ? 'SELECT TARGET for Secondary Vector'
              : 'SELECT TARGET for Kernel Rot'}
          </span>
          <button
            onClick={onCancelTargeting}
            className="px-2 py-0.5 bg-[#ff3366]/30 border border-[#ff3366] rounded text-[#ff3366] font-mono text-xs hover:bg-[#ff3366]/50"
          >
            CANCEL
          </button>
        </div>
      )}

      {/* Compact horizontal layout */}
      <div className="flex items-center gap-3">
        {/* Left Section - Status Effects (compact) */}
        <div className="flex flex-col gap-1 text-xs font-mono min-w-[90px]">
          {healOverTime.turnsRemaining > 0 && (
            <div className="flex items-center gap-1 text-[#00ff88] animate-pulse">
              <HealIcon />
              <span>+{healOverTime.healPerTurn}/t</span>
              <span className="text-[#446666] text-[10px]">({healOverTime.turnsRemaining})</span>
            </div>
          )}
          {activeDoTCount > 0 && (
            <div className="flex items-center gap-1 text-[#88ff00]">
              <DoTIcon />
              <span>DoT: {activeDoTCount}</span>
            </div>
          )}
          {suppressorPenalty > 0 && (
            <div className="flex items-center gap-1 text-[#9933ff]">
              <SuppressIcon />
              <span>-{suppressorPenalty}</span>
            </div>
          )}
          {/* Turn counter integrated into left side */}
          <div className="flex items-center gap-1 text-slate-400 mt-1">
            <span className="text-[10px] uppercase">Turn</span>
            <span className="text-amber-300 font-bold">{turnCount}</span>
          </div>
        </div>

        {/* Center - Compact Status Gauge */}
        <StatusGauge
          attack={effectiveAttack}
          maxAttack={maxAttack}
          coherence={coherence}
          maxCoherence={maxCoherence}
          suppressorPenalty={suppressorPenalty}
          shieldTurnsRemaining={shieldTurnsRemaining}
        />

        {/* Right Section - Spacer for symmetry */}
        <div className="min-w-[90px]" />
      </div>
    </div>
  );
};

// Small icon components for status effects
const HealIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const DoTIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 1.5" />
  </svg>
);

const SuppressIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export default HUD;
