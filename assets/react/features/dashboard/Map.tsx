import React, { useEffect, useMemo, useRef } from 'react';
import { Circle as CircleGeometry, Polygon, Rect, Text } from '@antv/g';
import { Circle, ExtensionCategory, Graph, Hexagon, register } from '@antv/g6';

import { useEdges, useMarkAsMain, useNodes } from '@/react/state/useDashboard';
import { Maps } from '../maps/Maps';

import useClusters from './hooks/useClusters';

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
  constructor(options) {
    super(options);
    // Detect device performance level
    this.isLowPerformance = this.detectLowPerformance();
  }

  onCreate() {
    const halo = this.shapeMap.halo;
    if (halo) {
      halo.animate([{ lineWidth: 0 }, { lineWidth: 20 }], {
        duration: 1000,
        iterations: Infinity,
        direction: 'alternate',
      });
    }

    // Create border indicator for border systems
    this.createBorderIndicator();
  }

  onUpdate() {
    const halo = this.shapeMap.halo;
    if (halo) {
      halo.animate([{ lineWidth: 0 }, { lineWidth: 20 }], {
        duration: 1000,
        iterations: Infinity,
        direction: 'alternate',
      });
    }

    // Update border indicator
    this.createBorderIndicator();
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

    const size = this.attributes.size || 30;
    const radius = size / 2;
    const borderColor = 'rgba(255, 165, 0, 0.9)'; // Orange color for border indication

    // Create outer border ring
    const outerBorderRadius = radius + 8;
    const outerBorder = this.upsert(
      'border-outer-ring',
      Polygon,
      {
        points: this.getHexagonPoints(outerBorderRadius),
        fill: 'transparent',
        stroke: borderColor,
        strokeWidth: 2,
        strokeOpacity: 0.8,
        filter: 'blur(0.5px) drop-shadow(0 0 5px rgba(255,165,0,0.6))',
      },
      this,
    );

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

    // Animate outer border pulsing
    outerBorder.animate(
      [
        { strokeOpacity: 0.8, strokeWidth: 2 },
        { strokeOpacity: 0.4, strokeWidth: 3 },
      ],
      {
        duration: 1500,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out',
      },
    );

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

    // Add corner warning markers for border systems
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const cornerX = outerBorderRadius * Math.cos(angle);
      const cornerY = outerBorderRadius * Math.sin(angle);
      const markerSize = 4;

      const warningMarker = this.upsert(
        `border-warning-${i}`,
        Rect,
        {
          x: cornerX - markerSize / 2,
          y: cornerY - markerSize / 2,
          width: markerSize,
          height: markerSize,
          fill: borderColor,
          opacity: 0.8,
          filter: 'blur(0.3px)',
        },
        this,
      );

      // Animate warning markers
      warningMarker.animate(
        [
          { opacity: 0.8, transform: 'scale(1)' },
          { opacity: 0.3, transform: 'scale(1.3)' },
        ],
        {
          duration: 1000,
          iterations: Infinity,
          direction: 'alternate',
          delay: i * 100,
          easing: 'ease-in-out',
        },
      );
    }
  }
}

register(ExtensionCategory.NODE, 'breathing-circle', BreathingCircle);

class HaloHexagon extends Hexagon {
  constructor(options) {
    super(options);
    // Detect device performance level
    this.isLowPerformance = this.detectLowPerformance();
  }

  onCreate() {
    // this.createStarVisualization();
    this.createTacticalOverlay();
    // this.createFactionEmblem();
    // this.create3DGlowHalo();
    // this.createHaloAnimation();
  }

  onUpdate() {
    // this.createStarVisualization();
    this.createTacticalOverlay();
    // this.createFactionEmblem();
    // this.create3DGlowHalo();
    // this.createHaloAnimation();
  }

  setState(name, value, item) {
    if (name === 'selected') {
      if (value) {
        this.createSelectionRipples();
      } else {
        this.clearSelectionRipples();
      }
    } else if (name === 'hover') {
      if (value) {
        this.createHoverCard(item);
      } else {
        this.clearHoverCard();
      }
    }
    // Call parent setState for other states
    super.setState && super.setState(name, value, item);
  }

  detectLowPerformance() {
    // Simple performance detection for older devices
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isOldDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4;

    return !gl || isMobile || isOldDevice || performance.memory?.usedJSHeapSize > 50000000;
  }

