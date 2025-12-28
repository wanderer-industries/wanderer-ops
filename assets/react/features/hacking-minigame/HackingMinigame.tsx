import React, { useCallback, useEffect, useRef, useState } from 'react';

import { HUD } from './components/HUD';
import { drawNodeStatsForType } from './components/nodeStats';
import { Difficulty, DIFFICULTY_CONFIG, NODE_STATS, NodeType, THEME } from './constants/nodeDefinitions';
import { useGameState } from './hooks/useGameState';
import { GameNode, GameState } from './types';
import { getHexCorners, hexToPixel } from './utils/hexMath';

interface HackingMinigameProps {
  difficulty: string;
  seed: string;
  pushEvent: (event: string, payload: object) => void;
}

const HEX_SIZE = 40;
const CANVAS_PADDING = 80;

// Preload all node icons
function useIconImages(): Map<NodeType, HTMLImageElement> {
  const [images, setImages] = useState<Map<NodeType, HTMLImageElement>>(new Map());

  useEffect(() => {
    const loadImages = async () => {
      const imageMap = new Map<NodeType, HTMLImageElement>();
      const nodeTypes = Object.keys(NODE_STATS) as NodeType[];

      await Promise.all(
        nodeTypes.map(
          nodeType =>
            new Promise<void>(resolve => {
              const stats = NODE_STATS[nodeType];
              if (stats.iconImage) {
                const img = new Image();
                img.onload = () => {
                  imageMap.set(nodeType, img);
                  resolve();
                };
                img.onerror = () => {
                  resolve(); // Don't block on error
                };
                img.src = stats.iconImage;
              } else {
                resolve();
              }
            }),
        ),
      );

      setImages(imageMap);
    };

    loadImages();
  }, []);

  return images;
}

