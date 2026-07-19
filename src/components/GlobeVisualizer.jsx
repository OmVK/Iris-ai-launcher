import React, { useEffect, useRef } from 'react';

export default function GlobeVisualizer({ state = 'idle', className = '' }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = 100;

    const colors = {
      idle: { r: 136, g: 135, b: 128 },
      listening: { r: 55, g: 138, b: 221 },
      thinking: { r: 127, g: 119, b: 221 },
      speaking: { r: 29, g: 158, b: 117 }
    };

    const aurora = [
      { base: [80, 220, 170], speed: 0.011, phase: 0 },
      { base: [110, 160, 230], speed: 0.008, phase: 2.1 },
      { base: [180, 120, 230], speed: 0.013, phase: 4.2 }
    ];

    let t = 0;
    let animationFrameId;

    const points = [];
    const N = 700;
    for (let i = 0; i < N; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      points.push({
        x: Math.sin(phi) * Math.cos(theta),
        y: Math.sin(phi) * Math.sin(theta),
        z: Math.cos(phi),
        seed: Math.random() * 10
      });
    }

    function rotateY(p, a) {
      const cos = Math.cos(a), sin = Math.sin(a);
      return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
    }
    
    function rotateX(p, a) {
      const cos = Math.cos(a), sin = Math.sin(a);
      return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
    }

    function drawAurora(currentState) {
      const speedMul = currentState === 'thinking' ? 1.8 : (currentState === 'speaking' ? 1.4 : 1);
      const intensityMul = currentState === 'idle' ? 0.6 : 1;

      for (const band of aurora) {
        const n = 60;
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2;
          const wob = Math.sin(a * 3 + t * band.speed * speedMul + band.phase) * 10
                    + Math.sin(a * 5 - t * band.speed * 0.6 * speedMul + band.phase) * 6;
          const rr = R + 26 + wob;
          const px = cx + Math.cos(a) * rr;
          const py = cy + Math.sin(a) * rr * 0.92;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        const [r, g, b] = band.base;
        const alpha = (0.10 + 0.05 * Math.sin(t * band.speed * 1.3 + band.phase)) * intensityMul;
        ctx.strokeStyle = `rgba(${r},${g},${b},${Math.max(alpha, 0.03).toFixed(3)})`;
        ctx.lineWidth = 14;
        ctx.filter = 'blur(6px)';
        ctx.stroke();
        ctx.filter = 'none';
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      drawAurora(state);

      const c = colors[state] || colors.idle;
      let rotSpeed = state === 'thinking' ? 0.010 : 0.004;
      let tilt = 0.45;

      const sorted = points.map(p => {
        let q = rotateY(p, t * rotSpeed);
        q = rotateX(q, tilt);
        return { ...p, proj: q };
      }).sort((a, b) => a.proj.z - b.proj.z);

      for (const p of sorted) {
        const q = p.proj;
        const scale = (q.z + 1.6) / 2.6;
        const px = cx + q.x * R;
        const py = cy + q.y * R;

        let radius = 1.3 * scale;
        let alpha = 0.25 + 0.55 * scale;

        if (state === 'listening') {
          const wobble = Math.sin(t * 0.05 + p.seed) * 0.5 + 0.5;
          radius = (1.0 + wobble * 1.4) * scale;
          alpha = (0.3 + wobble * 0.6) * scale;
        } else if (state === 'speaking') {
          const pulse = Math.sin(t * 0.08 + p.seed * 0.7) * 0.5 + 0.5;
          radius = (1.0 + pulse * 1.8) * scale;
          alpha = (0.35 + pulse * 0.65) * scale;
        } else if (state === 'thinking') {
          const sweep = Math.sin(t * 0.025 + q.y * 4) * 0.5 + 0.5;
          radius = (1.0 + sweep * 1.4) * scale;
          alpha = (0.25 + sweep * 0.6) * scale;
        } else {
          radius = (1.0 + Math.sin(t * 0.008 + p.seed) * 0.3) * scale;
          alpha = (0.2 + 0.3 * scale);
        }

        ctx.beginPath();
        ctx.arc(px, py, Math.max(radius, 0.4), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha.toFixed(2)})`;
        ctx.fill();
      }

      t += 1;
      animationFrameId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state]);

  return (
    <div className={`flex flex-col items-center justify-center relative ${className}`}>
      <canvas ref={canvasRef} width={320} height={320} className="w-[200px] h-[200px]" />
    </div>
  );
}
