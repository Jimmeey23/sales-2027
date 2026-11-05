import { useEffect, useRef } from 'react';

/* Seasonal canvases for the month covers (July's monsoon lives in MonsoonScene).

     2  Valentine's   hearts rising like bokeh, drifting petals, a warm rose glow
     3  Women's Day   purple/green/white ribbons, rising Venus symbols, mimosa, sparkle bursts
     4  Anniversary   Cloud Nine: gold confetti, floating balloons, a glowing 9 and sparkles
     6  Pride         a waving rainbow ribbon, a sweeping prism of light, rainbow hearts and confetti
     5  Midsummer     a breathing sun with counter-turning rays and lens flare, mirage, bokeh, embers, cool droplets
     8  Amazing Race  speed lines, a route drawn across the map with racers, a checkered flag
    10  Halloween     harvest moon, bats, ghosts, a dangling spider, fog, jack-o'-lanterns, lightning
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
    balloons: Array.from({ length: 6 }, (_, i) => ({
      x: w * (0.08 + i * 0.17) + rand(-20, 20),
      y: h + rand(0, h * 0.9),
      v: rand(26, 44),
      s: rand(34, 56),
      sway: rand(0, TAU),
      c: ['#e8336b', '#ff5c8a', '#c2185b', '#ff8fab', '#d81b60', '#f06292'][i],
    })),
    arrow: { x: -200, y: 0, vx: 0, vy: 0, next: 1.5 },
    bursts: [] as { x: number; y: number; vx: number; vy: number; life: number; s: number }[],
    nextBurst: 0.8,
    beat: 0,
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

    // Heart balloons on curling strings.
    for (const b of s.balloons) {
      b.y -= b.v * dt;
      const bx = b.x + Math.sin(t * 0.7 + b.sway) * 14;
      if (b.y < -b.s * 4) Object.assign(b, { y: h + b.s, x: rand(0, w) });
      ctx.strokeStyle = 'rgba(255, 220, 230, 0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, b.y + b.s);
      for (let k = 1; k <= 12; k++)
        ctx.lineTo(bx + Math.sin(t * 2 + b.sway + k * 0.6) * 5, b.y + b.s + k * b.s * 0.13);
      ctx.stroke();
      ctx.save();
      ctx.shadowColor = 'rgba(255, 80, 130, 0.6)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = b.c;
      heart(ctx, bx, b.y, b.s);
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx - b.s * 0.24, b.y + b.s * 0.22, b.s * 0.07, b.s * 0.12, -0.5, 0, TAU);
      ctx.fill();
    }

    // Cupid's arrow: streaks across, trailing small hearts.
    const a = s.arrow;
    a.next -= dt;
    if (a.next <= 0 && a.x > w + 200) a.x = -200;
    if (a.next <= 0 && a.x <= -200) {
      a.x = -120;
      a.y = rand(h * 0.15, h * 0.6);
      a.vx = rand(520, 700);
      a.vy = rand(-60, 60);
      a.next = rand(5, 9);
    }
    if (a.vx && a.x < w + 200) {
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (Math.random() < 0.6) s.bursts.push({ x: a.x - 40, y: a.y, vx: rand(-20, 20), vy: rand(-30, 10), life: 1, s: rand(5, 9) });
      const ang = Math.atan2(a.vy, a.vx);
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(ang);
      ctx.strokeStyle = '#f6d58a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-70, 0);
      ctx.lineTo(10, 0);
      ctx.stroke();
      ctx.fillStyle = '#ff4d7d';
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(6, -8);
      ctx.lineTo(6, 8);
      ctx.fill();
      ctx.fillStyle = '#ffd1dc';
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-58, 0);
        ctx.lineTo(-74, d * 9);
        ctx.lineTo(-64, 0);
        ctx.fill();
      }
      ctx.restore();
    }

    // Heart bursts: little pops of hearts that scatter and fade.
    s.nextBurst -= dt;
    if (s.nextBurst <= 0) {
      s.nextBurst = rand(1.4, 2.6);
      const bx = rand(w * 0.35, w * 0.95);
      const by = rand(h * 0.15, h * 0.75);
      for (let k = 0; k < 14; k++) {
        const ang = (k / 14) * TAU;
        const sp = rand(60, 140);
        s.bursts.push({ x: bx, y: by, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 1, s: rand(6, 12) });
      }
    }
    for (let i = s.bursts.length - 1; i >= 0; i--) {
      const p = s.bursts[i];
      p.vy += 40 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 0.8;
      if (p.life <= 0) {
        s.bursts.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(255, ${110 + ((p.s * 10) | 0)}, 150, ${p.life * 0.85})`;
      heart(ctx, p.x, p.y, p.s);
    }
    if (s.bursts.length > 400) s.bursts.splice(0, s.bursts.length - 400);

    // Heartbeat line across the bottom.
    s.beat += dt;
    ctx.strokeStyle = 'rgba(255, 120, 160, 0.55)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 80, 130, 0.9)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    const by = h * 0.93;
    const head = ((s.beat * 260) % (w + 300)) - 150;
    for (let x = Math.max(0, head - 420); x <= Math.min(w, head); x += 4) {
      const ph = (x % 220) / 220;
      let y = by;
      if (ph > 0.4 && ph < 0.45) y -= 26 * Math.sin(((ph - 0.4) / 0.05) * Math.PI);
      else if (ph > 0.45 && ph < 0.5) y += 12 * Math.sin(((ph - 0.45) / 0.05) * Math.PI);
      if (x === Math.max(0, head - 420)) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
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
    // Dim the room so the photograph and the gold spotlights carry the light.
    ctx.fillStyle = 'rgba(8, 6, 4, 0.38)';
    ctx.fillRect(0, 0, w, h);
    // A big soft "9" glowing behind the right side.
    ctx.save();
    ctx.font = `italic 600 ${Math.round(h * 0.62)}px Fraunces, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(243, 220, 155, 0.9)';
    ctx.shadowBlur = 40 + Math.sin(t * 1.5) * 12;
    const nine = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.7);
    nine.addColorStop(0, 'rgba(255, 241, 200, 0.14)');
    nine.addColorStop(1, 'rgba(201, 161, 90, 0.05)');
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
      ctx.globalAlpha = 0.55;
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
    motes: Array.from({ length: 60 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(8, 26), r: rand(2, 9), a: rand(0.08, 0.35), ph: rand(0, TAU) })),
    embers: Array.from({ length: 90 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(30, 80), s: rand(0.8, 2.4), ph: rand(0, TAU) })),
    drops: [] as { x: number; y: number; v: number; s: number }[],
    nextDrop: 0.6,
  }),
  draw(ctx, w, h, t, dt, s) {
    // Midsummer light: a gold wash that warms and cools with the sun's breath.
    const breath = 0.5 + 0.5 * Math.sin(t * 0.6);
    const air = ctx.createLinearGradient(0, 0, w, h);
    air.addColorStop(0, `rgba(255, 190, 80, ${0.26 + breath * 0.08})`);
    air.addColorStop(0.6, 'rgba(255, 120, 50, 0.08)');
    air.addColorStop(1, 'rgba(200, 70, 30, 0.2)');
    ctx.fillStyle = air;
    ctx.fillRect(0, 0, w, h);

    // The sun: layered corona, rotating soft rays in two directions.
    const sx = w * 0.84;
    const sy = h * 0.13;
    const R = Math.min(w, h) * 0.085;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [dir, n, len, al] of [[1, 12, 4.2, 0.16], [-1, 20, 2.8, 0.12]] as const) {
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(t * 0.06 * dir);
      for (let i = 0; i < n; i++) {
        ctx.rotate(TAU / n);
        const L = R * len * (1 + 0.15 * Math.sin(t * 1.7 + i * 1.3));
        const g = ctx.createLinearGradient(0, 0, L, 0);
        g.addColorStop(0, `rgba(255, 225, 150, ${al})`);
        g.addColorStop(1, 'rgba(255, 225, 150, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -R * 0.35);
        ctx.lineTo(L, 0);
        ctx.lineTo(0, R * 0.35);
        ctx.fill();
      }
      ctx.restore();
    }
    glow(ctx, sx, sy, R * (5.5 + breath), 'rgba(255, 170, 70, A)', 0.4);
    glow(ctx, sx, sy, R * 2, 'rgba(255, 236, 190, A)', 0.9);
    glow(ctx, sx, sy, R * 0.9, 'rgba(255, 255, 245, A)', 1);

    // Lens flare: ghosts strung along the line from the sun through the centre.
    const cx = w / 2 + Math.sin(t * 0.2) * w * 0.04;
    const cy = h / 2;
    const ghosts: [number, number, string, number][] = [
      [0.35, 0.5, 'rgba(255, 200, 120, A)', 0.18],
      [0.7, 0.25, 'rgba(255, 140, 90, A)', 0.2],
      [1.15, 0.8, 'rgba(255, 230, 160, A)', 0.1],
      [1.45, 0.35, 'rgba(180, 220, 255, A)', 0.14],
      [1.8, 1.2, 'rgba(255, 170, 100, A)', 0.08],
    ];
    for (const [k, r, c, al] of ghosts) glow(ctx, sx + (cx - sx) * k, sy + (cy - sy) * k, R * r * 2, c, al * (0.7 + breath * 0.5));
    ctx.restore();

    // Heat mirage: shimmering bands low in the frame.
    for (let i = 0; i < 6; i++) {
      const y = h * (0.72 + i * 0.05);
      ctx.strokeStyle = `rgba(255, 235, 200, ${0.05 + 0.03 * Math.sin(t * 2 + i)})`;
      ctx.lineWidth = 14;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 14) {
        const yy = y + Math.sin(x * 0.02 + t * 3.2 + i * 1.7) * 4 + Math.sin(x * 0.007 - t * 1.4) * 3;
        if (x === 0) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }

    // Golden bokeh drifting up in the heat.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of s.motes) {
      m.y -= m.v * dt;
      m.x += Math.sin(t * 0.5 + m.ph) * 8 * dt;
      if (m.y < -20) Object.assign(m, { y: h + 20, x: rand(0, w) });
      glow(ctx, m.x, m.y, m.r * 3, 'rgba(255, 210, 130, A)', m.a * (0.6 + 0.4 * Math.sin(t * 2 + m.ph)));
    }
    // Embers: hot sparks rising and flickering.
    for (const e of s.embers) {
      e.y -= e.v * dt;
      e.x += Math.sin(t * 2 + e.ph) * 20 * dt;
      if (e.y < -5) Object.assign(e, { y: h + 5, x: rand(0, w) });
      const f = 0.4 + 0.6 * Math.abs(Math.sin(t * 6 + e.ph));
      ctx.fillStyle = `rgba(255, ${150 + ((f * 80) | 0)}, 80, ${f * 0.7})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.s, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // Cool relief: water droplets sliding down the glass.
    s.nextDrop -= dt;
    if (s.nextDrop <= 0) {
      s.nextDrop = rand(0.4, 1.1);
      s.drops.push({ x: rand(0, w), y: rand(-20, h * 0.4), v: rand(20, 60), s: rand(3, 6) });
    }
    for (let i = s.drops.length - 1; i >= 0; i--) {
      const d = s.drops[i];
      d.v += 30 * dt;
      d.y += d.v * dt;
      if (d.y > h + 20) {
        s.drops.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = 'rgba(220, 240, 255, 0.18)';
      ctx.lineWidth = d.s * 0.6;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y - d.s * 8);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(230, 245, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.s * 0.8, d.s, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(d.x - d.s * 0.3, d.y - d.s * 0.3, d.s * 0.25, 0, TAU);
      ctx.fill();
    }
  },
};

/* ── March: International Women's Day ─────────────────────────────────── */
const IWD = ['#a855f7', '#7e22ce', '#d8b4fe', '#22c55e', '#f9a8d4', '#ffffff'];
function venus(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.moveTo(x, y + r);
  ctx.lineTo(x, y + r * 2.2);
  ctx.moveTo(x - r * 0.6, y + r * 1.6);
  ctx.lineTo(x + r * 0.6, y + r * 1.6);
  ctx.stroke();
}
const womensDay: Scene = {
  init: (w, h) => ({
    symbols: Array.from({ length: 16 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(14, 34), r: rand(7, 16), ph: rand(0, TAU), a: rand(0.25, 0.6), c: IWD[(Math.random() * 3) | 0] })),
    mimosa: Array.from({ length: 70 }, () => ({ x: rand(0, w), y: rand(-h, h), v: rand(20, 45), s: rand(2.5, 5), ph: rand(0, TAU) })),
    ribbons: Array.from({ length: 3 }, (_, i) => ({ y: h * (0.25 + i * 0.22), c: ['#a855f7', '#22c55e', '#f5f3ff'][i], ph: rand(0, TAU) })),
    bursts: [] as { x: number; y: number; vx: number; vy: number; c: string; life: number }[],
    next: 0.5,
  }),
  draw(ctx, w, h, t, dt, s) {
    glow(ctx, w * 0.8, h * 0.2, Math.max(w, h) * 0.55, 'rgba(168, 85, 247, A)', 0.24);
    glow(ctx, w * 0.1, h * 0.95, Math.max(w, h) * 0.4, 'rgba(34, 197, 94, A)', 0.1);

    // Purple, green and white ribbons, the colours of the suffrage movement, rippling across.
    for (const r of s.ribbons) {
      ctx.strokeStyle = r.c;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 10;
      ctx.beginPath();
      for (let x = -20; x <= w + 20; x += 12) {
        const y = r.y + Math.sin(x * 0.006 + t * 0.9 + r.ph) * 34 + Math.sin(x * 0.017 - t * 1.4) * 8;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Venus symbols rising, gently turning, glowing.
    ctx.lineCap = 'round';
    for (const p of s.symbols) {
      p.y -= p.v * dt;
      p.x += Math.sin(t * 0.6 + p.ph) * 10 * dt;
      if (p.y < -p.r * 4) Object.assign(p, { y: h + p.r * 2, x: rand(0, w) });
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(t * 0.8 + p.ph) * 0.25);
      ctx.shadowColor = p.c;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = p.c;
      ctx.globalAlpha = p.a;
      ctx.lineWidth = Math.max(2, p.r * 0.22);
      venus(ctx, 0, 0, p.r);
      ctx.restore();
    }

    // Mimosa: the yellow blossom given on Women's Day, drifting down in soft puffs.
    for (const m of s.mimosa) {
      m.y += m.v * dt;
      m.x += Math.sin(t * 0.9 + m.ph) * 16 * dt;
      if (m.y > h + 10) Object.assign(m, { y: -10, x: rand(0, w) });
      glow(ctx, m.x, m.y, m.s * 2.2, 'rgba(255, 214, 10, A)', 0.35);
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.s * 0.7, 0, TAU);
      ctx.fill();
    }

    // Sparkle bursts in purple and green: small celebrations popping across the cover.
    s.next -= dt;
    if (s.next <= 0) {
      s.next = rand(1, 2);
      const x = rand(w * 0.3, w * 0.95);
      const y = rand(h * 0.1, h * 0.7);
      for (let k = 0; k < 26; k++) {
        const a = (k / 26) * TAU;
        const sp = rand(70, 170);
        s.bursts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, c: IWD[(Math.random() * IWD.length) | 0], life: 1 });
      }
    }
    for (let i = s.bursts.length - 1; i >= 0; i--) {
      const p = s.bursts[i];
      p.vx *= 1 - 1.5 * dt;
      p.vy = p.vy * (1 - 1.5 * dt) + 50 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 0.7;
      if (p.life <= 0) {
        s.bursts.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};

/* ── October: Halloween ───────────────────────────────────────────────── */
function bat(ctx: Ctx, x: number, y: number, s: number, flap: number) {
  const f = Math.sin(flap) * 0.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - s * 0.5, y - s * (0.5 + f), x - s, y - s * f * 0.6);
  ctx.quadraticCurveTo(x - s * 0.7, y + s * 0.05, x - s * 0.55, y + s * 0.15);
  ctx.quadraticCurveTo(x - s * 0.3, y + s * 0.05, x, y + s * 0.25);
  ctx.quadraticCurveTo(x + s * 0.3, y + s * 0.05, x + s * 0.55, y + s * 0.15);
  ctx.quadraticCurveTo(x + s * 0.7, y + s * 0.05, x + s, y - s * f * 0.6);
  ctx.quadraticCurveTo(x + s * 0.5, y - s * (0.5 + f), x, y);
  ctx.fill();
}
function pumpkin(ctx: Ctx, x: number, y: number, r: number, flicker: number) {
  ctx.fillStyle = '#e8660f';
  for (const dx of [-0.45, 0.45, 0]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * r, y, r * 0.62, r * 0.78, 0, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120, 40, 0, 0.5)';
  ctx.lineWidth = 1.5;
  for (const dx of [-0.3, 0.3]) {
    ctx.beginPath();
    ctx.ellipse(x + dx * r, y, r * 0.3, r * 0.76, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#4b6b1e';
  ctx.fillRect(x - r * 0.08, y - r * 0.98, r * 0.16, r * 0.28);
  // Carved face, lit from inside.
  ctx.fillStyle = `rgba(255, ${200 + ((flicker * 40) | 0)}, 80, ${0.75 + flicker * 0.25})`;
  for (const dx of [-0.32, 0.32]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * r - r * 0.14, y - r * 0.12);
    ctx.lineTo(x + dx * r + r * 0.14, y - r * 0.12);
    ctx.lineTo(x + dx * r, y - r * 0.36);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y + r * 0.15);
  for (let i = 0; i <= 6; i++) ctx.lineTo(x - r * 0.5 + (i * r) / 6, y + r * (i % 2 ? 0.3 : 0.42));
  ctx.lineTo(x + r * 0.5, y + r * 0.15);
  ctx.quadraticCurveTo(x, y + r * 0.6, x - r * 0.5, y + r * 0.15);
  ctx.fill();
}
const halloween: Scene = {
  init: (w, h) => ({
    bats: Array.from({ length: 11 }, () => ({ x: rand(0, w), y: rand(h * 0.05, h * 0.5), v: rand(60, 130), s: rand(10, 24), ph: rand(0, TAU), fl: rand(9, 14) })),
    ghosts: Array.from({ length: 3 }, (_, i) => ({ x: rand(0, w), y: h * (0.3 + i * 0.18), v: rand(18, 34), s: rand(26, 40), ph: rand(0, TAU) })),
    fog: Array.from({ length: 7 }, () => ({ x: rand(0, w), y: rand(h * 0.75, h), r: rand(120, 260), v: rand(8, 22) })),
    pumpkins: Array.from({ length: 4 }, (_, i) => ({ x: w * (0.55 + i * 0.12), r: rand(18, 30), ph: rand(0, TAU) })),
    spider: { y: 0, ph: rand(0, TAU) },
    flash: 0,
    nextFlash: rand(5, 10),
  }),
  draw(ctx, w, h, t, dt, s) {
    // Night tint and a harvest moon behind thin cloud.
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, 'rgba(30, 10, 50, 0.45)');
    sky.addColorStop(1, 'rgba(10, 5, 20, 0.35)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const mx = w * 0.82;
    const my = h * 0.18;
    const mr = Math.min(w, h) * 0.09;
    glow(ctx, mx, my, mr * 4, 'rgba(255, 170, 60, A)', 0.35);
    ctx.fillStyle = '#ffd9a0';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(200, 140, 80, 0.25)';
    for (const [dx, dy, r] of [[-0.3, -0.2, 0.18], [0.25, 0.15, 0.22], [-0.1, 0.35, 0.12]])
      ctx.beginPath(), ctx.arc(mx + dx * mr, my + dy * mr, r * mr, 0, TAU), ctx.fill();
    for (let i = 0; i < 2; i++) {
      const cx = ((t * 14 + i * w * 0.6) % (w + 400)) - 200;
      glow(ctx, cx, my + (i ? 20 : -10), 160, 'rgba(40, 20, 60, A)', 0.55);
    }

    // Bats crossing the moon.
    ctx.fillStyle = 'rgba(12, 6, 18, 0.92)';
    for (const b of s.bats) {
      b.x += b.v * dt;
      b.y += Math.sin(t * 2 + b.ph) * 30 * dt;
      if (b.x > w + 40) Object.assign(b, { x: -40, y: rand(h * 0.05, h * 0.5) });
      bat(ctx, b.x, b.y, b.s, t * b.fl + b.ph);
    }

    // Ghosts drifting and bobbing, fading in and out.
    for (const g of s.ghosts) {
      g.x -= g.v * dt;
      if (g.x < -g.s * 2) Object.assign(g, { x: w + g.s * 2 });
      const y = g.y + Math.sin(t * 1.4 + g.ph) * 14;
      const a = 0.35 + 0.25 * Math.sin(t * 0.9 + g.ph);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(220, 230, 255, 0.9)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#f4f6ff';
      ctx.beginPath();
      ctx.arc(g.x, y, g.s * 0.5, Math.PI, 0);
      ctx.lineTo(g.x + g.s * 0.5, y + g.s * 0.7);
      for (let k = 0; k <= 4; k++)
        ctx.lineTo(g.x + g.s * 0.5 - (k * g.s) / 4, y + g.s * 0.7 + (k % 2 ? -1 : 1) * 6 * Math.sin(t * 4 + k + g.ph));
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a1024';
      ctx.beginPath();
      ctx.ellipse(g.x - g.s * 0.16, y - g.s * 0.05, g.s * 0.07, g.s * 0.11, 0, 0, TAU);
      ctx.ellipse(g.x + g.s * 0.16, y - g.s * 0.05, g.s * 0.07, g.s * 0.11, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // A spider dropping on its thread from the top, and climbing back.
    const sp = s.spider;
    sp.y = (Math.sin(t * 0.5 + sp.ph) * 0.5 + 0.5) * h * 0.35 + 20;
    const sx = w * 0.62;
    ctx.strokeStyle = 'rgba(230, 230, 240, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, sp.y);
    ctx.stroke();
    ctx.fillStyle = '#120a16';
    ctx.beginPath();
    ctx.arc(sx, sp.y + 6, 7, 0, TAU);
    ctx.arc(sx, sp.y - 2, 4.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#120a16';
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 4; k++)
      for (const d of [-1, 1]) {
        const wig = Math.sin(t * 6 + k) * 2;
        ctx.beginPath();
        ctx.moveTo(sx, sp.y + 4 + k * 2);
        ctx.quadraticCurveTo(sx + d * 10, sp.y - 2 + k * 3 + wig, sx + d * 14, sp.y + 6 + k * 4);
        ctx.stroke();
      }

    // Low fog rolling along the ground.
    for (const f of s.fog) {
      f.x += f.v * dt;
      if (f.x - f.r > w) f.x = -f.r;
      glow(ctx, f.x, f.y, f.r, 'rgba(170, 160, 200, A)', 0.22);
    }

    // Jack-o'-lanterns along the bottom, candles flickering.
    for (const p of s.pumpkins) {
      const fl = 0.5 + 0.5 * Math.sin(t * 13 + p.ph) * Math.sin(t * 7.3 + p.ph * 2);
      glow(ctx, p.x, h - p.r * 0.9, p.r * 3.2, 'rgba(255, 140, 30, A)', 0.25 + fl * 0.15);
      pumpkin(ctx, p.x, h - p.r * 0.9, p.r, fl);
    }

    // Lightning.
    s.nextFlash -= dt;
    if (s.nextFlash <= 0) {
      s.flash = 1;
      s.nextFlash = rand(7, 14);
    }
    if (s.flash > 0) {
      const f = s.flash > 0.6 ? s.flash : s.flash > 0.4 ? 0.1 : s.flash * 0.8;
      ctx.fillStyle = `rgba(210, 200, 255, ${f * 0.25})`;
      ctx.fillRect(0, 0, w, h);
      s.flash -= dt * 2.5;
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

/* ── Extra layers: drawn on top of a base scene ───────────────────────── */
function layered(base: Scene, extra: Scene): Scene {
  return {
    init: (w, h) => ({ base: base.init(w, h), extra: extra.init(w, h) }),
    draw(ctx, w, h, t, dt, s) {
      base.draw(ctx, w, h, t, dt, s.base);
      ctx.save();
      extra.draw(ctx, w, h, t, dt, s.extra);
      ctx.restore();
    },
  };
}

// April: spotlights sweeping like a gala, gold fireworks, champagne bubbles, curling streamers.
const galaExtra: Scene = {
  init: (w, h) => ({
    bubbles: Array.from({ length: 70 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(25, 70), r: rand(1.5, 5), ph: rand(0, TAU) })),
    streamers: Array.from({ length: 14 }, () => ({ x: rand(0, w), y: rand(-h, 0), v: rand(50, 90), len: rand(50, 110), ph: rand(0, TAU), c: GOLDS[(Math.random() * GOLDS.length) | 0] })),
    shells: [] as any[],
    sparks: [] as any[],
    next: 0.6,
  }),
  draw(ctx, w, h, t, dt, s) {
    // Two spotlights crossing from the floor.
    ctx.globalCompositeOperation = 'lighter';
    for (const [ox, sp, ph] of [[0.18, 0.5, 0], [0.55, 0.36, 1.2], [0.88, 0.42, 2]] as const) {
      const ang = -Math.PI / 2 + Math.sin(t * sp + ph) * 0.55;
      const L = h * 1.3;
      const x0 = w * ox;
      const y0 = h + 20;
      const g = ctx.createLinearGradient(x0, y0, x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L);
      g.addColorStop(0, 'rgba(255, 200, 90, 0.34)');
      g.addColorStop(0.6, 'rgba(240, 180, 70, 0.12)');
      g.addColorStop(1, 'rgba(240, 180, 70, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.cos(ang - 0.12) * L, y0 + Math.sin(ang - 0.12) * L);
      ctx.lineTo(x0 + Math.cos(ang + 0.12) * L, y0 + Math.sin(ang + 0.12) * L);
      ctx.fill();
      glow(ctx, x0 + Math.cos(ang) * h * 0.75, y0 + Math.sin(ang) * h * 0.75, h * 0.16, 'rgba(255, 205, 110, A)', 0.18);
    }
    // Gold fireworks: a shell climbs, bursts into a ring that falls as glitter.
    s.next -= dt;
    if (s.next <= 0) {
      s.next = rand(0.9, 1.8);
      s.shells.push({ x: rand(w * 0.35, w * 0.95), y: h, vy: -rand(h * 0.9, h * 1.2), top: rand(h * 0.12, h * 0.4) });
    }
    for (let i = s.shells.length - 1; i >= 0; i--) {
      const sh = s.shells[i];
      sh.y += sh.vy * dt;
      glow(ctx, sh.x, sh.y, 10, 'rgba(255, 230, 160, A)', 0.9);
      if (sh.y <= sh.top) {
        const n = 46;
        const c = GOLDS[(Math.random() * GOLDS.length) | 0];
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU;
          const v = rand(110, 170);
          s.sparks.push({ x: sh.x, y: sh.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c });
        }
        s.shells.splice(i, 1);
      }
    }
    for (let i = s.sparks.length - 1; i >= 0; i--) {
      const p = s.sparks[i];
      p.vx *= 1 - 1.4 * dt;
      p.vy = p.vy * (1 - 1.4 * dt) + 60 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 0.6;
      if (p.life <= 0) {
        s.sparks.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = p.life * (0.6 + 0.4 * Math.sin(t * 30 + i));
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // Champagne bubbles rising.
    for (const b of s.bubbles) {
      b.y -= b.v * dt;
      b.x += Math.sin(t * 2 + b.ph) * 8 * dt;
      if (b.y < -10) Object.assign(b, { y: h + 10, x: rand(0, w) });
      ctx.strokeStyle = 'rgba(255, 241, 200, 0.5)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 240, 0.6)';
      ctx.beginPath();
      ctx.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, TAU);
      ctx.fill();
    }
    // Curling gold streamers.
    ctx.lineCap = 'round';
    for (const st of s.streamers) {
      st.y += st.v * dt;
      if (st.y > h + st.len) Object.assign(st, { y: -st.len, x: rand(0, w) });
      ctx.strokeStyle = st.c;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k <= 16; k++) {
        const u = k / 16;
        const x = st.x + Math.sin(u * 9 + t * 4 + st.ph) * 8;
        const y = st.y - u * st.len;
        if (k) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  },
};

// December: a lit tree, a sleigh crossing the sky, shooting stars, snow settling on the ground.
const yuleExtra: Scene = {
  init: () => ({ shoot: null as any, nextShoot: 2 }),
  draw(ctx, w, h, t, dt, s) {
    // Sleigh and reindeer silhouette crossing high up, every ~14s.
    const cycle = (t % 14) / 14;
    const sx = -200 + cycle * (w + 400);
    const sy = h * 0.2 + Math.sin(cycle * Math.PI * 2) * 18;
    ctx.fillStyle = 'rgba(20, 24, 40, 0.75)';
    for (let k = 0; k < 4; k++) {
      const rx = sx + 60 + k * 26;
      const ry = sy - 6 + Math.sin(t * 8 + k) * 3;
      ctx.beginPath();
      ctx.ellipse(rx, ry, 10, 4, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(rx + 7, ry - 9, 2.5, 8);
      ctx.strokeStyle = 'rgba(20, 24, 40, 0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx + 8, ry - 9);
      ctx.lineTo(rx + 12, ry - 15);
      ctx.moveTo(rx + 8, ry - 9);
      ctx.lineTo(rx + 4, ry - 15);
      ctx.stroke();
      for (const lx of [-6, 6]) ctx.fillRect(rx + lx, ry + 2, 1.5, 6 + Math.sin(t * 10 + k + lx) * 2);
    }
    if (k0(t)) glow(ctx, sx + 60 + 3 * 26 + 12, sy - 12, 8, 'rgba(255, 60, 60, A)', 0.9);
    ctx.beginPath();
    ctx.moveTo(sx - 10, sy - 8);
    ctx.lineTo(sx + 30, sy - 8);
    ctx.quadraticCurveTo(sx + 38, sy + 6, sx + 24, sy + 8);
    ctx.lineTo(sx - 6, sy + 8);
    ctx.quadraticCurveTo(sx - 18, sy, sx - 10, sy - 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 24, 40, 0.5)';
    ctx.beginPath();
    ctx.moveTo(sx + 30, sy - 4);
    ctx.lineTo(sx + 56, sy - 6);
    ctx.stroke();
    // Sparkle trail behind the sleigh.
    for (let k = 0; k < 14; k++) {
      const tx = sx - 14 - k * 12;
      const ty = sy + 4 + Math.sin(t * 6 + k) * 4;
      ctx.fillStyle = `rgba(255, 240, 200, ${0.7 - k * 0.05})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 1.6, 0, TAU);
      ctx.fill();
    }

    // Shooting stars.
    s.nextShoot -= dt;
    if (s.nextShoot <= 0 && !s.shoot) {
      s.shoot = { x: rand(w * 0.3, w), y: rand(0, h * 0.25), life: 1 };
      s.nextShoot = rand(3, 7);
    }
    if (s.shoot) {
      const sh = s.shoot;
      sh.x -= 700 * dt;
      sh.y += 260 * dt;
      sh.life -= dt * 1.4;
      const g = ctx.createLinearGradient(sh.x, sh.y, sh.x + 120, sh.y - 45);
      g.addColorStop(0, `rgba(255, 255, 255, ${sh.life})`);
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(sh.x + 120, sh.y - 45);
      ctx.stroke();
      if (sh.life <= 0) s.shoot = null;
    }

    // Snow settled along the ground.
    ctx.fillStyle = 'rgba(245, 248, 255, 0.85)';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h - 14 - Math.sin(x * 0.013) * 7 - Math.sin(x * 0.041) * 3);
    ctx.lineTo(w, h);
    ctx.fill();

    // The tree, bottom right: tiers, garland, twinkling baubles, a glowing star.
    const tx = w * 0.88;
    const base = h - 16;
    const TH = Math.min(h * 0.42, 260);
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(tx - 8, base - TH * 0.1, 16, TH * 0.1);
    for (let k = 0; k < 4; k++) {
      const top = base - TH * 0.1 - TH * (0.28 + k * 0.2);
      const bot = base - TH * 0.1 - TH * k * 0.2;
      const half = TH * (0.34 - k * 0.07);
      ctx.fillStyle = k % 2 ? '#1f6b3a' : '#17582f';
      ctx.beginPath();
      ctx.moveTo(tx, top);
      ctx.lineTo(tx + half, bot);
      ctx.lineTo(tx - half, bot);
      ctx.fill();
    }
    const tip = base - TH * 0.1 - TH * 0.88;
    for (let i = 0; i < 26; i++) {
      const u = (i * 0.618) % 1;
      const v = 0.12 + ((i * 0.37) % 1) * 0.82;
      const y = tip + v * (base - TH * 0.1 - tip);
      const x = tx + (u - 0.5) * 2 * v * TH * 0.3;
      const c = BULBS[i % BULBS.length];
      const on = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7);
      glow(ctx, x, y, 10, `rgba(${c}, A)`, 0.6 * on);
      ctx.fillStyle = `rgba(${c}, ${0.6 + 0.4 * on})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, TAU);
      ctx.fill();
    }
    const pulse = 0.7 + 0.3 * Math.sin(t * 2);
    glow(ctx, tx, tip, 40 * pulse, 'rgba(255, 220, 120, A)', 0.7);
    ctx.fillStyle = '#ffd86b';
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 5 : 12;
      const a = -Math.PI / 2 + (k * Math.PI) / 5 + Math.sin(t) * 0.1;
      ctx.lineTo(tx + Math.cos(a) * r, tip + Math.sin(a) * r);
    }
    ctx.fill();
  },
};
const k0 = (t: number) => Math.sin(t * 4) > 0; // Rudolph's nose blinks

// August: a map grid, spinning compass, a plane with a contrail, a ticking stopwatch,
// and confetti whenever a racer crosses the line.
const raceExtra: Scene = {
  init: () => ({ pops: [] as any[], last: 0 }),
  draw(ctx, w, h, t, dt, s) {
    // Faint map grid.
    ctx.strokeStyle = 'rgba(255, 230, 160, 0.06)';
    ctx.lineWidth = 1;
    for (let x = (t * 6) % 48; x < w; x += 48) ctx.beginPath(), ctx.moveTo(x, 0), ctx.lineTo(x, h), ctx.stroke();
    for (let y = 0; y < h; y += 48) ctx.beginPath(), ctx.moveTo(0, y), ctx.lineTo(w, y), ctx.stroke();
    // Compass rose, top left of the route, needle hunting for north.
    const cx = w * 0.42;
    const cy = h * 0.16;
    const R = 34;
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.15);
    for (let k = 0; k < 8; k++) {
      ctx.rotate(TAU / 8);
      ctx.fillStyle = k % 2 ? 'rgba(250, 204, 21, 0.25)' : 'rgba(250, 204, 21, 0.5)';
      ctx.beginPath();
      ctx.moveTo(0, -R * (k % 2 ? 0.6 : 0.95));
      ctx.lineTo(4, 0);
      ctx.lineTo(-4, 0);
      ctx.fill();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 1.3) * 0.5 + Math.sin(t * 3.1) * 0.15);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -R * 0.8);
    ctx.lineTo(4, 0);
    ctx.lineTo(-4, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(0, R * 0.8);
    ctx.lineTo(4, 0);
    ctx.lineTo(-4, 0);
    ctx.fill();
    ctx.restore();

    // Plane on a long loop, contrail behind.
    const u = (t % 11) / 11;
    const px = -80 + u * (w + 160);
    const py = h * 0.08 + Math.sin(u * Math.PI) * h * 0.06;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - 10, py);
    for (let k = 1; k < 30; k++) {
      const uu = u - k * 0.006;
      ctx.lineTo(-80 + uu * (w + 160), h * 0.08 + Math.sin(uu * Math.PI) * h * 0.06);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.cos(u * Math.PI) * 0.15 * -1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 3.5, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(-4, -12);
    ctx.lineTo(-8, -12);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 12);
    ctx.lineTo(-4, 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.lineTo(-15, -6);
    ctx.lineTo(-13, 0);
    ctx.fill();
    ctx.restore();

    // Stopwatch, bottom left of the route.
    const wx = w * 0.46;
    const wy = h * 0.8;
    const WR = 28;
    ctx.fillStyle = 'rgba(20, 20, 20, 0.55)';
    ctx.beginPath();
    ctx.arc(wx, wy, WR, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.fillRect(wx - 4, wy - WR - 8, 8, 6);
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      ctx.fillRect(wx + Math.cos(a) * (WR - 6) - 1, wy + Math.sin(a) * (WR - 6) - 1, 2, 2);
    }
    const sec = Math.floor(t * 4) / 4; // ticks
    const ha = -Math.PI / 2 + (sec / 15) * TAU;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx, wy);
    ctx.lineTo(wx + Math.cos(ha) * (WR - 8), wy + Math.sin(ha) * (WR - 8));
    ctx.stroke();

    // Confetti pops near the finish every few seconds.
    if (Math.floor(t / 3) !== s.last) {
      s.last = Math.floor(t / 3);
      const fx = w * 0.95;
      const fy = h * 0.3;
      const cols = ['#ef4444', '#3b82f6', '#22c55e', '#facc15', '#ffffff'];
      for (let k = 0; k < 40; k++)
        s.pops.push({ x: fx, y: fy, vx: rand(-220, 60), vy: rand(-260, -60), r: rand(0, TAU), c: cols[k % 5], life: 1 });
    }
    for (let i = s.pops.length - 1; i >= 0; i--) {
      const p = s.pops[i];
      p.vy += 400 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += dt * 8;
      p.life -= dt * 0.6;
      if (p.life <= 0) {
        s.pops.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.restore();
    }
  },
};

export const SEASON_SCENES: Record<number, Scene> = {
  2: valentine,
  3: womensDay,
  4: layered(anniversary, galaExtra),
  5: heat,
  6: pride,
  8: layered(race, raceExtra),
  10: halloween,
  11: diwali,
  12: layered(christmas, yuleExtra),
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
