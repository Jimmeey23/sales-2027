import { useEffect, useRef } from 'react';

/* Monsoon over the July cover: rain in three depths, splashes and ripples where it lands,
   floodwater that rises and settles with a moving surface, a low mist, and the odd distant
   flash of lightning. One canvas, drawn behind the cover's content so every figure stays
   readable. It pauses when the tab is hidden and draws one still frame for reduced motion. */

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
  depth: number; // 0 far … 1 near
}
interface Splash {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}
interface Ripple {
  x: number;
  y: number;
  r: number;
  life: number;
}

const WIND = 0.22; // horizontal drift per unit of fall

export default function MonsoonScene() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let drops: Drop[] = [];
    const splashes: Splash[] = [];
    const ripples: Ripple[] = [];
    let flash = 0;
    let nextFlash = 6 + Math.random() * 10;
    let frame = 0;
    let last = performance.now();
    let t = 0;

    const spawn = (anywhere: boolean): Drop => {
      const depth = Math.random() ** 1.6; // most drops are far away
      return {
        x: Math.random() * (w + h * WIND) - h * WIND,
        y: anywhere ? Math.random() * h : -Math.random() * h * 0.3,
        len: 10 + depth * 26,
        speed: 520 + depth * 900,
        depth,
      };
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = box.width;
      h = box.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(700, (w * h) / 1900));
      drops = Array.from({ length: count }, () => spawn(true));
    };

    /* The water line: rises over the first seconds, then breathes, with layered waves. */
    const level = () => {
      const rise = still ? 1 : Math.min(1, t / 7);
      const eased = 1 - (1 - rise) ** 3;
      return h - h * (0.08 + 0.28 * eased + 0.015 * Math.sin(t * 0.35));
    };
    const surface = (x: number, base: number) =>
      base +
      Math.sin(x * 0.012 + t * 1.3) * 4 +
      Math.sin(x * 0.031 - t * 1.9) * 2.2 +
      Math.sin(x * 0.0045 + t * 0.6) * 6;

    const drawWater = (base: number) => {
      // Body: murky monsoon water, darker with depth.
      const body = ctx.createLinearGradient(0, base - 10, 0, h);
      body.addColorStop(0, 'rgba(120, 146, 150, 0.55)');
      body.addColorStop(0.25, 'rgba(62, 82, 84, 0.72)');
      body.addColorStop(1, 'rgba(22, 30, 31, 0.9)');
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, surface(x, base));
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = body;
      ctx.fill();

      // Reflection of the sky: soft bands that drift across the surface.
      ctx.save();
      ctx.clip();
      for (let i = 0; i < 5; i++) {
        const y = base + 14 + i * 22 + Math.sin(t * 0.8 + i) * 3;
        const band = ctx.createLinearGradient(0, y - 3, 0, y + 3);
        band.addColorStop(0, 'rgba(255,255,255,0)');
        band.addColorStop(0.5, `rgba(210, 228, 230, ${0.08 - i * 0.012})`);
        band.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = band;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
          const yy = y + Math.sin(x * 0.02 + t * (1.2 + i * 0.2)) * 2.5;
          if (x === 0) ctx.moveTo(x, yy - 3);
          else ctx.lineTo(x, yy - 3);
        }
        for (let x = w; x >= 0; x -= 12) ctx.lineTo(x, y + 3 + Math.sin(x * 0.02 + t * (1.2 + i * 0.2)) * 2.5);
        ctx.fill();
      }
      ctx.restore();

      // Crest: a bright, broken line where light catches the surface.
      ctx.beginPath();
      for (let x = 0; x <= w; x += 6) {
        const y = surface(x, base);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(225, 238, 240, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([22, 9, 6, 12]);
      ctx.lineDashOffset = -t * 40;
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      const base = level();

      // Overcast wash: the light of a heavy-rain afternoon.
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, 'rgba(40, 56, 64, 0.32)');
      sky.addColorStop(0.6, 'rgba(30, 42, 46, 0.12)');
      sky.addColorStop(1, 'rgba(20, 28, 30, 0.2)');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Rain: drops grouped into three depth layers, each stroked as one path (far to near).
      ctx.lineCap = 'round';
      const layers: Path2D[] = [new Path2D(), new Path2D(), new Path2D()];
      for (const d of drops) {
        d.y += d.speed * dt;
        d.x += d.speed * dt * WIND;
        const floor = surface(d.x, base) - (1 - d.depth) * 40; // far drops "land" further back
        if (d.y > floor) {
          if (d.depth > 0.35 && !still) {
            ripples.push({ x: d.x, y: floor + (1 - d.depth) * 40, r: 1, life: 1 });
            const n = d.depth > 0.7 ? 3 : 1;
            for (let i = 0; i < n; i++)
              splashes.push({
                x: d.x,
                y: floor + (1 - d.depth) * 40,
                vx: (Math.random() - 0.5) * 90 * d.depth,
                vy: -(60 + Math.random() * 120) * d.depth,
                life: 1,
              });
          }
          Object.assign(d, spawn(false));
          continue;
        }
        const path = layers[d.depth < 0.33 ? 0 : d.depth < 0.66 ? 1 : 2];
        path.moveTo(d.x, d.y);
        path.lineTo(d.x - d.len * WIND, d.y - d.len);
      }
      const LAYER = [
        { alpha: 0.16, width: 0.7 },
        { alpha: 0.3, width: 1.1 },
        { alpha: 0.48, width: 1.6 },
      ];
      layers.forEach((path, i) => {
        ctx.strokeStyle = `rgba(220, 232, 236, ${LAYER[i].alpha})`;
        ctx.lineWidth = LAYER[i].width;
        ctx.stroke(path);
      });

      drawWater(base);

      // Ripples: flattened rings that widen and fade on the surface.
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 26 * dt;
        r.life -= 1.1 * dt;
        if (r.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = r.life;
        ctx.strokeStyle = 'rgba(215, 232, 235, 0.35)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.r, r.r * 0.28, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (ripples.length > 250) ripples.splice(0, ripples.length - 250);

      // Splashes: tiny droplets thrown up, pulled back down.
      ctx.fillStyle = 'rgba(225, 236, 238, 0.6)';
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.vy += 520 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= 2.2 * dt;
        if (s.life <= 0) {
          splashes.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (splashes.length > 600) splashes.splice(0, splashes.length - 600);

      // Mist hanging just above the water.
      const mist = ctx.createLinearGradient(0, base - 90, 0, base + 10);
      mist.addColorStop(0, 'rgba(200, 214, 218, 0)');
      mist.addColorStop(1, 'rgba(200, 214, 218, 0.16)');
      ctx.fillStyle = mist;
      ctx.fillRect(0, base - 90, w, 100);

      // Distant lightning: a quick double flicker, rarely.
      if (!still) {
        nextFlash -= dt;
        if (nextFlash <= 0) {
          flash = 1;
          nextFlash = 9 + Math.random() * 14;
        }
        if (flash > 0) {
          const flicker = flash > 0.6 ? flash : flash > 0.4 ? 0.15 : flash * 0.9;
          ctx.fillStyle = `rgba(225, 235, 255, ${flicker * 0.22})`;
          ctx.fillRect(0, 0, w, h);
          flash -= dt * 2.4;
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); // first frame can predate start
      last = now;
      t += dt;
      draw(dt);
      frame = requestAnimationFrame(loop);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    if (still) {
      t = 10;
      draw(0);
    } else frame = requestAnimationFrame(loop);

    const onVisible = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !still) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <canvas ref={ref} className="mc-monsoon" aria-hidden="true" />;
}
