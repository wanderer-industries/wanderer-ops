/**
 * Node stat display components for canvas rendering
 * Each function draws coherence (top) and attack (bottom) values on the node
 */

import { NODE_STATS, NodeType } from '../constants/nodeDefinitions';
import { GameNode } from '../types';

const STAT_BOX_WIDTH = 24;
const STAT_BOX_HEIGHT = 14;
const STAT_BOX_RADIUS = 3;

interface DrawContext {
  ctx: CanvasRenderingContext2D;
  screenX: number;
  screenY: number;
  hexSize: number;
  node: GameNode;
}

/**
 * Draws a rounded rectangle for stat display
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Base function to draw coherence and attack stats on a node
 */
function drawNodeStats(context: DrawContext): void {
  const { ctx, screenX, screenY, hexSize, node } = context;
  const stats = NODE_STATS[node.type];

  // Only show stats for non-utility, non-empty nodes with coherence or attack
  if (stats.isUtility || node.type === 'empty') return;
  if (stats.coherence === 0 && stats.attack === 0) return;

  const topY = screenY - hexSize * 0.55;
  const bottomY = screenY + hexSize * 0.58;

  // Draw coherence box at top center
  if (node.coherence > 0) {
    const boxX = screenX - STAT_BOX_WIDTH / 2;
    const boxY = topY - STAT_BOX_HEIGHT / 2;

    // Draw black background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    drawRoundedRect(ctx, boxX, boxY, STAT_BOX_WIDTH, STAT_BOX_HEIGHT, STAT_BOX_RADIUS);
    ctx.fill();

    // Draw coherence value in green
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(node.coherence), screenX, topY);
  }

  // Draw attack box at bottom center (only if attack > 0)
  if (stats.attack > 0) {
    const boxX = screenX - STAT_BOX_WIDTH / 2;
    const boxY = bottomY - STAT_BOX_HEIGHT / 2;

    // Draw black background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    drawRoundedRect(ctx, boxX, boxY, STAT_BOX_WIDTH, STAT_BOX_HEIGHT, STAT_BOX_RADIUS);
    ctx.fill();

    // Draw attack value in red
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(stats.attack), screenX, bottomY);
  }
}

/**
 * Core node stat component - System Core with high coherence
 */
export function drawCoreNodeStats(context: DrawContext): void {
  drawNodeStats(context);
}

/**
 * Firewall node stat component - High coherence, moderate attack
 */
export function drawFirewallNodeStats(context: DrawContext): void {
  drawNodeStats(context);
}

/**
 * Antivirus node stat component - Moderate coherence, HIGH attack
 */
export function drawAntivirusNodeStats(context: DrawContext): void {
  drawNodeStats(context);
}

/**
 * Restoration node stat component - Heals nearby defenses
 */
export function drawRestorationNodeStats(context: DrawContext): void {
  drawNodeStats(context);
}

/**
 * Suppressor node stat component - Reduces virus attack while alive
 */
export function drawSuppressorNodeStats(context: DrawContext): void {
  drawNodeStats(context);
}

/**
 * Data cache node stat component - May contain utility or trap
 */
export function drawDataCacheNodeStats(context: DrawContext): void {
  drawNodeStats(context);
}

/**
 * Map of node types to their stat drawing functions
 */
export const nodeStatDrawers: Partial<Record<NodeType, (context: DrawContext) => void>> = {
  core: drawCoreNodeStats,
  firewall: drawFirewallNodeStats,
  antivirus: drawAntivirusNodeStats,
  restoration: drawRestorationNodeStats,
  suppressor: drawSuppressorNodeStats,
  data_cache: drawDataCacheNodeStats,
};

/**
 * Draws stats for any node type (if applicable)
 */
export function drawNodeStatsForType(
  ctx: CanvasRenderingContext2D,
  node: GameNode,
  screenX: number,
  screenY: number,
  hexSize: number,
): void {
  const drawer = nodeStatDrawers[node.type];
  if (drawer) {
    drawer({ ctx, screenX, screenY, hexSize, node });
  }
}
