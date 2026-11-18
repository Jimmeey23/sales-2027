import { useEffect, useRef } from 'react';
import {
  afterparty,
  afterpartyExtra,
  aprilGala,
  flagSwipe,
  preGame,
  santaKnock,
  ballDrop,
  heist,
  newbieLift,
  outOfOffice,
  storm,
  blackFriday,
  excuseAmnesty,
  giftBoxes,
  heartMonth,
  hostageLights,
  monsoonProps,
  mothersDay,
  resolution,
} from './seasonScenesExtra';

/* Seasonal canvases for the month covers (July's monsoon lives in MonsoonScene).

     2  Valentine's   hearts rising like bokeh, drifting petals, a warm rose glow
     3  Women's Day   purple/green/white ribbons, rising Venus symbols, mimosa, sparkle bursts
     4  Anniversary   We Kept The Receipts: receipts printing a nine-year record, a stamp, falling paper scraps
     6  Pride         a waving rainbow ribbon, a sweeping prism of light, rainbow hearts and confetti
     5  Midsummer     a breathing sun with counter-turning rays and lens flare, mirage, bokeh, embers, cool droplets
    10  Halloween     harvest moon, bats, ghosts, a dangling spider, fog, jack-o'-lanterns, lightning
    11  Diwali        a row of diyas with living flames, and fireworks over them
    12  Christmas     snow in three depths, a string of fairy lights, soft starbursts

   New-theme scenes live in seasonScenesExtra: January (Resolution Season), May (The Afterparty),
   September (Heart Month), October (Gift of Strength — Diwali gifting over the diyas) and November
   (Black Friday Hostage Crisis) and August (The Excuse Amnesty). Halloween stays defined but are not on any 2027 cover.

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
  if (!(r > 0)) return; // a non-positive radius throws and would stop the scene
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

/* ── April: 9th anniversary, Nine Years. We Kept The Receipts. ─────────── */
const RECEIPT_LINES = [
  ['PHYSIQUE 57 · ON RECORD', ''],
  ['-------------------------', ''],
  ['ON FILE SINCE', '14 Mar 2019'],
  ['CLASSES TAKEN', '312'],
  ['BOOKED, NOT ATTENDED', '41'],
  ['LATE CANCELS', '17'],
  ['LONGEST STREAK', '9 wks'],
  ['LONGEST SILENCE', '6 mths'],
  ['MOST TAKEN', 'Signature 7am'],
  ['AVOIDED SINCE 2021', 'Cycle'],
  ['REFERRALS ON FILE', '0'],
  ['-------------------------', ''],
  ['STATUS', ''],
  ['  CERTIFIED INSUFFERABLE', ''],
  ['-------------------------', ''],
  ['This is not a receipt.', ''],
  ['This is evidence.', ''],
];
const STAMPS = ['CERTIFIED INSUFFERABLE', 'ACCOUNT OPENED', 'FOUNDING WITNESS', 'NO RECORD FOUND', 'INSUFFERABLE, PLATINUM'];