  createHaloAnimation() {
    // Only create halo animation if the node has halo = true
    if (!this.attributes.halo) {
      return;
    }

    // Skip animation on very low performance devices
    if (this.isLowPerformance) {
      this.createStaticHalo();
      return;
    }

    const size = this.attributes.size || 30;
    const radius = size / 2;

    // Simplified single halo ring for performance
    const haloId = 'halo-ring';
    const haloRadius = radius + 10;

    // Create simple hexagonal halo using polygon
    const points = this.getHexagonPoints(haloRadius);

    const halo = this.upsert(
      haloId,
      Polygon,
      {
        points,
        fill: 'transparent',
        stroke: this.attributes.fill || '#4951BE',
        strokeWidth: 2,
        strokeOpacity: 0.5,
      },
      this,
    );

    // Simple opacity pulsing - most performance friendly
    halo.animate([{ strokeOpacity: 0.5 }, { strokeOpacity: 0.1 }], {
      duration: 2000, // Slower animation for better performance
      iterations: Infinity,
      direction: 'alternate',
      easing: 'linear', // Linear easing is faster than cubic curves
    });
  }

  createStaticHalo() {
    // Static halo for very old devices - no animation
    const size = this.attributes.size || 30;
    const radius = size / 2;
    const haloRadius = radius + 10;
    const points = this.getHexagonPoints(haloRadius);

    this.upsert(
      'static-halo',
      Polygon,
      {
        points,
        fill: 'transparent',
        stroke: this.attributes.fill || '#4951BE',
        strokeWidth: 1,
        strokeOpacity: 0.3,
      },
      this,
    );
  }

  createInternalPatterns() {
    const size = this.attributes.size || 30;
    const radius = size / 2;
    const patternType = this.attributes.patternType || 'honeycomb';

    // Choose pattern based on node data
    switch (patternType) {
      case 'honeycomb':
        this.createHoneycombPattern(radius);
        break;
      case 'triangular':
        this.createTriangularPattern(radius);
        break;
      case 'radial':
        this.createRadialPattern(radius);
        break;
      case 'grid':
        this.createGridPattern(radius);
        break;
      default:
        this.createHoneycombPattern(radius);
    }
  }

