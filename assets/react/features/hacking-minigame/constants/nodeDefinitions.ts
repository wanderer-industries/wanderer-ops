/**
 * EVE Online-style hacking node type definitions
 */

export type NodeType =
  | 'empty'
  | 'core'
  | 'firewall'
  | 'antivirus'
  | 'restoration'
  | 'suppressor'
  | 'data_cache'
  | 'self_repair'
  | 'kernel_rot'
  | 'polymorphic_shield'
  | 'secondary_vector';

export type NodeState = 'unexplored' | 'adjacent' | 'revealed' | 'explored' | 'destroyed';

export interface NodeStats {
  coherence: number;
  attack: number;
  color: string;
  glowColor: string;
  icon: string;
  iconImage: string | null;
  description: string;
  isDefensive: boolean;
  isUtility: boolean;
}

// Base path for EVE hacking icons
const ICON_BASE = '/assets/images/hacking';

export const NODE_STATS: Record<NodeType, NodeStats> = {
  empty: {
    coherence: 0,
    attack: 0,
    color: '#1a2636',
    glowColor: 'rgba(26, 38, 54, 0.5)',
    icon: '',
    iconImage: null,
    description: 'Empty node - shows distance to nearest threat',
    isDefensive: false,
    isUtility: false,
  },
  core: {
    coherence: 80,
    attack: 10,
    color: '#ff3366',
    glowColor: 'rgba(255, 51, 102, 0.6)',
    icon: 'skull',
    iconImage: `${ICON_BASE}/Core_node_medium_orange@2x.png`,
    description: 'System Core - Destroy to unlock!',
    isDefensive: true,
    isUtility: false,
  },
  firewall: {
    coherence: 70,
    attack: 20,
    color: '#0088ff',
    glowColor: 'rgba(0, 136, 255, 0.6)',
    icon: 'shield',
    iconImage: `${ICON_BASE}/Firewall_node@2x.png`,
    description: 'Firewall - High coherence, moderate attack',
    isDefensive: true,
    isUtility: false,
  },
  antivirus: {
    coherence: 50,
    attack: 40,
    color: '#ff6600',
    glowColor: 'rgba(255, 102, 0, 0.6)',
    icon: 'zap',
    iconImage: `${ICON_BASE}/Antivirus_node@2x.png`,
    description: 'Anti-Virus - Moderate coherence, HIGH attack!',
    isDefensive: true,
    isUtility: false,
  },
  restoration: {
    coherence: 80,
    attack: 10,
    color: '#00cc88',
    glowColor: 'rgba(0, 204, 136, 0.6)',
    icon: 'refresh',
    iconImage: `${ICON_BASE}/Restorer_node@2x.png`,
    description: 'Restoration Node - Heals ALL revealed defenses +10 each turn!',
    isDefensive: true,
    isUtility: false,
  },
  suppressor: {
    coherence: 60,
    attack: 10,
    color: '#9933ff',
    glowColor: 'rgba(153, 51, 255, 0.6)',
    icon: 'minus',
    iconImage: `${ICON_BASE}/Supressor_node@2x.png`,
    description: 'Virus Suppressor - Reduces attack by 10 while alive',
    isDefensive: true,
    isUtility: false,
  },
  data_cache: {
    coherence: 15,
    attack: 0,
    color: '#ffcc00',
    glowColor: 'rgba(255, 204, 0, 0.6)',
    icon: 'database',
    iconImage: `${ICON_BASE}/Data_cache2@2x.png`,
    description: 'Data Cache - May contain utility or trap',
    isDefensive: false,
    isUtility: false,
  },
  self_repair: {
    coherence: 0,
    attack: 0,
    color: '#00ff88',
    glowColor: 'rgba(0, 255, 136, 0.6)',
    icon: 'heart',
    iconImage: `${ICON_BASE}/Self_repair2@2x.png`,
    description: 'Self Repair - Heals 10 coherence per turn for 3 turns',
    isDefensive: false,
    isUtility: true,
  },
  kernel_rot: {
    coherence: 0,
    attack: 0,
    color: '#ff00ff',
    glowColor: 'rgba(255, 0, 255, 0.6)',
    icon: 'skull-crossbones',
    iconImage: `${ICON_BASE}/Kernel_rot2@2x.png`,
    description: 'Kernel Rot - Halves target coherence',
    isDefensive: false,
    isUtility: true,
  },
  polymorphic_shield: {
    coherence: 0,
    attack: 0,
    color: '#00ffff',
    glowColor: 'rgba(0, 255, 255, 0.6)',
    icon: 'shield-alt',
    iconImage: `${ICON_BASE}/Polymorphic_shield@2x.png`,
    description: 'Polymorphic Shield - Nullify next 2 attacks',
    isDefensive: false,
    isUtility: true,
  },
  secondary_vector: {
    coherence: 0,
    attack: 0,
    color: '#88ff00',
    glowColor: 'rgba(136, 255, 0, 0.6)',
    icon: 'bolt',
    iconImage: `${ICON_BASE}/Secondary_vector2@2x.png`,
    description: 'Secondary Vector - Deals 20 damage/turn for 3 turns to target',
    isDefensive: false,
    isUtility: true,
  },
};

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  gridRadius: number;
  coreCoherence: number;
  virusCoherence: number;
  virusStrength: number;
  defensiveCount: number;
  cacheCount: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    gridRadius: 2,
    coreCoherence: 50,
    virusCoherence: 100,
    virusStrength: 25,
    defensiveCount: 3,
    cacheCount: 2,
  },
  normal: {
    gridRadius: 3,
    coreCoherence: 70,
    virusCoherence: 80,
    virusStrength: 20,
    defensiveCount: 5,
    cacheCount: 3,
  },
  hard: {
    gridRadius: 4,
    coreCoherence: 80,
    virusCoherence: 60,
    virusStrength: 15,
    defensiveCount: 8,
    cacheCount: 5,
  },
};

// Colors for the UI theme (EVE-inspired)
export const THEME = {
  gridBg: '#0a0f14',
  nodeUnexplored: '#1a2636',
  nodeAdjacent: 'rgba(0, 255, 136, 0.4)',
  nodeExplored: 'rgba(255, 136, 0, 0.3)',
  nodeDestroyed: 'rgba(255, 51, 102, 0.2)',
  virusColor: '#00ff88',
  hpBarGradient: 'linear-gradient(90deg, #00ff88, #00ffcc)',
  damageFlash: '#ff3366',
  textPrimary: '#00ff88',
  textSecondary: '#88ccaa',
  textMuted: '#446666',
};