const anniversary: Scene = {
  init: (w, h) => ({
    // Receipt strips feeding down from printers above the frame, each printing a record line by line.
    strips: [0.55, 0.7].map((fx, i) => ({
      x: w * fx,
      width: Math.min(250, w * 0.16),
      fed: i * 140,
      speed: rand(16, 26),
      tilt: rand(-0.05, 0.05),
      offset: 0,
      gold: i === 1,
      // staggered so the two records are never at the same line
    })),
    scraps: Array.from({ length: 18 }, () => ({
      x: rand(w * 0.5, w), y: rand(-h, h), vy: rand(18, 46), r: rand(0, TAU), vr: rand(-1.6, 1.6),
      w: rand(14, 30), h: rand(26, 54), sway: rand(0, TAU),
    })),
    stamp: null as any,
    nextStamp: 1.4,
  }),
  draw(ctx, w, h, t, dt, s) {
    // Dim the room so the paper carries the light.
    ctx.fillStyle = 'rgba(8, 6, 4, 0.42)';
    ctx.fillRect(0, 0, w, h);
    // A big dot-matrix "9" behind the right side, like a thermal-printed numeral.
    ctx.save();
    ctx.font = `700 ${Math.round(h * 0.6)}px "IBM Plex Mono", "SFMono-Regular", Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(243, 220, 155, 0.6)';
    ctx.shadowBlur = 30 + Math.sin(t * 1.2) * 8;
    ctx.fillStyle = 'rgba(255, 241, 200, 0.07)';
    ctx.fillText('9', w * 0.42, h * 0.42);
    ctx.restore();

    const lineH = 15;
    ctx.font = `500 11px "IBM Plex Mono", "SFMono-Regular", Menlo, monospace`;
    ctx.textBaseline = 'top';
    for (const st of s.strips) {
      st.fed += st.speed * dt;
      const total = RECEIPT_LINES.length * lineH + 40;
      if (st.fed > total + st.speed * 4) st.fed = 0;   // the record prints, holds, tears off, starts again
      const len = Math.min(st.fed, total);
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.translate(st.x, 0);
      ctx.rotate(st.tilt + Math.sin(t * 0.5 + st.x) * 0.008);
      // The paper, with a soft shadow and a torn zig-zag bottom edge.
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      const paper = ctx.createLinearGradient(-st.width / 2, 0, st.width / 2, 0);
      paper.addColorStop(0, st.gold ? 'rgba(232, 200, 120, 0.92)' : 'rgba(236, 230, 216, 0.9)');
      paper.addColorStop(0.5, st.gold ? 'rgba(250, 226, 160, 0.95)' : 'rgba(250, 247, 240, 0.94)');
      paper.addColorStop(1, st.gold ? 'rgba(214, 178, 100, 0.92)' : 'rgba(226, 220, 206, 0.9)');
      ctx.fillStyle = paper;
      ctx.beginPath();
      ctx.moveTo(-st.width / 2, -4);
      ctx.lineTo(st.width / 2, -4);
      ctx.lineTo(st.width / 2, len);
      const teeth = 12;
      for (let k = 1; k <= teeth; k++) {
        const x = st.width / 2 - (st.width * k) / teeth;
        ctx.lineTo(x + st.width / teeth / 2, len + (k % 2 ? 6 : 0));
        ctx.lineTo(x, len);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowColor = 'transparent';
      // The record, printed from the newest line at the slot downward.
      ctx.save();
      ctx.beginPath();
      ctx.rect(-st.width / 2, 0, st.width, len);
      ctx.clip();
      ctx.fillStyle = 'rgba(40, 34, 28, 0.82)';
      // Reads top to bottom, unrolling as the paper feeds.
      for (let k = 0; k < RECEIPT_LINES.length; k++) {
        const [label, value] = RECEIPT_LINES[(st.offset + k) % RECEIPT_LINES.length];
        const y = 14 + k * lineH;
        if (y > len - 12) break;
        ctx.textAlign = 'left';
        ctx.fillText(label, -st.width / 2 + 12, y);
        if (value) { ctx.textAlign = 'right'; ctx.fillText(value, st.width / 2 - 12, y); }
      }
      ctx.restore();
      ctx.restore();
    }

    // The stamp: thuds onto a receipt, holds, fades.
    s.nextStamp -= dt;
    if (!s.stamp && s.nextStamp <= 0) {
      const st = s.strips[(Math.random() * s.strips.length) | 0];
      s.stamp = { x: st.x, y: rand(h * 0.3, Math.min(st.fed, h) - 40), text: STAMPS[(Math.random() * STAMPS.length) | 0], life: 0, rot: rand(-0.35, 0.2) };
    }
    if (s.stamp) {
      const sp = s.stamp;
      sp.life += dt;
      const inT = Math.min(sp.life / 0.18, 1);
      const scale = 1.9 - 0.9 * (1 - Math.pow(1 - inT, 3));
      const alpha = sp.life < 2.6 ? Math.min(1, inT * 1.2) : Math.max(0, 1 - (sp.life - 2.6) / 0.8);
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(sp.rot);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha * 0.85;
      ctx.font = `800 15px "IBM Plex Mono", Menlo, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const tw = ctx.measureText(sp.text).width + 22;
      ctx.strokeStyle = sp.text === 'FOUNDING WITNESS' ? '#c9a15a' : '#b8323f';
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-tw / 2, -15, tw, 30);
      ctx.lineWidth = 1;
      ctx.strokeRect(-tw / 2 + 4, -11, tw - 8, 22);
      ctx.fillText(sp.text, 0, 1);
      ctx.restore();
      if (sp.life > 3.4) { s.stamp = null; s.nextStamp = rand(1.2, 2.6); }
    }

    // Torn receipt scraps drifting down, flipping as they fall.
    for (const c of s.scraps) {
      c.y += c.vy * dt;
      c.x += Math.sin(t * 0.9 + c.sway) * 16 * dt;
      c.r += c.vr * dt;
      if (c.y > h + 40) Object.assign(c, { y: -40, x: rand(w * 0.5, w) });
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.scale(Math.cos(c.r * 1.7), 1);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = 'rgba(246, 240, 228, 1)';
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.fillStyle = 'rgba(60, 50, 40, 0.5)';
      for (let k = 0; k < c.h / 8 - 1; k++) ctx.fillRect(-c.w / 2 + 3, -c.h / 2 + 4 + k * 7, c.w * (0.4 + ((k * 37) % 50) / 100), 1.4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
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
    const fx = w * 0.7; // flags on the right, clear of the title
    const fy = h * 0.2;
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
      // Hand the cover root down so nested layers can shake it (thunder, Santa's knock).
      if (s.root) (s.base.root = s.root), (s.extra.root = s.root), (s.base.canvas = s.canvas), (s.extra.canvas = s.canvas);
      base.draw(ctx, w, h, t, dt, s.base);
      ctx.save();
      extra.draw(ctx, w, h, t, dt, s.extra);
      ctx.restore();
    },
  };
}


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


export const SEASON_SCENES: Record<number, Scene> = {
  1: layered(layered(resolution, ballDrop), newbieLift),
  2: layered(valentine, flagSwipe),
  3: layered(womensDay, preGame),
  4: aprilGala, // built from scratch; the old receipts scene and gala layer are retired
  5: layered(layered(afterparty, afterpartyExtra), mothersDay),
  6: layered(pride, outOfOffice),
  7: storm,
  8: excuseAmnesty,
  9: heartMonth,
  10: layered(diwali, giftBoxes),
  11: layered(layered(blackFriday, hostageLights), heist),
  12: layered(layered(christmas, yuleExtra), santaKnock),
};

export default function SeasonScene({ month }: { month: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const scene = SEASON_SCENES[month];

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !scene) return;
    // The covers always animate: the scenes are the month's theme, and they autoplay by design.
    const still = false;
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
      try {
        scene.draw(ctx, w, h, t, dt, state);
      } catch (error) {
        // One bad frame must never take the cover down; reset the scene and carry on.
        console.warn('Season scene frame failed; resetting.', error);
        ctx.restore?.();
        state = Object.assign(scene.init(w, h), { root: canvas.parentElement, canvas });
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