export const HackingMinigame: React.FC<HackingMinigameProps> = ({ difficulty, seed, pushEvent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const difficultyTyped = (difficulty as Difficulty) || 'normal';
  const iconImages = useIconImages();

  const { gameState, startGame, resetGame, clickNode, useUtility, cancelTargeting } = useGameState(
    seed,
    difficultyTyped,
  );

  // Calculate canvas size based on grid
  const config = DIFFICULTY_CONFIG[difficultyTyped];
  const gridPixelRadius = HEX_SIZE * config.gridRadius * 2 + HEX_SIZE;
  const canvasSize = gridPixelRadius * 2 + CANVAS_PADDING * 2;
  const centerOffset = canvasSize / 2;

  // Handle win
  useEffect(() => {
    if (gameState.phase === 'won') {
      const timer = setTimeout(() => {
        pushEvent('minigame_completed', {});
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, pushEvent]);

  // Draw the hex grid
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = THEME.gridBg;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw each hex
    gameState.nodes.forEach(node => {
      drawHex(ctx, node, centerOffset, gameState, iconImages);
    });
  }, [gameState, centerOffset, canvasSize, iconImages]);

  // Handle canvas click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (gameState.phase !== 'playing') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      // Account for CSS scaling - canvas may be displayed smaller than its actual size
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX - centerOffset;
      const y = (e.clientY - rect.top) * scaleY - centerOffset;

      // Find clicked hex
      let clickedNode: GameNode | null = null;
      let minDist = Infinity;

      gameState.nodes.forEach(node => {
        const pixel = hexToPixel(node, HEX_SIZE);
        const dist = Math.sqrt((x - pixel.x) ** 2 + (y - pixel.y) ** 2);
        if (dist < HEX_SIZE * 0.9 && dist < minDist) {
          minDist = dist;
          clickedNode = node;
        }
      });

      if (clickedNode) {
        // In targeting mode, only allow clicking revealed defensive nodes
        if (gameState.targetingMode !== 'none') {
          if (clickedNode.state === 'revealed' && NODE_STATS[clickedNode.type].isDefensive) {
            clickNode(clickedNode.id);
          }
        } else if (clickedNode.state === 'adjacent' || clickedNode.state === 'revealed') {
          // Normal mode - click adjacent (to reveal) or revealed (to attack)
          clickNode(clickedNode.id);
        }
      }
    },
    [gameState, centerOffset, clickNode],
  );

  // Calculate effective strength with suppressor penalty
  // Only count suppressors that have been revealed (not just adjacent/hidden)
  const activeSuppressors = Array.from(gameState.nodes.values()).filter(
    n => n.type === 'suppressor' && n.state === 'revealed',
  ).length;
  const suppressorPenalty = activeSuppressors * 10;
  const effectiveStrength = Math.max(5, gameState.baseVirusStrength - suppressorPenalty);

  return (
    <div className="flex items-center justify-center min-h-full bg-[#0a0f14] overflow-auto py-4">
      <div className="flex flex-col items-center gap-4 p-4 max-w-4xl w-full">
        {/* Intro Overlay */}
        {gameState.phase === 'intro' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
            <div className="text-center p-8 max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 text-[#00ff88] animate-pulse">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-mono text-[#00ff88] mb-3">INITIALIZE HACK</h2>
              <p className="text-[#88ccaa] font-mono text-sm mb-2">
                Difficulty: <span className="text-[#00ff88] uppercase">{difficultyTyped}</span>
              </p>
              <p className="text-[#446666] font-mono text-sm mb-6">
                Navigate the grid. Destroy the System Core. <br />
                Click green nodes to explore. Avoid or defeat defenses.
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-[#00ff88]/20 border-2 border-[#00ff88] rounded text-[#00ff88] font-mono text-lg hover:bg-[#00ff88]/30 transition-colors"
              >
                BEGIN HACK
              </button>
            </div>
          </div>
        )}

        {/* Win Overlay */}
        {gameState.phase === 'won' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
            <div className="text-center p-8">
              <div className="w-24 h-24 mx-auto mb-6 text-[#00ff88] animate-bounce">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <h2 className="text-4xl font-mono text-[#00ff88] mb-3">ACCESS GRANTED</h2>
              <p className="text-[#88ccaa] font-mono text-sm">System Core destroyed. Decrypting data...</p>
            </div>
          </div>
        )}

        {/* Lose Overlay */}
        {gameState.phase === 'lost' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80">
            <div className="text-center p-8">
              <div className="w-24 h-24 mx-auto mb-6 text-[#ff3366]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <h2 className="text-4xl font-mono text-[#ff3366] mb-3">HACK FAILED</h2>
              <p className="text-[#aa6666] font-mono text-sm mb-6">Virus coherence depleted. Connection lost.</p>
              <button
                onClick={resetGame}
                className="px-8 py-3 bg-[#ff3366]/20 border-2 border-[#ff3366] rounded text-[#ff3366] font-mono text-lg hover:bg-[#ff3366]/30 transition-colors"
              >
                RETRY
              </button>
            </div>
          </div>
        )}

        {/* Hex Grid Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          onClick={handleCanvasClick}
          className="cursor-pointer border border-[#00ff88]/20 rounded-lg"
          style={{ maxWidth: '100%', maxHeight: '60vh', width: 'auto', height: 'auto', objectFit: 'contain' }}
        />

        {/* HUD - Bottom Panel */}
        <div className="w-full max-w-3xl mt-4">
          <HUD
            attack={gameState.baseVirusStrength}
            maxAttack={50}
            suppressorPenalty={suppressorPenalty}
            coherence={gameState.virusCoherence}
            maxCoherence={gameState.maxVirusCoherence}
            shieldCharges={gameState.buffs.shieldCharges}
            healOverTime={gameState.healOverTime}
            activeDoTCount={Object.keys(gameState.activeDoTs).length}
            turnCount={gameState.turnCount}
            utilities={gameState.utilities}
            onUseUtility={useUtility}
            targetingMode={gameState.targetingMode}
            onCancelTargeting={cancelTargeting}
          />
        </div>

        {/* Combat Log */}
        {/*<div className="w-full max-w-md p-3 bg-black/50 border border-[#446666]/30 rounded font-mono text-xs hidden ">
          <div className="text-[#446666] mb-1">// COMBAT LOG</div>
          <div className="h-24 overflow-y-auto space-y-1">
            {gameState.combatLog.map((entry, i) => (
              <div
                key={i}
                className={`${
                  entry.includes('destroyed') || entry.includes('ACCESS')
                    ? 'text-[#00ff88]'
                    : entry.includes('damage to virus') || entry.includes('failed')
                      ? 'text-[#ff6666]'
                      : 'text-[#88ccaa]'
                }`}
              >
                {entry}
              </div>
            ))}
          </div>
        </div>*/}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 p-3 bg-black/30 rounded text-xs font-mono">
          <LegendItem color="#1a2636" label="Unexplored" />
          <LegendItem color="rgba(0, 255, 136, 0.6)" label="? (Click to Reveal)" />
          <LegendItem color="rgba(255, 170, 0, 0.6)" label="Revealed (Click to Attack)" />
        </div>
      </div>
    </div>
  );
};

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded" style={{ backgroundColor: color, border: '1px solid rgba(255,255,255,0.2)' }} />
      <span className="text-[#88ccaa]">{label}</span>
    </div>
  );
}

