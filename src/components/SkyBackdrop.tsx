import { useEffect, useRef } from 'react';

interface SkyBackdropProps {
  /** 0.15 (smoggy) -> 1.0 (crisp clear sky) */
  clarity: number;
  /** 0.2 (moderate) -> 0.92 (hazardous) */
  hazeLevel: number;
}

export function SkyBackdrop({ clarity, hazeLevel }: SkyBackdropProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rafId = 0;
    let isVisible = true;
    let lastDraw = 0;
    const startTime = performance.now();

    const puffs = [
      { bx: 0.14, by: 0.24, r: 165, speed: 0.008 },
      { bx: 0.26, by: 0.2, r: 190, speed: 0.009 },
      { bx: 0.39, by: 0.27, r: 150, speed: 0.007 },
      { bx: 0.64, by: 0.22, r: 185, speed: 0.006 },
      { bx: 0.78, by: 0.19, r: 210, speed: 0.008 },
      { bx: 0.9, by: 0.26, r: 160, speed: 0.007 },
      { bx: 0.5, by: 0.38, r: 220, speed: 0.005 },
    ];

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = 1;
      const w = Math.max(320, parent.clientWidth);
      const h = Math.max(320, parent.clientHeight);
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const paint = (now: number) => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      const elapsed = prefersReducedMotion ? 0 : (now - startTime) / 1000;

      const cleanFactor = Math.max(0, Math.min(1, clarity - hazeLevel * 0.35 + 0.25));
      const topR = Math.round(145 - cleanFactor * 54);
      const topG = Math.round(166 + cleanFactor * 18);
      const topB = Math.round(188 + cleanFactor * 56);

      const midR = Math.round(212 - cleanFactor * 36);
      const midG = Math.round(220 + cleanFactor * 10);
      const midB = Math.round(222 + cleanFactor * 30);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
      skyGrad.addColorStop(0.58, `rgb(${midR}, ${midG}, ${midB})`);
      skyGrad.addColorStop(1, '#F7F5EE');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < puffs.length; i += 1) {
        const p = puffs[i];
        const drift = ((p.bx + elapsed * p.speed) % 1.3) - 0.15;
        const cx = drift * w;
        const cy = p.by * h;
        const radius = p.r * (w < 640 ? 0.65 : 1);

        const grad = ctx.createRadialGradient(
          cx - radius * 0.16,
          cy - radius * 0.22,
          radius * 0.08,
          cx,
          cy,
          radius
        );
        const alpha = 0.45 + cleanFactor * 0.42;
        grad.addColorStop(0, `rgba(255, 255, 255, ${alpha.toFixed(2)})`);
        grad.addColorStop(0.55, `rgba(248, 250, 255, ${(alpha * 0.65).toFixed(2)})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = (now: number) => {
      if (!isVisible || prefersReducedMotion) return;
      if (now - lastDraw >= 120) {
        lastDraw = now;
        paint(now);
      }
      rafId = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const nextVisible = Boolean(entries[0]?.isIntersecting);
        isVisible = nextVisible;
        if (isVisible && !prefersReducedMotion) {
          cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(tick);
        } else {
          cancelAnimationFrame(rafId);
        }
      },
      { threshold: 0.01 }
    );

    observer.observe(canvas);
    resize();
    paint(performance.now());
    if (!prefersReducedMotion) {
      rafId = requestAnimationFrame(tick);
    }

    const handleResize = () => {
      resize();
      paint(performance.now());
    };
    window.addEventListener('resize', handleResize);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [clarity, hazeLevel]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="sky-backdrop-canvas"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
