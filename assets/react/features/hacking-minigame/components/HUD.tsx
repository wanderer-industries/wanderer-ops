import React from 'react';

import { TargetingMode, UtilityInventory, HealOverTime } from '../types';

import { StatusGauge } from './StatusGauge';
import { UtilitySlots } from './UtilitySlots';

interface HUDProps {
  // Attack stats
  attack: number;
  maxAttack: number;
  suppressorPenalty: number;

  // Coherence stats
  coherence: number;
  maxCoherence: number;

  // Buffs
  shieldCharges: number;
  healOverTime: HealOverTime;
  activeDoTCount: number;

  // Turn
  turnCount: number;

  // Utilities
  utilities: UtilityInventory;
  onUseUtility: (utility: keyof UtilityInventory) => void;

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
  shieldCharges,
  healOverTime,
  activeDoTCount,
  turnCount,
  utilities,
  onUseUtility,
  targetingMode,
  onCancelTargeting,
}) => {
  const effectiveAttack = Math.max(5, attack - suppressorPenalty);

  return (
    <div className="relative w-full">
      {/* Targeting Mode Banner */}
      {targetingMode !== 'none' && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-[#ff00ff]/20 border-2 border-[#ff00ff] rounded-lg animate-pulse z-10">
          <span className="text-[#ff00ff] font-mono text-sm whitespace-nowrap">
            {targetingMode === 'secondary_vector'
              ? 'SELECT TARGET for Secondary Vector'
              : 'SELECT TARGET for Kernel Rot'}
          </span>
          <button
            onClick={onCancelTargeting}
            className="px-3 py-1 bg-[#ff3366]/30 border border-[#ff3366] rounded text-[#ff3366] font-mono text-xs hover:bg-[#ff3366]/50"
          >
            CANCEL
          </button>
        </div>
      )}

      {/* Main HUD Bar */}
      <div
        className="flex items-center justify-between px-4 py-2 rounded-lg"
        style={{
          background: 'linear-gradient(180deg, rgba(20, 30, 45, 0.95) 0%, rgba(15, 25, 35, 0.98) 100%)',
          borderTop: '1px solid rgba(60, 80, 100, 0.4)',
          borderBottom: '1px solid rgba(30, 40, 50, 0.8)',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 -4px 20px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Left Section - Status Gauge */}
        <div className="flex items-center gap-4">
          <StatusGauge
            attack={effectiveAttack}
            maxAttack={maxAttack}
            coherence={coherence}
            maxCoherence={maxCoherence}
            suppressorPenalty={suppressorPenalty}
            shieldCharges={shieldCharges}
          />

          {/* Additional Status Info */}
          <div className="flex flex-col gap-1 text-xs font-mono">
            {healOverTime.turnsRemaining > 0 && (
              <div className="flex items-center gap-1 text-[#00ff88] animate-pulse">
                <span>+{healOverTime.healPerTurn}/turn</span>
                <span className="text-[#446666]">({healOverTime.turnsRemaining}t)</span>
              </div>
            )}
            {activeDoTCount > 0 && (
              <div className="flex items-center gap-1 text-[#88ff00]">
                <span>DoTs: {activeDoTCount}</span>
              </div>
            )}
            {suppressorPenalty > 0 && (
              <div className="flex items-center gap-1 text-[#9933ff]">
                <span>-{suppressorPenalty} suppressed</span>
              </div>
            )}
          </div>
        </div>

        {/* Center Section - Utility Slots */}
        <div className="flex items-center gap-4">
          <UtilitySlots utilities={utilities} onUseUtility={onUseUtility} targetingMode={targetingMode} />
        </div>

        {/* Right Section - Turn Counter & Additional Info */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center px-4">
            <span className="text-[#446666] font-mono text-xs">TURN</span>
            <span className="text-2xl font-mono text-[#88ccaa]">{turnCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HUD;
