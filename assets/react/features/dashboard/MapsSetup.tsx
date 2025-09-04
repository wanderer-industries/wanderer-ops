import React, { useEffect, useMemo, useRef } from 'react';
import { Circle as CircleGeometry } from '@antv/g';
import { Circle, ExtensionCategory, Graph, register } from '@antv/g6';

import { useMapEdges, useMapNodes, useMarkMapAsMain, useShowSetup } from '@/react/state/useDashboard';

class RippleCircle extends Circle {
  onCreate() {
    const { fill } = this.attributes;
    const r = this.shapeMap.key.style.r;
    const length = 5;
    const fillOpacity = 0.5;

    Array.from({ length }).map((_, index) => {
      const ripple = this.upsert(
        `ripple-${index}`,
        CircleGeometry,
        {
          r,
          fill,
          fillOpacity,
        },
        this,
      );
      ripple.animate(
        [
          { r, fillOpacity },
          { r: r + length * 5, fillOpacity: 0 },
        ],
        {
          duration: 1000 * length,
          iterations: Infinity,
          delay: 1000 * index,
          easing: 'ease-cubic',
        },
      );
    });
  }
}

register(ExtensionCategory.NODE, 'ripple-circle', RippleCircle);

class BreathingCircle extends Circle {
  onCreate() {
    const halo = this.shapeMap.halo;
    if (!halo) {
      return;
    }

    halo.animate([{ lineWidth: 0 }, { lineWidth: 20 }], {
      duration: 1000,
      iterations: Infinity,
      direction: 'alternate',
    });
  }

  onUpdate() {
    const halo = this.shapeMap.halo;
    if (!halo) {
      return;
    }

    halo.animate([{ lineWidth: 0 }, { lineWidth: 20 }], {
      duration: 1000,
      iterations: Infinity,
      direction: 'alternate',
    });
  }
}

register(ExtensionCategory.NODE, 'breathing-circle', BreathingCircle);

const animation = {
  duration: 500,
  easing: 'linear',
};

// const data1 = {
//   nodes: [
//     {
//       id: 'halo',
//       data: {
//         name: 'Circle1',
//         mapId: '1',
//         halo: true,
//       },
//     },
//     {
//       id: 'badges',
//       data: {
//         name: 'Circle2',
//         mapId: '1',
//       },
//     },
//     {
//       id: 'badges22',
//       data: {
//         name: 'Circle2',
//         mapId: '1',
//       },
//     },
//     {
//       id: 'ports',
//       data: {
//         name: 'Circle3',
//         mapId: '1',
//       },
//     },
//     {
//       id: 'badges2',
//       data: {
//         name: 'Circle2',
//         mapId: '2',
//       },
//     },
//     {
//       id: 'ports2',
//       data: {
//         name: 'Circle3',
//         mapId: '2',
//       },
//     },
//   ],
//   edges: [
//     {
//       id: 'edge1',
//       source: 'halo',
//       target: 'badges',
//       data: {
//         name: 'Edge1',
//       },
//     },
//     {
//       id: 'edge12',
//       source: 'halo',
//       target: 'badges22',
//       data: {
//         name: 'Edge1',
//       },
//     },
//     {
//       id: 'edge2',
//       source: 'badges',
//       target: 'ports',
//       data: {
//         name: 'Edge2',
//       },
//     },
//     // {
//     //   id: 'edge3',
//     //   source: 'halo',
//     //   target: 'badges2',
//     //   data: {
//     //     name: 'Edge222',
//     //   },
//     // },
//     {
//       id: 'edge4',
//       source: 'badges2',
//       target: 'ports2',
//       data: {
//         name: 'Edge2',
//       },
//     },
//   ],
// };

const MapsSetup = () => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const dataAddedRef = useRef(false);

  const mapNodes = useMapNodes();
  const mapEdges = useMapEdges();
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
          type: 'breathing-circle',
          animation: {
            enter: false,
          },
          style: {
            size: 20,
            labelBackground: true,
            labelBackgroundFill: '#00000040',
            labelBackgroundRadius: 4,
            labelFontFamily: 'Arial',
            labelFontSize: '20',
            labelPadding: [0, 4],
            labelText: d => d.data.name,
            // iconFontFamily: 'iconfont',
            // iconText: '\ue602',
            halo: d => !!d.data.isMain,
            fill: d => d.data.color,
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
          type: 'cubic-horizontal',
          style: {
            endArrow: true,
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
    <div className="max-h-[300px] h-[300px] z-[100] fixed top-0 left-0 right-0  text-gray-100 shadow-lg">
      {/* Main Content */}
      <main className="h-[300px] bg-gray-400 overflow-y-auto">
        {/* Grid Layout */}

        <div ref={containerRef} style={{ width: 'calc(100% - 5px)', height: 'calc(100% - 5px)' }} />
        <div
          className="absolute top-4 right-4 hero-x-mark-solid font-lg w-10 h-10 hover:bg-black"
          onClick={() => showSetup(false)}
        />
      </main>
    </div>
  );
};

export default MapsSetup;