  createHoneycombPattern(radius) {
    const patternRadius = radius * 0.6;
    const cellRadius = patternRadius * 0.25;

    // Central hexagon
    const centerPoints = this.getHexagonPoints(cellRadius);
    this.upsert(
      'pattern-center',
      Polygon,
      {
        points: centerPoints,
        fill: 'transparent',
        stroke: this.attributes.fill || '#4951BE',
        strokeWidth: 1,
        strokeOpacity: 0.4,
      },
      this,
    );

    // Surrounding hexagons (6 cells around center)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const offsetX = cellRadius * 1.8 * Math.cos(angle);
      const offsetY = cellRadius * 1.8 * Math.sin(angle);

      const cellPoints = this.getHexagonPoints(cellRadius * 0.8).map(([x, y]) => [x + offsetX, y + offsetY]);

      this.upsert(
        `pattern-cell-${i}`,
        Polygon,
        {
          points: cellPoints,
          fill: 'transparent',
          stroke: this.attributes.fill || '#4951BE',
          strokeWidth: 0.8,
          strokeOpacity: 0.3,
        },
        this,
      );
    }
  }

  createTriangularPattern(radius) {
    const patternRadius = radius * 0.7;

    // Create triangular mesh inside hexagon
    for (let layer = 0; layer < 3; layer++) {
      const layerRadius = patternRadius * (0.3 + layer * 0.2);

      for (let i = 0; i < 6; i++) {
        const angle1 = (i * Math.PI) / 3;
        const angle2 = ((i + 1) * Math.PI) / 3;

        const x1 = layerRadius * Math.cos(angle1);
        const y1 = layerRadius * Math.sin(angle1);
        const x2 = layerRadius * Math.cos(angle2);
        const y2 = layerRadius * Math.sin(angle2);

        // Create triangle from center to edge points
        const trianglePoints = [
          [0, 0],
          [x1, y1],
          [x2, y2],
        ];

        this.upsert(
          `pattern-triangle-${layer}-${i}`,
          Polygon,
          {
            points: trianglePoints,
            fill: 'transparent',
            stroke: this.attributes.fill || '#4951BE',
            strokeWidth: 0.5,
            strokeOpacity: 0.25 + layer * 0.1,
          },
          this,
        );
      }
    }
  }

  createRadialPattern(radius) {
    const patternRadius = radius * 0.8;

    // Create concentric circles and radial lines
    for (let r = 0; r < 3; r++) {
      const circleRadius = patternRadius * (0.2 + r * 0.2);
      const segments = 24;
      const circlePoints = [];

      for (let i = 0; i < segments; i++) {
        const angle = (i * Math.PI * 2) / segments;
        const x = circleRadius * Math.cos(angle);
        const y = circleRadius * Math.sin(angle);
        circlePoints.push([x, y]);
      }

      this.upsert(
        `pattern-circle-${r}`,
        Polygon,
        {
          points: circlePoints,
          fill: 'transparent',
          stroke: this.attributes.fill || '#4951BE',
          strokeWidth: 0.5,
          strokeOpacity: 0.2 + r * 0.1,
        },
        this,
      );
    }

    // Radial lines
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8;
      const x = patternRadius * Math.cos(angle);
      const y = patternRadius * Math.sin(angle);

      const linePoints = [
        [0, 0],
        [x, y],
      ];

      this.upsert(
        `pattern-line-${i}`,
        Polygon,
        {
          points: linePoints,
          fill: 'transparent',
          stroke: this.attributes.fill || '#4951BE',
          strokeWidth: 0.5,
          strokeOpacity: 0.2,
        },
        this,
      );
    }
  }

  createGridPattern(radius) {
    const patternRadius = radius * 0.7;
    const gridSize = 5;
    const cellSize = (patternRadius * 2) / gridSize;

    // Create grid lines
    for (let i = 0; i <= gridSize; i++) {
      const offset = -patternRadius + i * cellSize;

      // Vertical lines
      const vLinePoints = [
        [offset, -patternRadius],
        [offset, patternRadius],
      ];
      this.upsert(
        `pattern-vline-${i}`,
        Polygon,
        {
          points: vLinePoints,
          fill: 'transparent',
          stroke: this.attributes.fill || '#4951BE',
          strokeWidth: 0.3,
          strokeOpacity: 0.2,
        },
        this,
      );

      // Horizontal lines
      const hLinePoints = [
        [-patternRadius, offset],
        [patternRadius, offset],
      ];
      this.upsert(
        `pattern-hline-${i}`,
        Polygon,
        {
          points: hLinePoints,
          fill: 'transparent',
          stroke: this.attributes.fill || '#4951BE',
          strokeWidth: 0.3,
          strokeOpacity: 0.2,
        },
        this,
      );
    }
  }

  createStarVisualization() {
    const size = this.attributes.size || 30;
    const radius = size / 2;
    const starIntensity = this.attributes.starIntensity || 0.8;
    const starColor = this.attributes.fill || '#4951BE';

    // Create central star core
    const starCore = this.upsert(
      'star-core',
      CircleGeometry,
      {
        r: radius * 0.3,
        fill: starColor,
        filter: `blur(0.5px) drop-shadow(0 0 ${radius * 0.8}px ${starColor}CC)`,
        opacity: starIntensity,
      },
      this,
    );

    // Create lens flare rings
    const flareRings = 4;
    for (let i = 0; i < flareRings; i++) {
      const flareRadius = radius * (0.4 + i * 0.15);
      const flareOpacity = (1 - i * 0.2) * starIntensity * 0.3;

      const flareRing = this.upsert(
        `star-flare-${i}`,
        CircleGeometry,
        {
          r: flareRadius,
          fill: 'transparent',
          stroke: starColor,
          strokeWidth: 1,
          strokeOpacity: flareOpacity,
          filter: `blur(${1 + i * 0.5}px)`,
        },
        this,
      );

      // Animate flare pulsing
      flareRing.animate(
        [
          { strokeOpacity: flareOpacity, r: flareRadius },
          { strokeOpacity: flareOpacity * 0.5, r: flareRadius * 1.1 },
        ],
        {
          duration: 2000 + i * 300,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
          delay: i * 100,
        },
      );
    }

    // Create lens flare spikes
    const spikeCount = 8;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i * Math.PI * 2) / spikeCount;
      const spikeLength = radius * (1.2 + Math.random() * 0.3);
      const spikeWidth = 0.5 + Math.random() * 0.3;

      const spike = this.upsert(
        `star-spike-${i}`,
        Polygon,
        {
          points: [
            [0, 0],
            [spikeLength * Math.cos(angle), spikeLength * Math.sin(angle)],
          ],
          stroke: starColor,
          strokeWidth: spikeWidth,
          strokeOpacity: starIntensity * 0.6,
          filter: `blur(0.5px) drop-shadow(0 0 3px ${starColor}80)`,
        },
        this,
      );

      // Animate spike flickering
      spike.animate(
        [
          { strokeOpacity: starIntensity * 0.6 },
          { strokeOpacity: starIntensity * 0.2 },
          { strokeOpacity: starIntensity * 0.8 },
        ],
        {
          duration: 1000 + Math.random() * 1000,
          iterations: Infinity,
          delay: Math.random() * 2000,
        },
      );
    }

    // Animate star core pulsing
    starCore.animate(
      [
        { opacity: starIntensity, r: radius * 0.3 },
        { opacity: starIntensity * 1.2, r: radius * 0.35 },
      ],
      {
        duration: 1500,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out',
      },
    );
  }

  createTacticalOverlay() {
    const size = this.attributes.size || 30;
    const radius = size / 2;
    const tacticalColor = this.attributes.tacticalColor || 'rgba(0, 255, 255, 0.8)';

    // Main hexagonal tactical outline
    const tacticalHex = this.upsert(
      'tactical-hex',
      Polygon,
      {
        points: this.getHexagonPoints(radius),
        fill: 'transparent',
        stroke: tacticalColor,
        strokeWidth: 1.5,
        strokeOpacity: 0.8,
        filter: 'blur(0.3px)',
      },
      this,
    );

    // Corner markers for tactical feel
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const cornerX = radius * Math.cos(angle);
      const cornerY = radius * Math.sin(angle);
      const markerSize = 3;

      const cornerMarker = this.upsert(
        `tactical-corner-${i}`,
        Rect,
        {
          x: cornerX - markerSize / 2,
          y: cornerY - markerSize / 2,
          width: markerSize,
          height: markerSize,
          fill: tacticalColor,
          opacity: 0.9,
        },
        this,
      );
    }

    // Scanning tactical lines
    if (!this.isLowPerformance) {
      const scanLine = this.upsert(
        'tactical-scan',
        Polygon,
        {
          points: this.getHexagonPoints(radius * 0.8),
          fill: 'transparent',
          stroke: tacticalColor,
          strokeWidth: 0.5,
          strokeOpacity: 0.5,
          strokeDasharray: [2, 3],
        },
        this,
      );

      scanLine.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 10 }], {
        duration: 3000,
        iterations: Infinity,
        easing: 'linear',
      });
    }
  }

  createFactionEmblem() {
    const size = this.attributes.size || 30;
    const radius = size / 2;
    const factionType = this.attributes.factionType || 'neutral';
    const emblemSize = radius * 0.4;

    // Skip emblems on low performance devices
    if (this.isLowPerformance) {
      return;
    }

    // Position emblem above the star
    const emblemY = -radius * 0.6;

    // Create holographic emblem base
    const emblemBase = this.upsert(
      'faction-emblem-base',
      Rect,
      {
        x: -emblemSize / 2,
        y: emblemY - emblemSize / 2,
        width: emblemSize,
        height: emblemSize,
        fill: 'rgba(0, 255, 255, 0.1)',
        stroke: 'rgba(0, 255, 255, 0.6)',
        strokeWidth: 0.5,
        radius: 2,
        filter: 'blur(0.5px)',
      },
      this,
    );

    // Create faction-specific symbol
    let emblemSymbol;
    switch (factionType) {
      case 'caldari':
        emblemSymbol = '❖'; // Diamond
        break;
      case 'gallente':
        emblemSymbol = '●'; // Circle
        break;
      case 'minmatar':
        emblemSymbol = '▲'; // Triangle
        break;
      case 'amarr':
        emblemSymbol = '✦'; // Star
        break;
      case 'pirate':
        emblemSymbol = '☠'; // Skull
        break;
      case 'concord':
        emblemSymbol = '⚖'; // Scales
        break;
      default:
        emblemSymbol = '?'; // Unknown
    }

    const emblemText = this.upsert(
      'faction-emblem-symbol',
      Text,
      {
        x: 0,
        y: emblemY,
        text: emblemSymbol,
        fontSize: emblemSize * 0.6,
        fill: 'rgba(0, 255, 255, 0.9)',
        textAlign: 'center',
        textBaseline: 'middle',
        fontWeight: 'bold',
        filter: 'drop-shadow(0 0 3px rgba(0,255,255,0.8))',
      },
      this,
    );

    // Holographic floating animation
    emblemBase.animate(
      [
        { transform: 'translateY(0px) rotateZ(0deg)', opacity: 0.8 },
        { transform: 'translateY(-2px) rotateZ(2deg)', opacity: 1 },
        { transform: 'translateY(0px) rotateZ(0deg)', opacity: 0.8 },
      ],
      {
        duration: 3000,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    );

    emblemText.animate(
      [
        { transform: 'translateY(0px)', opacity: 0.9 },
        { transform: 'translateY(-2px)', opacity: 1 },
        { transform: 'translateY(0px)', opacity: 0.9 },
      ],
      {
        duration: 3000,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    );
  }

  create3DGlowHalo() {
    const size = this.attributes.size || 30;
    const radius = size / 2;
    const statusType = this.attributes.statusType || 'neutral';

    // Define status colors
    const statusColors = {
      safe: '#00BFFF', // Blue
      hostile: '#FF4444', // Red
      friendly: '#00FF88', // Green
      wormhole: '#AA44FF', // Purple
      neutral: '#888888', // Gray
    };

    const glowColor = statusColors[statusType] || statusColors.neutral;
    const glowRadius = radius * 1.8;

    // Create multi-layer 3D glow effect
    const glowLayers = 4;

    for (let i = 0; i < glowLayers; i++) {
      const layerRadius = glowRadius - i * radius * 0.15;
      const layerOpacity = (0.4 - i * 0.08) * (this.isLowPerformance ? 0.5 : 1);
      const blurIntensity = 2 + i * 1.5;

      const glowLayer = this.upsert(
        `glow-halo-${i}`,
        CircleGeometry,
        {
          r: layerRadius,
          fill: 'transparent',
          stroke: glowColor,
          strokeWidth: 1.5 - i * 0.2,
          strokeOpacity: layerOpacity,
          filter: `blur(${blurIntensity}px)`,
        },
        this,
      );

      // Animate 3D glow pulsing
      glowLayer.animate(
        [
          {
            strokeOpacity: layerOpacity,
            r: layerRadius,
            filter: `blur(${blurIntensity}px)`,
          },
          {
            strokeOpacity: layerOpacity * 1.5,
            r: layerRadius * 1.05,
            filter: `blur(${blurIntensity * 1.2}px)`,
          },
        ],
        {
          duration: 2500 + i * 200,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
          delay: i * 100,
        },
      );
    }

    // Add intensity sparkles for non-low performance devices
    if (!this.isLowPerformance) {
      const sparkleCount = 6;
      for (let i = 0; i < sparkleCount; i++) {
        const angle = (i * Math.PI * 2) / sparkleCount;
        const sparkleDistance = radius * (1.2 + Math.random() * 0.4);
        const sparkleX = sparkleDistance * Math.cos(angle);
        const sparkleY = sparkleDistance * Math.sin(angle);

        const sparkle = this.upsert(
          `glow-sparkle-${i}`,
          CircleGeometry,
          {
            r: 0.5,
            cx: sparkleX,
            cy: sparkleY,
            fill: glowColor,
            filter: `blur(0.5px) drop-shadow(0 0 2px ${glowColor})`,
          },
          this,
        );

        sparkle.animate(
          [
            { opacity: 0.2, r: 0.5 },
            { opacity: 0.8, r: 1 },
            { opacity: 0, r: 0.5 },
          ],
          {
            duration: 1500 + Math.random() * 1000,
            iterations: Infinity,
            delay: Math.random() * 2000,
            easing: 'ease-out',
          },
        );
      }
    }
  }

  createSelectionRipples() {
    // Skip ripples on very low performance devices
    if (this.isLowPerformance) {
      this.createStaticSelectionHighlight();
      return;
    }

    const size = this.attributes.size || 30;
    const radius = size / 2;
    const rippleCount = 4;
    const baseColor = this.attributes.fill || '#4951BE';

    // Clear any existing ripples
    this.clearSelectionRipples();

    for (let i = 0; i < rippleCount; i++) {
      const rippleId = `selection-ripple-${i}`;
      const startRadius = radius + 5;
      const endRadius = radius + 30 + i * 15;

      // Create hexagonal ripple ring
      const ripplePoints = this.getHexagonPoints(startRadius);

      const ripple = this.upsert(
        rippleId,
        Polygon,
        {
          points: ripplePoints,
          fill: 'transparent',
          stroke: baseColor,
          strokeWidth: 3,
          strokeOpacity: 0.8,
          filter: 'blur(0.5px)',
        },
        this,
      );

      // Animate ripple expanding outward
      const rippleAnimation = ripple.animate(
        [
          {
            strokeOpacity: 0.8,
            strokeWidth: 3,
            transform: `scale(1)`,
          },
          {
            strokeOpacity: 0.4,
            strokeWidth: 2,
            transform: `scale(${endRadius / startRadius})`,
          },
          {
            strokeOpacity: 0,
            strokeWidth: 1,
            transform: `scale(${(endRadius + 10) / startRadius})`,
          },
        ],
        {
          duration: 1000 + i * 200,
          iterations: Infinity,
          delay: i * 150,
          easing: 'ease-out',
        },
      );

      // Store animation reference for cleanup
      if (!this.selectionAnimations) {
        this.selectionAnimations = [];
      }
      this.selectionAnimations.push(rippleAnimation);
    }

    // Create pulsing center highlight
    const centerHighlight = this.upsert(
      'selection-center',
      Polygon,
      {
        points: this.getHexagonPoints(radius * 1.1),
        fill: 'transparent',
        stroke: baseColor,
        strokeWidth: 2,
        strokeOpacity: 0.6,
      },
      this,
    );

    const centerAnimation = centerHighlight.animate(
      [
        { strokeOpacity: 0.6, strokeWidth: 2 },
        { strokeOpacity: 1, strokeWidth: 3 },
      ],
      {
        duration: 800,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out',
      },
    );

    if (!this.selectionAnimations) {
      this.selectionAnimations = [];
    }
    this.selectionAnimations.push(centerAnimation);
  }

  createStaticSelectionHighlight() {
    // Static highlight for low performance devices
    const size = this.attributes.size || 30;
    const radius = size / 2;
    const baseColor = this.attributes.fill || '#4951BE';

    this.upsert(
      'selection-static',
      Polygon,
      {
        points: this.getHexagonPoints(radius + 8),
        fill: 'transparent',
        stroke: baseColor,
        strokeWidth: 2,
        strokeOpacity: 0.8,
      },
      this,
    );
  }

  clearSelectionRipples() {
    // Stop all selection animations
    if (this.selectionAnimations) {
      this.selectionAnimations.forEach(animation => {
        if (animation && animation.cancel) {
          animation.cancel();
        }
      });
      this.selectionAnimations = [];
    }

    // Remove selection elements
    const rippleCount = 4;
    for (let i = 0; i < rippleCount; i++) {
      const rippleElement = this.getElementById(`selection-ripple-${i}`);
      if (rippleElement) {
        rippleElement.remove();
      }
    }

    // Remove center highlight and static highlight
    const centerElement = this.getElementById('selection-center');
    if (centerElement) {
      centerElement.remove();
    }

    const staticElement = this.getElementById('selection-static');
    if (staticElement) {
      staticElement.remove();
    }
  }

  createHoverCard(item) {
    // Skip hover effects on low performance devices
    if (this.isLowPerformance) {
      return;
    }

    // Clear any existing hover modal
    this.clearHoverCard();

    const size = this.attributes.size || 30;
    const radius = size / 2;
    const nodeData = item?.data || {};
    const nodeName = nodeData.name || 'Unknown System';

    // Holographic modal dimensions
    const modalWidth = 200;
    const modalHeight = 80;
    const modalX = radius + 30;
    const modalY = -modalHeight / 2;

    // Create holographic backdrop with multiple layers
    this.createHolographicBackdrop(modalX, modalY, modalWidth, modalHeight);

    // Create animated text display
    this.createAnimatedText(nodeName, modalX, modalY, modalWidth, modalHeight);

    // Add holographic scanning lines
    this.createScanningLines(modalX, modalY, modalWidth, modalHeight);

    // Create energy beam connecting hex to modal
    this.createEnergyBeam(radius, modalX, modalY, modalHeight);

    // Scale up the hexagon with holographic glow
    const hexNode = this.shapeMap.key;
    if (hexNode) {
      hexNode.animate(
        [
          { transform: 'scale(1)', filter: 'drop-shadow(0 0 5px rgba(0,255,255,0.3))' },
          { transform: 'scale(1.1)', filter: 'drop-shadow(0 0 15px rgba(0,255,255,0.8))' },
        ],
        {
          duration: 300,
          easing: 'ease-out',
        },
      );
    }
  }

  createHolographicBackdrop(x, y, width, height) {
    const baseColor = this.attributes.fill || '#4951BE';

    // Main modal background with holographic effect
    const mainBg = this.upsert(
      'holo-modal-bg',
      Rect,
      {
        x,
        y,
        width,
        height,
        fill: 'rgba(0, 255, 255, 0.05)',
        stroke: 'rgba(0, 255, 255, 0.6)',
        strokeWidth: 2,
        radius: 4,
        filter: 'blur(0.5px) drop-shadow(0 0 10px rgba(0,255,255,0.4))',
      },
      this,
    );

    // Secondary glow layer
    const glowBg = this.upsert(
      'holo-modal-glow',
      Rect,
      {
        x: x - 2,
        y: y - 2,
        width: width + 4,
        height: height + 4,
        fill: 'transparent',
        stroke: 'rgba(0, 255, 255, 0.3)',
        strokeWidth: 1,
        radius: 6,
        filter: 'blur(2px)',
      },
      this,
    );

    // Animate backdrop appearance
    mainBg.animate(
      [
        { opacity: 0, transform: 'scale(0.8) rotateY(45deg)' },
        { opacity: 1, transform: 'scale(1) rotateY(0deg)' },
      ],
      {
        duration: 400,
        easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    );

    glowBg.animate(
      [
        { opacity: 0, strokeOpacity: 0 },
        { opacity: 1, strokeOpacity: 0.3 },
      ],
      {
        duration: 300,
        delay: 100,
        easing: 'ease-out',
      },
    );

    // Pulsing glow animation
    glowBg.animate(
      [
        { strokeOpacity: 0.3, filter: 'blur(2px)' },
        { strokeOpacity: 0.6, filter: 'blur(3px)' },
      ],
      {
        duration: 1500,
        iterations: Infinity,
        direction: 'alternate',
        easing: 'ease-in-out',
      },
    );
  }

  createAnimatedText(text, x, y, width, height) {
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    // Main text with holographic styling
    const mainText = this.upsert(
      'holo-text-main',
      Text,
      {
        x: centerX,
        y: centerY - 5,
        text,
        fontSize: 16,
        fontWeight: 'bold',
        fill: 'rgba(0, 255, 255, 0.9)',
        fontFamily: 'Courier New, monospace',
        textAlign: 'center',
        textBaseline: 'middle',
        filter: 'drop-shadow(0 0 8px rgba(0,255,255,0.8))',
      },
      this,
    );

    // Glitch effect text layer
    const glitchText = this.upsert(
      'holo-text-glitch',
      Text,
      {
        x: centerX + 1,
        y: centerY - 4,
        text,
        fontSize: 16,
        fontWeight: 'bold',
        fill: 'rgba(255, 0, 255, 0.3)',
        fontFamily: 'Courier New, monospace',
        textAlign: 'center',
        textBaseline: 'middle',
      },
      this,
    );

    // Animate text appearance with typewriter effect
    const fullText = text;
    let currentText = '';

    // Simulate typewriter by updating text content
    for (let i = 0; i <= fullText.length; i++) {
      setTimeout(() => {
        currentText = fullText.substring(0, i) + (i < fullText.length ? '_' : '');
        mainText.attr('text', currentText);
        glitchText.attr('text', currentText);
      }, i * 80);
    }

    // Flickering animation
    mainText.animate([{ opacity: 0.9 }, { opacity: 0.7 }, { opacity: 1 }], {
      duration: 200,
      iterations: Infinity,
      delay: Math.random() * 1000,
    });

    // Glitch displacement animation
    glitchText.animate(
      [
        { transform: 'translateX(1px) translateY(-1px)', opacity: 0.3 },
        { transform: 'translateX(-1px) translateY(1px)', opacity: 0.1 },
        { transform: 'translateX(0px) translateY(0px)', opacity: 0.2 },
      ],
      {
        duration: 150,
        iterations: Infinity,
        delay: Math.random() * 800,
      },
    );
  }

  createScanningLines(x, y, width, height) {
    const lineCount = 3;

    for (let i = 0; i < lineCount; i++) {
      const scanLine = this.upsert(
        `holo-scan-line-${i}`,
        Rect,
        {
          x,
          y: y + (i * height) / lineCount,
          width,
          height: 1,
          fill: 'rgba(0, 255, 255, 0.6)',
          filter: 'blur(0.5px)',
        },
        this,
      );

      // Animate scanning effect
      scanLine.animate(
        [
          { opacity: 0, transform: 'scaleX(0)' },
          { opacity: 0.8, transform: 'scaleX(1)' },
          { opacity: 0, transform: 'scaleX(0)' },
        ],
        {
          duration: 2000,
          iterations: Infinity,
          delay: i * 200,
          easing: 'ease-in-out',
        },
      );
    }
  }

  createEnergyBeam(hexRadius, modalX, modalY, modalHeight) {
    const beamPath = [
      [hexRadius, 0],
      [modalX - 5, modalY + modalHeight / 2],
    ];

    const energyBeam = this.upsert(
      'holo-energy-beam',
      Polygon,
      {
        points: beamPath,
        stroke: 'rgba(0, 255, 255, 0.4)',
        strokeWidth: 2,
        filter: 'blur(1px) drop-shadow(0 0 5px rgba(0,255,255,0.6))',
      },
      this,
    );

    // Animate energy beam
    energyBeam.animate(
      [
        { strokeOpacity: 0, strokeWidth: 2 },
        { strokeOpacity: 0.4, strokeWidth: 3 },
        { strokeOpacity: 0.2, strokeWidth: 1 },
      ],
      {
        duration: 800,
        iterations: Infinity,
        easing: 'ease-in-out',
      },
    );

    // Beam particles effect
    const particles = this.upsert(
      'holo-beam-particles',
      Polygon,
      {
        points: beamPath,
        stroke: 'rgba(255, 255, 255, 0.8)',
        strokeWidth: 0.5,
        strokeDasharray: [2, 4],
      },
      this,
    );

    particles.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 10 }], {
      duration: 500,
      iterations: Infinity,
      easing: 'linear',
    });
  }

  clearHoverCard() {
    // Remove holographic modal elements
    const holoElements = [
      'holo-modal-bg',
      'holo-modal-glow',
      'holo-text-main',
      'holo-text-glitch',
      'holo-scan-line-0',
      'holo-scan-line-1',
      'holo-scan-line-2',
      'holo-energy-beam',
      'holo-beam-particles',
    ];

    holoElements.forEach(id => {
      const element = this.getElementById(id);
      if (element) {
        element.remove();
      }
    });

    // Scale hexagon back to normal and remove holographic glow
    const hexNode = this.shapeMap.key;
    if (hexNode) {
      hexNode.animate(
        [
          { transform: 'scale(1.1)', filter: 'drop-shadow(0 0 15px rgba(0,255,255,0.8))' },
          { transform: 'scale(1)', filter: 'drop-shadow(0 0 5px rgba(0,255,255,0.3))' },
          { transform: 'scale(1)', filter: 'none' },
        ],
        {
          duration: 200,
          easing: 'ease-in',
        },
      );
    }
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
}

