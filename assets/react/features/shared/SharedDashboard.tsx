import React, { useEffect, useMemo, useRef } from 'react';
import { Circle as GCircle, Line as GLine, Polygon, Text } from '@antv/g';
import { Circle, ExtensionCategory, Graph, Line, register } from '@antv/g6';

import { DashboardProvider, useEdges, useMaps, useNodes } from '@/react/state/useDashboard';
import { isWormholeSpace } from '@/react/utils/isWormholeSpace';
import useClusters from '../dashboard/hooks/useClusters';

// =============================================================================
// EDGE ANIMATION CONFIGURATION
// Change this value to switch between animation types:
// - 'moving-dots': Animated dots/impulses moving along edges toward home
// - 'ant-line': Marching ants dashed line effect
// - 'line': Standard static line (no animation)
// =============================================================================
const EDGE_ANIMATION_TYPE: 'moving-dots' | 'ant-line' | 'line' = 'moving-dots';

// =============================================================================
// CUSTOM EDGE: Moving Dots (Impulses toward home system)
// =============================================================================
class MovingDotsEdge extends Line {
  private animationFrameId: number | null = null;
  private dots: any[] = [];

  onCreate() {
    this.createMovingDots();
  }

  onUpdate() {
    this.destroyDots();
    this.createMovingDots();
  }

  onDestroy() {
    this.destroyDots();
  }

  private destroyDots() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.dots.forEach((dot, i) => {
      const shape = this.getShape(`moving-dot-${i}`);
      if (shape) {
        shape.remove();
      }
    });
    this.dots = [];
  }

  private createMovingDots() {
    // Get source and target node references
    const sourceNode = (this as any).sourceNode;
    const targetNode = (this as any).targetNode;

    if (!sourceNode || !targetNode) return;

    // Get positions: source = offsetDistance 0, target = offsetDistance 1
    const [x1, y1] = sourceNode.getPosition();
    const [x2, y2] = targetNode.getPosition();

    // Get edge ID from the element's id property
    const edgeId = (this as any).id;

    // Get pre-computed direction from edge data (computed via BFS in SharedMapViewer)
    // directionToHome: 'source' = animate toward source, 'target' = animate toward target
    const context = (this as any).context;
    let directionToHome: 'source' | 'target' = 'source';

    if (context?.model && edgeId) {
      try {
        const edgeDataResult = context.model.getEdgeData(edgeId);
        // getEdgeData returns an array, get first element
        const edgeData = Array.isArray(edgeDataResult) ? edgeDataResult[0] : edgeDataResult;
        directionToHome = edgeData?.data?.directionToHome || 'source';
      } catch (e) {
        // Fallback to source direction
      }
    }

    // Determine animation direction based on pre-computed path to home
    // directionToHome indicates which end is closer to home
    // Dots should START far from home and END at home
    //
    // Swap the motion path direction instead of swapping offsets
    const homeIsTowardTarget = directionToHome === 'target';

    // Always animate from 0 to 1, but swap the path endpoints based on direction
    const startOffset = 0;
    const endOffset = 1;

    // Configuration
    const numDots = 3;
    const dotRadius = 1;
    const baseDuration = 2500;
    const staggerDelay = 800;

    // Green glow for home-bound traffic
    const dotColor = 'rgba(0, 255, 136, 0.9)';
    const glowColor = 'rgba(0, 255, 136, 0.6)';

    // Create motion path FROM far end TO home
    // offsetDistance: 0 = line start (x1,y1), 1 = line end (x2,y2)
    // Animation always goes 0->1
    //
    // If home toward TARGET: dots go source->target, so line: source(x1,y1) -> target(x2,y2)
    // If home toward SOURCE: dots go target->source, so line: target(x2,y2) -> source(x1,y1)
    const motionPath = new GLine({
      style: homeIsTowardTarget
        ? { x1, y1, x2, y2 } // line from source to target
        : { x1: x2, y1: y2, x2: x1, y2: y1 }, // line from target to source
    });

    // Create dots with staggered animations
    for (let i = 0; i < numDots; i++) {
      const dot = this.upsert(
        `moving-dot-${i}`,
        GCircle,
        {
          r: dotRadius,
          fill: dotColor,
          shadowColor: glowColor,
          shadowBlur: 10,
          opacity: 0,
          offsetPath: motionPath,
          offsetDistance: startOffset,
        },
        this,
      );

      this.dots.push(dot);

      // Animate dot traveling TOWARD home
      dot.animate(
        [
          { offsetDistance: startOffset, opacity: 0, r: dotRadius * 0.5 },
          { offsetDistance: startOffset + (endOffset - startOffset) * 0.15, opacity: 0.8, r: dotRadius },
          { offsetDistance: startOffset + (endOffset - startOffset) * 0.5, opacity: 1, r: dotRadius * 1.2 },
          { offsetDistance: startOffset + (endOffset - startOffset) * 0.85, opacity: 0.8, r: dotRadius },
          { offsetDistance: endOffset, opacity: 0, r: dotRadius * 0.5 },
        ],
        {
          duration: baseDuration + i * 100,
          iterations: Infinity,
          easing: 'ease-in-out',
          delay: i * staggerDelay,
        },
      );
    }
  }
}

