import React from 'react';

import { NODE_STATS, NodeType } from '../constants/nodeDefinitions';
import { UtilityInventory } from '../types';

interface UtilitySlotsProps {
  utilities: UtilityInventory;
  onUseUtility: (utility: keyof UtilityInventory) => void;
  targetingMode: 'none' | 'secondary_vector' | 'kernel_rot';
}

interface UtilitySlotProps {
  type: NodeType;
  utilityKey: keyof UtilityInventory;
  count: number;
  onUse: () => void;
  isTargeting: boolean;
}

const HexagonSlot: React.FC<{ isEmpty: boolean; isActive: boolean; children?: React.ReactNode }> = ({
  isEmpty,
  isActive,
  children,
}) => {
  return (
    <div className="relative w-16 h-16">
      {/* Hexagon shape using clip-path - flat-top orientation */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${isActive ? 'animate-pulse' : ''}`}
        style={{
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          background: isEmpty
            ? 'linear-gradient(180deg, rgba(30, 40, 50, 0.8) 0%, rgba(20, 30, 40, 0.9) 100%)'
            : 'linear-gradient(180deg, rgba(40, 50, 60, 0.9) 0%, rgba(30, 40, 50, 0.95) 100%)',
        }}
      />
      {/* Hexagon border - flat-top orientation */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon
          points="27,2 73,2 98,50 73,98 27,98 2,50"
          fill="none"
          stroke={isEmpty ? 'rgba(60, 80, 100, 0.6)' : 'rgba(100, 120, 140, 0.8)'}
          strokeWidth="2"
        />
        {/* Inner highlight */}
        <polygon
          points="30,8 70,8 92,50 70,92 30,92 8,50"
          fill="none"
          stroke={isEmpty ? 'rgba(40, 60, 80, 0.3)' : 'rgba(80, 100, 120, 0.4)'}
          strokeWidth="1"
        />
      </svg>
      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};

const UtilitySlot: React.FC<UtilitySlotProps> = ({ type, count, onUse, isTargeting }) => {
  const stats = NODE_STATS[type];

  if (count <= 0) {
    return <HexagonSlot isEmpty={true} isActive={false} />;
  }

  return (
    <button
      onClick={onUse}
      className={`group relative transition-transform hover:scale-105 active:scale-95 ${
        isTargeting ? 'animate-pulse' : ''
      }`}
      title={stats.description}
    >
      <HexagonSlot isEmpty={false} isActive={isTargeting}>
        <div className="flex flex-col items-center">
          {stats.iconImage && (
            <img
              src={stats.iconImage}
              alt={type}
              className="w-14 h-14 drop-shadow-lg group-hover:brightness-125 transition-all"
            />
          )}
        </div>
      </HexagonSlot>
      {/* Count badge */}
      {count > 1 && (
        <div
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            border: `1px solid ${stats.color}`,
            color: stats.color,
          }}
        >
          {count}
        </div>
      )}
    </button>
  );
};

export const UtilitySlots: React.FC<UtilitySlotsProps> = ({ utilities, onUseUtility, targetingMode }) => {
  const slots: Array<{
    type: NodeType;
    key: keyof UtilityInventory;
    count: number;
  }> = [
    { type: 'self_repair', key: 'selfRepairs', count: utilities.selfRepairs },
    { type: 'polymorphic_shield', key: 'polymorphicShields', count: utilities.polymorphicShields },
    { type: 'secondary_vector', key: 'secondaryVectors', count: utilities.secondaryVectors },
    { type: 'kernel_rot', key: 'kernelRots', count: utilities.kernelRots },
  ];

  // Show all slots that have utilities, ensuring we display at least 3 slots total
  const slotsWithItems = slots.filter(s => s.count > 0);
  const emptySlots = slots.filter(s => s.count === 0);
  const displaySlots = [...slotsWithItems, ...emptySlots].slice(0, Math.max(3, slotsWithItems.length));

  return (
    <div className="flex items-center gap-2">
      {displaySlots.map((slot, index) => (
        <UtilitySlot
          key={slot.key}
          type={slot.type}
          utilityKey={slot.key}
          count={slot.count}
          onUse={() => onUseUtility(slot.key)}
          isTargeting={
            (targetingMode === 'secondary_vector' && slot.key === 'secondaryVectors') ||
            (targetingMode === 'kernel_rot' && slot.key === 'kernelRots')
          }
        />
      ))}
      {/* Empty slots to fill to minimum 3 */}
      {displaySlots.length < 3 &&
        Array.from({ length: 3 - displaySlots.length }).map((_, i) => (
          <HexagonSlot key={`empty-${i}`} isEmpty={true} isActive={false} />
        ))}
    </div>
  );
};

export default UtilitySlots;
