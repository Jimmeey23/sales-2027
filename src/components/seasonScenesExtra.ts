/* Month-cover scenes for the themes SeasonScene did not cover yet. Same contract as SeasonScene:
   init(w, h) builds state; draw() paints one frame. Props sit along the right and top edges so the
   title, figures and cards on the left stay readable.

     1  Resolution Season         midnight fireworks, a checklist ticking itself off, confetti
     5  The Afterparty            a turning disco ball, sweeping spotlights, light flecks, confetti
     9  Heart Month               an ECG line tracing across, a beating heart, rising heart bokeh
    10  Gift of Strength          wrapped gift boxes with bobbing bows, a dumbbell, gold sparkles
    11  Black Friday Hostage      falling price tags, a ransom-note countdown, warning-tape strobe */

type Ctx = CanvasRenderingContext2D;
export interface Scene {
  init(w: number, h: number): any;
  draw(ctx: Ctx, w: number, h: number, t: number, dt: number, s: any): void;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function glow(ctx: Ctx, x: number, y: number, r: number, rgb: string, alpha: number) {
  // A gradient with a negative or zero radius throws (IndexSizeError) and kills the frame loop.
  if (!(r > 0) || !(alpha > 0)) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
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

/* Confetti shared by January and May. */
const CONFETTI = ['255, 214, 102', '255, 120, 150', '120, 200, 255', '170, 255, 190', '255, 255, 255'];
const makeConfetti = (w: number, h: number, n: number) =>
  Array.from({ length: n }, () => ({
    x: rand(0, w),
    y: rand(-h, h),
    vy: rand(30, 80),
    sway: rand(0, TAU),
    spin: rand(0, TAU),
    vs: rand(2, 6),
    c: pick(CONFETTI),
    s: rand(3, 7),
  }));
function drawConfetti(ctx: Ctx, w: number, h: number, t: number, dt: number, list: any[], alpha = 0.8) {
  for (const p of list) {
    p.y += p.vy * dt;
    p.spin += p.vs * dt;
    if (p.y > h + 10) (p.y = -10), (p.x = rand(0, w));
    const x = p.x + Math.sin(t + p.sway) * 18;
    ctx.save();
    ctx.translate(x, p.y);
    ctx.rotate(p.spin);
    ctx.scale(1, Math.abs(Math.cos(p.spin)) + 0.2);
    ctx.fillStyle = `rgba(${p.c}, ${alpha})`;
    ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    ctx.restore();
  }
}

/* ── January: Resolution Season ─────────────────────────────────────────── */
export const resolution: Scene = {
  init: (w, h) => ({ bursts: [] as any[], next: 0.4, confetti: makeConfetti(w, h, Math.round(Math.min(90, w / 14))) }),
  draw(ctx, w, h, t, dt, s) {
    // Fireworks over the top-right sky.
    s.next -= dt;
    if (s.next <= 0) {
      const c = pick(CONFETTI);
      const x = rand(w * 0.45, w * 0.95),
        y = rand(h * 0.08, h * 0.35);
      s.bursts.push({ x, y, life: 1, c, parts: Array.from({ length: 46 }, (_, i) => ({ a: (i / 46) * TAU, v: rand(70, 140) })) });
      s.next = rand(0.9, 1.8);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const b of s.bursts) {
      b.life = Math.max(0, b.life - dt * 0.55);
      const age = 1 - b.life;
      glow(ctx, b.x, b.y, 60 * b.life, b.c, 0.25 * b.life);
      for (const p of b.parts) {
        const r = p.v * age * (1.2 - age * 0.4);
        const px = b.x + Math.cos(p.a) * r,
          py = b.y + Math.sin(p.a) * r + age * age * 40;
        ctx.fillStyle = `rgba(${b.c}, ${Math.max(0, b.life)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    s.bursts = s.bursts.filter((b: any) => b.life > 0);

    // A resolutions checklist card, top right, ticking itself off on a 9 s loop.
    const cw = Math.min(210, w * 0.2),
      cx = w - cw - 40,
      cy = h * 0.38;
    const items = ['Show up', 'Book the 7am', 'Stop late-cancelling', 'Actually go'];
    const lh = 26;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.05);
    ctx.fillStyle = 'rgba(255, 252, 244, 0.9)';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 18;
    ctx.fillRect(0, 0, cw, 38 + items.length * lh);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2b2b33';
    ctx.font = '600 12px Inter, system-ui, sans-serif';
    ctx.fillText('2027 RESOLUTIONS', 14, 22);
    const loop = (t % 9) / 9;
    items.forEach((label, i) => {
      const y = 44 + i * lh;
      const done = loop > 0.15 + i * 0.18;
      ctx.strokeStyle = '#2b2b33';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(14, y - 11, 13, 13);
      ctx.fillStyle = 'rgba(43,43,51,0.85)';
      ctx.font = '13px Inter, system-ui, sans-serif';
      ctx.fillText(label, 36, y);
      if (done) {
        const k = Math.min(1, (loop - (0.15 + i * 0.18)) * 12);
        ctx.strokeStyle = '#d23d5a';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(15, y - 5);
        ctx.lineTo(15 + 4 * k, y - 1);
        if (k > 0.5) ctx.lineTo(15 + 4 + 8 * (k - 0.5) * 2, y - 1 - 12 * (k - 0.5) * 2);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(43,43,51,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(36, y - 4);
        ctx.lineTo(36 + ctx.measureText(label).width * k, y - 4);
        ctx.stroke();
      }
    });
    ctx.restore();

    drawConfetti(ctx, w, h, t, dt, s.confetti, 0.65);
  },
};

/* ── May: The Afterparty ────────────────────────────────────────────────── */
export const afterparty: Scene = {
  init: (w, h) => ({
    flecks: Array.from({ length: 70 }, () => ({ a: rand(0, TAU), r: rand(0.2, 1), s: rand(1, 3) })),
    confetti: makeConfetti(w, h, 50),
  }),
  draw(ctx, w, h, t, dt, s) {
    const bx = w * 0.6,
      by = h * 0.13,
      R = Math.min(70, w * 0.06);
    // Spotlights sweeping from the floor.
    ctx.globalCompositeOperation = 'lighter';
    const beams = [
      ['255, 80, 180', w * 0.55, 0.9],
      ['80, 180, 255', w * 0.95, -1.1],
      ['255, 220, 90', w * 0.75, 0.6],
    ] as const;
    for (const [c, x, sp] of beams) {
      const a = -Math.PI / 2 + Math.sin(t * sp) * 0.5;
      const len = h * 1.1;
      const g = ctx.createLinearGradient(x, h, x + Math.cos(a) * len, h + Math.sin(a) * len);
      g.addColorStop(0, `rgba(${c}, 0.22)`);
      g.addColorStop(1, `rgba(${c}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + Math.cos(a - 0.09) * len, h + Math.sin(a - 0.09) * len);
      ctx.lineTo(x + Math.cos(a + 0.09) * len, h + Math.sin(a + 0.09) * len);
      ctx.fill();
    }
    // Light flecks thrown by the ball.
    for (const f of s.flecks) {
      const a = f.a + t * 0.25;
      const x = bx + Math.cos(a) * f.r * w * 0.5,
        y = by + Math.abs(Math.sin(a)) * f.r * h * 0.7;
      ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.35 * Math.sin(t * 3 + f.a * 5) ** 2})`;
      ctx.fillRect(x, y, f.s, f.s);
    }
    ctx.globalCompositeOperation = 'source-over';
    // The ball on its wire.
    ctx.strokeStyle = 'rgba(220,220,230,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.lineTo(bx, by - R);
    ctx.stroke();
    glow(ctx, bx, by, R * 2.2, '255, 255, 255', 0.18);
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = '#8b8d98';
    ctx.fillRect(bx - R, by - R, R * 2, R * 2);
    const tile = R / 5;
    for (let row = -5; row < 5; row++)
      for (let col = -6; col < 6; col++) {
        const x = bx + col * tile + ((t * 18) % tile) + (row % 2 ? tile / 2 : 0);
        const y = by + row * tile;
        const b = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.4 + row * 1.3 + col * 0.7));
        ctx.fillStyle = `rgba(${Math.round(180 + 75 * b)}, ${Math.round(180 + 75 * b)}, ${Math.round(195 + 60 * b)}, 1)`;
        ctx.fillRect(x, y, tile - 1.2, tile - 1.2);
      }
    const sh = ctx.createRadialGradient(bx - R * 0.4, by - R * 0.4, R * 0.1, bx, by, R);
    sh.addColorStop(0, 'rgba(255,255,255,0.35)');
    sh.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = sh;
    ctx.fillRect(bx - R, by - R, R * 2, R * 2);
    ctx.restore();
    drawConfetti(ctx, w, h, t, dt, s.confetti, 0.55);
  },
};

/* ── September: Heart Month ─────────────────────────────────────────────── */
export const heartMonth: Scene = {
  init: (w, h) => ({
    bokeh: Array.from({ length: 22 }, () => ({ x: rand(w * 0.4, w), y: rand(0, h), s: rand(8, 22), v: rand(12, 30), p: rand(0, TAU) })),
  }),
  draw(ctx, w, h, t, dt, s) {
    // Rising heart bokeh.
    for (const b of s.bokeh) {
      b.y -= b.v * dt;
      if (b.y < -30) (b.y = h + 20), (b.x = rand(w * 0.4, w));
      ctx.fillStyle = `rgba(255, 90, 110, ${0.12 + 0.1 * Math.sin(t + b.p)})`;
      heart(ctx, b.x + Math.sin(t * 0.8 + b.p) * 10, b.y, b.s);
    }
    // ECG line across the upper third; the bright head sweeps left to right every 3.2 s.
    const y0 = h * 0.3;
    const beat = (x: number) => {
      const u = (x / 180) % 1;
      if (u < 0.36) return 0;
      if (u < 0.4) return -10 * Math.sin(((u - 0.36) / 0.04) * Math.PI);
      if (u < 0.44) return 0;
      if (u < 0.47) return 60 * ((u - 0.44) / 0.03);
      if (u < 0.5) return 60 - 100 * ((u - 0.47) / 0.03);
      if (u < 0.53) return -40 + 40 * ((u - 0.5) / 0.03);
      if (u < 0.66) return -14 * Math.sin(((u - 0.53) / 0.13) * Math.PI);
      return 0;
    };
    const head = ((t % 3.2) / 3.2) * (w + 200);
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    for (let x = Math.max(0, head - 420); x < Math.min(w, head); x += 3) {
      const a = 1 - (head - x) / 420;
      ctx.strokeStyle = `rgba(255, 110, 130, ${a * 0.9})`;
      ctx.beginPath();
      ctx.moveTo(x, y0 - beat(x));
      ctx.lineTo(x + 3, y0 - beat(x + 3));
      ctx.stroke();
    }
    if (head < w) glow(ctx, head, y0 - beat(head), 26, '255, 140, 160', 0.8);
    // Beating heart, top right, in time with the line.
    const hx = w * 0.86,
      hy = h * 0.42;
    const pulse = 1 + 0.12 * Math.max(0, Math.sin(t * 7.5)) ** 8 + 0.06 * Math.max(0, Math.sin(t * 7.5 - 1.2)) ** 8;
    glow(ctx, hx, hy + 30, 110 * pulse, '255, 60, 90', 0.28);
    const g = ctx.createLinearGradient(hx, hy - 20, hx, hy + 90);
    g.addColorStop(0, '#ff6f86');
    g.addColorStop(1, '#c21f45');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(hx, hy + 30);
    ctx.scale(pulse, pulse);
    heart(ctx, 0, -42, 84);
    ctx.restore();
  },
};

/* ── October: Gift of Strength ──────────────────────────────────────────── */
export const giftBoxes: Scene = {
  init: (w, h) => ({
    sparks: Array.from({ length: 40 }, () => ({ x: rand(w * 0.5, w), y: rand(0, h), p: rand(0, TAU), s: rand(1, 2.6) })),
  }),
  draw(ctx, w, h, t, _dt, s) {
    for (const sp of s.sparks) {
      const a = Math.max(0, Math.sin(t * 2 + sp.p));
      ctx.fillStyle = `rgba(255, 214, 120, ${a * 0.8})`;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.s * a, 0, TAU);
      ctx.fill();
    }
    const base = Math.min(h - 24, h * 0.57);
    const boxes = [
      { x: w * 0.7, s: 72, body: '#b3243c', ribbon: '#f3c35a', p: 0 },
      { x: w * 0.79, s: 96, body: '#1f5f57', ribbon: '#f3c35a', p: 1.4 },
      { x: w * 0.88, s: 60, body: '#d9a33a', ribbon: '#7a1f3a', p: 2.6 },
    ];
    for (const b of boxes) {
      const bob = Math.sin(t * 1.6 + b.p) * 3;
      const x = b.x - b.s / 2,
        y = base - b.s + bob;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(b.x, base + 4, b.s * 0.55, 6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = b.body;
      ctx.fillRect(x, y + b.s * 0.18, b.s, b.s * 0.82);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, y + b.s * 0.18, b.s * 0.35, b.s * 0.82);
      // Lid lifts a touch on its own beat.
      const lift = Math.max(0, Math.sin(t * 1.2 + b.p)) ** 6 * 10;
      ctx.fillStyle = b.body;
      ctx.fillRect(x - 6, y + b.s * 0.06 - lift, b.s + 12, b.s * 0.16);
      if (lift > 2) glow(ctx, b.x, y + b.s * 0.18, b.s * 0.6, '255, 220, 140', lift / 14);
      ctx.fillStyle = b.ribbon;
      ctx.fillRect(b.x - b.s * 0.07, y + b.s * 0.06 - lift, b.s * 0.14, b.s * 0.94 + lift);
      ctx.fillRect(x, y + b.s * 0.5, b.s, b.s * 0.1);
      // Bow.
      ctx.save();
      ctx.translate(b.x, y + b.s * 0.06 - lift);
      for (const dir of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(dir * b.s * 0.13, -b.s * 0.07, b.s * 0.14, b.s * 0.08, dir * 0.5 + Math.sin(t * 2 + b.p) * 0.08, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    // A dumbbell on the floor in front — the "strength" in the gift.
    const dx = w * 0.6,
      dy = base - 12;
    ctx.fillStyle = '#2c2f38';
    ctx.fillRect(dx - 34, dy - 2.5, 68, 5);
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#3d414d';
      ctx.fillRect(dx + side * 34 - (side < 0 ? 14 : 0), dy - 14, 14, 28);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(dx + side * 34 - (side < 0 ? 14 : 0), dy - 14, 4, 28);
    }
  },
};

/* ── November: Black Friday Hostage Crisis ──────────────────────────────── */
export const blackFriday: Scene = {
  init: (w, h) => ({
    tags: Array.from({ length: 14 }, () => ({
      x: rand(w * 0.45, w - 30),
      y: rand(-h, h),
      v: rand(25, 55),
      r: rand(-0.6, 0.6),
      vr: rand(-0.6, 0.6),
      pct: pick(['-20%', '-18%', '-16%', '-14%', 'SOLD', 'LAST 3']),
    })),
  }),
  draw(ctx, w, h, t, dt, s) {
    // Warning-tape band across the top, sliding.
    ctx.save();
    ctx.translate(w * 0.55, h * 0.52);
    ctx.rotate(-0.06);
    const tw = w * 0.5;
    ctx.fillStyle = 'rgba(245, 200, 30, 0.85)';
    ctx.fillRect(0, 0, tw, 22);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, tw, 22);
    ctx.clip();
    ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
    const off = (t * 40) % 40;
    for (let x = -60 + off; x < tw + 40; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 22);
      ctx.lineTo(x + 18, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 12, 22);
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();

    // Falling price tags.
    for (const g of s.tags) {
      g.y += g.v * dt;
      g.r += g.vr * dt;
      if (g.y > h + 40) (g.y = -40), (g.x = rand(w * 0.45, w - 30));
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.r + Math.sin(t + g.x) * 0.15);
      ctx.fillStyle = 'rgba(250, 246, 236, 0.92)';
      ctx.beginPath();
      ctx.moveTo(-22, -12);
      ctx.lineTo(16, -12);
      ctx.lineTo(28, 0);
      ctx.lineTo(16, 12);
      ctx.lineTo(-22, 12);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(30,30,30,0.85)';
      ctx.beginPath();
      ctx.arc(18, 0, 2.5, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#c0162d';
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.pct, -3, 4);
      ctx.restore();
    }

    // Ransom-note countdown, top right: cut-out letters, digits ticking.
    const left = 4 * 86400 - ((t * 37) % (4 * 86400));
    const d = Math.floor(left / 86400),
      hh = Math.floor((left % 86400) / 3600),
      mm = Math.floor((left % 3600) / 60),
      ss = Math.floor(left % 60);
    const text = `${d}D ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    const words = ['PAY', 'UP', 'IN'];
    let x = w - 330,
      y = h * 0.2;
    const flash = Math.sin(t * 6) > 0.6;
    glow(ctx, w - 180, y + 30, 160, '255, 30, 50', flash ? 0.22 : 0.1);
    const cut = (ch: string, i: number, big: boolean) => {
      const fonts = ['Georgia, serif', 'Impact, sans-serif', 'Courier New, monospace', 'Inter, system-ui, sans-serif'];
      const size = big ? 30 : 20;
      ctx.font = `700 ${size}px ${fonts[(i * 7 + ch.charCodeAt(0)) % fonts.length]}`;
      const cw = ctx.measureText(ch).width + 8;
      const bgs = ['#f4efe2', '#111', '#e2c13a', '#c0162d', '#ffffff'];
      const bg = bgs[(i * 3 + ch.charCodeAt(0)) % bgs.length];
      ctx.save();
      ctx.translate(x + cw / 2, y);
      ctx.rotate(Math.sin(i * 12.9) * 0.12);
      ctx.fillStyle = bg;
      ctx.fillRect(-cw / 2, -size * 0.85, cw, size * 1.1);
      ctx.fillStyle = bg === '#111' || bg === '#c0162d' ? '#fff' : '#111';
      ctx.textAlign = 'center';
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      x += cw + 2;
    };
    let i = 0;
    for (const word of words) {
      for (const ch of word) cut(ch, i++, false);
      x += 10;
    }
    x = w - 330;
    y += 44;
    for (const ch of text) ch === ' ' ? (x += 10) : cut(ch, i++, true);
  },
};

/* ── August: The Excuse Amnesty ─────────────────────────────────────────── */
const EXCUSES = [
  "I'll start Monday",
  'Too busy this week',
  "I'm travelling",
  'Prices will go up',
  "I'd feel weird alone",
  'I only like barre',
  'I wasted my last pack',
  'What if I quit?',
  'It is raining',
  'My knee, probably',
];
export const excuseAmnesty: Scene = {
  init: (w, h) => ({
    slips: Array.from({ length: 9 }, (_, i) => ({
      x: rand(w * 0.5, w - 120),
      y: rand(-h, h * 0.6),
      v: rand(18, 34),
      r: rand(-0.25, 0.25),
      text: EXCUSES[i % EXCUSES.length],
      stamped: 0,
    })),
    stampT: 0,
    target: null as any,
  }),
  draw(ctx, w, h, t, dt, s) {
    const floor = h * 0.58;
    for (const p of s.slips) {
      p.y += p.v * dt;
      if (p.y > floor + 40) Object.assign(p, { y: -60, x: rand(w * 0.5, w - 120), stamped: 0, r: rand(-0.25, 0.25), text: pick(EXCUSES) });
      if (p.stamped) p.stamped = Math.min(1, p.stamped + dt * 4);
    }
    // The stamp picks the next unstamped slip in the hero band every ~1.6 s.
    s.stampT -= dt;
    if (s.stampT <= 0) {
      s.target = s.slips.find((p: any) => !p.stamped && p.y > h * 0.12 && p.y < floor - 30) || null;
      s.stampT = 1.6;
    }
    const phase = 1 - s.stampT / 1.6; // 0 → 1 over the cycle
    for (const p of s.slips) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r + Math.sin(t * 0.8 + p.x) * 0.04);
      ctx.font = '13px Inter, system-ui, sans-serif';
      const tw = Math.max(120, ctx.measureText(p.text).width + 28);
      ctx.fillStyle = 'rgba(252, 248, 238, 0.9)';
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 10;
      ctx.fillRect(-tw / 2, -18, tw, 36);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(40,40,48,0.55)';
      ctx.font = '600 8px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('EXCUSE ON FILE', -tw / 2 + 8, -6);
      ctx.fillStyle = 'rgba(40,40,48,0.9)';
      ctx.font = '13px Georgia, serif';
      ctx.fillText(p.text, -tw / 2 + 8, 10);
      if (p.stamped) {
        ctx.save();
        ctx.rotate(-0.18);
        ctx.scale(1.4 - 0.4 * p.stamped, 1.4 - 0.4 * p.stamped);
        ctx.globalAlpha = 0.85 * p.stamped;
        ctx.strokeStyle = '#1f8a5b';
        ctx.lineWidth = 2;
        ctx.strokeRect(-46, -12, 92, 24);
        ctx.fillStyle = '#1f8a5b';
        ctx.font = '800 14px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('AMNESTY', 0, 5);
        ctx.restore();
      }
      ctx.restore();
    }
    // The stamp itself: hovers, drops onto the target, lifts.
    const tg = s.target;
    if (tg) {
      const drop = phase < 0.45 ? 0 : phase < 0.55 ? (phase - 0.45) / 0.1 : phase < 0.7 ? 1 : 1 - (phase - 0.7) / 0.3;
      if (drop >= 0.99 && !tg.stamped) tg.stamped = 0.01;
      const sx = tg.x,
        sy = tg.y - 70 + drop * 52;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(sx, tg.y + 4, 30 * (0.6 + drop * 0.4), 6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#6b3f22';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 34, 13, 11, 0, 0, TAU);
      ctx.fill();
      ctx.fillRect(sx - 5, sy - 28, 10, 20);
      ctx.fillStyle = '#2c2f38';
      ctx.fillRect(sx - 28, sy - 10, 56, 12);
      ctx.fillStyle = '#1f8a5b';
      ctx.fillRect(sx - 26, sy + 2, 52, 4);
    }
  },
};

/* ── April: anniversary gala layer — a giant gold 9, spotlights, confetti cannons, gold fireworks ── */
const GOLD = ['255, 214, 120', '255, 190, 80', '255, 236, 180', '255, 160, 90'];
export const anniversaryGala: Scene = {
  init: () => ({ pieces: [] as any[], nextCannon: 0.3, bursts: [] as any[], nextBurst: 1.2 }),
  draw(ctx, w, h, t, dt, s) {
    ctx.globalCompositeOperation = 'lighter';
    // Two searchlights sweeping up from behind the 9.
    for (const [x, sp, ph] of [[w * 0.62, 0.5, 0], [w * 0.92, 0.6, 2]] as const) {
      const a = -Math.PI / 2 + Math.sin(t * sp + ph) * 0.45;
      const len = h * 1.2;
      const g = ctx.createLinearGradient(x, h * 0.62, x + Math.cos(a) * len, h * 0.62 + Math.sin(a) * len);
      g.addColorStop(0, 'rgba(255, 220, 150, 0.22)');
      g.addColorStop(1, 'rgba(255, 220, 150, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, h * 0.62);
      ctx.lineTo(x + Math.cos(a - 0.08) * len, h * 0.62 + Math.sin(a - 0.08) * len);
      ctx.lineTo(x + Math.cos(a + 0.08) * len, h * 0.62 + Math.sin(a + 0.08) * len);
      ctx.fill();
    }
    // Giant gold "9" with a shimmer sweeping across it and an orbiting ring of sparks.
    const cx = w * 0.79,
      cy = h * 0.33,
      size = Math.min(h * 0.42, 360);
    glow(ctx, cx, cy, size * 0.9, '255, 200, 100', 0.25 + 0.08 * Math.sin(t * 2));
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.font = `800 ${size}px Georgia, 'Playfair Display', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const sweep = ((t * 0.35) % 1.6) - 0.3;
    const grad = ctx.createLinearGradient(cx - size * 0.4, cy - size * 0.5, cx + size * 0.4, cy + size * 0.5);
    grad.addColorStop(0, '#b8862b');
    grad.addColorStop(Math.max(0, Math.min(1, sweep - 0.08)), '#e9c46a');
    grad.addColorStop(Math.max(0, Math.min(1, sweep)), '#fff6d6');
    grad.addColorStop(Math.max(0, Math.min(1, sweep + 0.08)), '#e9c46a');
    grad.addColorStop(1, '#a8741f');
    ctx.shadowColor = 'rgba(255, 190, 80, 0.6)';
    ctx.shadowBlur = 40;
    ctx.fillStyle = grad;
    ctx.fillText('9', cx, cy);
    ctx.shadowBlur = 0;
    ctx.font = `600 ${Math.round(size * 0.07)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255, 236, 190, 0.85)';
    ctx.fillText('Y E A R S', cx, cy + size * 0.56);
    ctx.restore();
    for (let i = 0; i < 36; i++) {
      const a = t * 0.6 + (i / 36) * TAU;
      const x = cx + Math.cos(a) * size * 0.55,
        y = cy + Math.sin(a) * size * 0.2 + size * 0.05;
      const front = Math.sin(a) > 0;
      ctx.fillStyle = `rgba(255, 220, 140, ${front ? 0.9 : 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, front ? 2.4 : 1.4, 0, TAU);
      ctx.fill();
    }
    // Confetti cannons firing from the bottom corners of the hero.
    s.nextCannon -= dt;
    if (s.nextCannon <= 0) {
      const left = Math.random() < 0.5;
      const ox = left ? w * 0.52 : w * 0.99,
        oy = h * 0.62;
      for (let i = 0; i < 70; i++) {
        const a = -Math.PI / 2 + (left ? 0.35 : -0.35) + rand(-0.35, 0.35);
        const v = rand(380, 720);
        s.pieces.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(0, TAU), vr: rand(-10, 10), c: Math.random() < 0.7 ? pick(GOLD) : pick(CONFETTI), sz: rand(4, 9), life: 1 });
      }
      s.nextCannon = rand(2.2, 3.6);
    }
    for (const p of s.pieces) {
      p.vy += 520 * dt;
      p.vx *= 1 - 1.4 * dt;
      p.vy = Math.min(p.vy, 140);
      p.x += p.vx * dt + Math.sin(t * 3 + p.r) * 0.6;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      p.life -= dt * 0.22;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.scale(1, Math.abs(Math.cos(p.r * 1.3)) + 0.15);
      ctx.fillStyle = `rgba(${p.c}, ${Math.max(0, Math.min(1, p.life * 1.5))})`;
      ctx.fillRect(-p.sz / 2, -p.sz / 4, p.sz, p.sz / 2);
      ctx.restore();
    }
    s.pieces = s.pieces.filter((p: any) => p.life > 0 && p.y < h + 20);
    // Gold fireworks high in the sky.
    s.nextBurst -= dt;
    if (s.nextBurst <= 0) {
      s.bursts.push({ x: rand(w * 0.55, w * 0.98), y: rand(h * 0.05, h * 0.2), life: 1, c: pick(GOLD), n: 54 });
      s.nextBurst = rand(1.1, 2);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const b of s.bursts) {
      b.life = Math.max(0, b.life - dt * 0.6);
      const age = 1 - b.life;
      for (let i = 0; i < b.n; i++) {
        const a = (i / b.n) * TAU;
        const r = 120 * age * (1.2 - age * 0.4);
        ctx.fillStyle = `rgba(${b.c}, ${b.life})`;
        ctx.fillRect(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r + age * age * 30, 2, 2);
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    s.bursts = s.bursts.filter((b: any) => b.life > 0);
  },
};

/* ── May: Mother's Day — flowers blooming along the right, petals, a gift card for Mom ── */
export const mothersDay: Scene = {
  init: (w, h) => ({
    petals: Array.from({ length: 16 }, () => ({ x: rand(w * 0.45, w), y: rand(-h, h), v: rand(20, 45), r: rand(0, TAU), s: rand(5, 10), c: pick(['255, 170, 190', '255, 210, 220', '250, 140, 170', '255, 240, 245']) })),
  }),
  draw(ctx, w, h, t, dt, s) {
    for (const p of s.petals) {
      p.y += p.v * dt;
      p.r += dt;
      if (p.y > h + 20) (p.y = -20), (p.x = rand(w * 0.45, w));
      ctx.save();
      ctx.translate(p.x + Math.sin(t + p.r) * 20, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = `rgba(${p.c}, 0.75)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // A bouquet of flowers swaying, bottom-right of the hero.
    const base = h * 0.58;
    const stems = [
      [w * 0.76, 120, '#ff7aa2'],
      [w * 0.8, 160, '#ffd166'],
      [w * 0.84, 135, '#ff9ebd'],
      [w * 0.88, 170, '#c77dff'],
      [w * 0.92, 140, '#ff6b8b'],
      [w * 0.96, 110, '#fff0f5'],
    ] as const;
    stems.forEach(([x, len, col], i) => {
      const sway = Math.sin(t * 1.2 + i) * 8;
      const tx = x + sway,
        ty = base - len;
      ctx.strokeStyle = '#3f7a4a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.quadraticCurveTo(x + sway * 0.3, base - len * 0.5, tx, ty);
      ctx.stroke();
      ctx.fillStyle = '#4f9a5c';
      ctx.beginPath();
      ctx.ellipse(x + sway * 0.2 + 10, base - len * 0.4, 12, 5, -0.6, 0, TAU);
      ctx.fill();
      const bloom = 0.85 + 0.15 * Math.sin(t * 1.5 + i * 2);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + t * 0.3;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(tx + Math.cos(a) * 11 * bloom, ty + Math.sin(a) * 11 * bloom, 10 * bloom, 6 * bloom, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe08a';
      ctx.beginPath();
      ctx.arc(tx, ty, 6, 0, TAU);
      ctx.fill();
    });
    // The gift card for Mom, tilting gently.
    ctx.save();
    ctx.translate(w * 0.655, h * 0.45);
    ctx.rotate(-0.08 + Math.sin(t * 0.9) * 0.04);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fff5f7';
    ctx.fillRect(-80, -48, 160, 96);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e05780';
    ctx.fillRect(-80, -48, 160, 16);
    ctx.fillStyle = '#3a2a30';
    ctx.font = 'italic 600 20px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('For Mom', 0, 8);
    ctx.font = '600 10px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#e05780';
    ctx.fillText('4 CLASSES · ON US', 0, 30);
    ctx.fillStyle = '#e05780';
    heart(ctx, 58, -8, 16);
    ctx.restore();
  },
};

/* ── July: monsoon props over the rain — umbrella, paper boats on the flood line, lightning ── */
export const monsoonProps: Scene = {
  init: (w) => ({ boats: Array.from({ length: 3 }, (_, i) => ({ x: w * (0.55 + i * 0.15), v: rand(10, 22) })), flash: 0, next: rand(3, 6) }),
  draw(ctx, w, h, t, dt, s) {
    // Lightning bolt + sky flash.
    s.next -= dt;
    if (s.next <= 0) {
      s.flash = 1;
      s.boltX = rand(w * 0.6, w * 0.95);
      s.next = rand(4, 8);
    }
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(220, 235, 255, ${s.flash * 0.18})`;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = `rgba(235, 245, 255, ${s.flash})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      let x = s.boltX,
        y = 0;
      ctx.moveTo(x, y);
      while (y < h * 0.4) {
        x += rand(-26, 26);
        y += rand(20, 40);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      s.flash = Math.max(0, s.flash - dt * 3);
    }
    // Umbrella, bobbing, top right.
    const ux = w * 0.82,
      uy = h * 0.3 + Math.sin(t * 1.4) * 6,
      R = Math.min(90, w * 0.07);
    ctx.save();
    ctx.translate(ux, uy);
    ctx.rotate(Math.sin(t * 0.9) * 0.08 - 0.15);
    const cols = ['#ffcc33', '#ff6b6b', '#4ecdc4', '#ffffff'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -R - 6);
    ctx.lineTo(0, R * 1.1);
    ctx.arc(-10, R * 1.1, 10, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
    // Paper boats riding the flood line at the bottom of the hero.
    const water = h * 0.5;
    for (const b of s.boats) {
      b.x += b.v * dt;
      if (b.x > w + 60) b.x = w * 0.48;
      const y = water + Math.sin(t * 2 + b.x * 0.02) * 5;
      ctx.save();
      ctx.translate(b.x, y);
      ctx.rotate(Math.sin(t * 2 + b.x * 0.02) * 0.08);
      ctx.fillStyle = '#f4f1e8';
      ctx.beginPath();
      ctx.moveTo(-28, -6);
      ctx.lineTo(28, -6);
      ctx.lineTo(18, 8);
      ctx.lineTo(-18, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e3ddcc';
      ctx.beginPath();
      ctx.moveTo(-12, -6);
      ctx.lineTo(0, -30);
      ctx.lineTo(12, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Rising flood band.
    const g = ctx.createLinearGradient(0, water, 0, h);
    g.addColorStop(0, 'rgba(90, 150, 180, 0.25)');
    g.addColorStop(1, 'rgba(40, 80, 110, 0.5)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, water + 10 + Math.sin(x * 0.02 + t * 1.6) * 4);
    ctx.lineTo(w, h);
    ctx.fill();
  },
};

/* ── November extra: police light bar sweep + flickering neon BLACK FRIDAY sign ── */
export const hostageLights: Scene = {
  init: () => ({}),
  draw(ctx, w, h, t) {
    const red = Math.sin(t * 9) > 0;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, w * 0.6, h * 0.05, w * 0.35, red ? '255, 30, 60' : '40, 90, 255', 0.22);
    glow(ctx, w * 0.98, h * 0.05, w * 0.3, red ? '40, 90, 255' : '255, 30, 60', 0.22);
    ctx.globalCompositeOperation = 'source-over';
    const flick = Math.random() < 0.04 ? 0.3 : 1;
    ctx.save();
    ctx.font = `800 ${Math.min(54, w * 0.04)}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.shadowColor = `rgba(255, 40, 80, ${flick})`;
    ctx.shadowBlur = 24;
    ctx.strokeStyle = `rgba(255, 120, 150, ${flick})`;
    ctx.lineWidth = 2;
    ctx.strokeText('BLACK FRIDAY', w - 60, h * 0.36);
    ctx.font = `600 ${Math.min(18, w * 0.014)}px Inter, system-ui, sans-serif`;
    ctx.shadowColor = `rgba(80, 160, 255, ${flick})`;
    ctx.fillStyle = `rgba(160, 210, 255, ${flick})`;
    ctx.fillText('HOSTAGE CRISIS · 26–29 NOV', w - 60, h * 0.36 + 30);
    ctx.restore();
  },
};

/* ── July: the storm. Rolling clouds, branching lightning with a screen shake, wind-driven
   rain sheets, and a flood that surges with waves and carries debris across the cover. ── */
function bolt(ctx: Ctx, x: number, y: number, len: number, angle: number, width: number, depth: number) {
  let cx = x,
    cy = y;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const a = angle + rand(-0.6, 0.6);
    cx += Math.cos(a) * (len / steps);
    cy += Math.sin(a) * (len / steps);
    ctx.lineTo(cx, cy);
    if (depth < 2 && Math.random() < 0.18) {
      ctx.stroke();
      bolt(ctx, cx, cy, len * 0.45, angle + rand(-0.9, 0.9), width * 0.5, depth + 1);
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
    }
  }
  ctx.stroke();
}
export const storm: Scene = {
  init: (w, h) => ({
    clouds: Array.from({ length: 9 }, (_, i) => ({ x: rand(-w * 0.2, w), y: rand(-h * 0.08, h * 0.12), r: rand(110, 220), v: rand(8, 22), shade: rand(0.8, 1), i })),
    sheets: Array.from({ length: Math.round(Math.min(600, w / 2.4)) }, () => ({ x: rand(-w * 0.3, w), y: rand(0, h), v: rand(900, 1500), l: rand(18, 42) })),
    flash: 0,
    next: rand(1.2, 2.5),
    seed: 0,
    debris: Array.from({ length: 4 }, (_, i) => ({ kind: ['umbrella', 'boat', 'mat', 'bottle'][i], x: w * (0.15 + i * 0.22), v: rand(45, 90), r: 0, vr: rand(-1, 1) })),
    nextDebris: 1,
    level: 0,
  }),
  draw(ctx, w, h, t, dt, s) {
    // Thunder flash: lightning strikes every 2–5 s, sometimes a double strike.
    s.next -= dt;
    if (s.next <= 0) {
      s.flash = 1;
      s.boltX = rand(w * 0.45, w * 0.98);
      s.seed = Math.random();
      s.next = Math.random() < 0.3 ? 0.18 : rand(2, 5);
    }
    // Screen shake on the strike: nudge the cover root itself.
    if (s.root) {
      const k = s.flash > 0.6 ? (s.flash - 0.6) * 10 : 0;
      s.root.style.transform = k ? `translate(${rand(-k, k)}px, ${rand(-k, k)}px)` : '';
    }
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(210, 225, 255, ${s.flash * 0.35})`;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.shadowColor = 'rgba(180, 210, 255, 1)';
      ctx.shadowBlur = 30;
      ctx.strokeStyle = `rgba(245, 250, 255, ${Math.min(1, s.flash * 1.4)})`;
      bolt(ctx, s.boltX, 0, h * 0.55, Math.PI / 2, 3.2, 0);
      ctx.restore();
      s.flash = Math.max(0, s.flash - dt * 2.6);
    }
    // Clouds, lit from inside on the flash.
    for (const c of s.clouds) {
      c.x += c.v * dt;
      if (c.x - c.r > w) c.x = -c.r * 2;
      const lit = s.flash * (Math.abs(c.x - (s.boltX || 0)) < 300 ? 1 : 0.35);
      const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
      const base = Math.round(18 + 70 * lit);
      g.addColorStop(0, `rgba(${base + 20}, ${base + 30}, ${base + 45}, ${c.shade})`);
      g.addColorStop(1, `rgba(${base}, ${base + 8}, ${base + 18}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, c.r * 1.6, c.r * 0.7, 0, 0, TAU);
      ctx.fill();
    }
    // Wind-driven rain sheets, gusting.
    const gust = 0.35 + 0.25 * Math.sin(t * 0.7);
    ctx.strokeStyle = 'rgba(190, 215, 235, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const d of s.sheets) {
      d.y += d.v * dt;
      d.x += d.v * gust * dt;
      if (d.y > h) (d.y = rand(-40, 0)), (d.x = rand(-w * 0.3, w));
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.l * gust, d.y - d.l);
    }
    ctx.stroke();
    // The flood: surges up and down over ~12 s, three layered waves.
    s.level = 0.5 + 0.06 * Math.sin(t * 0.5) + 0.02 * Math.sin(t * 1.7);
    const wl = h * s.level;
    const layers = [
      ['rgba(40, 85, 110, 0.45)', 1.0, 10, 0],
      ['rgba(55, 110, 140, 0.4)', 1.4, 7, 1.7],
      ['rgba(80, 140, 170, 0.35)', 2.1, 5, 3.1],
    ] as const;
    layers.forEach(([col, sp, amp, ph], i) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12)
        ctx.lineTo(x, wl + i * 8 + Math.sin(x * 0.012 + t * sp + ph) * amp + Math.sin(x * 0.031 - t * sp * 1.3) * amp * 0.5);
      ctx.lineTo(w, h);
      ctx.fill();
    });
    // Foam on the crest.
    ctx.strokeStyle = 'rgba(230, 245, 255, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const y = wl + Math.sin(x * 0.012 + t) * 10 + Math.sin(x * 0.031 - t * 1.3) * 5;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Debris carried on the flood: a flipped umbrella, a yoga mat, a water bottle, a sandal.
    s.nextDebris -= dt;
    if (s.nextDebris <= 0) {
      s.debris.push({ kind: pick(['umbrella', 'mat', 'bottle', 'sandal', 'boat', 'boat']), x: -60, v: rand(45, 90), r: 0, vr: rand(-1, 1) });
      s.nextDebris = rand(1.6, 3.2);
    }
    for (const d of s.debris) {
      d.x += d.v * dt;
      d.r += d.vr * dt;
      const y = wl + Math.sin(d.x * 0.012 + t) * 10 - 6;
      ctx.save();
      ctx.translate(d.x, y);
      ctx.rotate(Math.sin(t * 2 + d.x * 0.02) * 0.25 + (d.kind === 'umbrella' ? d.r : 0));
      if (d.kind === 'umbrella') {
        ctx.fillStyle = '#ff5d6c';
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -30);
        ctx.stroke();
      } else if (d.kind === 'mat') {
        ctx.fillStyle = '#7b5cff';
        ctx.fillRect(-40, -5, 70, 8);
        ctx.beginPath();
        ctx.arc(32, -1, 8, 0, TAU);
        ctx.fill();
      } else if (d.kind === 'bottle') {
        ctx.fillStyle = '#4ecdc4';
        ctx.fillRect(-18, -6, 32, 12);
        ctx.fillStyle = '#222';
        ctx.fillRect(14, -4, 6, 8);
      } else if (d.kind === 'sandal') {
        ctx.fillStyle = '#ffb347';
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 7, 0, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = '#f4f1e8';
        ctx.beginPath();
        ctx.moveTo(-26, -4);
        ctx.lineTo(26, -4);
        ctx.lineTo(16, 9);
        ctx.lineTo(-16, 9);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.lineTo(0, -26);
        ctx.lineTo(10, -4);
        ctx.fill();
      }
      ctx.restore();
      // Splash rings where it bobs.
      if (Math.random() < 0.04) glow(ctx, d.x, y + 6, 18, '220, 240, 255', 0.5);
    }
    s.debris = s.debris.filter((d: any) => d.x < w + 80);
  },
};

/* ── May: afterparty extras — neon sign, a bass speaker thumping, balloons rising (one for Mom) ── */
export const afterpartyExtra: Scene = {
  init: (w, h) => ({ balloons: Array.from({ length: 5 }, (_, i) => ({ x: rand(w * 0.72, w * 0.95), y: rand(h * 0.3, h * 1.2), v: rand(22, 40), c: pick(['255, 90, 150', '255, 200, 70', '120, 200, 255', '190, 120, 255', '255, 130, 100']), mom: i === 0 })) }),
  draw(ctx, w, h, t, dt, s) {
    const beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * 1.05)), 6); // ~126 bpm-ish thump
    // Neon sign.
    const flick = Math.random() < 0.03 ? 0.35 : 1;
    ctx.save();
    ctx.font = `italic 700 ${Math.min(46, w * 0.034)}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = `rgba(255, 70, 180, ${flick})`;
    ctx.shadowBlur = 26 + beat * 20;
    ctx.strokeStyle = `rgba(255, 150, 220, ${flick})`;
    ctx.lineWidth = 2;
    ctx.textAlign = 'right';
    ctx.strokeText('the afterparty', w - 70, h * 0.13);
    ctx.restore();
    // Speaker with pulsing cone and sound rings.
    const sx = w * 0.53,
      sy = h * 0.47;
    ctx.fillStyle = '#1b1b22';
    ctx.fillRect(sx - 34, sy - 60, 68, 104);
    for (const [cy, r] of [[sy - 32, 14], [sy + 12, 24]] as const) {
      ctx.fillStyle = '#33333f';
      ctx.beginPath();
      ctx.arc(sx, cy, r * (1 + beat * 0.12), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(sx, cy, r * 0.35, 0, TAU);
      ctx.fill();
    }
    for (let k = 0; k < 3; k++) {
      const p = ((t * 1.05 + k / 3) % 1);
      ctx.strokeStyle = `rgba(255, 120, 200, ${0.5 * (1 - p)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy + 12, 30 + p * 90, -0.9, 0.9);
      ctx.stroke();
    }
    // Balloons.
    for (const b of s.balloons) {
      b.y -= b.v * dt;
      if (b.y < h * 0.18) (b.y = h * 0.62 + rand(0, 80)), (b.x = rand(w * 0.72, w * 0.95));
      const x = b.x + Math.sin(t + b.y * 0.01) * 12;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, b.y + 30);
      ctx.quadraticCurveTo(x + 8, b.y + 55, x, b.y + 80);
      ctx.stroke();
      const g = ctx.createRadialGradient(x - 8, b.y - 10, 2, x, b.y, 32);
      g.addColorStop(0, `rgba(255,255,255,0.9)`);
      g.addColorStop(0.25, `rgba(${b.c}, 0.95)`);
      g.addColorStop(1, `rgba(${b.c}, 0.75)`);
      ctx.fillStyle = g;
      if (b.mom) {
        heart(ctx, x, b.y - 26, 56);
        ctx.fillStyle = '#fff';
        ctx.font = '700 12px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('MOM', x, b.y + 4);
      } else {
        ctx.beginPath();
        ctx.ellipse(x, b.y, 24, 30, 0, 0, TAU);
        ctx.fill();
      }
    }
  },
};

/* ── November: heist lasers, a searchlight hunting the cover, a swinging hostage tag ── */
export const heist: Scene = {
  init: () => ({}),
  draw(ctx, w, h, t) {
    // Red laser grid, sweeping.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const y0 = h * 0.08 + i * h * 0.08;
      const off = Math.sin(t * 0.8 + i) * 60;
      ctx.strokeStyle = `rgba(255, 40, 60, ${0.25 + 0.2 * Math.sin(t * 3 + i)})`;
      ctx.shadowColor = 'rgba(255, 30, 50, 0.9)';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, y0 + off);
      ctx.lineTo(w, y0 - off * 0.6 + 40);
      ctx.stroke();
    }
    // Searchlight cone hunting across the hero.
    const sx = w * 0.5 + (Math.sin(t * 0.45) * 0.5 + 0.5) * w * 0.48,
      sy = h * 0.3 + Math.sin(t * 0.8) * h * 0.1;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 140);
    g.addColorStop(0, 'rgba(255, 250, 220, 0.25)');
    g.addColorStop(1, 'rgba(255, 250, 220, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - 140, sy - 140, 280, 280);
    ctx.restore();
    // A big price tag hanging on a chain with a padlock, swinging.
    const px = w * 0.66,
      py = 0,
      swing = Math.sin(t * 1.3) * 0.22;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(swing);
    ctx.strokeStyle = '#9aa0a8';
    ctx.lineWidth = 3;
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.ellipse(0, 10 + k * 14, 4, 7, k % 2 ? 0 : Math.PI / 2, 0, TAU);
      ctx.stroke();
    }
    ctx.translate(0, 140);
    ctx.fillStyle = '#c0162d';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(48, 26);
    ctx.lineTo(48, 120);
    ctx.lineTo(-48, 120);
    ctx.lineTo(-48, 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 22, 7, 0, TAU);
    ctx.fill();
    ctx.font = '800 30px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('-20%', 0, 72);
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    ctx.fillText('HELD HOSTAGE', 0, 98);
    // Padlock.
    ctx.strokeStyle = '#d9b44a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(30, 112, 9, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#d9b44a';
    ctx.fillRect(18, 112, 24, 18);
    ctx.restore();
  },
};

/* ── January: Times-Square style ball drop and a 3-2-1 countdown that lands on 2027 ── */
export const ballDrop: Scene = {
  init: () => ({}),
  draw(ctx, w, h, t) {
    const cycle = t % 8; // 0–5 s drop with countdown, 5–8 s celebrate
    const x = w * 0.5,
      top = h * 0.06,
      bottom = h * 0.4;
    ctx.strokeStyle = 'rgba(200, 210, 230, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, top - 30);
    ctx.lineTo(x, bottom + 20);
    ctx.stroke();
    const p = Math.min(1, cycle / 5);
    const y = top + (bottom - top) * p;
    glow(ctx, x, y, 70, '180, 210, 255', 0.5);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU + t * 0.8;
      const r = 22;
      const c = ['120, 200, 255', '255, 214, 102', '255, 120, 150', '255, 255, 255'][i % 4];
      ctx.fillStyle = `rgba(${c}, ${0.6 + 0.4 * Math.sin(t * 6 + i)})`;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9, 4, 0, TAU);
      ctx.fill();
    }
    ctx.save();
    ctx.textAlign = 'center';
    if (cycle < 5) {
      const n = Math.max(1, 5 - Math.floor(cycle));
      const frac = cycle % 1;
      ctx.font = `800 ${Math.round(70 + frac * 40)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = `rgba(255, 255, 255, ${1 - frac * 0.8})`;
      ctx.fillText(String(n), x, bottom + 110);
    } else {
      const k = Math.min(1, (cycle - 5) * 2);
      ctx.font = `800 ${Math.round(60 + k * 30)}px Georgia, serif`;
      ctx.shadowColor = 'rgba(255, 214, 102, 0.9)';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ffd666';
      ctx.fillText('2027', x, bottom + 110);
    }
    ctx.restore();
  },
};

/* ── February: Red Flags, Green Flags — a dating-app card stack. A profile slides in, the bio
   types out, a giant stamp slams RED FLAG or GREEN FLAG, and the card is flung off left or
   right. Little flags pop up out of the floor like whack-a-mole. ── */
const PROFILES = [
  { name: 'Rohan, 29', bio: 'Skips leg day. Every day.', red: true },
  { name: 'Ananya, 27', bio: 'Books the 7am. Shows up.', red: false },
  { name: 'Kabir, 31', bio: '"I don\'t need to stretch."', red: true },
  { name: 'Meera, 30', bio: 'Brings a friend to barre.', red: false },
  { name: 'Dev, 28', bio: 'Late-cancels at 6:59.', red: true },
  { name: 'Isha, 26', bio: 'Holds the plank. Smiles.', red: false },
];
export const flagSwipe: Scene = {
  init: (w, h) => ({ i: 0, t0: 0, pops: Array.from({ length: 8 }, (_, k) => ({ x: w * (0.5 + k * 0.065), p: rand(0, 6), red: k % 2 === 0 })) }),
  draw(ctx, w, h, t, _dt, s) {
    const cyc = 3.6;
    if (t - s.t0 > cyc) (s.t0 = t), (s.i = (s.i + 1) % PROFILES.length);
    const k = (t - s.t0) / cyc; // 0 → 1
    const prof = PROFILES[s.i];
    const cx = w * 0.74,
      cy = h * 0.3,
      cw = 230,
      ch = 300;
    // Next card peeking behind.
    ctx.save();
    ctx.translate(cx + 10, cy + 10);
    ctx.rotate(0.05);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
    ctx.restore();
    // Enter (0–0.15), hold + stamp (0.15–0.7), fling (0.7–1).
    const enter = Math.min(1, k / 0.15);
    const fling = k > 0.7 ? (k - 0.7) / 0.3 : 0;
    const dir = prof.red ? -1 : 1;
    const x = cx + dir * fling * fling * w * 0.6;
    const y = cy + (1 - enter) * 60 - fling * 40;
    ctx.save();
    ctx.globalAlpha = enter * (1 - fling * 0.6);
    ctx.translate(x, y);
    ctx.rotate(dir * fling * 0.6 + Math.sin(t * 2) * 0.01);
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 24;
    ctx.fillStyle = '#fff8f8';
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 18);
    ctx.fill();
    ctx.shadowBlur = 0;
    // "Photo": a gradient with a silhouette.
    const g = ctx.createLinearGradient(0, -ch / 2, 0, 20);
    g.addColorStop(0, prof.red ? '#f7b2b7' : '#b9e6c9');
    g.addColorStop(1, prof.red ? '#e9707c' : '#62b98a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(-cw / 2 + 10, -ch / 2 + 10, cw - 20, 180, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(0, -ch / 2 + 80, 30, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -ch / 2 + 165, 55, 40, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#2a2026';
    ctx.font = '700 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(prof.name, -cw / 2 + 16, 52);
    const typed = prof.bio.slice(0, Math.floor(Math.min(1, Math.max(0, (k - 0.1) / 0.25)) * prof.bio.length));
    ctx.font = '14px Georgia, serif';
    ctx.fillStyle = '#5a4a52';
    ctx.fillText(typed, -cw / 2 + 16, 78);
    // Like / nope buttons.
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✕', -40, 125);
    ctx.fillText('♥', 40, 125);
    // The stamp.
    if (k > 0.4) {
      const sk = Math.min(1, (k - 0.4) / 0.08);
      const sc = 2.2 - 1.2 * sk;
      ctx.save();
      ctx.translate(0, -20);
      ctx.rotate(prof.red ? -0.25 : 0.2);
      ctx.scale(sc, sc);
      ctx.globalAlpha = sk;
      ctx.strokeStyle = prof.red ? '#e11d48' : '#16a34a';
      ctx.lineWidth = 4;
      ctx.strokeRect(-78, -22, 156, 44);
      ctx.fillStyle = prof.red ? '#e11d48' : '#16a34a';
      ctx.font = '900 24px Inter, system-ui, sans-serif';
      ctx.fillText(prof.red ? '🚩 RED FLAG' : 'GREEN FLAG ✅', 0, 9);
      ctx.restore();
    }
    ctx.restore();
    // Whack-a-mole flags popping up along the floor of the hero.
    const floor = h * 0.58;
    for (const p of s.pops) {
      const up = Math.max(0, Math.sin(t * 1.6 + p.p)) ** 3;
      const fy = floor - up * 60;
      ctx.strokeStyle = 'rgba(240,240,240,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, floor);
      ctx.lineTo(p.x, fy - 30);
      ctx.stroke();
      ctx.fillStyle = p.red ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.moveTo(p.x, fy - 30);
      ctx.lineTo(p.x + 26 + Math.sin(t * 6 + p.p) * 3, fy - 22);
      ctx.lineTo(p.x, fy - 14);
      ctx.fill();
    }
  },
};

/* ── March: The Pre-Game — a stadium scoreboard counting down to the anniversary, a foam finger
   bouncing, a megaphone shouting, pom-pom confetti. ── */
export const preGame: Scene = {
  init: (w, h) => ({ confetti: makeConfetti(w, h, 40) }),
  draw(ctx, w, h, t, dt, s) {
    // Scoreboard.
    const bx = w * 0.62,
      by = h * 0.08,
      bw = Math.min(420, w * 0.32),
      bh = 120;
    ctx.fillStyle = '#121218';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#3a3a48';
    ctx.lineWidth = 4;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.fillStyle = '#ffcc33';
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('KICK-OFF: 9TH ANNIVERSARY · 1 APR', bx + bw / 2, by + 22);
    const secs = Math.max(0, 31 * 86400 - ((t * 3600) % (31 * 86400)));
    const parts = [Math.floor(secs / 86400), Math.floor((secs % 86400) / 3600), Math.floor((secs % 3600) / 60), Math.floor(secs % 60)];
    const labels = ['DAYS', 'HRS', 'MIN', 'SEC'];
    parts.forEach((v, i) => {
      const x = bx + bw * (0.14 + i * 0.24);
      ctx.fillStyle = '#ff5a3c';
      ctx.shadowColor = 'rgba(255, 90, 60, 0.9)';
      ctx.shadowBlur = 12;
      ctx.font = '700 40px "Courier New", monospace';
      ctx.fillText(String(v).padStart(2, '0'), x, by + 75);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#aaa';
      ctx.font = '600 10px Inter, system-ui, sans-serif';
      ctx.fillText(labels[i], x, by + 100);
    });
    // Foam finger bouncing.
    const fx = w * 0.88,
      fy = h * 0.42 + Math.abs(Math.sin(t * 3)) * -24;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(Math.sin(t * 3) * 0.15);
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.roundRect(-38, -10, 76, 90, 16);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-12, -90, 26, 90, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#1', 0, 45);
    ctx.restore();
    // Megaphone with shout lines and a word bubble.
    const mx = w * 0.66,
      my = h * 0.42;
    const shout = (Math.sin(t * 2.2) + 1) / 2;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(70, -36);
    ctx.lineTo(70, 36);
    ctx.lineTo(0, 12);
    ctx.fill();
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(-22, -10, 24, 20);
    ctx.strokeStyle = `rgba(255,255,255,${0.4 + shout * 0.5})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(70, 0, 24 + i * 16 + shout * 8, -0.5, 0.5);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.font = `900 ${Math.round(26 + shout * 8)}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = '#ffd166';
    ctx.textAlign = 'center';
    ctx.rotate(0);
    ctx.fillText("LET'S GOOO", mx + 120, my - 50);
    ctx.restore();
    drawConfetti(ctx, w, h, t, dt, s.confetti, 0.6);
  },
};

/* ── April, from scratch: Nine Years. We Kept The Receipts. One composed gala scene:
   a gold "9" on a spinning sunburst, a desk printer printing a client's record line by
   line, a stamp slamming CERTIFIED INSUFFERABLE, confetti cannons and gold fireworks. ── */
const RECEIPT = [
  'PHYSIQUE 57 · ON RECORD',
  '------------------------',
  'ON FILE SINCE   14 Mar 2019',
  'CLASSES TAKEN           312',
  'BOOKED, NOT ATTENDED     41',
  'LATE CANCELS             17',
  'LONGEST STREAK       9 wks',
  'MOST TAKEN   Signature 7am',
  '------------------------',
  'STATUS',
];
export const aprilGala: Scene = {
  init: (w, h) => ({
    pieces: [] as any[],
    nextCannon: 0.5,
    bursts: [] as any[],
    nextBurst: 0.8,
    glitter: Array.from({ length: Math.round(Math.min(260, (w * h) / 6000)) }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(14, 40), p: rand(0, TAU), s: rand(0.8, 2.2) })),
  }),
  draw(ctx, w, h, t, dt, s) {
    // Slow diagonal gold light sweeps across the whole cover.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 2; k++) {
      const pos = (((t * 0.07 + k * 0.5) % 1) * 1.6 - 0.3) * w;
      const g = ctx.createLinearGradient(pos - 200, 0, pos + 200, h);
      g.addColorStop(0, 'rgba(212, 175, 55, 0)');
      g.addColorStop(0.5, 'rgba(212, 175, 55, 0.07)');
      g.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    // Glitter rain over the full page, twinkling.
    for (const g of s.glitter) {
      g.y += g.v * dt;
      if (g.y > h + 4) (g.y = -4), (g.x = rand(0, w));
      const tw = Math.max(0, Math.sin(t * 4 + g.p));
      ctx.fillStyle = `rgba(255, 220, 140, ${0.25 + 0.75 * tw})`;
      ctx.fillRect(g.x, g.y, g.s, g.s);
      if (tw > 0.97) {
        ctx.fillRect(g.x - 4, g.y, 9, 1);
        ctx.fillRect(g.x, g.y - 4, 1, 9);
      }
    }
    ctx.restore();
    // Bunting across the top right.
    const flags = 14;
    for (let i = 0; i < flags; i++) {
      const u = i / (flags - 1);
      const x = w * 0.42 + u * w * 0.56;
      const y = h * 0.03 + Math.sin(u * Math.PI) * 34 + Math.sin(t * 2 + i) * 2;
      ctx.fillStyle = ['#d4af37', '#111111', '#f5e6c8', '#b8860b', '#1c1c1c'][i % 5];
      ctx.beginPath();
      ctx.moveTo(x - 14, y);
      ctx.lineTo(x + 14, y);
      ctx.lineTo(x, y + 30);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      const x = w * 0.42 + u * w * 0.56,
        y = h * 0.03 + Math.sin(u * Math.PI) * 34;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    // The cake: three tiers, drips, nine candles that flicker, get blown out every 10 s, and relight.
    const kx = w * 0.85,
      kb = h * 0.585;
    const tiers = [
      [150, 54, '#f7f0e2', '#d4af37'],
      [116, 46, '#1a1a1a', '#e9c46a'],
      [84, 40, '#f7f0e2', '#d4af37'],
    ] as const;
    let ty = kb;
    ctx.fillStyle = '#d9d2c5';
    ctx.beginPath();
    ctx.ellipse(kx, kb + 4, 100, 10, 0, 0, TAU);
    ctx.fill();
    for (const [tw2, th2, body, icing] of tiers) {
      ctx.fillStyle = body;
      ctx.fillRect(kx - tw2 / 2, ty - th2, tw2, th2);
      ctx.fillStyle = icing;
      ctx.fillRect(kx - tw2 / 2, ty - th2, tw2, 10);
      for (let d = 0; d < 7; d++) {
        const dx = kx - tw2 / 2 + 8 + d * ((tw2 - 16) / 6);
        ctx.beginPath();
        ctx.ellipse(dx, ty - th2 + 10, 5, 7 + (d % 3) * 3, 0, 0, Math.PI);
        ctx.fill();
      }
      ty -= th2;
    }
    const blow = t % 10; // 0–7 lit, 7–8 blown (smoke), 8–10 relight
    for (let c = 0; c < 9; c++) {
      const cxp = kx - 36 + c * 9;
      ctx.fillStyle = ['#f5e6c8', '#d4af37'][c % 2];
      ctx.fillRect(cxp - 2, ty - 22, 4, 22);
      const lit = blow < 7 || blow > 8 + c * 0.2;
      if (lit) {
        const fl = 1 + 0.25 * Math.sin(t * 18 + c * 3);
        glow(ctx, cxp, ty - 28, 14 * fl, '255, 190, 80', 0.6);
        ctx.fillStyle = '#ffdd66';
        ctx.beginPath();
        ctx.ellipse(cxp, ty - 28, 3 * fl, 6 * fl, Math.sin(t * 7 + c) * 0.2, 0, TAU);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(220,220,220,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let q = 0; q < 6; q++) ctx.lineTo(cxp + Math.sin((blow - 7) * 6 + q) * 4, ty - 24 - q * 7 - (blow - 7) * 10);
        ctx.stroke();
      }
    }
    if (blow >= 6.6 && blow < 7.4) {
      ctx.save();
      ctx.font = '900 30px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('MAKE A WISH', kx, ty - 70);
      ctx.restore();
    }
    // Party hats on the floor either side of the cake.
    for (const [hx, col, tilt] of [[kx - 128, '#111111', -0.2], [kx + 125, '#d4af37', 0.25]] as const) {
      ctx.save();
      ctx.translate(hx, kb);
      ctx.rotate(tilt + Math.sin(t * 2 + hx) * 0.05);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-18, 0);
      ctx.lineTo(18, 0);
      ctx.lineTo(0, -50);
      ctx.fill();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(0, -52, 6, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // Balloon bunches tied either side, bobbing.
    const bunches = [
      [w * 0.7, kb - 20, ['212, 175, 55', '30, 30, 30', '245, 230, 200', '183, 110, 121']],
      [w * 0.97, kb - 20, ['30, 30, 30', '212, 175, 55', '245, 230, 200']],
      [w * 0.04, h * 0.95, ['212, 175, 55', '30, 30, 30', '245, 230, 200']],
      [w * 0.4, h * 0.97, ['183, 110, 121', '212, 175, 55']],
    ] as const;
    for (const [bxp, by0, cols] of bunches) {
      cols.forEach((col, i) => {
        const bx2 = bxp + (i - (cols.length - 1) / 2) * 34 + Math.sin(t * 1.3 + i) * 6;
        const by2 = by0 - 210 - (i % 2) * 40 + Math.sin(t * 1.7 + i * 2) * 8;
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bxp, by0);
        ctx.quadraticCurveTo((bxp + bx2) / 2 + 10, (by0 + by2) / 2, bx2, by2 + 34);
        ctx.stroke();
        const g2 = ctx.createRadialGradient(bx2 - 9, by2 - 12, 3, bx2, by2, 34);
        g2.addColorStop(0, 'rgba(255,255,255,0.9)');
        g2.addColorStop(0.3, `rgba(${col}, 0.95)`);
        g2.addColorStop(1, `rgba(${col}, 0.8)`);
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.ellipse(bx2, by2, 26, 33, 0, 0, TAU);
        ctx.fill();
      });
    }
    // Receipt printer and the receipt feeding out of it (prints a line every 0.5 s, 9 s loop).
    const px = w * 0.55,
      py = h * 0.09,
      pw = 230;
    const loop = t % 9;
    const lines = Math.min(RECEIPT.length, Math.floor(loop / 0.5));
    const lh = 18;
    const paperH = 30 + lines * lh + (lines >= RECEIPT.length ? 60 : 0);
    ctx.save();
    ctx.translate(px, py + 40);
    ctx.rotate(Math.sin(t * 0.8) * 0.01);
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(-pw / 2 + 12, 0, pw - 24, paperH);
    // Torn zig-zag bottom.
    ctx.beginPath();
    for (let x = -pw / 2 + 12; x <= pw / 2 - 12; x += 8) ctx.lineTo(x, paperH + ((x / 8) % 2 ? 5 : 0));
    ctx.lineTo(pw / 2 - 12, paperH);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a2a2a';
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i < lines; i++) ctx.fillText(RECEIPT[i], -pw / 2 + 22, 24 + i * lh);
    if (lines >= RECEIPT.length) {
      const sk = Math.min(1, (loop - RECEIPT.length * 0.5) / 0.15);
      ctx.save();
      ctx.translate(0, 30 + RECEIPT.length * lh + 18);
      ctx.rotate(-0.12);
      ctx.scale(2 - sk, 2 - sk);
      ctx.globalAlpha = sk;
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 3;
      ctx.strokeRect(-96, -18, 192, 36);
      ctx.fillStyle = '#b91c1c';
      ctx.font = '900 15px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CERTIFIED INSUFFERABLE', 0, 5);
      ctx.restore();
    }
    ctx.restore();
    // The printer body on top of the paper.
    ctx.fillStyle = '#1d1d24';
    ctx.beginPath();
    ctx.roundRect(px - pw / 2, py, pw, 48, 10);
    ctx.fill();
    ctx.fillStyle = '#0c0c10';
    ctx.fillRect(px - pw / 2 + 14, py + 38, pw - 28, 6);
    ctx.fillStyle = lines < RECEIPT.length ? (Math.sin(t * 12) > 0 ? '#22c55e' : '#14532d') : '#22c55e';
    ctx.beginPath();
    ctx.arc(px + pw / 2 - 20, py + 18, 4, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e9c46a';
    ctx.font = '700 10px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('P57 · RECEIPT ENGINE', px - pw / 2 + 14, py + 22);
    // Confetti cannons from both bottom corners of the hero, alternating.
    s.nextCannon -= dt;
    if (s.nextCannon <= 0) {
      const corner = Math.floor(t / 2.2) % 4;
      const left = corner % 2 === 0;
      const ox = left ? w * 0.01 : w * 0.99,
        oy = corner < 2 ? h * 0.98 : h * 0.6;
      for (let i = 0; i < 80; i++) {
        const a = -Math.PI / 2 + (left ? 0.3 : -0.3) + rand(-0.3, 0.3);
        const v = rand(420, 760);
        s.pieces.push({ x: ox, y: oy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rand(0, TAU), vr: rand(-12, 12), c: Math.random() < 0.8 ? pick(GOLD) : pick(['20, 20, 20', '245, 230, 200', '183, 110, 121']), sz: rand(4, 10), life: 1 });
      }
      s.nextCannon = 2.2;
    }
    for (const p of s.pieces) {
      p.vy = Math.min(p.vy + 560 * dt, 130);
      p.vx *= 1 - 1.5 * dt;
      p.x += p.vx * dt + Math.sin(t * 3 + p.r) * 0.6;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      p.life -= dt * 0.25;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.scale(1, Math.abs(Math.cos(p.r * 1.3)) + 0.15);
      ctx.fillStyle = `rgba(${p.c}, ${Math.max(0, Math.min(1, p.life * 1.5))})`;
      ctx.fillRect(-p.sz / 2, -p.sz / 4, p.sz, p.sz / 2);
      ctx.restore();
    }
    s.pieces = s.pieces.filter((p: any) => p.life > 0 && p.y < h + 20);
    // Gold fireworks with trailing sparks.
    s.nextBurst -= dt;
    if (s.nextBurst <= 0) {
      s.bursts.push({ x: rand(w * 0.05, w * 0.95), y: rand(h * 0.05, h * 0.45), life: 1, c: pick(GOLD), n: 70 });
      s.nextBurst = rand(0.9, 1.6);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const b of s.bursts) {
      b.life = Math.max(0, b.life - dt * 0.55);
      const age = 1 - b.life;
      glow(ctx, b.x, b.y, 50 * b.life, b.c, 0.3 * b.life);
      for (let i = 0; i < b.n; i++) {
        const a = (i / b.n) * TAU;
        const r = 130 * age * (1.2 - age * 0.4);
        const x = b.x + Math.cos(a) * r,
          y = b.y + Math.sin(a) * r + age * age * 40;
        ctx.strokeStyle = `rgba(${b.c}, ${b.life})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - Math.cos(a) * 8, y - Math.sin(a) * 8);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    s.bursts = s.bursts.filter((b: any) => b.life > 0);
  },
};

/* ── December: heavy, real-feeling snow (big soft foreground flakes that drift and tumble)
   and Santa, who waddles in, walks right up to the glass, knocks on your screen, makes his
   pitch and waddles off again. 16 s loop. ── */
function drawSanta(ctx: Ctx, x: number, y: number, sc: number, t: number, walking: boolean, knock: number, wave: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  const step = walking ? Math.sin(t * 9) : 0;
  ctx.translate(0, -Math.abs(step) * 3);
  // Boots.
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-18 + step * 4, -8, 14, 8);
  ctx.fillRect(4 - step * 4, -8, 14, 8);
  // Body.
  ctx.fillStyle = '#d62828';
  ctx.beginPath();
  ctx.ellipse(0, -40, 30, 34, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(-4, -72, 8, 64);
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-30, -40, 60, 9);
  ctx.fillStyle = '#f4c542';
  ctx.fillRect(-7, -41, 14, 11);
  // Arms: left arm waves, right arm knocks toward the viewer.
  ctx.strokeStyle = '#d62828';
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-26, -58);
  ctx.lineTo(-44, -58 - 30 * wave + 14 * (1 - wave) + Math.sin(t * 10) * 8 * wave);
  ctx.stroke();
  const kx = 40 + knock * 6,
    ky = -66 - knock * 4;
  ctx.beginPath();
  ctx.moveTo(26, -58);
  ctx.lineTo(kx, ky);
  ctx.stroke();
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.arc(kx, ky, 7 + knock * 2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-44, -58 - 30 * wave + 14 * (1 - wave) + Math.sin(t * 10) * 8 * wave, 7, 0, TAU);
  ctx.fill();
  // Head, beard, hat.
  ctx.fillStyle = '#f2c6a0';
  ctx.beginPath();
  ctx.arc(0, -86, 16, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(0, -74, 19, 15, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(-6, -89, 2, 0, TAU);
  ctx.arc(6, -89, 2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e07a5f';
  ctx.beginPath();
  ctx.arc(0, -84, 3.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#d62828';
  ctx.beginPath();
  ctx.moveTo(-17, -96);
  ctx.quadraticCurveTo(4, -130, 26, -108 + Math.sin(t * 4) * 3);
  ctx.lineTo(15, -96);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(-18, -100, 36, 7);
  ctx.beginPath();
  ctx.arc(26, -108 + Math.sin(t * 4) * 3, 6, 0, TAU);
  ctx.fill();
  // Sack over the shoulder.
  ctx.fillStyle = '#8b5e34';
  ctx.beginPath();
  ctx.ellipse(-30, -70, 18, 22, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}
export const santaKnock: Scene = {
  init: (w, h) => ({
    flakes: Array.from({ length: 70 }, () => ({ x: rand(0, w), y: rand(-h, h), r: rand(3, 8), v: rand(30, 70), s: rand(0, TAU) })),
  }),
  draw(ctx, w, h, t, dt, s) {
    const floor = h * 0.58;
    const L = 16,
      k = t % L;
    let x = w * 0.82,
      y = floor,
      sc = 1,
      walking = false,
      knock = 0,
      wave = 0;
    if (k < 4) {
      // Waddle in from the right edge.
      x = w + 60 - (k / 4) * (w * 0.18 + 60);
      walking = true;
    } else if (k < 6.5) {
      // Walk right up to the glass: bigger and lower.
      const p = (k - 4) / 2.5;
      x = w * 0.82 - p * w * 0.06;
      y = floor;
      sc = 1 + p * 1.6;
      walking = true;
    } else if (k < 10) {
      x = w * 0.76;
      y = floor;
      sc = 2.6;
      // Three knocks per second for the first 2 s.
      const kk = k - 6.5;
      knock = kk < 2 ? Math.max(0, Math.sin(kk * Math.PI * 3)) ** 2 : 0;
      wave = kk >= 2 ? 1 : 0;
      if (s.root) s.root.style.transform = knock > 0.85 ? `translate(${rand(-2, 2)}px, ${rand(-2, 2)}px)` : '';
    } else if (k < 12) {
      const p = (k - 10) / 2;
      x = w * 0.76 + p * w * 0.06;
      y = floor;
      sc = 2.6 - p * 1.6;
      walking = true;
    } else {
      const p = (k - 12) / 4;
      x = w * 0.82 + p * (w * 0.18 + 80);
      walking = true;
      wave = 0.5;
    }
    if (s.root && (k < 6.5 || k >= 10)) s.root.style.transform = '';
    // Snow layer behind Santa (heavy, soft, tumbling).
    for (const f of s.flakes) {
      f.y += f.v * dt;
      f.x += Math.sin(t * 0.8 + f.s) * 14 * dt;
      if (f.y > h + 10) (f.y = -10), (f.x = rand(0, w));
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
    }
    drawSanta(ctx, x, y, sc, t, walking, knock, wave);
    // Footprints in the snow while he waddles.
    // Knock bubbles and the pitch.
    if (k >= 6.5 && k < 8.5 && knock > 0.5) {
      ctx.save();
      ctx.font = `900 ${Math.round(34 + knock * 12)}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#d62828';
      ctx.lineWidth = 5;
      ctx.textAlign = 'center';
      ctx.strokeText('KNOCK', w * 0.86, h * 0.2 + (Math.floor((k - 6.5) * 3) % 2) * 50);
      ctx.fillText('KNOCK', w * 0.86, h * 0.2 + (Math.floor((k - 6.5) * 3) % 2) * 50);
      ctx.restore();
      // Little glass crack at the knuckle point.
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.2;
      const cx = x + 40 * sc,
        cy = y - 66 * sc;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
        ctx.stroke();
      }
    }
    if (k >= 8.5 && k < 10) {
      ctx.save();
      const bx = w * 0.62,
        by = h * 0.16;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(bx - 150, by - 34, 300, 68, 16);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx + 90, by + 30);
      ctx.lineTo(bx + 130, by + 70);
      ctx.lineTo(bx + 60, by + 34);
      ctx.fill();
      ctx.fillStyle = '#b91c1c';
      ctx.font = '800 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HO HO HO! Pre-buy January?', bx, by - 4);
      ctx.fillStyle = '#333';
      ctx.font = '13px Inter, system-ui, sans-serif';
      ctx.fillText("I've checked the list. You skipped leg day.", bx, by + 18);
      ctx.restore();
    }
  },
};

/* ── January, funnier: "New year, new me." A round little gym newbie tries a barbell that is
   far too heavy — wobbles, turns red, sweats, gives up, and the bubble says it all. 9 s loop. ── */
export const newbieLift: Scene = {
  init: () => ({ drops: [] as any[] }),
  draw(ctx, w, h, t, dt, s) {
    const k = t % 9;
    const x = w * 0.66,
      floor = h * 0.58;
    // 0–2 squat down, 2–5 strain up (wobble, redden), 5–6 collapse, 6–9 lie there.
    const lift = k < 2 ? 0 : k < 5 ? Math.min(1, (k - 2) / 2.4) * 0.7 : k < 6 ? 0.7 * (1 - (k - 5)) : 0;
    const strain = k >= 2 && k < 5 ? (k - 2) / 3 : 0;
    const fallen = k >= 5.6;
    const wob = strain * Math.sin(t * 30) * 4;
    ctx.save();
    ctx.translate(x, floor);
    if (fallen) ctx.rotate(-Math.PI / 2 * Math.min(1, (k - 5.6) * 4)), ctx.translate(-30, 0);
    // Legs.
    ctx.strokeStyle = '#2b2d42';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    const bend = (1 - lift) * 18;
    ctx.beginPath();
    ctx.moveTo(-14, -4);
    ctx.lineTo(-20 - bend * 0.4, -28 + bend * 0.5);
    ctx.lineTo(-12, -56 + bend);
    ctx.moveTo(14, -4);
    ctx.lineTo(20 + bend * 0.4, -28 + bend * 0.5);
    ctx.lineTo(12, -56 + bend);
    ctx.stroke();
    // Body: a round blob in a headband.
    const by = -84 + bend;
    const face = `rgb(${Math.round(242 + strain * 13)}, ${Math.round(198 - strain * 110)}, ${Math.round(160 - strain * 110)})`;
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.ellipse(wob, by, 30, 32, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(wob, by - 44, 20, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(wob - 20, by - 56, 40, 6);
    // Eyes squeeze shut under strain, mouth grimaces.
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (strain > 0.3) {
      ctx.moveTo(wob - 10, by - 46);
      ctx.lineTo(wob - 4, by - 43);
      ctx.moveTo(wob + 10, by - 46);
      ctx.lineTo(wob + 4, by - 43);
      ctx.moveTo(wob - 8, by - 34);
      ctx.lineTo(wob + 8, by - 34);
    } else {
      ctx.arc(wob - 7, by - 45, 1.5, 0, TAU);
      ctx.moveTo(wob + 8.5, by - 45);
      ctx.arc(wob + 7, by - 45, 1.5, 0, TAU);
      ctx.moveTo(wob - 6, by - 36);
      ctx.quadraticCurveTo(wob, by - 31, wob + 6, by - 36);
    }
    ctx.stroke();
    // Arms + barbell.
    const barY = fallen ? -20 : by - 10 - lift * 70;
    const tilt = strain * Math.sin(t * 6) * 0.12;
    ctx.save();
    ctx.translate(wob, barY);
    ctx.rotate(tilt);
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-22, by - barY + 6 - (fallen ? 0 : 0));
    ctx.lineTo(-30, 0);
    ctx.moveTo(22, by - barY + 6);
    ctx.lineTo(30, 0);
    ctx.stroke();
    ctx.fillStyle = '#9aa0a8';
    ctx.fillRect(-110, -3, 220, 6);
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(sd * 86 - 9, -32, 18, 64);
      ctx.fillRect(sd * 100 - 7, -26, 14, 52);
      ctx.fillStyle = '#ffd166';
      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('200', sd * 86, 4);
    }
    ctx.restore();
    ctx.restore();
    // Sweat drops flying off.
    if (strain > 0.2 && Math.random() < 0.3) s.drops.push({ x: x + rand(-20, 20), y: floor - 140, vx: rand(-80, 80), vy: rand(-120, -40), life: 1 });
    for (const d of s.drops) {
      d.vy += 400 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt * 1.5;
      ctx.fillStyle = `rgba(120, 200, 255, ${Math.max(0, d.life)})`;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 3, 5, 0, 0, TAU);
      ctx.fill();
    }
    s.drops = s.drops.filter((d: any) => d.life > 0);
    // Speech bubble.
    const say = k < 2 ? 'New year, new me.' : k < 5 ? 'Easy… easy…' : k < 6 ? 'NOPE.' : 'Starting Monday.';
    ctx.save();
    ctx.font = '700 16px Inter, system-ui, sans-serif';
    const tw = ctx.measureText(say).width + 28;
    const bx = x + 70,
      by2 = floor - 230;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(bx - tw / 2, by2 - 22, tw, 40, 14);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx - 20, by2 + 16);
    ctx.lineTo(bx - 40, by2 + 38);
    ctx.lineTo(bx - 4, by2 + 16);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.textAlign = 'center';
    ctx.fillText(say, bx, by2 + 4);
    ctx.restore();
  },
};

/* ── June, funnier: Out of Office. A suitcase on tiny legs struts across in sunglasses, a beach
   ball bounces, and an out-of-office auto-reply pops up and types itself. ── */
export const outOfOffice: Scene = {
  init: () => ({}),
  draw(ctx, w, h, t) {
    const floor = h * 0.58;
    // Suitcase strutting left→right across the right half, 10 s loop.
    const u = (t % 10) / 10;
    const sx = w * 0.42 + u * w * 0.62,
      hop = Math.abs(Math.sin(t * 8)) * 8;
    ctx.save();
    ctx.translate(sx, floor - hop);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    const st = Math.sin(t * 8) * 10;
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(-14 + st, 0 + hop);
    ctx.moveTo(14, -6);
    ctx.lineTo(14 - st, 0 + hop);
    ctx.stroke();
    ctx.fillStyle = '#ff9f1c';
    ctx.beginPath();
    ctx.roundRect(-40, -78, 80, 72, 10);
    ctx.fill();
    ctx.fillStyle = '#2ec4b6';
    ctx.fillRect(-40, -50, 80, 8);
    ctx.strokeStyle = '#6b4e16';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-14, -78);
    ctx.lineTo(-14, -92);
    ctx.lineTo(14, -92);
    ctx.lineTo(14, -78);
    ctx.stroke();
    // Sunglasses + grin.
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.roundRect(-26, -70, 22, 12, 4);
    ctx.roundRect(4, -70, 22, 12, 4);
    ctx.fill();
    ctx.fillRect(-4, -66, 8, 3);
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -46, 10, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Stickers.
    ctx.fillStyle = '#fff';
    ctx.font = '700 9px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GOA', -22, -20);
    ctx.fillText('BRB', 22, -20);
    ctx.restore();
    // Beach ball bouncing.
    const bx = w * 0.9,
      by = floor - 30 - Math.abs(Math.sin(t * 2.6)) * 140;
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(t * 2);
    const cols = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#ffffff', '#ff9f1c'];
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 28, (i / 6) * TAU, ((i + 1) / 6) * TAU);
      ctx.fill();
    }
    ctx.restore();
    // Auto-reply window, typing itself, 8 s loop.
    const msg = "Out of office. Freezing, not quitting. Back with abs. 🏖️";
    const k = (t % 8) / 6;
    const shown = msg.slice(0, Math.floor(Math.min(1, k) * msg.length));
    const ax = w * 0.45,
      ay = h * 0.3,
      aw = 330;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(ax, ay, aw, 92, 12);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#e9ecef';
    ctx.beginPath();
    ctx.roundRect(ax, ay, aw, 26, [12, 12, 0, 0]);
    ctx.fill();
    for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(ax + 14 + i * 14, ay + 13, 4.5, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#495057';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Automatic reply: Re: your membership', ax + 64, ay + 17);
    ctx.fillStyle = '#212529';
    ctx.font = '14px Inter, system-ui, sans-serif';
    const brk = msg.lastIndexOf(' ', 38); // wrap on a word, not mid-word
    const l1 = shown.slice(0, Math.min(shown.length, brk)),
      l2 = shown.length > brk ? shown.slice(brk + 1) : '';
    ctx.fillText(l1, ax + 14, ay + 52);
    ctx.fillText(l2, ax + 14, ay + 74);
    if (Math.sin(t * 6) > 0 && k < 1) {
      const cw = ctx.measureText(l2 || l1).width;
      ctx.fillRect(ax + 16 + cw, l2 ? ay + 62 : ay + 40, 2, 15);
    }
    ctx.restore();
  },
};