// =============================================================================
// CUSTOM EDGE: Ant Line (Marching ants dashed line effect)
// =============================================================================
class AntLineEdge extends Line {
  onCreate() {
    this.startAntAnimation();
  }

  onUpdate() {
    // Animation continues on the key shape
  }

  private startAntAnimation() {
    const keyShape = this.shapeMap.key;
    if (!keyShape) return;

    // Get edge ID from the element's id property
    const edgeId = (this as any).id;

    // Get pre-computed direction from edge data (computed via BFS in SharedMapViewer)
    const context = (this as any).context;
    let directionToHome: 'source' | 'target' = 'source';

    if (context?.model && edgeId) {
      try {
        const edgeDataResult = context.model.getEdgeData(edgeId);
        // getEdgeData returns an array, get first element
        const edgeData = Array.isArray(edgeDataResult) ? edgeDataResult[0] : edgeDataResult;
        directionToHome = edgeData?.data?.directionToHome || 'source';
      } catch {
        // Fallback to source direction
      }
    }

    // Animate TOWARD home system
    // INVERTED to match moving-dots fix
    const dashLength = 20;
    const animateTowardTarget = directionToHome === 'target';

    // Animate lineDashOffset for marching effect TOWARD home
    keyShape.animate(
      animateTowardTarget
        ? [{ lineDashOffset: 0 }, { lineDashOffset: dashLength }] // Toward target (home direction)
        : [{ lineDashOffset: dashLength }, { lineDashOffset: 0 }], // Toward source (home direction)
      {
        duration: 800,
        iterations: Infinity,
        easing: 'linear',
      },
    );
  }
}

// Register custom edge types
try {
  register(ExtensionCategory.EDGE, 'moving-dots', MovingDotsEdge);
} catch {
  // Already registered
}

try {
  register(ExtensionCategory.EDGE, 'ant-line', AntLineEdge);
} catch {
  // Already registered
}

// Register the BreathingCircle node type (same as Map.tsx)
class BreathingCircle extends Circle {
  constructor(options: any) {
    super(options);
    this.isLowPerformance = this.detectLowPerformance();
  }

  isLowPerformance: boolean;

  onCreate() {
    this.createSecurityValueText();
    // this.createBorderIndicator();
    this.createMainIndicator();
  }

  onUpdate() {
    this.createSecurityValueText();
    // this.createBorderIndicator();
    this.createMainIndicator();
  }

  detectLowPerformance() {
    // Enable animations for home system wormhole effect
    return false;
  }