function drawHex(
  ctx: CanvasRenderingContext2D,
  node: GameNode,
  centerOffset: number,
  gameState: GameState,
  iconImages: Map<NodeType, HTMLImageElement>,
) {
  const pixel = hexToPixel(node, HEX_SIZE);
  const screenX = pixel.x + centerOffset;
  const screenY = pixel.y + centerOffset;
  const corners = getHexCorners({ x: screenX, y: screenY }, HEX_SIZE * 0.9);

  const stats = NODE_STATS[node.type];
  const hasDoT = gameState.activeDoTs[node.id] !== undefined;
  // Only revealed defensive nodes can be targeted for utilities
  const isTargetable = gameState.targetingMode !== 'none' && node.state === 'revealed' && stats.isDefensive;

  // Determine fill color based on state
  let fillColor = THEME.nodeUnexplored;
  let strokeColor = 'rgba(0, 255, 136, 0.2)';
  let strokeWidth = 1;

  if (isTargetable) {
    // Targeting mode - highlight targetable nodes (only revealed defensive)
    fillColor = 'rgba(255, 0, 255, 0.2)';
    strokeColor = 'rgba(255, 0, 255, 0.8)';
    strokeWidth = 3;
  } else if (node.state === 'adjacent') {
    // Unknown node - clickable to reveal
    fillColor = 'rgba(0, 255, 136, 0.15)';
    strokeColor = 'rgba(0, 255, 136, 0.8)';
    strokeWidth = 2;
  } else if (node.state === 'revealed') {
    // Revealed node - clickable to attack (yellow-orange border)
    fillColor = 'rgba(255, 170, 0, 0.2)';
    strokeColor = 'rgba(255, 170, 0, 0.9)';
    strokeWidth = 2;
  } else if (node.state === 'explored') {
    // Explored empty node
    fillColor = 'rgba(255, 136, 0, 0.2)';
    strokeColor = 'rgba(255, 136, 0, 0.5)';
  } else if (node.state === 'destroyed') {
    fillColor = 'rgba(255, 51, 102, 0.2)';
    strokeColor = 'rgba(255, 51, 102, 0.5)';
  }

  // DoT overlay - green pulsing glow
  if (hasDoT && node.state !== 'destroyed') {
    fillColor = 'rgba(136, 255, 0, 0.3)';
    strokeColor = 'rgba(136, 255, 0, 0.9)';
    strokeWidth = 3;
  }

  // Draw hex background
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 6; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.stroke();

  // Draw "?" for unknown adjacent nodes
  if (node.state === 'adjacent' && !stats.isUtility) {
    ctx.font = `bold ${HEX_SIZE * 0.6}px monospace`;
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', screenX, screenY);
  }

  // Draw utilities on grid (adjacent, clickable to collect)
  if (node.state === 'adjacent' && stats.isUtility) {
    const icon = iconImages.get(node.type);
    if (icon) {
      const iconSize = HEX_SIZE * 1.6;
      ctx.drawImage(icon, screenX - iconSize / 2, screenY - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.beginPath();
      ctx.arc(screenX, screenY, HEX_SIZE * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = stats.color;
      ctx.fill();
    }
  }

  // Draw revealed nodes (defensive/data_cache - show icon and stats)
  if (node.state === 'revealed') {
    const icon = iconImages.get(node.type);
    if (icon) {
      const iconSize = HEX_SIZE * 1.6;
      ctx.drawImage(icon, screenX - iconSize / 2, screenY - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.beginPath();
      ctx.arc(screenX, screenY, HEX_SIZE * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = stats.color;
      ctx.fill();
    }
    // Draw coherence/attack stats for revealed nodes
    drawNodeStatsForType(ctx, node, screenX, screenY, HEX_SIZE);
  }

  // Draw explored empty nodes - show distance hint
  if (node.state === 'explored' && node.type === 'empty') {
    ctx.font = `bold ${HEX_SIZE * 0.5}px monospace`;
    ctx.fillStyle = '#446666';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(node.distanceHint || '?'), screenX, screenY);
  }

  // Draw start position indicator
  if (
    node.q === gameState.startPosition.q &&
    node.r === gameState.startPosition.r &&
    node.s === gameState.startPosition.s
  ) {
    ctx.font = `bold ${HEX_SIZE * 0.4}px monospace`;
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', screenX, screenY);
  }
}

export default HackingMinigame;
