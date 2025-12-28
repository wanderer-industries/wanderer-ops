import React, { useEffect, useRef } from 'react';

interface StatusGaugeProps {
  attack: number;
  maxAttack: number;
  coherence: number;
  maxCoherence: number;
  suppressorPenalty?: number;
  shieldCharges?: number;
}

export const StatusGauge: React.FC<StatusGaugeProps> = ({
  attack,
  maxAttack,
  coherence,
  maxCoherence,
  suppressorPenalty = 0,
  shieldCharges = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 20;

    const animate = (timestamp: number) => {
      timeRef.current = timestamp * 0.001;
      const time = timeRef.current;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw outer ring (dark base)
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(40, 50, 60, 0.8)';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Draw attack bars (left side - orange/yellow)
      const attackPercent = attack / maxAttack;
      const attackBars = 10;
      const barHeight = 12;
      const barSpacing = 4;
      const totalBarHeight = attackBars * (barHeight + barSpacing);
      const startY = centerY - totalBarHeight / 2;

      for (let i = 0; i < attackBars; i++) {
        const barProgress = (i + 1) / attackBars;
        const isActive = barProgress <= attackPercent;
        const animOffset = Math.sin(time * 3 + i * 0.3) * 0.1;
        const barX = centerX - radius - 25;
        const barY = startY + i * (barHeight + barSpacing);
        const barWidth = 8;

        // Bar background
        ctx.fillStyle = 'rgba(30, 40, 50, 0.8)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Active bar fill
        if (isActive) {
          const intensity = suppressorPenalty > 0 ? 0.6 : 1;
          const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
          gradient.addColorStop(0, `rgba(255, ${180 - i * 10}, 0, ${(0.7 + animOffset) * intensity})`);
          gradient.addColorStop(1, `rgba(255, ${140 - i * 8}, 0, ${(0.9 + animOffset) * intensity})`);
          ctx.fillStyle = gradient;
          ctx.fillRect(barX, barY, barWidth, barHeight);

          // Glow effect
          ctx.shadowColor = `rgba(255, ${160 - i * 10}, 0, ${0.5 + animOffset})`;
          ctx.shadowBlur = 6;
          ctx.fillRect(barX, barY, barWidth, barHeight);
          ctx.shadowBlur = 0;
        }
      }

      // Draw coherence bars (right side - red)
      const coherencePercent = coherence / maxCoherence;
      const coherenceBars = 10;

      for (let i = 0; i < coherenceBars; i++) {
        const barProgress = (i + 1) / coherenceBars;
        const isActive = barProgress <= coherencePercent;
        const animOffset = Math.sin(time * 2.5 + i * 0.4 + Math.PI) * 0.1;
        const barX = centerX + radius + 17;
        const barY = startY + i * (barHeight + barSpacing);
        const barWidth = 8;

        // Bar background
        ctx.fillStyle = 'rgba(30, 40, 50, 0.8)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Active bar fill
        if (isActive) {
          const gradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
          gradient.addColorStop(0, `rgba(255, ${50 + i * 5}, ${50 + i * 5}, ${0.7 + animOffset})`);
          gradient.addColorStop(1, `rgba(200, ${40 + i * 4}, ${40 + i * 4}, ${0.9 + animOffset})`);
          ctx.fillStyle = gradient;
          ctx.fillRect(barX, barY, barWidth, barHeight);

          // Glow effect
          ctx.shadowColor = `rgba(255, ${60 + i * 5}, ${60 + i * 5}, ${0.4 + animOffset})`;
          ctx.shadowBlur = 5;
          ctx.fillRect(barX, barY, barWidth, barHeight);
          ctx.shadowBlur = 0;
        }
      }

      // Draw inner circle background
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(10, 20, 30, 0.9)';
      ctx.fill();

      // Draw arc indicators on the ring
      // Attack arc (left, 180-270 degrees)
      const attackArcAngle = (attackPercent * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, Math.PI + attackArcAngle, false);
      ctx.strokeStyle = suppressorPenalty > 0 ? 'rgba(153, 51, 255, 0.8)' : 'rgba(255, 160, 0, 0.8)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Coherence arc (right, 0-90 degrees)
      const coherenceArcAngle = (coherencePercent * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + coherenceArcAngle, false);
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Draw center icon (virus/hacker symbol)
      drawVirusIcon(ctx, centerX, centerY, 25 + Math.sin(time * 2) * 2);

      // Draw attack value at top
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = suppressorPenalty > 0 ? '#9933ff' : '#ffa000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`*${attack}`, centerX, centerY - radius - 12);

      // Draw coherence value at bottom
      ctx.fillStyle = '#ff5555';
      ctx.fillText(String(coherence), centerX + 8, centerY + radius + 12);

      // Draw wifi-like icon for coherence
      drawCoherenceIcon(ctx, centerX - 14, centerY + radius + 12);

      // Draw shield indicator if active
      if (shieldCharges > 0) {
        drawShieldIndicator(ctx, centerX, centerY - radius / 2, shieldCharges, time);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [attack, maxAttack, coherence, maxCoherence, suppressorPenalty, shieldCharges]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={150} height={150} className="drop-shadow-lg" />
    </div>
  );
};

function drawVirusIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 2;

  // Draw stylized virus/circuit icon (3 prongs like in the image)
  const prongs = 3;
  const prongLength = size * 0.7;

  for (let i = 0; i < prongs; i++) {
    const angle = (i * Math.PI * 2) / prongs - Math.PI / 2;
    const endX = x + Math.cos(angle) * prongLength;
    const endY = y + Math.sin(angle) * prongLength;

    // Main prong line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Curved ends
    const curveRadius = size * 0.25;
    const curveAngle = angle + Math.PI / 2;
    ctx.beginPath();
    ctx.arc(
      endX + Math.cos(angle) * curveRadius,
      endY + Math.sin(angle) * curveRadius,
      curveRadius,
      curveAngle + Math.PI,
      curveAngle,
      true,
    );
    ctx.stroke();
  }

  // Center dot
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#e0e0e0';
  ctx.fill();
}

function drawCoherenceIcon(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.strokeStyle = '#ff5555';
  ctx.lineWidth = 1.5;

  // Draw wifi-like signal icon
  const arcs = 3;
  for (let i = 0; i < arcs; i++) {
    const radius = 3 + i * 3;
    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
  }

  // Base dot
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ff5555';
  ctx.fill();
}

function drawShieldIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, charges: number, time: number) {
  const pulse = Math.sin(time * 4) * 0.2 + 0.8;
  ctx.fillStyle = `rgba(0, 255, 255, ${0.8 * pulse})`;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shield icon (simple)
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x - 6, y - 4);
  ctx.lineTo(x - 6, y + 2);
  ctx.lineTo(x, y + 8);
  ctx.lineTo(x + 6, y + 2);
  ctx.lineTo(x + 6, y - 4);
  ctx.closePath();
  ctx.strokeStyle = `rgba(0, 255, 255, ${0.9 * pulse})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Charge count
  ctx.fillText(String(charges), x, y);
}

export default StatusGauge;
