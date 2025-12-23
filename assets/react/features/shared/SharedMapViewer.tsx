import React, { useEffect, useMemo, useRef } from 'react';
import { Circle as GCircle, Polygon, Text } from '@antv/g';
import { Circle, ExtensionCategory, Graph, register } from '@antv/g6';

import { useExpiresAt, useSharedEdges, useSharedMapData, useSharedNodes } from '@/react/state/useSharedMap';
import { isWormholeSpace } from '@/react/utils/isWormholeSpace';

// Reuse the BreathingCircle node type from Map.tsx
class BreathingCircle extends Circle {
  isLowPerformance: boolean;

  constructor(options: any) {
    super(options);
    this.isLowPerformance = false; // Enable animations for wormhole effect
  }

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

  createSecurityValueText() {
    const security = this.attributes.security;
    const systemClass = this.attributes.systemClass;
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
    if (!this.attributes.isBorder) {
      return;
    }

    const size = this.attributes.size || 50;
    const radius = size / 1.5;
    const borderColor = 'rgba(255, 165, 0, 0.9)';
    const innerBorderRadius = radius + 4;

    this.upsert(
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
  }

  createMainIndicator() {
    if (!this.attributes.isMain) {
      return;
    }

    const size = this.attributes.size || 20;
    const baseRadius = size / 2;
    const maxRadius = baseRadius + 25;

    // 3D Wormhole tunnel effect - rings emerge from center and expand outward
    // Creating a portal/vortex illusion with depth
    const numRings = 6;
    const tunnelDuration = 3000;

    // Color gradient for tunnel depth (bright center -> dim edges)
    const getColor = (progress: number) => {
      // Shift from bright cyan/white at center to deep purple at edges
      const r = Math.round(100 + 138 * progress);
      const g = Math.round(255 - 180 * progress);
      const b = Math.round(255 - 30 * progress);
      return `rgba(${r}, ${g}, ${b}, 1)`;
    };

    // Create tunnel rings that will animate from center outward
    for (let i = 0; i < numRings; i++) {
      const phaseOffset = (i / numRings) * tunnelDuration;
      const startRadius = baseRadius + 2;

      const ring = this.upsert(
        `wormhole-tunnel-${i}`,
        GCircle,
        {
          cx: 0,
          cy: 0,
          r: startRadius,
          fill: 'transparent',
          stroke: getColor(0),
          lineWidth: 3,
          strokeOpacity: 0,
        },
        this,
      );

      // Skip animations on low performance devices
      if (this.isLowPerformance) {
        // Static fallback - show rings at fixed positions
        ring.attr({
          r: baseRadius + 4 + i * 4,
          stroke: getColor(i / numRings),
          strokeOpacity: 0.3 - i * 0.04,
          lineWidth: 2,
        });
        continue;
      }

      // 3D tunnel animation - rings spawn from center, expand, fade out
      ring.animate(
        [
          // Birth - small, bright, thin
          {
            r: startRadius,
            strokeOpacity: 0,
            lineWidth: 1,
            stroke: 'rgba(255, 255, 255, 0.9)',
          },
          // Emerge - growing, peak brightness
          {
            r: baseRadius + 6,
            strokeOpacity: 0.8,
            lineWidth: 2.5,
            stroke: 'rgba(150, 255, 255, 0.9)',
          },
          // Mid-tunnel - expanding, transitioning color
          {
            r: baseRadius + 12,
            strokeOpacity: 0.6,
            lineWidth: 3,
            stroke: 'rgba(100, 200, 255, 0.8)',
          },
          // Approaching edge - larger, dimming
          {
            r: baseRadius + 18,
            strokeOpacity: 0.35,
            lineWidth: 4,
            stroke: 'rgba(138, 100, 226, 0.6)',
          },
          // Exit - fading into void
          {
            r: maxRadius,
            strokeOpacity: 0,
            lineWidth: 5,
            stroke: 'rgba(75, 0, 130, 0.3)',
          },
        ],
        {
          duration: tunnelDuration,
          iterations: Infinity,
          easing: 'ease-out',
          delay: phaseOffset,
        },
      );
    }

    // Event horizon glow - the bright center of the wormhole
    const eventHorizon = this.upsert(
      'wormhole-event-horizon',
      GCircle,
      {
        cx: 0,
        cy: 0,
        r: baseRadius + 1,
        fill: 'transparent',
        stroke: 'rgba(200, 255, 255, 0.9)',
        lineWidth: 2,
        strokeOpacity: 0.8,
      },
      this,
    );

    // Inner glow - creates depth illusion
    const innerGlow = this.upsert(
      'wormhole-inner-glow',
      GCircle,
      {
        cx: 0,
        cy: 0,
        r: baseRadius - 2,
        fill: 'rgba(150, 255, 255, 0.1)',
        stroke: 'transparent',
        fillOpacity: 0.15,
      },
      this,
    );

    if (this.isLowPerformance) {
      return;
    }

    // Event horizon pulsing - the "edge" of the portal
    eventHorizon.animate(
      [
        {
          strokeOpacity: 0.8,
          lineWidth: 2,
          stroke: 'rgba(200, 255, 255, 0.9)',
        },
        {
          strokeOpacity: 0.5,
          lineWidth: 3,
          stroke: 'rgba(255, 255, 255, 1)',
        },
        {
          strokeOpacity: 0.9,
          lineWidth: 1.5,
          stroke: 'rgba(150, 255, 200, 0.95)',
        },
        {
          strokeOpacity: 0.8,
          lineWidth: 2,
          stroke: 'rgba(200, 255, 255, 0.9)',
        },
      ],
      {
        duration: 1500,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    );

    // Inner glow breathing - simulates looking into the tunnel
    innerGlow.animate(
      [
        { fillOpacity: 0.15, r: baseRadius - 2 },
        { fillOpacity: 0.25, r: baseRadius - 1 },
        { fillOpacity: 0.1, r: baseRadius - 3 },
        { fillOpacity: 0.15, r: baseRadius - 2 },
      ],
      {
        duration: 2000,
        iterations: Infinity,
        easing: 'ease-in-out',
        delay: 500,
      },
    );
  }
}

// Register the node type if not already registered
try {
  register(ExtensionCategory.NODE, 'breathing-circle-shared', BreathingCircle);
} catch {
  // Already registered
}

const animation = {
  duration: 500,
  easing: 'linear',
};

const SharedMapViewer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const map = useSharedMapData();
  const nodes = useSharedNodes();
  const edges = useSharedEdges();
  const expiresAt = useExpiresAt();

  // Format expiration date for display
  const expiresAtFormatted = useMemo(() => {
    try {
      const date = new Date(expiresAt);
      return date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      });
    } catch {
      return expiresAt;
    }
  }, [expiresAt]);

  // Filter edges and create stable data object
  const data = useMemo(() => {
    const nodeIds = new Set(nodes.map(n => n.id));
    const validEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
    return { nodes, edges: validEdges };
  }, [nodes, edges]);

  // Graph configuration - read-only (no drag-element, no context menu)
  const graphConfig = useMemo(
    () => ({
      theme: 'dark',
      container: containerRef.current,
      width: containerRef.current?.clientWidth || 800,
      height: containerRef.current?.clientHeight || 600,
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        // No drag-element - read-only
        'click-select',
        'hover-activate',
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
        // No context menu - read-only view
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
          badgeFontSize: 8,
          badgePadding: [1, 4],
          portR: 3,
        },
      },
      edge: {
        type: 'line',
        style: {
          lineWidth: 5,
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
  const lastRenderedDataRef = useRef<string>('');

  // Initialize graph once on mount
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

  // Update data when it changes
  useEffect(() => {
    if (!graphRef.current || !data?.nodes?.length) return;

    const graph = graphRef.current;

    const dataHash = JSON.stringify({
      nodes: data.nodes.map(n => ({ id: n.id, x: n.style?.x, y: n.style?.y })).sort((a, b) => a.id.localeCompare(b.id)),
      edges: data.edges.map(e => e.id).sort(),
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
      {/* Header bar for shared view */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-gray-900/95 backdrop-blur-md border-b border-orange-500/30 px-4 py-2">
        <div className="flex items-center justify-between max-w-screen-xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/50 rounded text-orange-400 text-xs font-mono uppercase tracking-wider">
              Shared View
            </span>
            <span className="text-white font-mono text-sm">{map.title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span>Expires: {expiresAtFormatted}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full bg-gray-800" style={{ height: 'calc(100vh - 48px)', marginTop: '48px' }}>
        <div ref={containerRef} className="w-full h-full" />
      </main>
    </div>
  );
};

export default SharedMapViewer;
