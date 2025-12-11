import React, { useEffect, useMemo, useRef } from 'react';
import { Circle as GCircle, Path } from '@antv/g';
import { Circle, ExtensionCategory, Graph, register } from '@antv/g6';

import {
  useMapEdges,
  useMapLicenseState,
  useMapNodes,
  useMarkMapAsMain,
  useShowSetup,
} from '@/react/state/useDashboard';

import LicenseStatus from './LicenseStatus';

// Cyber-themed circle node for maps setup
class CyberCircle extends Circle {
  onCreate() {
    this.createOuterRing();
    this.createScanRing();
    // this.createCornerBrackets();
    this.createStatusIndicator();
  }

  onUpdate() {
    this.createOuterRing();
    this.createScanRing();
    // this.createCornerBrackets();
    this.createStatusIndicator();
  }

  // Outer glowing ring
  createOuterRing() {
    const size = this.attributes.size || 20;
    const radius = size / 2 + 4;
    const color = this.attributes.fill || '#00f0ff';

    // Outer glow ring
    this.upsert(
      'cyber-outer-ring',
      GCircle,
      {
        cx: 0,
        cy: 0,
        r: radius,
        fill: 'transparent',
        stroke: '#00f0ff',
        lineWidth: 1,
        strokeOpacity: 0.6,
      },
      this,
    );

    // Inner data ring (dashed)
    this.upsert(
      'cyber-data-ring',
      GCircle,
      {
        cx: 0,
        cy: 0,
        r: radius + 3,
        fill: 'transparent',
        stroke: '#00f0ff',
        lineWidth: 0.5,
        lineDash: [2, 4],
        strokeOpacity: 0.3,
      },
      this,
    );
  }

  // Rotating scan ring effect
  createScanRing() {
    const size = this.attributes.size || 20;
    const radius = size / 2 + 6;
    const isMain = this.attributes.halo;

    if (!isMain) return;

    // Arc segment for scanning effect
    const arcPath = this.createArcPath(0, 0, radius, 0, Math.PI / 2);

    const scanArc = this.upsert(
      'cyber-scan-arc',
      Path,
      {
        d: arcPath,
        stroke: '#00ff88',
        lineWidth: 2,
        strokeOpacity: 0.8,
        lineCap: 'round',
      },
      this,
    );

    // Animate rotation
    scanArc.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
      duration: 3000,
      iterations: Infinity,
      easing: 'linear',
    });
  }

  // Create arc path for scan effect
  createArcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const start = {
      x: cx + r * Math.cos(startAngle),
      y: cy + r * Math.sin(startAngle),
    };
    const end = {
      x: cx + r * Math.cos(endAngle),
      y: cy + r * Math.sin(endAngle),
    };
    const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;

    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  }

  // Corner bracket decorations
  createCornerBrackets() {
    const size = this.attributes.size || 20;
    const offset = size / 2 + 8;
    const bracketSize = 4;

    const corners = [
      { x: -offset, y: -offset, rot: 0 }, // top-left
      { x: offset, y: -offset, rot: 90 }, // top-right
      { x: offset, y: offset, rot: 180 }, // bottom-right
      { x: -offset, y: offset, rot: 270 }, // bottom-left
    ];

    corners.forEach((corner, i) => {
      const bracketPath = `M 0 ${bracketSize} L 0 0 L ${bracketSize} 0`;

      this.upsert(
        `cyber-bracket-${i}`,
        Path,
        {
          d: bracketPath,
          stroke: '#00f0ff',
          lineWidth: 1,
          strokeOpacity: 0.5,
          transform: `translate(${corner.x}, ${corner.y}) rotate(${corner.rot}deg)`,
        },
        this,
      );
    });
  }

  // Status indicator dot
  createStatusIndicator() {
    const size = this.attributes.size || 20;
    const isMain = this.attributes.halo;

    // Small status dot
    const statusDot = this.upsert(
      'cyber-status-dot',
      GCircle,
      {
        cx: size / 2 + 2,
        cy: -(size / 2 + 2),
        r: 2,
        fill: isMain ? '#00ff88' : '#00f0ff',
        stroke: 'transparent',
        shadowColor: isMain ? '#00ff88' : '#00f0ff',
        shadowBlur: 6,
      },
      this,
    );

    // Pulse animation for main nodes
    if (isMain) {
      statusDot.animate([{ opacity: 1 }, { opacity: 0.4 }], {
        duration: 1000,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out',
      });
    }
  }
}

