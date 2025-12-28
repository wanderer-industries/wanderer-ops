import { HexCoord } from './utils/hexMath';
import { NodeType, NodeState, Difficulty } from './constants/nodeDefinitions';

export interface GameNode {
  id: string;
  q: number;
  r: number;
  s: number;
  type: NodeType;
  state: NodeState;
  coherence: number;
  maxCoherence: number;
  distanceHint?: number;
  revealedType?: NodeType; // For data caches when opened
}

export interface UtilityInventory {
  selfRepairs: number;
  kernelRots: number;
  polymorphicShields: number;
  secondaryVectors: number;
}

export interface ActiveBuffs {
  shieldCharges: number; // Polymorphic shield charges remaining
}

export interface HealOverTime {
  turnsRemaining: number;
  healPerTurn: number;
}

export interface DamageOverTime {
  turnsRemaining: number;
  damagePerTurn: number;
}

export type TargetingMode = 'none' | 'secondary_vector' | 'kernel_rot';

export type GamePhase = 'intro' | 'playing' | 'won' | 'lost';

export interface GameState {
  phase: GamePhase;
  virusCoherence: number;
  maxVirusCoherence: number;
  virusStrength: number;
  baseVirusStrength: number;
  turnCount: number;
  nodes: Map<string, GameNode>;
  corePosition: HexCoord;
  startPosition: HexCoord;
  utilities: UtilityInventory;
  buffs: ActiveBuffs;
  healOverTime: HealOverTime; // Self-Repair HoT
  activeDoTs: Record<string, DamageOverTime>; // Secondary Vector DoTs on nodes
  targetingMode: TargetingMode; // Current targeting state
  difficulty: Difficulty;
  combatLog: string[];
  lastAction?: string;
}

export interface CombatResult {
  virusDamage: number;
  nodeDamage: number;
  nodeDestroyed: boolean;
  virusDestroyed: boolean;
  log: string[];
  lootedUtility?: NodeType;
}

export interface HackingMinigameProps {
  difficulty: Difficulty;
  seed: string;
  onComplete: () => void;
}
