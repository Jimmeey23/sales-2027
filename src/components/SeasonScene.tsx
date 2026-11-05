import { useEffect, useRef } from 'react';

/* Seasonal canvases for the month covers (July's monsoon lives in MonsoonScene).

     2  Valentine's   hearts rising like bokeh, drifting petals, a warm rose glow
     4  Anniversary   Cloud Nine: gold confetti, floating balloons, a glowing 9 and sparkles
     6  Pride         a waving rainbow ribbon, a sweeping prism of light, rainbow hearts and confetti
     5  Hot and dry   a blazing sun with turning rays, heat haze, dust on a dry wind
     8  Amazing Race  speed lines, a route drawn across the map with racers, a checkered flag
    11  Diwali        a row of diyas with living flames, and fireworks over them
    12  Christmas     snow in three depths, a string of fairy lights, soft starbursts

   Each scene is drawn behind the cover's content, pauses when the tab is hidden, and shows
   one still frame for reduced motion. */

type Ctx = CanvasRenderingContext2D;
interface Scene {
  init(w: number, h: number): any;
  draw(ctx: Ctx, w: number, h: number, t: number, dt: number, s: any): void;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', String(alpha)));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function heart(ctx: Ctx, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

/* ── February: Valentine's ─────────────────────────────────────────────── */
const valentine: Scene = {
  init: (w, h) => ({
    hearts: Array.from({ length: 46 }, () => ({
      x: rand(0, w),
      y: rand(0, h),
      s: rand(8, 34),
      v: rand(14, 42),
      sway: rand(0, TAU),
      a: rand(0.12, 0.5),
      hue: rand(335, 360),
    })),
    petals: Array.from({ length: 26 }, () => ({ x: rand(0, w), y: rand(-h, h), r: rand(0, TAU), v: rand(30, 60), s: rand(5, 9) })),
  }),
  draw(ctx, w, h, t, dt, s) {
    glow(ctx, w * 0.78, h * 0.25, Math.max(w, h) * 0.55, 'rgba(232, 74, 120, A)', 0.22);
    glow(ctx, w * 0.15, h * 0.9, Math.max(w, h) * 0.4, 'rgba(255, 140, 170, A)', 0.14);
    for (const p of s.hearts) {
      p.y -= p.v * dt;
      p.x += Math.sin(t * 0.8 + p.sway) * 12 * dt;
      if (p.y < -p.s * 2) Object.assign(p, { y: h + p.s, x: rand(0, w) });
      const pulse = 1 + Math.sin(t * 2.4 + p.sway) * 0.06;
      ctx.save();
      ctx.shadowColor = `hsla(${p.hue}, 85%, 65%, 0.8)`;
      ctx.shadowBlur = p.s * 0.8;
      ctx.fillStyle = `hsla(${p.hue}, 80%, 66%, ${p.a})`;
      heart(ctx, p.x, p.y, p.s * pulse);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(255, 170, 190, 0.55)';
    for (const p of s.petals) {
      p.y += p.v * dt;
      p.x += Math.sin(t + p.r) * 30 * dt + 10 * dt;
      p.r += dt * 1.4;
      if (p.y > h + 10) Object.assign(p, { y: -10, x: rand(0, w) });
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.scale(1, Math.abs(Math.sin(p.r * 1.3)) * 0.6 + 0.4);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  },
};

/* ── April: 9th anniversary, Cloud Nine ───────────────────────────────── */
const GOLDS = ['#f3dc9b', '#e6c06a', '#c9a15a', '#fff1c8', '#d9b46d'];
const anniversary: Scene = {
  init: (w, h) => ({
    confetti: Array.from({ length: 150 }, () => ({
      x: rand(0, w),
      y: rand(-h, h),
      vy: rand(40, 110),
      r: rand(0, TAU),
      vr: rand(-4, 4),
      s: rand(4, 9),
      c: GOLDS[(Math.random() * GOLDS.length) | 0],
      sway: rand(0, TAU),
    })),
    balloons: Array.from({ length: 7 }, (_, i) => ({
      x: w * (0.5 + i * 0.075),
      y: h + rand(0, h),
      v: rand(22, 40),
      r: rand(22, 34),
      c: GOLDS[i % GOLDS.length],
      sway: rand(0, TAU),
    })),
    sparks: [] as any[],
  }),
  draw(ctx, w, h, t, dt, s) {
    glow(ctx, w * 0.72, h * 0.3, Math.max(w, h) * 0.5, 'rgba(240, 205, 130, A)', 0.18);
    // A big soft "9" glowing behind the right side.
    ctx.save();
    ctx.font = `italic 600 ${Math.round(h * 0.62)}px Fraunces, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(243, 220, 155, 0.9)';
    ctx.shadowBlur = 40 + Math.sin(t * 1.5) * 12;
    const nine = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.7);
    nine.addColorStop(0, 'rgba(255, 241, 200, 0.28)');
    nine.addColorStop(1, 'rgba(201, 161, 90, 0.1)');
    ctx.fillStyle = nine;
    ctx.fillText('9', w * 0.78, h * 0.36);
    ctx.restore();
    // Balloons with strings.
    for (const b of s.balloons) {
      b.y -= b.v * dt;
      const x = b.x + Math.sin(t * 0.7 + b.sway) * 14;
      if (b.y < -b.r * 4) b.y = h + b.r * 2;
      ctx.strokeStyle = 'rgba(255, 241, 200, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, b.y + b.r * 1.15);
      ctx.quadraticCurveTo(x + Math.sin(t + b.sway) * 10, b.y + b.r * 2.2, x, b.y + b.r * 3.3);
      ctx.stroke();
      const g = ctx.createRadialGradient(x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, x, b.y, b.r * 1.2);
      g.addColorStop(0, 'rgba(255, 250, 230, 0.75)');
      g.addColorStop(0.35, b.c);
      g.addColorStop(1, 'rgba(120, 90, 40, 0.8)');
      ctx.fillStyle = g;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.ellipse(x, b.y, b.r, b.r * 1.15, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Gold confetti: flat pieces that flip as they fall.
    for (const c of s.confetti) {
      c.y += c.vy * dt;
      c.x += Math.sin(t * 1.2 + c.sway) * 20 * dt;
      c.r += c.vr * dt;
      if (c.y > h + 10) Object.assign(c, { y: -10, x: rand(0, w) });
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.scale(1, Math.cos(c.r * 2));
      ctx.fillStyle = c.c;
      ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
      ctx.restore();
    }
    // Sparkles that twinkle and fade.
    if (Math.random() < dt * 9) s.sparks.push({ x: rand(0, w), y: rand(0, h * 0.7), life: 1, r: rand(4, 10) });
    for (let i = s.sparks.length - 1; i >= 0; i--) {
      const p = s.sparks[i];
      p.life -= dt * 1.2;
      if (p.life <= 0) {
        s.sparks.splice(i, 1);
        continue;
      }
      const a = Math.sin(p.life * Math.PI);
      ctx.strokeStyle = `rgba(255, 241, 200, ${a * 0.9})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x - p.r * a, p.y);
      ctx.lineTo(p.x + p.r * a, p.y);
      ctx.moveTo(p.x, p.y - p.r * a);
      ctx.lineTo(p.x, p.y + p.r * a);
      ctx.stroke();
    }
  },
};

/* ── May: hot and dry ─────────────────────────────────────────────────── */
const heat: Scene = {
  init: (w, h) => ({
    dust: Array.from({ length: 140 }, () => ({ x: rand(0, w), y: rand(h * 0.3, h), v: rand(20, 70), s: rand(0.6, 2.2), a: rand(0.1, 0.45) })),
  }),
  draw(ctx, w, h, t, dt, s) {
    // Bleached, warm air.
    const air = ctx.createLinearGradient(0, 0, 0, h);
    air.addColorStop(0, 'rgba(255, 170, 70, 0.22)');
    air.addColorStop(0.5, 'rgba(230, 120, 40, 0.1)');
    air.addColorStop(1, 'rgba(160, 80, 30, 0.22)');
    ctx.fillStyle = air;
    ctx.fillRect(0, 0, w, h);
    // The sun: a white core, a hot halo and slowly turning rays.
    const sx = w * 0.82;
    const sy = h * 0.14;
    const R = Math.min(w, h) * 0.09;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.05);
    for (let i = 0; i < 18; i++) {
      ctx.rotate(TAU / 18);
      const len = R * (3.2 + Math.sin(t * 1.3 + i) * 0.5);
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, 'rgba(255, 220, 140, 0.32)');
      g.addColorStop(1, 'rgba(255, 220, 140, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(R * 0.8, -R * 0.12);
      ctx.lineTo(len, 0);
      ctx.lineTo(R * 0.8, R * 0.12);
      ctx.fill();
    }
    ctx.restore();
    glow(ctx, sx, sy, R * 5, 'rgba(255, 190, 90, A)', 0.45);
    glow(ctx, sx, sy, R * 1.6, 'rgba(255, 248, 225, A)', 0.95);
    // Heat haze: wavering translucent bands rising off the ground.
    for (let i = 0; i < 9; i++) {
      const y = h - ((t * 26 + i * (h / 9)) % h);
      const a = 0.06 * Math.sin((y / h) * Math.PI);
      ctx.strokeStyle = `rgba(255, 236, 200, ${a})`;
      ctx.lineWidth = 10;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const yy = y + Math.sin(x * 0.018 + t * 3 + i) * 5;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    // Dust carried on a dry wind.
    for (const d of s.dust) {
      d.x += d.v * dt;
      d.y += Math.sin(t + d.x * 0.01) * 6 * dt;
      if (d.x > w + 5) Object.assign(d, { x: -5, y: rand(h * 0.3, h) });
      ctx.fillStyle = `rgba(240, 200, 150, ${d.a})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.s, 0, TAU);
      ctx.fill();
    }
  },
};

/* ── August: The Amazing Race 2.0 ─────────────────────────────────────── */
const race: Scene = {
  init: (w, h) => ({
    lines: Array.from({ length: 60 }, () => ({ x: rand(0, w), y: rand(0, h), len: rand(60, 220), v: rand(500, 1200), a: rand(0.05, 0.25) })),
    route: Array.from({ length: 7 }, (_, i) => ({ x: w * (0.5 + i * 0.075), y: h * (0.18 + 0.3 * Math.abs(Math.sin(i * 1.7))) })),
  }),
  draw(ctx, w, h, t, dt, s) {
    glow(ctx, w * 0.75, h * 0.35, Math.max(w, h) * 0.5, 'rgba(250, 196, 40, A)', 0.14);
    // Speed lines.
    for (const l of s.lines) {
      l.x -= l.v * dt;
      if (l.x + l.len < 0) Object.assign(l, { x: w + rand(0, 200), y: rand(0, h) });
      const g = ctx.createLinearGradient(l.x, 0, l.x + l.len, 0);
      g.addColorStop(0, `rgba(255, 230, 160, ${l.a})`);
      g.addColorStop(1, 'rgba(255, 230, 160, 0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x + l.len, l.y);
      ctx.stroke();
    }
    // The route: dashed path between checkpoints, drawn on progressively.
    const pts = s.route;
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    pts.forEach((p: any, i: number) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
    pts.forEach((p: any, i: number) => {
      ctx.fillStyle = i === pts.length - 1 ? '#fff' : 'rgba(250, 204, 21, 0.95)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20, 20, 20, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
      ctx.font = '700 9px Instrument Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), p.x, p.y + 0.5);
    });
    // Racers travelling the route.
    const along = (u: number) => {
      const seg = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
      const f = u * (pts.length - 1) - seg;
      return { x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * f, y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * f };
    };
    ['#ef4444', '#3b82f6', '#22c55e'].forEach((c, i) => {
      const p = along((t * 0.06 + i * 0.13) % 1);
      glow(ctx, p.x, p.y, 22, 'rgba(255, 255, 255, A)', 0.35);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.5, 0, TAU);
      ctx.fill();
    });
    // Checkered flag waving at the finish.
    const f = pts[pts.length - 1];
    const fx = f.x + 4;
    const fy = f.y - 62;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y - 8);
    ctx.lineTo(f.x, fy);
    ctx.stroke();
    const cell = 7;
    for (let cx = 0; cx < 6; cx++)
      for (let cy = 0; cy < 4; cy++) {
        const wave = Math.sin(t * 5 + cx * 0.7) * 3;
        ctx.fillStyle = (cx + cy) % 2 ? 'rgba(20,20,20,0.9)' : 'rgba(255,255,255,0.92)';
        ctx.fillRect(fx + cx * cell, fy + cy * cell + wave, cell, cell);
      }
    // "2.0" badge.
    ctx.save();
    ctx.font = `800 italic ${Math.round(h * 0.17)}px Instrument Sans, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.16)';
    ctx.fillText('2.0', w * 0.97, h * 0.5);
    ctx.restore();
  },
};

/* ── November: Diwali ─────────────────────────────────────────────────── */
const FIRE = ['255, 196, 87', '255, 120, 80', '255, 236, 160', '250, 110, 160', '140, 210, 255'];
const diwali: Scene = {
  init: () => ({ rockets: [] as any[], sparks: [] as any[], next: 0.3 }),
  draw(ctx, w, h, t, dt, s) {
    glow(ctx, w * 0.7, h * 0.55, Math.max(w, h) * 0.55, 'rgba(255, 150, 60, A)', 0.18);
    // Fireworks: a rocket climbs, bursts into a ring of sparks that fall and fade.
    s.next -= dt;
    if (s.next <= 0) {
      s.rockets.push({ x: rand(w * 0.35, w * 0.95), y: h, vy: -rand(420, 560), top: rand(h * 0.1, h * 0.38), c: FIRE[(Math.random() * FIRE.length) | 0] });
      s.next = rand(0.5, 1.4);
    }
    for (let i = s.rockets.length - 1; i >= 0; i--) {
      const r = s.rockets[i];
      r.y += r.vy * dt;
      ctx.fillStyle = `rgba(${r.c}, 0.9)`;
      ctx.fillRect(r.x - 1, r.y, 2, 10);
      if (r.y <= r.top) {
        const n = 70;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU;
          const v = rand(120, 230);
          s.sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: r.c });
        }
        s.rockets.splice(i, 1);
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = s.sparks.length - 1; i >= 0; i--) {
      const p = s.sparks[i];
      p.vy += 90 * dt;
      p.vx *= 1 - dt * 0.9;
      p.vy *= 1 - dt * 0.9;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 0.65;
      if (p.life <= 0) {
        s.sparks.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = `rgba(${p.c}, ${p.life})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    if (s.sparks.length > 1600) s.sparks.splice(0, s.sparks.length - 1600);
    // A row of diyas along the bottom: clay bowl, oil sheen, a flame that breathes.
    // The diyas sit on a ledge just above the cover's figures row, to the right of the play
    // button, so the content panels never hide them. Measured each frame; cheap.
    const box = s.canvas?.getBoundingClientRect();
    const kpis = s.root?.querySelector('.mc-kpis')?.getBoundingClientRect();
    const play = s.root?.querySelector('.mc-explainer')?.getBoundingClientRect();
    const ledge = kpis && box && kpis.top - box.top > 80 ? kpis.top - box.top - 16 : h - 26;
    const from = play && box ? play.right - box.left + 40 : 30;
    const span = Math.max(200, w - from - 30);
    const count = Math.max(4, Math.round(span / 95));
    for (let i = 0; i < count; i++) {
      const x = from + (i + 0.5) * (span / count);
      const y = ledge;
      const flick = Math.sin(t * 9 + i * 1.7) * 0.5 + Math.sin(t * 13.3 + i) * 0.5;
      glow(ctx, x, y - 18, 70 + flick * 6, 'rgba(255, 170, 60, A)', 0.38);
      // bowl
      const bowl = ctx.createLinearGradient(0, y - 6, 0, y + 14);
      bowl.addColorStop(0, '#d0743a');
      bowl.addColorStop(1, '#6b2f14');
      ctx.fillStyle = bowl;
      ctx.beginPath();
      ctx.moveTo(x - 22, y - 4);
      ctx.quadraticCurveTo(x, y + 22, x + 22, y - 4);
      ctx.quadraticCurveTo(x + 26, y - 9, x + 30, y - 10);
      ctx.lineTo(x + 18, y - 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 210, 120, 0.5)';
      ctx.beginPath();
      ctx.ellipse(x, y - 4, 20, 3, 0, 0, TAU);
      ctx.fill();
      // flame
      const fh = 22 + flick * 4;
      const fx = x + 20 + flick * 1.5;
      const fy = y - 10;
      const flame = ctx.createRadialGradient(fx, fy - fh * 0.35, 1, fx, fy - fh * 0.3, fh * 0.7);
      flame.addColorStop(0, 'rgba(255, 255, 230, 1)');
      flame.addColorStop(0.35, 'rgba(255, 200, 80, 0.95)');
      flame.addColorStop(1, 'rgba(255, 90, 20, 0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.moveTo(fx, fy - fh);
      ctx.quadraticCurveTo(fx + 7, fy - fh * 0.35, fx, fy);
      ctx.quadraticCurveTo(fx - 7, fy - fh * 0.35, fx, fy - fh);
      ctx.fill();
    }
  },
};

/* ── December: Christmas ──────────────────────────────────────────────── */
const BULBS = ['255, 90, 90', '255, 210, 90', '110, 220, 140', '120, 180, 255', '255, 160, 220'];
const christmas: Scene = {
  init: (w, h) => ({
    flakes: Array.from({ length: Math.round(Math.min(420, (w * h) / 3200)) }, () => {
      const d = Math.random() ** 1.5;
      return { x: rand(0, w), y: rand(0, h), d, r: 0.8 + d * 3.2, v: 20 + d * 70, sway: rand(0, TAU) };
    }),
  }),
  draw(ctx, w, h, t, dt, s) {
    glow(ctx, w * 0.8, h * 0.2, Math.max(w, h) * 0.5, 'rgba(160, 200, 255, A)', 0.12);
    glow(ctx, w * 0.2, h * 0.95, Math.max(w, h) * 0.45, 'rgba(255, 190, 120, A)', 0.12);
    // Snow in depth: far flakes small and slow, near ones large, soft and quick.
    for (const f of s.flakes) {
      f.y += f.v * dt;
      f.x += Math.sin(t * 0.6 + f.sway) * (8 + f.d * 14) * dt;
      if (f.y > h + 5) Object.assign(f, { y: -5, x: rand(0, w) });
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, `rgba(255, 255, 255, ${0.35 + f.d * 0.55})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, TAU);
      ctx.fill();
    }
    // Fairy lights strung in two swags across the top.
    const sag = h * 0.07;
    ctx.strokeStyle = 'rgba(40, 50, 40, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(w * 0.25, 8 + sag * 2, w * 0.5, 8);
    ctx.quadraticCurveTo(w * 0.75, 8 + sag * 2, w, 8);
    ctx.stroke();
    const n = Math.round(w / 46);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const half = u < 0.5 ? u * 2 : (u - 0.5) * 2;
      const x = u * w;
      const y = 8 + sag * 2 * 2 * half * (1 - half) + 6;
      const c = BULBS[i % BULBS.length];
      const on = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.3);
      glow(ctx, x, y, 22, `rgba(${c}, A)`, 0.55 * on);
      ctx.fillStyle = `rgba(${c}, ${0.6 + 0.4 * on})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 3.5, 5, 0, 0, TAU);
      ctx.fill();
    }
    // Starbursts that twinkle in the sky.
    for (let i = 0; i < 6; i++) {
      const x = w * (0.45 + i * 0.09);
      const y = h * (0.15 + ((i * 37) % 25) / 100);
      const a = 0.5 + 0.5 * Math.sin(t * 1.7 + i * 2.1);
      const r = 6 + a * 6;
      ctx.strokeStyle = `rgba(255, 245, 215, ${a * 0.8})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - r, y);
      ctx.lineTo(x + r, y);
      ctx.moveTo(x, y - r);
      ctx.lineTo(x, y + r);
      ctx.stroke();
    }
  },
};