  createSecurityValueText() {
    const security = (this as any).attributes.security;
    const systemClass = (this as any).attributes.systemClass;
    const isWormhole = isWormholeSpace(systemClass);

    if (security === undefined || security === null) {
      return;
    }

    const securityText = isWormhole
      ? `C${systemClass}`
      : typeof security === 'number'
        ? security.toFixed(1)
        : String(security);

    let textColor = '#FFFFFF';
    if (typeof security === 'number') {
      if (security >= 0.7) {
        textColor = '#00BFFF';
      } else if (security >= 0.5) {
        textColor = '#90EE90';
      } else if (security >= 0.3) {
        textColor = '#FFA500';
      } else {
        textColor = '#FF6B6B';
      }
    }

    this.upsert(
      'security-value-text',
      Text,
      {
        x: 0,
        y: 0,
        text: securityText,
        fontSize: 8,
        fontWeight: 'regular',
        fill: textColor,
        textAlign: 'center',
        textBaseline: 'middle',
        fontFamily: 'Arial, sans-serif',
      },
      this,
    );
  }

  getHexagonPoints(radius: number) {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);
      points.push([x, y]);
    }
    return points;
  }

  createBorderIndicator() {
    if (!(this as any).attributes.isBorder) {
      return;
    }

    const size = (this as any).attributes.size || 50;
    const radius = size / 1.5;
    const borderColor = 'rgba(255, 165, 0, 0.9)';

    const innerBorderRadius = radius + 4;
    const innerBorder = this.upsert(
      'border-inner-ring',
      Polygon,
      {
        points: this.getHexagonPoints(innerBorderRadius),
        fill: 'transparent',
        stroke: borderColor,
        strokeWidth: 1.5,
        strokeOpacity: 0.6,
      },
      this,
    );

    if (this.isLowPerformance) {
      return;
    }

    innerBorder.animate(
      [
        { strokeOpacity: 0.6, strokeWidth: 1.5 },
        { strokeOpacity: 0.3, strokeWidth: 2 },
      ],
      {
        duration: 1500,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out',
        delay: 750,
      },
    );
  }

  createMainIndicator() {
    if (!(this as any).attributes.isMain) {
      return;
    }

    const size = (this as any).attributes.size || 20;
    const baseRadius = size / 2;

    // Wormhole color palette
    const wormholeColors = [
      'rgba(138, 43, 226, 0.6)', // Deep violet
      'rgba(75, 0, 130, 0.5)', // Indigo
      'rgba(0, 191, 255, 0.4)', // Deep sky blue
      'rgba(0, 255, 127, 0.3)', // Spring green
      'rgba(255, 20, 147, 0.35)', // Deep pink
    ];

    // Create morphing aura layers (from outer to inner)
    const auraLayers = [
      { offset: 18, color: wormholeColors[0], width: 8, opacity: 0.15 },
      { offset: 14, color: wormholeColors[1], width: 6, opacity: 0.25 },
      { offset: 10, color: wormholeColors[2], width: 5, opacity: 0.35 },
      { offset: 6, color: wormholeColors[3], width: 4, opacity: 0.45 },
      { offset: 3, color: wormholeColors[4], width: 3, opacity: 0.55 },
    ];

    // Create each aura layer
    const layers = auraLayers.map((layer, i) => {
      return this.upsert(
        `wormhole-aura-${i}`,
        GCircle,
        {
          cx: 0,
          cy: 0,
          r: baseRadius + layer.offset,
          fill: 'transparent',
          stroke: layer.color,
          lineWidth: layer.width,
          strokeOpacity: layer.opacity,
        },
        this,
      );
    });

    // Core glow (central bright ring)
    const coreGlow = this.upsert(
      'wormhole-core',
      GCircle,
      {
        cx: 0,
        cy: 0,
        r: baseRadius + 1,
        fill: 'transparent',
        stroke: 'rgba(255, 255, 255, 0.8)',
        lineWidth: 2,
        strokeOpacity: 0.7,
      },
      this,
    );

    // Skip animations on low performance devices
    if (this.isLowPerformance) {
      return;
    }

    // Animate each layer with different phases to create morphing effect
    layers.forEach((layer, i) => {
      const config = auraLayers[i];
      const phase = i * 400; // Stagger animation phases
      const duration = 3000 + i * 300; // Slightly different speeds

      // Breathing/morphing animation
      layer.animate(
        [
          {
            r: baseRadius + config.offset,
            strokeOpacity: config.opacity,
            lineWidth: config.width,
          },
          {
            r: baseRadius + config.offset + 4 - i * 0.5,
            strokeOpacity: config.opacity * 0.4,
            lineWidth: config.width + 3,
          },
          {
            r: baseRadius + config.offset - 2 + i * 0.3,
            strokeOpacity: config.opacity * 1.3,
            lineWidth: config.width - 1,
          },
          {
            r: baseRadius + config.offset,
            strokeOpacity: config.opacity,
            lineWidth: config.width,
          },
        ],
        {
          duration,
          iterations: Infinity,
          easing: 'ease-in-out',
          delay: phase,
        },
      );
    });

    // Core pulsing animation
    coreGlow.animate(
      [
        { strokeOpacity: 0.7, lineWidth: 2, stroke: 'rgba(255, 255, 255, 0.8)' },
        { strokeOpacity: 0.4, lineWidth: 3, stroke: 'rgba(200, 220, 255, 0.6)' },
        { strokeOpacity: 0.9, lineWidth: 1.5, stroke: 'rgba(255, 255, 255, 0.9)' },
        { strokeOpacity: 0.7, lineWidth: 2, stroke: 'rgba(255, 255, 255, 0.8)' },
      ],
      {
        duration: 2500,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    );
  }
}

