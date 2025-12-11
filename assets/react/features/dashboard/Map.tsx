import React, { useEffect, useMemo, useRef } from 'react';
import { Circle as GCircle, Polygon, Text } from '@antv/g';
import { Circle, ExtensionCategory, Graph, register } from '@antv/g6';

import { useEdges, useMarkAsMain, useNodes } from '@/react/state/useDashboard';
import { isWormholeSpace } from '@/react/utils/isWormholeSpace';
import { Maps } from '../maps/Maps';

import useClusters from './hooks/useClusters';

class BreathingCircle extends Circle {
  constructor(options) {
    super(options);
    // Detect device performance level
    this.isLowPerformance = this.detectLowPerformance();
  }

  onCreate() {
    // Create security value text in center
    this.createSecurityValueText();

    // Create border indicator for border systems
    this.createBorderIndicator();

    // Create main system indicator (dotted orange border)
    this.createMainIndicator();
  }

  onUpdate() {
    // Update security value text
    this.createSecurityValueText();

    // Update border indicator
    this.createBorderIndicator();

    // Update main system indicator
    this.createMainIndicator();
  }

  detectLowPerformance() {
    // Simple performance detection for older devices
    // const canvas = document.createElement('canvas');
    // const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    // const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    // const isOldDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;

    // return !gl || isMobile || isOldDevice || performance.memory?.usedJSHeapSize > 50000000;
    return true;
  }

  createSecurityValueText() {
    const security = this.attributes.security;
    const systemClass = this.attributes.systemClass;
    const isWormhole = isWormholeSpace(systemClass);

    // Only create text if security value exists
    if (security === undefined || security === null) {
      return;
    }

    // Format security value to 1 decimal place
    const securityText = isWormhole
      ? `C${systemClass}`
      : typeof security === 'number'
        ? security.toFixed(1)
        : String(security);

    // Determine text color based on security value
    let textColor = '#FFFFFF'; // Default white
    if (typeof security === 'number') {
      if (security >= 0.7) {
        textColor = '#00BFFF'; // Blue for high security
      } else if (security >= 0.5) {
        textColor = '#90EE90'; // Light green for medium-high security
      } else if (security >= 0.3) {
        textColor = '#FFA500'; // Orange for medium security
      } else {
        textColor = '#FF6B6B'; // Red for low security
      }
    }

    // Create or update security text element
    const securityTextElement = this.upsert(
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

  getHexagonPoints(radius) {
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
    // Only create border indicator if the node is marked as a border system
    if (!this.attributes.isBorder) {
      return;
    }

    const size = this.attributes.size || 50;
    const radius = size / 1.5;
    const borderColor = 'rgba(255, 165, 0, 0.9)'; // Orange color for border indication

    // Create inner border ring
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

    // Skip animations on low performance devices
    if (this.isLowPerformance) {
      return;
    }

    // Animate inner border pulsing (slightly offset)
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
        delay: 750, // Offset by half duration for alternating pulse effect
      },
    );
  }

  createMainIndicator() {
    // Only create main indicator if the node is marked as main
    if (!this.attributes.isMain) {
      return;
    }

    const size = this.attributes.size || 20;
    const radius = size / 2 + 3; // Slightly larger than the node

    // Create dotted orange circle border for main systems
    this.upsert(
      'main-indicator-ring',
      GCircle,
      {
        cx: 0,
        cy: 0,
        r: radius,
        fill: 'transparent',
        stroke: '#00f705', // Orange color
        lineWidth: 1,
        lineDash: [1, 5], // Dotted pattern: 4px dash, 3px gap
        strokeOpacity: 0.9,
      },
      this,
    );
  }
}

register(ExtensionCategory.NODE, 'breathing-circle', BreathingCircle);

const animation = {
  duration: 500,
  easing: 'linear',
};