register(ExtensionCategory.NODE, 'halo-hexagon', HaloHexagon);

const animation = {
  duration: 500,
  easing: 'linear',
};

const Map = () => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);

  const nodes = useNodes();
  const edges = useEdges();
  const clusters = useClusters(nodes);
  const markAsMain = useMarkAsMain();

  const ref = useRef({ markAsMain });
  ref.current = { markAsMain };

  const data = useMemo(
    () => ({
      nodes,
      edges,
    }),
    [nodes, edges],
  );

  // Create graph configuration
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
        ...clusters,
      ],
      layout: {
        type: 'force',
        preventOverlap: true,
        linkDistance: d => {
          return 10;
        },
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
          fill: d => d.data.bgFill,
          patternType: d => d.data.patternType || 'honeycomb',
          starIntensity: d => d.data.starIntensity || 0.8,
          tacticalColor: d => d.data.tacticalColor || 'rgba(0, 255, 255, 0.8)',
          factionType: d => d.data.factionType || 'neutral',
          statusType: d => d.data.statusType || 'neutral',
          traffic: d => d.data.traffic,
          sovereignty: d => d.data.sovereignty,
          security: d => d.data.security,
          labelBackground: true,
          labelBackgroundFill: '#00000040',
          labelBackgroundRadius: 4,
          labelFontFamily: 'Arial',
          labelFontSize: '20',
          labelPadding: [0, 4],
          labelText: d => d.data.name,
          halo: d => !!d.data.isMain,
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
        type: 'cubic-horizontal',
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
    [clusters],
  );

  // Initialize graph once
  useEffect(() => {
    if (!containerRef.current) return;

    // Clear the container
    containerRef.current.innerHTML = '';

    // Create new graph
    const graph = new Graph({
      ...graphConfig,
      container: containerRef.current,
    });

    graphRef.current = graph;

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      graphRef.current = null;
    };
  }, [graphConfig]);

  // Update data when it changes
  useEffect(() => {
    if (!graphRef.current || !data?.nodes?.length) return;

    console.log('Updating graph with data:', {
      nodeCount: data.nodes.length,
      nodeIds: data.nodes.map(n => n.id),
      uniqueNodeIds: [...new Set(data.nodes.map(n => n.id))].length,
    });

    // Use setData to completely replace the data
    graphRef.current.setData(data);
    graphRef.current.render();
    graphRef.current.fitView();
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Topbar */}
      <Maps />

      {/* Main Content */}
      <main className="h-screen bg-gray-800 overflow-y-auto">
        {/* Grid Layout */}

        <div ref={containerRef} style={{ width: 'calc(100% - 5px)', height: 'calc(100% - 5px)' }} />
      </main>
    </div>
  );
};

export default Map;