// Register if not already registered
try {
  register(ExtensionCategory.NODE, 'breathing-circle-shared', BreathingCircle);
} catch {
  // Already registered
}

const animation = {
  duration: 500,
  easing: 'linear',
};

// Read-only header showing shared status and expiration
const SharedHeader = ({
  expiresAt,
  isSnapshot,
  snapshotAt,
}: {
  expiresAt: string;
  isSnapshot: boolean;
  snapshotAt: string | null;
}) => {
  const maps = useMaps();

  const formatExpiration = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      if (diffMs <= 0) return 'Expired';
      if (diffHours > 24) {
        return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h remaining`;
      }
      if (diffHours > 0) {
        return `${diffHours}h ${diffMins}m remaining`;
      }
      return `${diffMins}m remaining`;
    } catch {
      return 'Unknown';
    }
  };

  const formatSnapshotTime = (isoString: string | null) => {
    if (!isoString) return 'Unknown time';
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Unknown time';
    }
  };

  return (
    <header className="fixed w-full z-10">
      <div className="relative">
        <div className="absolute inset-0 bg-cyber-dark-900/90 backdrop-blur-md border-b border-orange-500/30" />

        <div className="relative w-full px-2 py-1 flex justify-between items-center">
          {/* Maps list (read-only) */}
          <div className="flex items-center gap-1">
            {maps.map(map => (
              <div
                key={map.id}
                className="relative bg-cyber-dark-800/80 border border-cyber-primary/20 rounded overflow-hidden"
              >
                <div className="relative z-10 flex items-center px-1 gap-1.5">
                  {!map.started ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-cyber-danger shadow-[0_0_4px_rgba(255,51,102,0.6)]" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-cyber-accent shadow-[0_0_4px_rgba(0,255,136,0.6)] animate-pulse" />
                  )}
                  <span className="text-[9px] font-mono font-medium uppercase text-cyber-primary/80">{map.title}</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: map.color }} />
              </div>
            ))}
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2">
            {/* Snapshot or Live badge */}
            {isSnapshot ? (
              <>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 border border-blue-500/50 rounded">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-3.5 h-3.5 text-blue-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z"
                    />
                  </svg>
                  <span className="text-[10px] font-mono text-blue-400">SNAPSHOT</span>
                </div>
                <span className="text-[9px] font-mono text-gray-400">from {formatSnapshotTime(snapshotAt)}</span>
              </>
            ) : (
              <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded text-[10px] font-mono text-green-400">
                LIVE
              </span>
            )}
            <span className="text-[9px] font-mono text-gray-400">{formatExpiration(expiresAt)}</span>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
      </div>
    </header>
  );
};

// =============================================================================
// UTILITY: Compute edge directions toward home using BFS
// =============================================================================
function computeEdgeDirectionsToHome(nodes: any[], edges: any[]): Map<string, 'source' | 'target'> {
  const edgeDirections = new Map<string, 'source' | 'target'>();

  // Find home node (isMain = true)
  const homeNode = nodes.find(n => n.data?.isMain);
  if (!homeNode) {
    // No home node found - no directions to compute
    return edgeDirections;
  }

  const homeId = homeNode.id;

  // Build adjacency list (undirected graph)
  const adjacency = new Map<string, Set<string>>();
  for (const node of nodes) {
    adjacency.set(node.id, new Set());
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  // BFS from home to determine parent (next hop toward home) for each node
  const parentMap = new Map<string, string>(); // nodeId -> parentId (toward home)
  const visited = new Set<string>();
  const queue: string[] = [homeId];
  visited.add(homeId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current) || new Set();

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parentMap.set(neighbor, current); // neighbor's parent is current (one step closer to home)
        queue.push(neighbor);
      }
    }
  }

  // For each edge, determine direction toward home
  // The direction value indicates which end of the edge is CLOSER to home
  // Animation will move FROM the far end TOWARD the closer end
  for (const edge of edges) {
    const { source, target, id } = edge;

    if (source === homeId) {
      // Source IS home - animate toward source
      edgeDirections.set(id, 'source');
    } else if (target === homeId) {
      // Target IS home - animate toward target
      edgeDirections.set(id, 'target');
    } else if (parentMap.get(source) === target) {
      // Source's parent is target -> source is farther, target is closer to home
      edgeDirections.set(id, 'target');
    } else if (parentMap.get(target) === source) {
      // Target's parent is source -> target is farther, source is closer to home
      edgeDirections.set(id, 'source');
    } else {
      // Fallback (shouldn't happen in a connected tree)
      edgeDirections.set(id, 'source');
    }
  }

  return edgeDirections;
}

// Map viewer component (read-only version)
const SharedMapViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const nodes = useNodes();
  const edges = useEdges();
  const clusters = useClusters(nodes);

  const data = useMemo(() => {
    const nodeIds = new Set(nodes.map(n => n.id));
    const validEdges = edges.filter((e: any) => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Compute direction toward home for each edge using BFS
    const edgeDirections = computeEdgeDirectionsToHome(nodes, validEdges);

    // Add direction data to each edge
    const edgesWithDirection = validEdges.map((edge: any) => ({
      ...edge,
      data: {
        ...edge.data,
        // 'source' means animate toward source, 'target' means animate toward target
        directionToHome: edgeDirections.get(edge.id) || 'source',
      },
    }));

    return { nodes, edges: edgesWithDirection };
  }, [nodes, edges]);

  const clustersRef = useRef(clusters);
  clustersRef.current = clusters;

  const graphConfig = useMemo(
    () => ({
      theme: 'dark',
      container: containerRef.current,
      width: containerRef.current?.clientWidth || 800,
      height: containerRef.current?.clientHeight || 600,
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        // Read-only mode: no drag-element, click-select, or hover-activate
        {
          key: 'fix-element-size',
          type: 'fix-element-size',
          enable: true,
          node: { shape: 'label' },
        },
      ],
      plugins: [
        {
          type: 'minimap',
          size: [160, 100],
          containerStyleBackground: '#4b4848',
        },
        {
          type: 'toolbar',
          position: 'bottom-left',
          onClick: (item: string) => {
            if (!graphRef.current) return;
            if (item === 'zoom-in') {
              graphRef.current.zoomBy(1.2, animation);
            }
            if (item === 'zoom-out') {
              graphRef.current.zoomBy(0.8, animation);
            }
            if (item === 'auto-fit') {
              graphRef.current.fitView();
            }
          },
          getItems: () => {
            return [
              { id: 'zoom-in', value: 'zoom-in' },
              { id: 'zoom-out', value: 'zoom-out' },
              { id: 'auto-fit', value: 'auto-fit' },
            ];
          },
        },
        // No context menu for read-only mode
      ],
      layout: null,
      autoFit: 'view',
      defaultNode: {
        shape: 'bubble',
        size: 30,
      },
      node: {
        type: 'breathing-circle-shared',
        animation: {
          enter: false,
        },
        style: {
          size: 20,
          fill: (d: any) => d.data.bgFill,
          patternType: (d: any) => d.data.patternType || 'honeycomb',
          starIntensity: (d: any) => d.data.starIntensity || 0.8,
          tacticalColor: (d: any) => d.data.tacticalColor || 'rgba(0, 255, 255, 0.8)',
          factionType: (d: any) => d.data.factionType || 'neutral',
          statusType: (d: any) => d.data.statusType || 'neutral',
          traffic: (d: any) => d.data.traffic,
          sovereignty: (d: any) => d.data.sovereignty,
          security: (d: any) => d.data.security,
          systemClass: (d: any) => d.data.systemClass,
          labelBackground: true,
          labelBackgroundFill: '#00000040',
          labelBackgroundRadius: 4,
          labelFontFamily: 'Arial',
          labelFontSize: '20',
          labelPadding: [0, 4],
          labelText: (d: any) => d.data.name,
          halo: false,
          isMain: (d: any) => !!d.data.isMain,
          isBorder: (d: any) => d.data.isBorder || false,
          borderMaps: (d: any) => d.data.borderMaps || [],
          badges: (d: any) =>
            d.id === 'badges'
              ? [
                  { text: 'A', placement: 'right-top' },
                  { text: 'Important', placement: 'right' },
                  { text: 'Notice', placement: 'right-bottom' },
                ]
              : [],
          badgeFontSize: 8,
          badgePadding: [1, 4],
          portR: 3,
          ports: (d: any) =>
            d.id === 'ports'
              ? [{ placement: 'left' }, { placement: 'right' }, { placement: 'top' }, { placement: 'bottom' }]
              : [],
        },
      },
      edge: {
        type: EDGE_ANIMATION_TYPE,
        style: {
          // Base line style
          lineWidth: EDGE_ANIMATION_TYPE === 'ant-line' ? 2 : 3,
          stroke: EDGE_ANIMATION_TYPE === 'ant-line' ? 'rgba(0, 255, 136, 0.6)' : 'rgba(100, 150, 200, 0.5)',
          // Dashed style for ant-line effect
          ...(EDGE_ANIMATION_TYPE === 'ant-line' && {
            lineDash: [10, 10],
          }),
          // Label styling
          labelPosition: 'center',
          labelTextBaseline: 'top',
          labelDy: 5,
          labelFontSize: 12,
          labelFontWeight: 'bold',
          labelFill: '#1890ff',
          labelBackground: true,
          labelBackgroundFill: 'linear-gradient(336deg, rgba(0,0,255,.8), rgba(0,0,255,0) 70.71%)',
          labelBackgroundStroke: '#9ec9ff',
          labelBackgroundRadius: 2,
          labelText: (e: any) => e.data.name,
          labelMaxWidth: '80%',
          labelBackgroundFillOpacity: 0.5,
          labelWordWrap: true,
          labelMaxLines: 4,
        },
      },
    }),
    [],
  );

  const isInitialRenderDone = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const graph = new Graph({
      ...graphConfig,
      width,
      height,
      plugins: [...(graphConfig.plugins as any[]), ...clustersRef.current],
      container,
    });

    graphRef.current = graph;
    isInitialRenderDone.current = false;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (graphRef.current && newWidth > 0 && newHeight > 0) {
          graphRef.current.setSize(newWidth, newHeight);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (container) {
        container.innerHTML = '';
      }
      graphRef.current = null;
      isInitialRenderDone.current = false;
    };
  }, []);

  useEffect(() => {
    if (!graphRef.current || !isInitialRenderDone.current) return;

    const currentPlugins = graphRef.current.getPlugins();
    const nonHullPlugins = currentPlugins.filter((plugin: any) => plugin?.type !== 'hull');

    graphRef.current.setPlugins([...nonHullPlugins, ...clusters]);
  }, [clusters]);

  const lastRenderedDataRef = useRef<string>('');

  useEffect(() => {
    if (!graphRef.current || !data?.nodes?.length) return;

    const graph = graphRef.current;

    const dataHash = JSON.stringify({
      nodes: data.nodes
        .map((n: any) => ({ id: n.id, x: n.style?.x, y: n.style?.y }))
        .sort((a: any, b: any) => a.id.localeCompare(b.id)),
      edges: data.edges.map((e: any) => e.id).sort(),
    });

    const hasChanges = dataHash !== lastRenderedDataRef.current;

    if (!isInitialRenderDone.current) {
      graph.setData(data);
      graph.render().then(() => {
        graph.fitView();
        isInitialRenderDone.current = true;
        lastRenderedDataRef.current = dataHash;
      });
      return;
    }

    if (!hasChanges) {
      return;
    }

    graph.setData(data);
    graph.render().then(() => {
      lastRenderedDataRef.current = dataHash;
    });
  }, [data]);

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-gray-100">
      <main className="w-full bg-gray-800" style={{ height: 'calc(100vh - 40px)', marginTop: '40px' }}>
        <div ref={containerRef} className="w-full h-full" />
      </main>
    </div>
  );
};

// Main SharedDashboard component
interface SharedDashboardProps {
  data: any[];
  map_cached_data: Record<string, any>;
  license_state: any;
  expires_at: string;
  is_snapshot: boolean;
  snapshot_at: string | null;
  description?: string | null;
}

// Encrypted message style description shown below header
const DescriptionCard = ({ description }: { description: string }) => {
  return (
    <div className="fixed top-[32px] left-0 right-0 z-[9]">
      <div className="relative bg-black/90 border-b border-cyan-500/30 overflow-hidden">
        {/* Scanline effect overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
          }}
        />

        <div className="relative flex items-center gap-3 px-3 py-1.5">
          {/* Decrypt indicator */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(0,255,255,0.8)]" />
            <span className="text-[9px] font-mono text-cyan-500/80 uppercase tracking-[0.2em]">Decrypted</span>
          </div>

          {/* Separator */}
          <div className="w-px h-3 bg-cyan-500/30" />

          {/* Message content */}
          <p className="text-xs font-mono text-cyan-300/90 leading-relaxed tracking-wide">
            <span className="text-cyan-500/60 mr-1">&gt;</span>
            {description}
          </p>
        </div>

        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      </div>
    </div>
  );
};

export const SharedDashboard: React.FC<SharedDashboardProps> = ({
  data,
  map_cached_data,
  license_state,
  expires_at,
  is_snapshot,
  snapshot_at,
  description,
}) => {
  // No pushEvent - read-only mode
  const noop = () => {};

  return (
    <DashboardProvider pushEvent={noop} serverMaps={data} mapCachedData={map_cached_data} licenseState={license_state}>
      <SharedHeader expiresAt={expires_at} isSnapshot={is_snapshot} snapshotAt={snapshot_at} />
      {description && <DescriptionCard description={description} />}
      <SharedMapViewer />
    </DashboardProvider>
  );
};

export default SharedDashboard;
