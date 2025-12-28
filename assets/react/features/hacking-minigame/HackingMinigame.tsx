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

// Animation types
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  color: string;
}

interface DataStream {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  opacity: number;
}

interface GlitchSlice {
  y: number;
  height: number;
  offset: number;
  duration: number;
  time: number;
}

interface AnimationState {
  particles: Particle[];
  ripples: Ripple[];
  dataStreams: DataStream[];
  scanlineY: number;
  glitchSlices: GlitchSlice[];
  pulsePhase: number;
  energyWaves: { nodeId: string; phase: number; color: string }[];
  time: number;
}

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

// Initialize data streams for background effect
function createDataStreams(count: number, canvasWidth: number, canvasHeight: number): DataStream[] {
  const streams: DataStream[] = [];
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split(
    '',
  );

  for (let i = 0; i < count; i++) {
    const streamLength = Math.floor(Math.random() * 15) + 5;
    streams.push({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight - canvasHeight,
      speed: Math.random() * 2 + 1,
      chars: Array.from({ length: streamLength }, () => chars[Math.floor(Math.random() * chars.length)]),
      opacity: Math.random() * 0.3 + 0.1,
    });
  }
  return streams;
}

// Create explosion particles
function createExplosionParticles(x: number, y: number, color: string, count: number = 20): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = Math.random() * 4 + 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      color,
      size: Math.random() * 4 + 2,
    });
  }
  return particles;
}

// Create energy spark particles
function createSparkParticles(x: number, y: number, color: string): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 3 + 1;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      color,
      size: Math.random() * 2 + 1,
    });
  }
  return particles;
}