const Map = () => {
  const containerRef = useRef(null);
  const graphRef = useRef<Graph | null>(null);

  const nodes = useNodes();
  const edges = useEdges();
  const clusters = useClusters(nodes);
  const markAsMain = useMarkAsMain();

  const ref = useRef({ markAsMain });
  ref.current = { markAsMain };

  // Filter edges and create stable data object
  const data = useMemo(() => {
    // Filter edges to only include those where both source and target nodes exist
    const nodeIds = new Set(nodes.map(n => n.id));
    const validEdges = edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

    // Debug: Log first node to verify x/y coordinates
    if (nodes.length > 0) {
      console.log('[Map] First node data:', {
        id: nodes[0].id,
        style: nodes[0].style,
      });
    }

    return { nodes, edges: validEdges };
  }, [nodes, edges]);

  // Store clusters in a ref for plugin updates without recreating the graph
  const clustersRef = useRef(clusters);
  clustersRef.current = clusters;

  // Create graph configuration - stable, doesn't depend on clusters
  const graphConfig = useMemo(
    () => ({
      theme: 'dark',
      container: containerRef.current,
      width: containerRef.current?.clientWidth || 800,
      height: containerRef.current?.clientHeight || 600,
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        'drag-element',
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
          onClick: item => {
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
              { id: 'export', value: 'export' },
            ];
          },
        },
        {
          type: 'contextmenu',
          trigger: 'contextmenu',
          onClick: (type: string, _target: any, current: any) => {
            const { markAsMain } = ref.current;
            if (type === 'mark') {
              markAsMain(current.id);
            }
          },
          getItems: e => {
            return [
              // { name: 'Set as main for map', value: 'mark' }
            ];
          },
          enable: e => e.targetType === 'node',
        },
      ],
      // No layout - use predefined x/y coordinates from node data directly
      layout: null,
      autoFit: 'view',
      defaultNode: {
        shape: 'bubble',
        size: 30,
      },
      node: {
        type: 'breathing-circle',
        animation: {
          enter: false,
        },
        style: {
          size: 20,
          fill: d => d.data.bgFill,
          patternType: d => d.data.patternType || 'honeycomb',
          starIntensity: d => d.data.starIntensity || 0.8,
          tacticalColor: d => d.data.tacticalColor || 'rgba(0, 255, 255, 0.8)',
          factionType: d => d.data.factionType || 'neutral',
          statusType: d => d.data.statusType || 'neutral',
          traffic: d => d.data.traffic,
          sovereignty: d => d.data.sovereignty,
          security: d => d.data.security,
          systemClass: d => d.data.systemClass,
          labelBackground: true,
          labelBackgroundFill: '#00000040',
          labelBackgroundRadius: 4,
          labelFontFamily: 'Arial',
          labelFontSize: '20',
          labelPadding: [0, 4],
          labelText: d => d.data.name,
          halo: false,
          isMain: d => !!d.data.isMain,
          isBorder: d => d.data.isBorder || false,
          borderMaps: d => d.data.borderMaps || [],
          badges: d =>
            d.id === 'badges'
              ? [
                  {
                    text: 'A',
                    placement: 'right-top',
                  },
                  {
                    text: 'Important',
                    placement: 'right',
                  },
                  {
                    text: 'Notice',
                    placement: 'right-bottom',
                  },
                ]
              : [],
          badgeFontSize: 8,
          badgePadding: [1, 4],
          portR: 3,
          ports: d =>
            d.id === 'ports'
              ? [{ placement: 'left' }, { placement: 'right' }, { placement: 'top' }, { placement: 'bottom' }]
              : [],
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
          labelText: e => e.data.name,
          labelMaxWidth: '80%',
          labelBackgroundFillOpacity: 0.5,
          labelWordWrap: true,
          labelMaxLines: 4,
        },
      },
    }),
    [], // Empty deps - config is now stable
  );

  // Track if initial render has been done
  const isInitialRenderDone = useRef(false);

  // Initialize graph once on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Clear the container
    container.innerHTML = '';

    // Get actual container dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Create new graph with initial clusters
    const graph = new Graph({
      ...graphConfig,
      width,
      height,
      plugins: [...graphConfig.plugins, ...clustersRef.current],
      container,
    });

    graphRef.current = graph;
    isInitialRenderDone.current = false;

    // Handle resize
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
  }, []); // Only run on mount

  // Update clusters when they change (without recreating graph)
  useEffect(() => {
    if (!graphRef.current || !isInitialRenderDone.current) return;

    // Get current non-hull plugins and merge with new clusters
    const currentPlugins = graphRef.current.getPlugins();
    const nonHullPlugins = currentPlugins.filter((plugin: any) => plugin?.type !== 'hull');

    // Set all plugins (non-hull + new clusters)
    graphRef.current.setPlugins([...nonHullPlugins, ...clusters]);
  }, [clusters]);

  // Track previous data to detect changes
  const lastRenderedDataRef = useRef<string>('');

  // Update data when it changes
  useEffect(() => {
    console.log('[Map] Data effect triggered', {
      hasGraph: !!graphRef.current,
      nodeCount: data?.nodes?.length,
      edgeCount: data?.edges?.length,
      edgeIds: data?.edges?.map(e => e.id),
    });

    if (!graphRef.current || !data?.nodes?.length) return;

    const graph = graphRef.current;

    // Create a hash of current data to detect any changes (including position updates)
    const dataHash = JSON.stringify({
      nodes: data.nodes.map(n => ({ id: n.id, x: n.style?.x, y: n.style?.y })).sort((a, b) => a.id.localeCompare(b.id)),
      edges: data.edges.map(e => e.id).sort(),
    });

    const hasChanges = dataHash !== lastRenderedDataRef.current;

    console.log('[Map] Change detection:', {
      hasChanges,
      isInitialRenderDone: isInitialRenderDone.current,
      currentHash: dataHash.substring(0, 100),
      lastHash: lastRenderedDataRef.current.substring(0, 100),
    });

    // Initial render
    if (!isInitialRenderDone.current) {
      console.log('[Map] Initial graph render:', { nodeCount: data.nodes.length });

      graph.setData(data);
      graph.render().then(() => {
        graph.fitView();
        isInitialRenderDone.current = true;
        lastRenderedDataRef.current = dataHash;
      });
      return;
    }

    // Skip if no changes
    if (!hasChanges) {
      console.log('[Map] Skipping - no changes detected');
      return;
    }

    console.log('[Map] Graph update:', {
      nodes: data.nodes.length,
      edges: data.edges.length,
    });

    // Always use setData + render for reliability
    graph.setData(data);
    graph.render().then(() => {
      lastRenderedDataRef.current = dataHash;
      console.log('[Map] Graph render complete');
    });
  }, [data]);

  return (
    <div className="h-screen overflow-hidden bg-gray-900 text-gray-100">
      {/* Topbar (fixed position) */}
      <Maps />

      {/* Main Content - uses calc to subtract header height */}
      <main className="w-full bg-gray-800" style={{ height: 'calc(100vh - 40px)', marginTop: '40px' }}>
        <div ref={containerRef} className="w-full h-full" />
      </main>
    </div>
  );
};

export default Map;