// Register the cyber circle node type
register(ExtensionCategory.NODE, 'cyber-circle', CyberCircle);

const animation = {
  duration: 500,
  easing: 'linear',
};

const MapsSetup = () => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const dataAddedRef = useRef(false);

  const mapNodes = useMapNodes();
  const mapEdges = useMapEdges();
  const licenseState = useMapLicenseState();
  const markMapAsMain = useMarkMapAsMain();
  const showSetup = useShowSetup();

  const ref = useRef({ markMapAsMain });
  ref.current = { markMapAsMain };

  const data = useMemo(
    () => ({
      nodes: mapNodes,
      edges: mapEdges,
    }),
    [mapNodes, mapEdges],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize the graph
    const graph = new Graph(
      {
        theme: 'dark',
        container: containerRef.current,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        behaviors: [
          'drag-canvas',
          'zoom-canvas',
          'drag-element',
          {
            key: 'fix-element-size',
            type: 'fix-element-size',
            enable: true,
            node: { shape: 'label' },
          },
        ],
        plugins: [
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
            trigger: 'contextmenu', // 'click' or 'contextmenu'
            onClick: (type: string, _target: any, current: any) => {
              const { markMapAsMain } = ref.current;

              if (type === 'mark') {
                markMapAsMain(current.id);
              }
            },
            getItems: e => {
              return [{ name: 'Set as main', value: 'mark' }];
            },
            enable: e => e.targetType === 'node',
          },
        ],
        layout: {
          type: 'mindmap',
          direction: 'H',
          getHeight: () => 32,
          getWidth: () => 32,
          getVGap: () => 15,
          getHGap: () => 64,
        },
        autoFit: 'view',
        defaultNode: {
          shape: 'bubble',
          size: 30,
        },
        node: {
          type: 'cyber-circle',
          animation: {
            enter: false,
          },
          style: {
            size: 20,
            labelBackground: true,
            labelBackgroundFill: 'rgba(10, 14, 23, 0.8)',
            labelBackgroundRadius: 2,
            labelBackgroundStroke: 'rgba(0, 240, 255, 0.3)',
            labelBackgroundLineWidth: 1,
            labelFontFamily: 'monospace',
            labelFontSize: 11,
            labelFill: '#00f0ff',
            labelPadding: [2, 6],
            labelText: d => d.data.name,
            halo: d => !!d.data.isMain,
            fill: d => d.data.color || '#0a84ff',
            stroke: '#00f0ff',
            lineWidth: 1,
            strokeOpacity: 0.6,
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
          type: 'cubic-horizontal',
          style: {
            endArrow: true,
            endArrowSize: 6,
            endArrowFill: '#00f0ff',
            stroke: '#00f0ff',
            lineWidth: 2,
            strokeOpacity: 0.4,
            lineDash: [4, 4],
            labelPosition: 'center',
            labelTextBaseline: 'top',
            labelDy: 5,
            labelFontSize: 10,
            labelFontWeight: 'normal',
            labelFontFamily: 'monospace',
            labelFill: '#00f0ff',
            labelBackground: true,
            labelBackgroundFill: 'rgba(10, 14, 23, 0.9)',
            labelBackgroundStroke: 'rgba(0, 240, 255, 0.3)',
            labelBackgroundRadius: 2,
            labelText: e => e.data.name,
            labelMaxWidth: '80%',
            labelBackgroundFillOpacity: 0.9,
            labelWordWrap: true,
            labelMaxLines: 4,
          },
        },
      },
      // edge: {
      //   labelShape: {
      //     text: 'this is an edge with long long label',
      //   },
      //   labelBackgroundShape: {},
      // },
      // data,
    );
    // const graph = new G6.Graph({
    //   container: containerRef.current,
    //   width: containerRef.current.clientWidth,
    //   height: 600,
    //   modes: {
    //     default: ['drag-canvas', 'drag-node', 'zoom-canvas'],
    //   },
    //   defaultNode: {
    //     type: 'rect',
    //     style: {
    //       fill: '#f0f0f0',
    //       stroke: '#999',
    //       lineWidth: 1,
    //     },
    //     labelCfg: {
    //       style: {
    //         fill: '#333',
    //         fontSize: 12,
    //       },
    //     },
    //   },
    //   defaultEdge: {
    //     type: 'line',
    //     style: {
    //       stroke: '#999',
    //       lineWidth: 1,
    //     },
    //     arrow: {
    //       path: G6.Arrow.triangle(8, 8, 12),
    //       fill: '#999',
    //     },
    //   },
    //   ...config,
    // });

    graphRef.current = graph;

    // Render the graph with data
    // if (data) {

    //   graph.render();
    // }

    // Fit the view to show all elements
    // graph.fitView();

    // // Handle window resize
    // const handleResize = () => {
    //   if (!graph || graph.get('destroyed')) return;
    //   if (!containerRef.current) return;
    //   graph.changeSize(containerRef.current.clientWidth, 600);
    // };
    // window.addEventListener('resize', handleResize);

    return () => {
      // window.removeEventListener('resize', handleResize);
      // if (graph && !graph.get('destroyed')) {
      //   graph.destroy();
      // }
    };
  }, []);

  // Update graph when data changes
  useEffect(() => {
    if (graphRef.current && data) {
      if (!dataAddedRef.current) {
        dataAddedRef.current = true;
        graphRef.current.addData(data);
        graphRef.current.render();
        graphRef.current.fitView();
      } else {
        graphRef.current.setData(data);
        // graphRef.current.updateData(data);
        graphRef.current.render();
        graphRef.current.fitView();
      }
    }
  }, [data]);

  return (
    <div className="h-[340px] z-[100] fixed top-0 left-0 right-0 text-gray-100">
      {/* Cyber panel background */}
      <div className="absolute inset-0 bg-cyber-dark-900/95 backdrop-blur-md border-b border-cyber-primary/30 shadow-cyber" />

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyber-primary z-10" />
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyber-primary z-10" />

      {/* Main Content */}
      <main className="relative h-[300px] overflow-hidden">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0, 240, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.03) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Graph container */}
        <div
          ref={containerRef}
          className="relative z-10"
          style={{ width: 'calc(100% - 5px)', height: 'calc(100% - 5px)' }}
        />

        {/* Close button */}
        <button
          className="absolute top-3 right-3 z-20 p-2 rounded border border-cyber-primary/30
                     bg-cyber-dark-800/80 hover:border-cyber-primary hover:bg-cyber-primary/10
                     transition-all duration-200 group"
          onClick={() => showSetup(false)}
        >
          <span className="hero-x-mark-solid w-5 h-5 text-cyber-primary/70 group-hover:text-cyber-primary" />
        </button>

        {/* Panel title */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyber-primary shadow-[0_0_8px_rgba(0,240,255,0.6)] animate-pulse" />
          <span className="text-xs font-mono font-medium uppercase tracking-wider text-cyber-primary">Maps Setup</span>
        </div>
      </main>

      {/* Footer */}
      <aside className="relative h-[40px] border-t border-cyber-primary/20 flex items-center justify-between px-4">
        <LicenseStatus licenseState={licenseState} />

        {/* Footer accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-primary/30 to-transparent" />
      </aside>

      {/* Bottom corner accents */}
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyber-primary" />
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyber-primary" />
    </div>
  );
};

export default MapsSetup;