export const HackingMinigame: React.FC<HackingMinigameProps> = ({ difficulty, seed, pushEvent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const difficultyTyped = (difficulty as Difficulty) || 'normal';
  const iconImages = useIconImages();
  const prevDestroyedRef = useRef<Set<string>>(new Set());
  const nodesRef = useRef<Map<string, GameNode>>(new Map());

  const { gameState, startGame, resetGame, clickNode, useUtility, cancelTargeting } = useGameState(
    seed,
    difficultyTyped,
  );

  // Calculate canvas size based on grid
  const config = DIFFICULTY_CONFIG[difficultyTyped];
  const gridPixelRadius = HEX_SIZE * config.gridRadius * 2 + HEX_SIZE;
  const canvasSize = gridPixelRadius * 2 + CANVAS_PADDING * 2;
  const centerOffset = canvasSize / 2;

  // Animation state
  const [animState, setAnimState] = useState<AnimationState>(() => ({
    particles: [],
    ripples: [],
    dataStreams: createDataStreams(30, canvasSize, canvasSize),
    scanlineY: 0,
    glitchSlices: [],
    pulsePhase: 0,
    energyWaves: [],
    time: 0,
  }));

  // Keep nodesRef in sync with gameState.nodes (for animation callback without restarts)
  useEffect(() => {
    nodesRef.current = gameState.nodes;
  }, [gameState.nodes]);

  // Detect destroyed nodes and create explosions
  useEffect(() => {
    const currentDestroyed = new Set(
      Array.from(gameState.nodes.values())
        .filter(n => n.state === 'destroyed')
        .map(n => n.id),
    );

    // Find newly destroyed nodes
    currentDestroyed.forEach(id => {
      if (!prevDestroyedRef.current.has(id)) {
        const node = gameState.nodes.get(id);
        if (node) {
          const pixel = hexToPixel(node, HEX_SIZE);
          const screenX = pixel.x + centerOffset;
          const screenY = pixel.y + centerOffset;
          const stats = NODE_STATS[node.type];

          setAnimState(prev => ({
            ...prev,
            particles: [...prev.particles, ...createExplosionParticles(screenX, screenY, stats.glowColor, 30)],
            ripples: [
              ...prev.ripples,
              {
                x: screenX,
                y: screenY,
                radius: 0,
                maxRadius: HEX_SIZE * 3,
                life: 1,
                color: stats.glowColor,
              },
            ],
            // Add glitch effect on destruction
            glitchSlices: [
              ...prev.glitchSlices,
              ...Array.from({ length: 5 }, () => {
                const height = Math.random() * 20 + 5;
                return {
                  y: Math.max(0, Math.min(Math.random() * canvasSize, canvasSize - height - 1)),
                  height,
                  offset: (Math.random() - 0.5) * 30,
                  duration: 0.3,
                  time: 0,
                };
              }),
            ],
          }));
        }
      }
    });

    prevDestroyedRef.current = currentDestroyed;
  }, [gameState.nodes, centerOffset, canvasSize]);

  // Handle win
  useEffect(() => {
    if (gameState.phase === 'won') {
      const timer = setTimeout(() => {
        pushEvent('minigame_completed', {});
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState.phase, pushEvent]);

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      // Update animation state
      setAnimState(prev => {
        // Update particles
        const particles = prev.particles
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1, // gravity
            life: p.life - deltaTime * 2,
          }))
          .filter(p => p.life > 0);

        // Update ripples
        const ripples = prev.ripples
          .map(r => ({
            ...r,
            radius: r.radius + deltaTime * 200,
            life: r.life - deltaTime * 2,
          }))
          .filter(r => r.life > 0 && r.radius < r.maxRadius);

        // Update data streams
        const dataStreams = prev.dataStreams.map(stream => {
          let newY = stream.y + stream.speed;
          if (newY > canvasSize + 100) {
            newY = -stream.chars.length * 14;
            return {
              ...stream,
              y: newY,
              x: Math.random() * canvasSize,
            };
          }
          return { ...stream, y: newY };
        });

        // Update scanline
        let scanlineY = prev.scanlineY + deltaTime * 150;
        if (scanlineY > canvasSize) scanlineY = -10;

        // Update glitch slices
        const glitchSlices = prev.glitchSlices
          .map(g => ({ ...g, time: g.time + deltaTime }))
          .filter(g => g.time < g.duration);

        // Update pulse phase
        const pulsePhase = (prev.pulsePhase + deltaTime * 3) % (Math.PI * 2);

        // Update energy waves
        const energyWaves = prev.energyWaves
          .map(w => ({ ...w, phase: w.phase + deltaTime * 4 }))
          .filter(w => w.phase < Math.PI * 2);

        // Randomly add new energy waves to revealed nodes
        const newWaves = [...energyWaves];
        if (Math.random() < deltaTime * 2) {
          const revealedNodes = Array.from(nodesRef.current.values()).filter(
            n => n.state === 'revealed' || n.state === 'adjacent',
          );
          if (revealedNodes.length > 0) {
            const randomNode = revealedNodes[Math.floor(Math.random() * revealedNodes.length)];
            const stats = NODE_STATS[randomNode.type];
            newWaves.push({
              nodeId: randomNode.id,
              phase: 0,
              color: stats.glowColor,
            });
          }
        }

        return {
          particles,
          ripples,
          dataStreams,
          scanlineY,
          glitchSlices,
          pulsePhase,
          energyWaves: newWaves,
          time: prev.time + deltaTime,
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasSize]);

  // Draw everything
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = THEME.gridBg;
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Draw data streams (background)
    ctx.save();
    animState.dataStreams.forEach(stream => {
      ctx.font = '12px monospace';
      stream.chars.forEach((char, i) => {
        const opacity = stream.opacity * (1 - i / stream.chars.length);
        ctx.fillStyle = `rgba(0, 255, 136, ${opacity})`;
        ctx.fillText(char, stream.x, stream.y + i * 14);
      });
    });
    ctx.restore();

    // Draw grid lines connecting hexes (subtle)
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.05)';
    ctx.lineWidth = 1;
    gameState.nodes.forEach(node => {
      const pixel = hexToPixel(node, HEX_SIZE);
      const screenX = pixel.x + centerOffset;
      const screenY = pixel.y + centerOffset;

      // Draw connecting lines to neighbors
      const neighbors = [
        { dq: 1, dr: 0, ds: -1 },
        { dq: 0, dr: 1, ds: -1 },
        { dq: -1, dr: 1, ds: 0 },
      ];
      neighbors.forEach(({ dq, dr, ds }) => {
        const neighborId = `${node.q + dq},${node.r + dr},${node.s + ds}`;
        const neighbor = gameState.nodes.get(neighborId);
        if (neighbor) {
          const nPixel = hexToPixel(neighbor, HEX_SIZE);
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(nPixel.x + centerOffset, nPixel.y + centerOffset);
          ctx.stroke();
        }
      });
    });
    ctx.restore();

    // Draw ripples (behind nodes)
    animState.ripples.forEach(ripple => {
      if (ripple.radius <= 0 || ripple.life <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, Math.max(0, ripple.radius), 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color.replace('0.6', `${Math.max(0, ripple.life * 0.5)}`);
      ctx.lineWidth = Math.max(0.1, 3 * ripple.life);
      ctx.stroke();
      ctx.restore();
    });

    // Draw energy waves
    animState.energyWaves.forEach(wave => {
      const node = gameState.nodes.get(wave.nodeId);
      if (node) {
        const pixel = hexToPixel(node, HEX_SIZE);
        const screenX = pixel.x + centerOffset;
        const screenY = pixel.y + centerOffset;
        const waveRadius = Math.max(0.1, HEX_SIZE * (0.5 + wave.phase / Math.PI));
        const opacity = Math.max(0, 1 - wave.phase / (Math.PI * 2));
        if (opacity <= 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.arc(screenX, screenY, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = wave.color.replace('0.6', `${opacity * 0.4}`);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    });

    // Draw each hex with animations
    gameState.nodes.forEach(node => {
      drawHex(ctx, node, centerOffset, gameState, iconImages, animState.pulsePhase, animState.time);
    });

    // Draw particles (on top)
    animState.particles.forEach(particle => {
      if (particle.life <= 0) return;
      const radius = Math.max(0.1, particle.size * particle.life);
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Add glow
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();
    });

    // Draw scanline
    ctx.save();
    const gradient = ctx.createLinearGradient(0, animState.scanlineY - 10, 0, animState.scanlineY + 10);
    gradient.addColorStop(0, 'rgba(0, 255, 136, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 136, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, animState.scanlineY - 10, canvasSize, 20);
    ctx.restore();

    // Draw glitch effect
    if (animState.glitchSlices.length > 0) {
      ctx.save();
      animState.glitchSlices.forEach(slice => {
        // Bounds check to prevent getImageData errors
        const y = Math.max(0, Math.min(Math.floor(slice.y), canvasSize - 1));
        const height = Math.min(Math.floor(slice.height), canvasSize - y);
        if (height <= 0) return;

        try {
          const imageData = ctx.getImageData(0, y, canvasSize, height);
          ctx.putImageData(imageData, slice.offset, y);

          // Add color separation
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(255, 0, 0, ${0.1 * (1 - slice.time / slice.duration)})`;
          ctx.fillRect(slice.offset + 2, y, canvasSize, height);
          ctx.fillStyle = `rgba(0, 255, 255, ${0.1 * (1 - slice.time / slice.duration)})`;
          ctx.fillRect(slice.offset - 2, y, canvasSize, height);
        } catch {
          // Skip this glitch slice if it fails
        }
      });
      ctx.restore();
    }

    // Add CRT-style vignette
    ctx.save();
    const vignetteGradient = ctx.createRadialGradient(
      canvasSize / 2,
      canvasSize / 2,
      canvasSize * 0.3,
      canvasSize / 2,
      canvasSize / 2,
      canvasSize * 0.7,
    );
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = vignetteGradient;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    ctx.restore();

    // Add subtle noise overlay
    ctx.save();
    ctx.globalAlpha = 0.02;
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * canvasSize;
      const y = Math.random() * canvasSize;
      ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }, [gameState, centerOffset, canvasSize, iconImages, animState]);

  // Handle canvas click with ripple effect
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;
      const x = clickX - centerOffset;
      const y = clickY - centerOffset;

      // Add click ripple
      setAnimState(prev => ({
        ...prev,
        ripples: [
          ...prev.ripples,
          {
            x: clickX,
            y: clickY,
            radius: 0,
            maxRadius: HEX_SIZE * 2,
            life: 1,
            color: 'rgba(0, 255, 136, 0.6)',
          },
        ],
        particles: [...prev.particles, ...createSparkParticles(clickX, clickY, '#00ff88')],
      }));

      if (gameState.phase !== 'playing') return;

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
  const activeSuppressors = Array.from(gameState.nodes.values()).filter(
    n => n.type === 'suppressor' && n.state === 'revealed',
  ).length;
  const suppressorPenalty = activeSuppressors * 10;

  return (
    <div className="flex items-center justify-center min-h-full bg-[#0a0f14] overflow-auto py-4">
      <div className="flex flex-col items-center gap-4 p-4 max-w-4xl w-full">
        {/* Intro Overlay */}
        {gameState.phase === 'intro' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center p-8 max-w-md animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 text-[#00ff88] animate-pulse relative">
                <div className="absolute inset-0 animate-ping opacity-30">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                    />
                  </svg>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
              </div>
              <h2 className="text-3xl font-mono text-[#00ff88] mb-3 animate-glitch">INITIALIZE HACK</h2>
              <p className="text-[#88ccaa] font-mono text-sm mb-2">
                Difficulty: <span className="text-[#00ff88] uppercase">{difficultyTyped}</span>
              </p>
              <p className="text-[#446666] font-mono text-sm mb-6">
                Navigate the grid. Destroy the System Core. <br />
                Click green nodes to explore. Avoid or defeat defenses.
              </p>
              <button
                onClick={startGame}
                className="px-8 py-3 bg-[#00ff88]/20 border-2 border-[#00ff88] rounded text-[#00ff88] font-mono text-lg hover:bg-[#00ff88]/30 hover:shadow-[0_0_30px_rgba(0,255,136,0.5)] transition-all duration-300 hover:scale-105"
              >
                BEGIN HACK
              </button>
            </div>
          </div>
        )}

        {/* Win Overlay */}
        {gameState.phase === 'won' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center p-8 animate-fade-in">
              <div className="w-24 h-24 mx-auto mb-6 text-[#00ff88] animate-bounce relative">
                <div className="absolute inset-0 animate-spin-slow opacity-30">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
                    <circle cx="12" cy="12" r="11" strokeDasharray="4 2" />
                  </svg>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <h2 className="text-4xl font-mono text-[#00ff88] mb-3 animate-pulse">ACCESS GRANTED</h2>
              <p className="text-[#88ccaa] font-mono text-sm typing-animation">
                System Core destroyed. Decrypting data...
              </p>
            </div>
          </div>
        )}

        {/* Lose Overlay */}
        {gameState.phase === 'lost' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="text-center p-8 animate-fade-in">
              <div className="w-24 h-24 mx-auto mb-6 text-[#ff3366] animate-shake">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>
              </div>
              <h2 className="text-4xl font-mono text-[#ff3366] mb-3 animate-glitch-red">HACK FAILED</h2>
              <p className="text-[#aa6666] font-mono text-sm mb-6">Virus coherence depleted. Connection lost.</p>
              <button
                onClick={resetGame}
                className="px-8 py-3 bg-[#ff3366]/20 border-2 border-[#ff3366] rounded text-[#ff3366] font-mono text-lg hover:bg-[#ff3366]/30 hover:shadow-[0_0_30px_rgba(255,51,102,0.5)] transition-all duration-300 hover:scale-105"
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
          className="cursor-pointer border border-[#00ff88]/20 rounded-lg shadow-[0_0_50px_rgba(0,255,136,0.1)] hover:shadow-[0_0_80px_rgba(0,255,136,0.2)] transition-shadow duration-500"
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
            shieldTurnsRemaining={gameState.buffs.shieldTurnsRemaining}
            healOverTime={gameState.healOverTime}
            activeDoTCount={Object.keys(gameState.activeDoTs).length}
            turnCount={gameState.turnCount}
            utilities={gameState.utilities}
            onUseUtility={useUtility}
            targetingMode={gameState.targetingMode}
            onCancelTargeting={cancelTargeting}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 p-3 bg-black/30 rounded text-xs font-mono border border-[#00ff88]/10">
          <LegendItem color="#1a2636" label="Unexplored" />
          <LegendItem color="rgba(0, 255, 136, 0.6)" label="? (Click to Reveal)" pulse />
          <LegendItem color="rgba(255, 170, 0, 0.6)" label="Revealed (Click to Attack)" pulse />
        </div>
      </div>

      {/* CSS for custom animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes glitch {
          0%, 100% { text-shadow: 2px 0 #ff3366, -2px 0 #00ffff; }
          25% { text-shadow: -2px 0 #ff3366, 2px 0 #00ffff; }
          50% { text-shadow: 2px 2px #ff3366, -2px -2px #00ffff; }
          75% { text-shadow: -2px -2px #ff3366, 2px 2px #00ffff; }
        }

        @keyframes glitch-red {
          0%, 100% { text-shadow: 2px 0 #ff0000, -2px 0 #00ffff; }
          33% { text-shadow: -3px 0 #ff0000, 3px 0 #00ffff; clip-path: inset(20% 0 30% 0); }
          66% { text-shadow: 3px 0 #ff0000, -3px 0 #00ffff; clip-path: inset(50% 0 10% 0); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 5px currentColor; }
          50% { box-shadow: 0 0 15px currentColor, 0 0 25px currentColor; }
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-glitch {
          animation: glitch 0.5s ease-in-out infinite;
        }

        .animate-glitch-red {
          animation: glitch-red 0.3s ease-in-out infinite;
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }

        .animate-pulse-border {
          animation: pulse-border 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

function LegendItem({ color, label, pulse }: { color: string; label: string; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-4 h-4 rounded ${pulse ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: color,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: pulse ? `0 0 10px ${color}` : 'none',
        }}
      />
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
  pulsePhase: number,
  time: number,
) {
  const pixel = hexToPixel(node, HEX_SIZE);
  const screenX = pixel.x + centerOffset;
  const screenY = pixel.y + centerOffset;
  const corners = getHexCorners({ x: screenX, y: screenY }, HEX_SIZE * 0.9);

  const stats = NODE_STATS[node.type];
  const hasDoT = gameState.activeDoTs[node.id] !== undefined;
  const isTargetable = gameState.targetingMode !== 'none' && node.state === 'revealed' && stats.isDefensive;

  // Calculate pulse factor for animations
  const pulseFactor = 0.5 + 0.5 * Math.sin(pulsePhase + (node.q + node.r) * 0.5);
  const glowPulse = 0.3 + 0.7 * pulseFactor;

  // Determine fill color based on state
  let fillColor = THEME.nodeUnexplored;
  let strokeColor = 'rgba(0, 255, 136, 0.2)';
  let strokeWidth = 1;
  let glowColor = '';
  let glowIntensity = 0;

  if (isTargetable) {
    fillColor = `rgba(255, 0, 255, ${0.1 + 0.1 * pulseFactor})`;
    strokeColor = `rgba(255, 0, 255, ${0.6 + 0.4 * pulseFactor})`;
    strokeWidth = 3;
    glowColor = 'rgba(255, 0, 255, 0.8)';
    glowIntensity = 15 + 10 * pulseFactor;
  } else if (node.state === 'adjacent') {
    fillColor = `rgba(0, 255, 136, ${0.1 + 0.1 * pulseFactor})`;
    strokeColor = `rgba(0, 255, 136, ${0.6 + 0.3 * pulseFactor})`;
    strokeWidth = 2;
    glowColor = 'rgba(0, 255, 136, 0.6)';
    glowIntensity = 8 + 5 * pulseFactor;
  } else if (node.state === 'revealed') {
    fillColor = `rgba(255, 170, 0, ${0.15 + 0.1 * pulseFactor})`;
    strokeColor = `rgba(255, 170, 0, ${0.7 + 0.3 * pulseFactor})`;
    strokeWidth = 2;
    glowColor = 'rgba(255, 170, 0, 0.6)';
    glowIntensity = 10 + 8 * pulseFactor;
  } else if (node.state === 'explored') {
    fillColor = 'rgba(255, 136, 0, 0.15)';
    strokeColor = 'rgba(255, 136, 0, 0.4)';
  } else if (node.state === 'destroyed') {
    fillColor = 'rgba(255, 51, 102, 0.1)';
    strokeColor = 'rgba(255, 51, 102, 0.3)';
  }

  // DoT overlay - enhanced green pulsing glow
  if (hasDoT && node.state !== 'destroyed') {
    fillColor = `rgba(136, 255, 0, ${0.2 + 0.15 * pulseFactor})`;
    strokeColor = `rgba(136, 255, 0, ${0.7 + 0.3 * pulseFactor})`;
    strokeWidth = 3;
    glowColor = 'rgba(136, 255, 0, 0.8)';
    glowIntensity = 15 + 10 * pulseFactor;
  }

  // Draw glow effect
  if (glowIntensity > 0) {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowIntensity;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();
    ctx.restore();
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

  // Add inner hexagon pattern for visual interest on active nodes
  if (node.state === 'revealed' || node.state === 'adjacent') {
    const innerCorners = getHexCorners({ x: screenX, y: screenY }, HEX_SIZE * 0.6);
    ctx.beginPath();
    ctx.moveTo(innerCorners[0].x, innerCorners[0].y);
    for (let i = 1; i < 6; i++) {
      ctx.lineTo(innerCorners[i].x, innerCorners[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeColor.replace(/[\d.]+\)$/, `${glowPulse * 0.3})`);
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Draw "?" for unknown adjacent nodes with animation
  if (node.state === 'adjacent' && !stats.isUtility) {
    const scale = 0.9 + 0.1 * pulseFactor;
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(scale, scale);
    ctx.font = `bold ${HEX_SIZE * 0.6}px monospace`;
    ctx.fillStyle = `rgba(0, 255, 136, ${0.7 + 0.3 * pulseFactor})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10 * pulseFactor;
    ctx.fillText('?', 0, 0);
    ctx.restore();
  }

  // Draw utilities on grid
  if (node.state === 'adjacent' && stats.isUtility) {
    const icon = iconImages.get(node.type);
    const bobOffset = Math.sin(time * 3 + node.q + node.r) * 3;

    ctx.save();
    ctx.shadowColor = stats.glowColor;
    ctx.shadowBlur = 15 + 5 * pulseFactor;

    if (icon) {
      const iconSize = HEX_SIZE * 1.6;
      ctx.drawImage(icon, screenX - iconSize / 2, screenY - iconSize / 2 + bobOffset, iconSize, iconSize);
    } else {
      ctx.beginPath();
      ctx.arc(screenX, screenY + bobOffset, HEX_SIZE * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = stats.color;
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw revealed nodes with glow
  if (node.state === 'revealed') {
    const icon = iconImages.get(node.type);

    ctx.save();
    ctx.shadowColor = stats.glowColor;
    ctx.shadowBlur = 12 + 8 * pulseFactor;

    if (icon) {
      const iconSize = HEX_SIZE * 1.6;
      ctx.drawImage(icon, screenX - iconSize / 2, screenY - iconSize / 2, iconSize, iconSize);
    } else {
      ctx.beginPath();
      ctx.arc(screenX, screenY, HEX_SIZE * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = stats.color;
      ctx.fill();
    }
    ctx.restore();

    drawNodeStatsForType(ctx, node, screenX, screenY, HEX_SIZE);
  }

  // Draw explored empty nodes with subtle animation
  if (node.state === 'explored' && node.type === 'empty') {
    const alpha = 0.4 + 0.2 * Math.sin(time * 2 + node.q * 0.3);
    ctx.font = `bold ${HEX_SIZE * 0.5}px monospace`;
    ctx.fillStyle = `rgba(68, 102, 102, ${alpha})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(node.distanceHint || '?'), screenX, screenY);
  }

  // Draw start position indicator with animation
  if (
    node.q === gameState.startPosition.q &&
    node.r === gameState.startPosition.r &&
    node.s === gameState.startPosition.s
  ) {
    ctx.save();
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 10 + 5 * pulseFactor;
    ctx.font = `bold ${HEX_SIZE * 0.4}px monospace`;
    ctx.fillStyle = `rgba(0, 255, 136, ${0.7 + 0.3 * pulseFactor})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', screenX, screenY);
    ctx.restore();
  }
}

export default HackingMinigame;