/* ── June: Pride ──────────────────────────────────────────────────────── */
const RAINBOW = ['228, 3, 3', '255, 140, 0', '255, 237, 0', '0, 128, 38', '0, 77, 255', '117, 7, 135'];
const pride: Scene = {
  init: (w, h) => ({
    confetti: Array.from({ length: 120 }, (_, i) => ({
      x: rand(0, w),
      y: rand(-h, h),
      vy: rand(40, 100),
      r: rand(0, TAU),
      vr: rand(-4, 4),
      s: rand(4, 8),
      c: RAINBOW[i % RAINBOW.length],
      sway: rand(0, TAU),
    })),
    hearts: Array.from({ length: 18 }, (_, i) => ({
      x: rand(0, w),
      y: rand(0, h),
      s: rand(10, 26),
      v: rand(14, 34),
      c: RAINBOW[i % RAINBOW.length],
      sway: rand(0, TAU),
    })),
  }),
  draw(ctx, w, h, t, dt, s) {
    // Warm sunset light, like the beach in the photograph.
    glow(ctx, w * 0.85, h * 0.05, Math.max(w, h) * 0.6, 'rgba(255, 196, 120, A)', 0.22);
    // A rainbow ribbon waving across the top: six bands, one flag.
    // Slim, along the very top edge, so it never sits over the header text.
    const band = Math.max(2, h * 0.0035);
    const top = 2;
    ctx.save();
    ctx.globalAlpha = 0.8;
    RAINBOW.forEach((c, i) => {
      ctx.fillStyle = `rgb(${c})`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 10) {
        const y = top + i * band + Math.sin(x * 0.008 - t * 1.6) * 2 + Math.sin(x * 0.02 - t * 2.3) * 0.8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let x = w; x >= 0; x -= 10) {
        const y = top + (i + 1) * band + Math.sin(x * 0.008 - t * 1.6) * 2 + Math.sin(x * 0.02 - t * 2.3) * 0.8;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
    // A soft prism of light that sweeps slowly across the cover.
    const sweep = ((t * 0.06) % 1.6) - 0.3;
    const sx = sweep * w;
    const prism = ctx.createLinearGradient(sx - w * 0.25, 0, sx + w * 0.25, h);
    RAINBOW.forEach((c, i) => prism.addColorStop(i / (RAINBOW.length - 1), `rgba(${c}, 0.07)`));
    ctx.fillStyle = prism;
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.12, 0);
    ctx.lineTo(sx + w * 0.02, 0);
    ctx.lineTo(sx + w * 0.3, h);
    ctx.lineTo(sx + w * 0.12, h);
    ctx.closePath();
    ctx.fill();
    // Props: the rainbow flag and the Progress Pride flag on poles, waving.
    const flag = (px: number, py: number, fw: number, fh: number, stripes: string[], chevron: boolean) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(235, 225, 205, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + fh * 2.4);
      ctx.stroke();
      const cols = 24;
      const bh = fh / stripes.length;
      for (let c = 0; c < cols; c++) {
        const u = c / cols;
        const x = px + u * fw;
        const wave = Math.sin(u * 5 - t * 4) * 6 * u;
        const wave2 = Math.sin((u + 1 / cols) * 5 - t * 4) * 6 * (u + 1 / cols);
        const shade = 0.82 + 0.18 * Math.cos(u * 5 - t * 4);
        stripes.forEach((col, r) => {
          ctx.fillStyle = `rgba(${col}, ${shade})`;
          ctx.beginPath();
          ctx.moveTo(x, py + r * bh + wave);
          ctx.lineTo(x + fw / cols + 0.5, py + r * bh + wave2);
          ctx.lineTo(x + fw / cols + 0.5, py + (r + 1) * bh + wave2);
          ctx.lineTo(x, py + (r + 1) * bh + wave);
          ctx.fill();
        });
      }
      if (chevron) {
        // Progress Pride: white, pink, blue, brown and black chevrons at the hoist.
        ['20, 20, 20', '120, 80, 40', '91, 206, 250', '245, 169, 184', '255, 255, 255'].forEach((col, k) => {
          const depth = fw * (0.36 - k * 0.06);
          ctx.fillStyle = `rgb(${col})`;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + depth, py + fh / 2 + Math.sin(-t * 4) * 2);
          ctx.lineTo(px, py + fh);
          ctx.fill();
        });
      }
      ctx.restore();
    };
    const fx = w * 0.06;
    const fy = h * 0.31;
    flag(fx, fy, Math.min(120, w * 0.09), Math.min(78, h * 0.085), RAINBOW, false);
    flag(fx + Math.min(150, w * 0.11), fy + 22, Math.min(110, w * 0.08), Math.min(70, h * 0.077), RAINBOW, true);

    // Floating badges.
    const words = ['Love is love', 'Pride', 'Be you', 'Proud & loud', '#Pride2027'];
    ctx.save();
    ctx.font = '600 13px Instrument Sans, sans-serif';
    ctx.textBaseline = 'middle';
    words.forEach((word, i) => {
      const cycle = (t * 0.05 + i / words.length) % 1;
      const x = w * (0.04 + ((i * 0.13) % 0.4));
      const y = h * (0.92 - cycle * 0.8);
      const a = Math.sin(cycle * Math.PI) * 0.9;
      const tw = ctx.measureText(word).width + 22;
      const g = ctx.createLinearGradient(x, 0, x + tw, 0);
      RAINBOW.forEach((c, k) => g.addColorStop(k / (RAINBOW.length - 1), `rgba(${c}, ${a})`));
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgba(20, 16, 14, ${a * 0.55})`;
      ctx.beginPath();
      ctx.roundRect(x, y - 13, tw, 26, 13);
      ctx.fill();
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
      ctx.fillText(word, x + 11, y + 0.5);
    });
    ctx.restore();

    // Rainbow hearts rising.
    for (const p of s.hearts) {
      p.y -= p.v * dt;
      p.x += Math.sin(t * 0.8 + p.sway) * 10 * dt;
      if (p.y < -p.s * 2) Object.assign(p, { y: h + p.s, x: rand(0, w) });
      ctx.save();
      ctx.shadowColor = `rgba(${p.c}, 0.8)`;
      ctx.shadowBlur = p.s * 0.7;
      ctx.fillStyle = `rgba(${p.c}, 0.42)`;
      heart(ctx, p.x, p.y, p.s);
      ctx.restore();
    }
    // Rainbow confetti, flipping as it falls.
    for (const c of s.confetti) {
      c.y += c.vy * dt;
      c.x += Math.sin(t * 1.2 + c.sway) * 20 * dt;
      c.r += c.vr * dt;
      if (c.y > h + 10) Object.assign(c, { y: -10, x: rand(0, w) });
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.scale(1, Math.cos(c.r * 2));
      ctx.fillStyle = `rgba(${c.c}, 0.85)`;
      ctx.fillRect(-c.s / 2, -c.s / 4, c.s, c.s / 2);
      ctx.restore();
    }
  },
};

export const SEASON_SCENES: Record<number, Scene> = {
  2: valentine,
  4: anniversary,
  5: heat,
  6: pride,
  8: race,
  11: diwali,
  12: christmas,
};

export default function SeasonScene({ month }: { month: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const scene = SEASON_SCENES[month];

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !scene) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    let w = 0;
    let h = 0;
    let state: any = null;
    let frame = 0;
    let last = performance.now();
    let t = 0;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = box.width;
      h = box.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state = scene.init(w, h);
      state.root = canvas.parentElement;
      state.canvas = canvas;
    };
    const draw = (dt: number) => {
      ctx.clearRect(0, 0, w, h);
      scene.draw(ctx, w, h, t, dt, state);
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
      // Settle the scene for a moment so the still frame has something in it.
      for (let i = 0; i < 90; i++) {
        t += 1 / 30;
        scene.draw(ctx, w, h, t, 1 / 30, state);
      }
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
  }, [scene]);

  if (!scene) return null;
  return <canvas ref={ref} className="mc-monsoon mc-season" aria-hidden="true" />;
}
