'use client';

import { useEffect, useRef, useState } from 'react';

const TECHS = [
  { label: 'Next.js',    icon: '▲' },
  { label: 'React',      icon: '⚛' },
  { label: 'TypeScript', icon: 'TS' },
  { label: 'Supabase',   icon: '⚡' },
  { label: 'PostgreSQL', icon: '🐘' },
  { label: 'Linux',      icon: '🐧' },
  { label: 'Vercel',     icon: '◆' },
  { label: 'Node.js',    icon: '⬡' },
];

interface Particle { x: number; y: number; vx: number; vy: number; }

export default function TechStackWeb() {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const nodeRefs    = useRef<(HTMLDivElement | null)[]>([]);
  const particles   = useRef<Particle[]>([]);
  const hoveredRef  = useRef(-1);
  const animRef     = useRef(0);
  const sizeRef     = useRef({ w: 0, h: 0 });
  const [hovered, setHovered] = useState(-1);
  const [ready, setReady]     = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const init = (w: number, h: number) => {
      sizeRef.current = { w, h };
      canvas.width  = w;
      canvas.height = h;

      if (particles.current.length === 0) {
        const n = TECHS.length;
        particles.current = TECHS.map((_, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
          return {
            x:  w / 2 + w * 0.3  * Math.cos(angle) + (Math.random() - 0.5) * 40,
            y:  h / 2 + h * 0.32 * Math.sin(angle) + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
          };
        });
        setReady(true);
      }
    };

    const ro = new ResizeObserver(entries => {
      const e = entries[0];
      const w = Math.round(e.contentRect.width);
      const h = Math.round(e.contentRect.height);
      if (w > 0 && h > 0) init(w, h);
    });
    ro.observe(canvas);

    // Fallback if ResizeObserver fires late
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (w > 0 && h > 0) init(w, h);

    const draw = () => {
      const { w, h } = sizeRef.current;
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, w, h);
      const ps  = particles.current;
      const hi  = hoveredRef.current;

      for (const p of ps) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 80 || p.x > w - 80) p.vx *= -1;
        if (p.y < 40 || p.y > h - 40) p.vy *= -1;
      }

      // Draw connections between all pairs
      for (let i = 0; i < ps.length; i++) {
        for (let j = i + 1; j < ps.length; j++) {
          const dx   = ps[i].x - ps[j].x;
          const dy   = ps[i].y - ps[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const MAX  = 350;
          if (dist > MAX) continue;
          const lit   = hi !== -1 && (i === hi || j === hi);
          const alpha = (1 - dist / MAX) * (lit ? 0.9 : 0.25);
          ctx.strokeStyle = lit ? `rgba(255,213,79,${alpha})` : `rgba(255,255,255,${alpha})`;
          ctx.lineWidth   = lit ? 1.5 : 0.8;
          ctx.beginPath();
          ctx.moveTo(ps[i].x, ps[i].y);
          ctx.lineTo(ps[j].x, ps[j].y);
          ctx.stroke();
        }
      }

      // Sync node div positions
      for (let i = 0; i < ps.length; i++) {
        const el = nodeRefs.current[i];
        if (el) {
          el.style.left = `${ps[i].x}px`;
          el.style.top  = `${ps[i].y}px`;
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      />
      {ready && TECHS.map((tech, i) => {
        const isHovered = hovered === i;
        const isDimmed  = hovered !== -1 && hovered !== i;
        return (
          <div
            key={tech.label}
            ref={el => { nodeRefs.current[i] = el; }}
            onMouseEnter={() => { hoveredRef.current = i; setHovered(i); }}
            onMouseLeave={() => { hoveredRef.current = -1; setHovered(-1); }}
            style={{
              position:      'absolute',
              transform:     `translate(-50%, -50%) scale(${isHovered ? 1.65 : isDimmed ? 0.78 : 1})`,
              transition:    'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease, background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
              opacity:       isDimmed ? 0.4 : 1,
              pointerEvents: 'auto',
              cursor:        'default',
              userSelect:    'none',
              display:       'flex',
              alignItems:    'center',
              gap:           7,
              padding:       '9px 16px',
              borderRadius:  28,
              whiteSpace:    'nowrap',
              background:    isHovered ? 'rgba(255,213,79,0.18)' : 'rgba(255,255,255,0.1)',
              border:        `1.5px solid ${isHovered ? 'rgba(255,213,79,0.85)' : 'rgba(255,255,255,0.25)'}`,
              backdropFilter:'blur(8px)',
              boxShadow:     isHovered
                ? '0 0 28px rgba(255,213,79,0.4), 0 4px 16px rgba(0,0,0,0.3)'
                : '0 2px 10px rgba(0,0,0,0.25)',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1, color: isHovered ? '#FFD54F' : 'rgba(255,255,255,0.7)' }}>
              {tech.icon}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', color: isHovered ? '#FFD54F' : '#fff' }}>
              {tech.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
