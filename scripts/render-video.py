#!/usr/bin/env python3
"""Renders the month explainer videos: one narrated, animated MP4 per studio-month.

Inputs (all produced by this repo's tooling):
  public/explainer/scripts/<slug>-<MM>.json     the month's figures (from the app's plan data)
  public/explainer/narration/<slug>-<MM>.json   narration segments, one per scene (build_narration.py)
  public/explainer/audio/<slug>-<MM>.mp3        the recorded read (.mp3, .m4a, .wav or .aac)

Timing: the reader pauses about a second between sections (marked "· · ·" in the script).
Those pauses are found in the recording and each scene starts on its own sentence. If the
pauses can't be matched one-to-one, scenes are timed by word count instead.

Output:
  public/explainer/video/<slug>-<MM>.mp4

Sound: host clips, a soft synthesised bed, and synthesised sound effects (whoosh, boing,
cha-ching, sad trombone, vine boom, airhorn, record scratch, rimshot, drum roll). Everything
is generated here, so nothing has to be downloaded at render time.

Usage:
    python3 scripts/render-video.py                 # all 48 months
    python3 scripts/render-video.py bandra 01       # one month
    python3 scripts/render-video.py --manifest      # record which videos exist
Needs: pillow, numpy and an ffmpeg (imageio-ffmpeg wheel, or FFMPEG=/path/to/ffmpeg).
"""
import datetime as dt
import json
import math
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "public/explainer/scripts"
NARR = ROOT / "public/explainer/narration"
AUDIO = ROOT / "public/explainer/audio"
VIDEO = ROOT / "public/explainer/video"
MANIFEST = ROOT / "public/explainer/manifest.json"

SR = 44100
W, H, FPS = 1920, 1080, 24
PRE = 2.5      # intro card before host A starts
OUTRO = 3.5    # end card


def ffmpeg_bin():
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


FFMPEG = ffmpeg_bin()

# ---------- palette (matches the app's explainer) ----------
BG = (12, 11, 9)
INK = (247, 243, 234)
GOLD = (201, 161, 90)
CHAMP = (230, 213, 174)
TEAL = (87, 163, 140)
ROSE = (203, 122, 98)
BLUE = (124, 159, 182)
MUTE = (128, 121, 110)
PANEL = (27, 25, 21)
TRACK = (46, 42, 35)
SLOT_COL = {"Revenue boost": GOLD, "New clients": TEAL, "Win-backs": ROSE, "Renewals": BLUE}
STREAM_COL = {"renewal": GOLD, "newClient": TEAL, "reactivation": ROSE, "other": BLUE}

def _font_dir():
    """DejaVu fonts: the Linux system copy, or the one matplotlib ships (works on macOS)."""
    cands = [os.environ.get("FONT_DIR", ""), "/usr/share/fonts/truetype/dejavu/"]
    try:
        import matplotlib
        cands.append(os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data/fonts/ttf/"))
    except Exception:
        pass
    for c in cands:
        if c and os.path.exists(os.path.join(c, "DejaVuSans-Bold.ttf")):
            return c.rstrip("/") + "/"
    raise SystemExit("DejaVu fonts not found: pip install matplotlib, or set FONT_DIR")


FD = _font_dir()
F_BOLD, F_SANS, F_SERIF, F_SERIFB, F_MONO = (
    "DejaVuSans-Bold.ttf", "DejaVuSans.ttf", "DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf", "DejaVuSansMono-Bold.ttf")
_FONTS = {}


def font(name, size):
    key = (name, int(size))
    if key not in _FONTS:
        _FONTS[key] = ImageFont.truetype(FD + name, int(size))
    return _FONTS[key]


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def clamp(x, lo=0.0, hi=1.0):
    return max(lo, min(hi, x))


def eo(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def eio(x):
    x = clamp(x)
    return 0.5 - 0.5 * math.cos(math.pi * x)


def back(x):
    x = clamp(x)
    c1 = 1.70158
    c3 = c1 + 1
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def wrap(text, fnt, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if not cur or fnt.getlength(t) <= maxw:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


# ---------- money and number formats (same figures the app shows) ----------
def lakh_disp(v, dec=2):
    v = float(v or 0)
    if abs(v) >= 1e7:
        return "\u20b9" + f"{v/1e7:.{dec}f}".rstrip("0").rstrip(".") + "Cr"
    if abs(v) >= 1e5:
        return "\u20b9" + f"{v/1e5:.{dec}f}".rstrip("0").rstrip(".") + "L"
    return f"\u20b9{round(v):,}"


def num1(x):
    x = round(float(x), 1)
    return str(int(x)) if x == int(x) else f"{x:.1f}"


def clean_title(s):
    return s.replace("\u2192", "to")


# ---------- backgrounds ----------
def make_background():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    base = np.zeros((H, W, 3), np.float32) + np.array(BG, np.float32)
    g1 = np.exp(-(((xx - 280) ** 2) + ((yy - 160) ** 2)) / (2 * 520.0 ** 2))
    g2 = np.exp(-(((xx - 1720) ** 2) + ((yy - 980) ** 2)) / (2 * 600.0 ** 2))
    base += g1[..., None] * np.array([58, 42, 18], np.float32)
    base += g2[..., None] * np.array([10, 44, 36], np.float32)
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(img)
    for gx in range(0, W, 96):
        for gy in range(0, H, 96):
            d.point((gx, gy), fill=(44, 40, 33))
    return img


def make_band():
    band = np.zeros((300, W, 4), np.uint8)
    a = np.linspace(0, 215, 300, dtype=np.float32)
    band[..., 0], band[..., 1], band[..., 2] = BG
    band[..., 3] = a[:, None].astype(np.uint8)
    return Image.fromarray(band, "RGBA")


PARTICLES = [(((i * 7919) % W), ((i * 104729) % H), 1 + (i % 3), 6 + (i % 5) * 2, GOLD if i % 3 else TEAL)
             for i in range(46)]


def draw_particles(img, t):
    d = ImageDraw.Draw(img)
    for x0, y0, r, spd, col in PARTICLES:
        y = (y0 - t * spd) % H
        x = x0 + 14 * math.sin(t * 0.6 + x0)
        d.ellipse((x - r, y - r, x + r, y + r), fill=mix(BG, col, 0.35))


# ---------- annotation layer (hand-drawn marks that animate in) ----------
def scribble_ellipse(d, box, p, col, width=5, seed=0):
    """A marker circle drawn around box, revealed from 0..1 like a pen stroke."""
    if p <= 0:
        return
    x0, y0, x1, y1 = box
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 26, (y1 - y0) / 2 + 20
    n = 90
    end = int(n * 1.12 * clamp(p))
    pts = []
    for i in range(end + 1):
        a = -2.3 + 2 * math.pi * i / n
        wob = 1 + 0.035 * math.sin(i * 0.37 + seed) + 0.05 * (i / n)
        pts.append((cx + rx * wob * math.cos(a), cy + ry * wob * math.sin(a)))
    if len(pts) > 1:
        d.line(pts, fill=col, width=width, joint="curve")


def draw_arrow(d, p0, p1, p, col, width=5, bend=0.25):
    """Curved arrow from p0 to p1, drawn progressively; head appears at the end."""
    if p <= 0:
        return
    (x0, y0), (x1, y1) = p0, p1
    mx, my = (x0 + x1) / 2 - (y1 - y0) * bend, (y0 + y1) / 2 + (x1 - x0) * bend
    n = 40
    k = max(2, int(n * clamp(p)))
    pts = []
    for i in range(k + 1):
        t = i / n
        pts.append(((1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1,
                    (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1))
    d.line(pts, fill=col, width=width, joint="curve")
    if p >= 0.98:
        ang = math.atan2(y1 - pts[-2][1], x1 - pts[-2][0])
        L = 24
        for s_ in (-0.5, 0.5):
            d.line((x1, y1, x1 - L * math.cos(ang + s_), y1 - L * math.sin(ang + s_)), fill=col, width=width)


def note(d, x, y, text, p, col=None, size=30, maxw=520, anchor="l"):
    """A sticky-note callout that pops in."""
    if p <= 0:
        return
    col = col or CHAMP
    f = font(F_BOLD, size)
    lines = wrap(text, f, maxw)
    w = max(f.getlength(ln) for ln in lines) + 44
    h = len(lines) * (size + 10) + 30
    sc = 0.7 + 0.3 * back(clamp(p))
    w2, h2 = w * sc, h * sc
    x0 = x if anchor == "l" else x - w2
    d.rounded_rectangle((x0, y, x0 + w2, y + h2), radius=16, fill=mix(BG, col, clamp(p)))
    if sc > 0.95:
        for i, ln in enumerate(lines):
            d.text((x0 + 22, y + 15 + i * (size + 10)), ln, font=f, fill=BG, anchor="la")


def underline(d, x0, x1, y, p, col, width=8):
    if p <= 0:
        return
    xe = x0 + (x1 - x0) * eo(p)
    pts = [(x0 + (xe - x0) * i / 20, y + 3 * math.sin(i * 0.9)) for i in range(21)]
    d.line(pts, fill=col, width=width, joint="curve")


def chapter_rail(d, scenes, idx, t):
    """Dots under the header: one per narrated scene, the current one lit."""
    named = [s for s in scenes if s.get("seg")]
    if not named:
        return
    n = len(named)
    gap = 34
    x0 = W / 2 - (n - 1) * gap / 2
    for i, s in enumerate(named):
        x = x0 + i * gap
        if s is idx:
            d.rounded_rectangle((x - 13, 56, x + 13, 66), radius=5, fill=GOLD)
        else:
            done = s["e"] <= t
            d.ellipse((x - 5, 56, x + 5, 66), fill=CHAMP if done else TRACK)


# ---------- scene drawers ----------
def header(d, ctx, p_global):
    d.text((90, 50), "P57 \u00b7 SALES PLAN 2027", font=font(F_BOLD, 26), fill=GOLD, anchor="la")
    d.text((W - 90, 50), f"{ctx['monthName'].upper()} \u00b7 {ctx['studio'].upper()}",
           font=font(F_SANS, 26), fill=MUTE, anchor="ra")
    d.rectangle((0, 0, int(W * p_global), 4), fill=GOLD)


def kicker(d, s, a=1.0):
    d.text((90, 128), s.upper(), font=font(F_BOLD, 28), fill=mix(BG, GOLD, a), anchor="la")


def draw_intro(img, d, lt, ctx):
    sz = int(230 * max(0.02, back(lt / 0.9)))
    d.rounded_rectangle((960 - sz / 2, 400 - sz / 2, 960 + sz / 2, 400 + sz / 2), radius=int(sz * 0.22), fill=GOLD)
    d.text((960, 400), "P57", font=font(F_BOLD, 118 * sz / 230), fill=BG, anchor="mm")
    line = 520 * eo((lt - 0.4) / 0.9)
    d.line((960 - line / 2, 560, 960 + line / 2, 560), fill=GOLD, width=2)
    a = eo((lt - 0.7) / 0.6)
    d.text((960, 620), "Sales Plan 2027", font=font(F_BOLD, 74), fill=mix(BG, INK, a), anchor="mm")
    a2 = eo((lt - 1.1) / 0.6)
    d.text((960, 710), f"{ctx['monthName']} \u00b7 {ctx['studio']}", font=font(F_SERIF, 56),
           fill=mix(BG, CHAMP, a2), anchor="mm")


def draw_open(img, d, lt, dur, ctx, sc):
    m = ctx["month"]
    name = ctx["monthName"].upper()
    size = 210
    while font(F_SERIFB, size).getlength(name) > 1000 and size > 90:
        size -= 6
    n = int(len(name) * eo(lt / max(0.8, dur * 0.5)) + 0.999)
    d.text((90, 190), name[:n], font=font(F_SERIFB, size), fill=INK, anchor="la")
    d.text((94, 420), f"2027 \u00b7 {ctx['studio']}", font=font(F_SANS, 40), fill=mix(BG, CHAMP, eo((lt - 0.5) / 0.6)),
           anchor="la")
    # theme card
    a = eo((lt - 0.8) / 0.6)
    d.rounded_rectangle((90, 500, 1080, 680), radius=26, fill=mix(BG, PANEL, a), outline=mix(BG, GOLD, a), width=2)
    d.text((130, 530), "THIS MONTH\u2019S THEME", font=font(F_BOLD, 24), fill=mix(BG, GOLD, a), anchor="la")
    theme = ctx["theme"]
    k = int(len(theme) * eo((lt - 1.2) / 1.6))
    d.text((130, 575), theme[:k], font=font(F_SERIF, 52), fill=mix(BG, INK, a), anchor="la")
    # calendar, Monday first
    first = dt.date(2027, m, 1)
    days = (dt.date(2027 + (m == 12), (m % 12) + 1, 1) - first).days
    x0, y0, cw, ch = 1160, 250, 92, 74
    d.rounded_rectangle((x0 - 30, y0 - 30, x0 + 7 * cw + 30, y0 + 6 * ch + 30), radius=30, fill=PANEL)
    for i, lab in enumerate("MTWTFSS"):
        d.text((x0 + i * cw + cw / 2, y0 + 4), lab, font=font(F_BOLD, 24), fill=MUTE, anchor="ma")
    lit = int(days * eo((lt - 1.0) / 2.2))
    for day in range(1, days + 1):
        idx = first.weekday() + day - 1
        cx = x0 + (idx % 7) * cw + cw / 2
        cy = y0 + 46 + (idx // 7) * ch + ch / 2 - 10
        if day <= lit:
            col = GOLD if day % 7 not in (0, 6) else TEAL
            r = 30 if day == lit else 27
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col if day != lit else CHAMP)
            d.text((cx, cy), str(day), font=font(F_BOLD, 26), fill=BG, anchor="mm")
        else:
            d.text((cx, cy), str(day), font=font(F_SANS, 26), fill=TRACK if day > lit else INK, anchor="mm")


def draw_target(img, d, lt, dur, ctx, sc):
    data = sc["data"]
    tgt, ly, yoy = data["target"], data["lastYear"], data["yoy"]
    kicker(d, "What the month has to do")
    shown = tgt * eo(lt / 1.2)
    d.text((90, 175), lakh_disp(shown), font=font(F_BOLD, 230), fill=GOLD, anchor="la")
    mx = max(tgt, ly)
    full = 1120
    a = eo((lt - 0.2) / 1.0)
    w_ly = full * ly / mx * eo((lt - 0.3) / 1.2)
    w_t = full * tgt / mx * eo((lt - 0.6) / 1.2)
    d.text((90, 500), f"Last year \u00b7 {lakh_disp(ly)}", font=font(F_SANS, 34), fill=mix(BG, MUTE, a), anchor="la")
    d.rounded_rectangle((90, 548, 90 + full, 598), radius=25, fill=TRACK)
    d.rounded_rectangle((90, 548, 90 + max(4, w_ly), 598), radius=25, fill=(92, 88, 82))
    d.text((90, 640), f"2027 target \u00b7 {lakh_disp(tgt)}", font=font(F_BOLD, 34), fill=mix(BG, GOLD, a), anchor="la")
    d.rounded_rectangle((90, 688, 90 + full, 738), radius=25, fill=TRACK)
    d.rounded_rectangle((90, 688, 90 + max(4, w_t), 738), radius=25, fill=GOLD)
    up = yoy >= 0
    pill = TEAL if up else ROSE
    s = eo((lt - 1.4) / 0.5)
    if s > 0:
        pw, ph = 470, 120
        cx, cy = 1450, 600
        sc2 = 0.6 + 0.4 * back(clamp((lt - 1.4) / 0.6))
        bw, bh = pw * sc2, ph * sc2
        d.rounded_rectangle((cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2), radius=int(bh / 2),
                            fill=mix(BG, pill, s))
        arrow = "\u25b2" if up else "\u25bc"
        d.text((cx, cy - 12), f"{arrow} {abs(round(yoy*100))}% vs last year", font=font(F_BOLD, int(40 * sc2)),
               fill=INK, anchor="mm")
    gap = tgt - ly
    sign = "+" if gap >= 0 else "\u2212"
    d.text((1450, 716), f"Gap to last year: {sign}{lakh_disp(abs(gap))}",
           font=font(F_SANS, 34), fill=mix(BG, INK, eo((lt - 1.8) / 0.6)), anchor="ma")
    # annotations: circle the headline number, arrow from the bars to the verdict pill
    tw = font(F_BOLD, 230).getlength(lakh_disp(tgt))
    scribble_ellipse(d, (90, 205, 90 + tw, 400), (lt - 1.0) / 0.9, CHAMP, seed=3)
    draw_arrow(d, (90 + max(w_t, w_ly) + 30, 713), (1450 - 250, 640), (lt - 2.2) / 0.7, CHAMP, bend=-0.2)


def draw_streams(img, d, lt, dur, ctx, sc):
    data = sc["data"]
    streams = sorted(data["streams"], key=lambda x: -x["value"])
    kicker(d, "Where it comes from")
    d.text((90, 175), f"{len(streams)} streams", font=font(F_BOLD, 120), fill=INK, anchor="la")
    x = 90
    total_w = 1740
    for s in streams:
        seg_w = total_w * s["share"] / 100.0 * eo((lt - 0.2) / 1.2)
        if seg_w <= 0:
            continue
        col = STREAM_COL.get(s["key"], BLUE)
        d.rectangle((x, 330, x + seg_w, 386), fill=col)
        if seg_w > 90:
            d.text((x + seg_w / 2, 358), f"{num1(s['share'])}%", font=font(F_BOLD, 26), fill=BG, anchor="mm")
        x += seg_w
    for i, s in enumerate(streams):
        a = eo((lt - 0.9 - i * 0.35) / 0.6)
        if a <= 0:
            continue
        y = 460 + i * 86
        col = STREAM_COL.get(s["key"], BLUE)
        d.ellipse((90, y - 28, 146, y + 28), fill=mix(BG, col, a))
        d.text((118, y), s["label"][0], font=font(F_BOLD, 30), fill=BG, anchor="mm")
        d.text((180, y), s["label"], font=font(F_BOLD, 38), fill=mix(BG, INK, a), anchor="lm")
        d.rounded_rectangle((560, y - 14, 1420, y + 14), radius=14, fill=TRACK)
        fw = 860 * (s["share"] / 100.0) * eo((lt - 1.0 - i * 0.35) / 0.9)
        d.rounded_rectangle((560, y - 14, 560 + max(8, fw), y + 14), radius=14, fill=mix(BG, col, a))
        d.text((1460, y), f"{lakh_disp(s['value'])} \u00b7 {num1(s['share'])}%", font=font(F_SANS, 34),
               fill=mix(BG, INK, a), anchor="lm")
    if streams:
        lead = streams[0]
        lw = font(F_BOLD, 38).getlength(lead["label"])
        scribble_ellipse(d, (90, 432, 180 + lw, 488), (lt - 2.4) / 0.8, CHAMP, width=4, seed=5)
        note(d, 1180, 175, f"{round(lead['share'] / 10)} in every \u20b910 comes from {lead['label'].lower()}",
             (lt - 3.0) / 0.5, maxw=560)


def draw_funnel(img, d, lt, dur, ctx, sc):
    data = sc["data"]
    leads, trials, buyers = data["leads"], data["trials"], data["buyers"]
    kicker(d, "Who has to walk in")
    d.text((90, 175), f"{buyers} buyers", font=font(F_BOLD, 120), fill=INK, anchor="la")
    rows = [("leads", leads, BLUE), ("trials", trials, TEAL), ("buyers", buyers, GOLD)]
    cy0 = 330
    for i, (lab, v, col) in enumerate(rows):
        a = eo((lt - 0.4 - i * 0.5) / 0.7)
        if a <= 0:
            continue
        w = 1240 * math.sqrt(v / leads) * a
        w = max(w, 320 * a)
        y = cy0 + i * 130
        d.rounded_rectangle((90, y, 90 + w, y + 104), radius=22, fill=mix(BG, col, a))
        d.text((90 + w / 2, y + 52), f"{v} {lab}", font=font(F_BOLD, 44), fill=mix(col, BG, 0.85), anchor="mm")
    conv = [(f"{num1(data['leadToTrial']*100)}% book a trial", 1), (f"{num1(data['trialToBuyer']*100)}% of trials buy", 2)]
    for txt, i in conv:
        a = eo((lt - 1.6 - i * 0.4) / 0.6)
        if a <= 0:
            continue
        y = cy0 + i * 130 - 14
        d.line((1420, y - 6, 1420, y + 30), fill=mix(BG, CHAMP, a), width=3)
        d.polygon([(1412, y + 24), (1428, y + 24), (1420, y + 36)], fill=mix(BG, CHAMP, a))
        d.text((1460, y + 10), txt, font=font(F_BOLD, 40), fill=mix(BG, CHAMP, a), anchor="lm")
    d.text((90, 716), f"{leads} leads become {trials} trials and {buyers} buyers.",
           font=font(F_SANS, 32), fill=mix(BG, MUTE, eo((lt - 2.2) / 0.6)), anchor="la")
    per = max(1, round(1 / max(data["trialToBuyer"], 0.01)))
    note(d, 1830, 175, f"About 1 in {per} trials buys. The first class wins it.", (lt - 3.0) / 0.5,
         col=TEAL, anchor="r", maxw=600)
    underline(d, 1460, 1460 + font(F_BOLD, 40).getlength(conv[1][0]), cy0 + 2 * 130 + 30, (lt - 3.4) / 0.6, TEAL)


def draw_coverage(img, d, lt, dur, ctx, sc):
    data = sc["data"]
    share = data["share"]
    kicker(d, "What the offers carry")
    cx, cy, r = 560, 470, 230
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=TRACK, width=40)
    end = -90 + 360 * share * eio(lt / 1.6)
    d.arc((cx - r, cy - r, cx + r, cy + r), start=-90, end=end, fill=GOLD, width=40)
    d.text((cx, cy - 10), f"{round(share*100)}%", font=font(F_BOLD, 120), fill=INK, anchor="mm")
    d.text((cx, cy + 90), "of target", font=font(F_SANS, 34), fill=MUTE, anchor="mm")
    x = 960
    a = eo((lt - 0.8) / 0.7)
    d.text((x, 330), lakh_disp(data["offerRevenue"]), font=font(F_BOLD, 130), fill=mix(BG, GOLD, a), anchor="la")
    d.text((x, 470), f"from {ctx['offers_word']} offers", font=font(F_SANS, 40), fill=mix(BG, INK, a), anchor="la")
    b = eo((lt - 1.6) / 0.7)
    d.text((x, 560), lakh_disp(data["standard"]), font=font(F_BOLD, 86), fill=mix(BG, MUTE, b), anchor="la")
    d.text((x, 660), "expected at full price", font=font(F_SANS, 36), fill=mix(BG, MUTE, b), anchor="la")
    c = eo((lt - 2.2) / 0.6)
    d.text((x, 730), f"of the {lakh_disp(data['target'])} target", font=font(F_SANS, 36), fill=mix(BG, CHAMP, c),
           anchor="la")
    draw_arrow(d, (x - 20, 400), (cx + r + 30, cy - 120), (lt - 2.6) / 0.6, CHAMP, bend=0.3)
    note(d, x, 175, "Offers boost. Full price still matters.", (lt - 3.2) / 0.5, maxw=700)


def draw_offer(img, d, lt, dur, ctx, sc):
    o = sc["data"]
    slot = o["slotLabel"]
    col = SLOT_COL.get(slot, GOLD)
    a = eo(lt / 0.5)
    chip_w = font(F_BOLD, 30).getlength(f"Offer {o['index']+1} of {o['count']} \u00b7 {slot}") + 56
    d.rounded_rectangle((90, 128, 90 + chip_w, 180), radius=26, fill=mix(BG, col, a))
    d.text((118, 154), f"Offer {o['index']+1} of {o['count']} \u00b7 {slot}", font=font(F_BOLD, 30),
           fill=BG, anchor="lm")
    name = clean_title(o["name"])
    size = 110
    lines = wrap(name, font(F_SERIFB, size), 1450)
    while len(lines) > 2 and size > 64:
        size -= 6
        lines = wrap(name, font(F_SERIFB, size), 1450)
    k = 0
    total = sum(len(x) for x in lines)
    shown_total = int(total * eo(lt / 0.9))
    y = 205
    for ln in lines:
        vis = ln[: max(0, min(len(ln), shown_total - k))]
        k += len(ln)
        d.text((90, y), vis, font=font(F_SERIFB, size), fill=INK, anchor="la")
        y += size * 1.12
    # stamp
    st = back(clamp((lt - 0.5) / 0.5))
    if st > 0 and o["discount"]:
        r = 118 * st
        cx, cy = 1680, 330
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=mix(BG, col, 0.9 * clamp(st)), outline=col, width=6)
        d.text((cx, cy - 10), f"\u2212{num1(o['discount'])}%", font=font(F_BOLD, int(max(10, 58 * st))), fill=BG,
               anchor="mm")
        d.text((cx, cy + 58), "off", font=font(F_BOLD, int(max(10, 30 * st))), fill=BG, anchor="mm")
    tiles = [("Buyers", f"{o['buyers']}"), ("Ticket", f"\u20b9{round(o['ticket']):,}"),
             ("Revenue", lakh_disp(o["revenue"])), ("Share of offers", f"{round(o['share']*100)}%")]
    for i, (lab, val) in enumerate(tiles):
        ta = eo((lt - 0.4 - i * 0.12) / 0.6)
        if ta <= 0:
            continue
        x = 90 + i * 440
        d.rounded_rectangle((x, 470, x + 400, 620), radius=24, fill=mix(BG, PANEL, ta), outline=mix(BG, TRACK, ta), width=2)
        d.text((x + 30, 494), lab.upper(), font=font(F_BOLD, 22), fill=mix(BG, MUTE, ta), anchor="la")
        d.text((x + 30, 530), val, font=font(F_BOLD, 58), fill=mix(BG, INK, ta), anchor="la")
    # revenue bar against the month's biggest offer
    bar_w = 1740 * (o["revenue"] / o["maxRevenue"]) * eo((lt - 0.9) / 1.0)
    d.text((90, 660), "Revenue against the month\u2019s biggest offer", font=font(F_SANS, 28), fill=MUTE, anchor="la")
    d.rounded_rectangle((90, 700, 1830, 736), radius=18, fill=TRACK)
    d.rounded_rectangle((90, 700, 90 + max(10, bar_w), 736), radius=18, fill=col)
    who = (o.get("audience") or "").strip()
    if who and not who[:1].isdigit() and "\u2248" not in who and "effective" not in who:
        who_txt = f"Who it's for: {who}"
        while len(wrap(who_txt, font(F_BOLD, 24), 640)) > 2:
            who_txt = who_txt.rsplit(" ", 1)[0].rstrip(",;:") + "\u2026"
        note(d, 1830, 92, who_txt, (lt - 2.0) / 0.5, col=col, anchor="r", maxw=640, size=24)
    if o["revenue"] == o["maxRevenue"]:
        bp = (lt - 1.6) / 0.5
        if bp > 0:
            bx = 90 + 2 * 440
            scribble_ellipse(d, (bx + 10, 480, bx + 390, 610), bp, GOLD, seed=9)
            note(d, bx + 250, 410, "Biggest offer this month", (lt - 2.0) / 0.4, col=GOLD, size=24, maxw=400)
    kpi = clean_title(o.get("kpi", ""))[:150]
    if kpi:
        d.text((90, 738), f"Watch: {kpi}", font=font(F_SANS, 26), fill=mix(BG, CHAMP, eo((lt - 1.2) / 0.6)),
               anchor="la")


def draw_plan(img, d, lt, dur, ctx, sc, seg=None):
    kicker(d, "How the month runs")
    d.text((90, 175), "4 weeks", font=font(F_BOLD, 120), fill=INK, anchor="la")
    xs = [330, 760, 1190, 1620]
    d.line((xs[0], 380, xs[0] + (xs[-1] - xs[0]) * eo((lt - 0.2) / 1.6), 380), fill=GOLD, width=6)
    steps = [("W1", "Launch", "Set up every offer, so it is live from day one."),
             ("W2", "Track weekly", "Check sell-out and redemptions every week."),
             ("W3", "Mid-month check", f"Review against the {ctx['target_say']} target."),
             ("W4", "Close and brief", "Tag every redemption by offer ID, then brief next month.")]
    beats = (seg or {}).get("beats") or []
    if len(beats) == 4:
        heads = ["Week one", "Week two", "Week three", "Week four"]
        steps = [(f"W{i+1}", heads[i], b[0].upper() + b[1:]) for i, b in enumerate(beats)]
    for i, (lab, head, body) in enumerate(steps):
        # each week lands as the narrator reaches it
        at = 0.4 + (dur * 0.12 + dur * 0.22 * i if beats else i * 0.45)
        a = eo((lt - at) / 0.6)
        if a <= 0:
            continue
        x = xs[i]
        r = 56 * back(clamp((lt - at) / 0.7))
        if i < 3 and beats:
            nxt = 0.4 + dur * 0.12 + dur * 0.22 * (i + 1)
            if lt < nxt:
                scribble_ellipse(d, (x - 60, 324, x + 60, 436), (lt - at) / 0.6, CHAMP, width=4, seed=i)
        d.ellipse((x - r, 380 - r, x + r, 380 + r), fill=mix(BG, GOLD, a))
        d.text((x, 380), lab, font=font(F_BOLD, int(34 * max(0.2, r / 56))), fill=BG, anchor="mm")
        d.text((x, 490), head, font=font(F_BOLD, 40), fill=mix(BG, INK, a), anchor="ma")
        for j, ln in enumerate(wrap(body, font(F_SANS, 30), 380)):
            d.text((x, 550 + j * 42), ln, font=font(F_SANS, 30), fill=mix(BG, MUTE, a), anchor="ma")


def draw_close(img, d, lt, dur, ctx, sc, seg=None):
    kicker(d, f"{ctx['monthName']} 2027")
    d.text((90, 175), "That is the plan", font=font(F_BOLD, 110), fill=INK, anchor="la")
    tgt = ctx["target"]
    d.text((90, 330), lakh_disp(tgt * eo(lt / 1.0)), font=font(F_BOLD, 150), fill=GOLD, anchor="la")
    tiles = [(f"{ctx['offers']}", "offers"), (f"{ctx['buyers']}", "buyers to find"),
             (lakh_disp(ctx["offerRevenue"]), "from offers")]
    for i, (v, lab) in enumerate(tiles):
        a = eo((lt - 0.5 - i * 0.2) / 0.6)
        if a <= 0:
            continue
        x = 960 + i * 300
        d.rounded_rectangle((x, 380, x + 270, 520), radius=24, fill=mix(BG, PANEL, a), outline=mix(BG, TRACK, a), width=2)
        d.text((x + 135, 425), v, font=font(F_BOLD, 52), fill=mix(BG, INK, a), anchor="mm")
        d.text((x + 135, 485), lab, font=font(F_SANS, 24), fill=mix(BG, MUTE, a), anchor="mm")
    g = eo((lt - 1.4) / 0.8)
    line = (seg or {}).get("signoff") or "Go find them."
    size = 96
    while font(F_SERIFB, size).getlength(line) > 1740 and size > 50:
        size -= 4
    lines = wrap(line, font(F_SERIFB, size), 1740)
    for j, ln in enumerate(lines[:2]):
        d.text((90, 600 + j * size * 1.1), ln, font=font(F_SERIFB, size), fill=mix(BG, CHAMP, g), anchor="la")
    # confetti
    rnd = np.random.default_rng(ctx["seed"])
    for i in range(70):
        x0 = rnd.uniform(0, W)
        y0 = rnd.uniform(-200, 0)
        sp = rnd.uniform(160, 340)
        col = [GOLD, TEAL, ROSE, CHAMP][i % 4]
        y = (y0 + sp * lt) % (H + 200) - 100
        if lt > 0.3 and y < H:
            x = x0 + 40 * math.sin(lt * 2 + i)
            d.rectangle((x, y, x + 9, y + 15), fill=mix(BG, col, 0.7))


def draw_endcard(img, d, lt, dur, ctx, sc):
    sz = 200
    r = sz * back(clamp(lt / 0.8))
    d.rounded_rectangle((960 - r / 2, 380 - r / 2, 960 + r / 2, 380 + r / 2), radius=int(r * 0.22), fill=GOLD)
    d.text((960, 380), "P57", font=font(F_BOLD, 100 * max(0.2, r / sz)), fill=BG, anchor="mm")
    d.text((960, 560), f"Sales Plan 2027 \u00b7 {ctx['studio']}", font=font(F_BOLD, 64), fill=mix(BG, INK, eo((lt - 0.5) / 0.6)),
           anchor="mm")
    d.text((960, 650), "All 12 months and every location, in the app.", font=font(F_SANS, 38),
           fill=mix(BG, MUTE, eo((lt - 0.9) / 0.6)), anchor="mm")


# ---------- synthesised sound effects ----------
def _env(n, a, d_):
    t = np.arange(n) / SR
    e = np.ones(n, np.float32)
    na = min(n, max(1, int(a * SR)))
    e[:na] = np.linspace(0, 1, na)
    nd = min(n, max(1, int(d_ * SR)))
    e[-nd:] *= np.linspace(1, 0, nd)
    return e


def _lowpass(x, k):
    if k <= 1:
        return x
    return np.convolve(x, np.ones(k, np.float32) / k, mode="same")[: len(x)].astype(np.float32)


def sfx_whoosh(rng):
    n = int(0.7 * SR)
    x = rng.standard_normal(n).astype(np.float32)
    y = np.zeros(n, np.float32)
    acc = 0.0
    for i in range(n):
        cut = 0.005 + 0.12 * (i / n) ** 2
        acc += cut * (x[i] - acc)
        y[i] = acc
    return y * _env(n, 0.35, 0.4) * 3.0


def sfx_cha_ching(rng):
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    y = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * (5 + i * 2)) for i, f in enumerate([2093, 3136, 4186]))
    y = y.astype(np.float32)
    click = rng.standard_normal(int(0.02 * SR)).astype(np.float32) * 0.6
    y[: len(click)] += click
    return y * 0.45


def sfx_sad_trombone(rng):
    notes = [(311, 0.42), (294, 0.42), (277, 0.42), (262, 1.1)]
    parts = []
    for f, dur in notes:
        n = int(dur * SR)
        t = np.arange(n) / SR
        vib = 1 + 0.012 * np.sin(2 * np.pi * 5.5 * t)
        saw = sum(((f * vib * h) % 1.0 * 2 - 1) / h for h in range(1, 9))
        y = _lowpass(saw.astype(np.float32), 9) * _env(n, 0.04, 0.12)
        parts.append(y)
    return np.concatenate(parts) * 0.32


def sfx_vine_boom(rng):
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    f = 42 + 120 * np.exp(-t * 14)
    phase = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(phase) * np.exp(-t * 3.2)
    y = np.tanh(3.2 * y) / np.tanh(3.2)
    return y.astype(np.float32) * 0.9


def sfx_airhorn(rng):
    n = int(1.1 * SR)
    t = np.arange(n) / SR
    y = np.zeros(n, np.float32)
    for f in (466.2, 587.3, 698.5, 466.2 * 1.01):
        saw = sum(((f * h) * t) % 1.0 * 2 - 1 for h in range(1, 6)) / 5
        y += saw.astype(np.float32) / 4
    y = np.tanh(2.2 * y) * _env(n, 0.03, 0.2)
    return y.astype(np.float32) * 0.22


def sfx_record_scratch(rng):
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    f = 2600 * np.exp(-t * 7) + 90
    saw = (np.cumsum(f) / SR) % 1.0 * 2 - 1
    y = saw * (0.6 + 0.4 * rng.standard_normal(n)) * _env(n, 0.01, 0.2)
    return y.astype(np.float32) * 0.35


def sfx_rimshot(rng):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 18)
    noise = rng.standard_normal(n) * np.exp(-t * 60)
    return (tone * 0.6 + noise * 0.5).astype(np.float32) * 0.5


def sfx_drum_roll(rng):
    parts = []
    gaps = np.linspace(0.11, 0.03, 16)
    for g in gaps:
        n = int(0.3 * SR)
        t = np.arange(n) / SR
        hit = rng.standard_normal(n) * np.exp(-t * 90)
        parts.append(np.concatenate([hit * 0.28, np.zeros(max(1, int(g * SR) - n))]))
    return np.concatenate(parts).astype(np.float32)


def sfx_pop(rng):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = 500 + 1100 * (t / t[-1])
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)
    return y.astype(np.float32) * 0.4


def sfx_ding(rng):
    n = int(1.0 * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 1319 * t) * np.exp(-t * 5) + 0.35 * np.sin(2 * np.pi * 2637 * t) * np.exp(-t * 9)
    return y.astype(np.float32) * 0.35


def sfx_boing(rng):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = 180 + 260 * np.sin(np.clip(t * 9, 0, np.pi)) * np.exp(-t * 3)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4)
    return y.astype(np.float32) * 0.45


def sfx_tada(rng):
    parts = []
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        n = int((0.22 if i < 3 else 1.1) * SR)
        t = np.arange(n) / SR
        y = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)) * _env(n, 0.01, 0.4)
        parts.append(y.astype(np.float32))
    return np.concatenate(parts) * 0.3


SFX = {
    "whoosh": sfx_whoosh, "cha_ching": sfx_cha_ching, "sad_trombone": sfx_sad_trombone,
    "vine_boom": sfx_vine_boom, "airhorn": sfx_airhorn, "record_scratch": sfx_record_scratch,
    "rimshot": sfx_rimshot, "drum_roll": sfx_drum_roll, "pop": sfx_pop, "ding": sfx_ding,
    "boing": sfx_boing, "tada": sfx_tada,
}


def make_bed(n, rng):
    t = np.arange(n, dtype=np.float32) / SR
    chords = [
        [110.0, 130.81, 164.81, 196.0],   # Am7
        [87.31, 130.81, 174.61, 220.0],   # Fmaj7
        [130.81, 164.81, 196.0, 246.94],  # C
        [98.0, 146.83, 196.0, 246.94],    # G
    ]
    period = 8.0
    out = np.zeros(n, np.float32)
    pos = (t / period) % len(chords)
    idx = np.floor(pos).astype(int)
    frac = pos - idx
    weight = np.where(frac > 0.85, 0.5 - 0.5 * np.cos(np.pi * (frac - 0.85) / 0.15), 0.0)
    for ci, notes in enumerate(chords):
        w_now = np.where(idx == ci, 1.0, 0.0)
        w_prev = np.where(idx == (ci - 1) % len(chords), weight, 0.0)
        w = np.clip(w_now + w_prev * (idx != ci), 0, 1)
        sig = np.zeros(n, np.float32)
        for f in notes:
            sig += np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)).astype(np.float32) * 0.25
        out += sig * w
    swell = 0.7 + 0.3 * np.sin(2 * np.pi * t / 17.0)
    return out * swell.astype(np.float32) * 0.06


def decode(path):
    raw = subprocess.run([FFMPEG, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


AUDIO_EXT = (".mp3", ".m4a", ".wav", ".aac")


def find_audio(slug):
    for ext in AUDIO_EXT:
        f = AUDIO / f"{slug}{ext}"
        if f.exists():
            return f
    return None


def trim_silence(x, thr):
    """Index of first and last sample above the threshold."""
    hop = int(SR * 0.02)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(hop) / hop, mode="same"))
    loud = np.where(rms > thr)[0]
    if len(loud) == 0:
        return 0, len(x)
    return max(0, loud[0] - hop * 5), min(len(x), loud[-1] + hop * 10)


def _short_gaps(quiet, min_len=0.18):
    out, k, f = [], 0, len(quiet)
    while k < f:
        if quiet[k]:
            j = k
            while j < f and quiet[j]:
                j += 1
            if (j - k) * 0.02 >= min_len and k > 0 and j < f:
                out.append(((k + j) / 2 * 0.02, (j - k) * 0.02))
            k = j
        else:
            k += 1
    return out


def align(voice, segs):
    """Scene start/end times (seconds into the voice), one per segment.

    Looks for the reader's pauses between sections. The N-1 longest pauses become the scene
    boundaries when every resulting scene is a plausible length for its words; otherwise
    scenes are timed by word count. Returns (bounds, method)."""
    n = len(segs)
    dur = len(voice) / SR
    words = np.array([len(sg["text"].split()) for sg in segs], np.float64)
    expect = np.cumsum(words) / words.sum() * dur
    fallback = [0.0] + list(expect[:-1]) + [dur]
    hop = int(SR * 0.02)
    frames = len(voice) // hop
    if frames < 10 or n < 2:
        return fallback, "words"
    rms = np.sqrt((voice[: frames * hop].reshape(frames, hop) ** 2).mean(axis=1))
    thr = max(np.percentile(rms, 95) * 0.06, 1e-4)
    quiet = rms < thr
    gaps, k = [], 0
    while k < frames:
        if quiet[k]:
            j = k
            while j < frames and quiet[j]:
                j += 1
            length = (j - k) * 0.02
            if length >= 0.45 and k > 0 and j < frames:
                gaps.append(((k + j) / 2 * 0.02, length))
            k = j
        else:
            k += 1
    def plausible(bounds):
        for q in range(n):
            got = bounds[q + 1] - bounds[q]
            want = fallback[q + 1] - fallback[q]
            if not (0.4 * want <= got <= 2.5 * want):
                return False
        return True

    # 1) the reader left clearly longer pauses at the section breaks
    if len(gaps) >= n - 1:
        best = sorted(gaps, key=lambda g: -g[1])[: n - 1]
        bounds = [0.0] + sorted(g[0] for g in best) + [dur]
        if plausible(bounds):
            return bounds, "pauses"
    # 2) otherwise estimate each break from word count and snap it to the nearest real pause,
    #    so scenes never change mid-word
    small = [g for g in gaps] + [(t, l) for t, l in _short_gaps(quiet) if all(abs(t - g[0]) > 0.1 for g in gaps)]
    cuts, prev = [], 0.0
    for q in range(1, n):
        want = fallback[q]
        win = max(3.0, 0.25 * (fallback[q + 1] - fallback[q - 1]))
        cands = [g for g in small if abs(g[0] - want) <= win and g[0] > prev + 1.5]
        if cands:
            t = min(cands, key=lambda g: abs(g[0] - want) / win - 1.5 * min(g[1], 1.0))[0]
        else:
            t = max(want, prev + 1.5)
        cuts.append(t)
        prev = t
    bounds = [0.0] + cuts + [dur]
    return (bounds, "snapped") if plausible(bounds) else (fallback, "words")


def build_timeline(script, narr):
    scenes_by_id = {s["id"]: s for s in script["script"]["scenes"]}
    ctx = dict(
        monthName=narr["monthName"], month=narr["month"], studio=narr["studio"], offers=narr["offers"],
        buyers=narr["buyers"], target=narr["target"],
        theme=scenes_by_id["open"]["data"]["theme"], seed=narr["month"] * 31 + len(narr["studio"]),
    )
    ctx["target_say"] = lakh_disp(narr["target"])
    ctx["offerRevenue"] = scenes_by_id["coverage"]["data"]["offerRevenue"]
    ctx["offers_word"] = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six"}.get(narr["offers"], str(narr["offers"]))
    offer_rev = [s["data"]["revenue"] for s in script["script"]["scenes"] if s["kind"] == "offer"]
    max_rev = max(offer_rev) if offer_rev else 1
    raw = decode(narr["audio"])
    peak = float(np.abs(raw).max() or 1.0)
    raw = raw / peak * 0.89  # level the read so every month sits at the same loudness
    a0, a1 = trim_silence(raw, 0.01)
    voice = raw[a0:a1]
    segs = narr["segments"]
    bounds, method = align(voice, segs)
    T_V = PRE
    T_END = T_V + len(voice) / SR
    T_TOTAL = T_END + OUTRO
    scenes, sfx = [dict(kind="intro", s=0.0, e=T_V, seg=None, sc=None)], []
    sfx += [(0.15, "whoosh", 0.6), (0.7, "tada", 0.5)]
    for q, seg in enumerate(segs):
        s_, e_ = T_V + bounds[q], T_V + bounds[q + 1]
        kind = "offer" if seg["id"].startswith("offer-") else seg["id"]
        scenes.append(dict(kind=kind, s=s_, e=e_, seg=seg, sc=scenes_by_id.get(seg["id"])))
        sfx.append((max(0.0, s_ - 0.15), "whoosh", 0.3))
    scenes.append(dict(kind="endcard", s=T_END, e=T_TOTAL, seg=None, sc=None))
    sfx.append((T_END + 0.2, "ding", 0.6))
    # light sound cues; kept quiet so they sit under a real voice
    for sc in scenes:
        k, s_, e_ = sc["kind"], sc["s"], sc["e"]
        D = e_ - s_
        if k == "target":
            sfx.append((s_ + 1.2, "cha_ching" if narr["targetTrend"] == "up" else "boing", 0.45))
        elif k == "streams":
            for i in range(4):
                sfx.append((s_ + 1.0 + 0.35 * i, "pop", 0.3))
        elif k == "coverage":
            sfx.append((s_ + 1.6, "ding", 0.4))
        elif k == "offer":
            sfx.append((s_ + 0.5, "pop", 0.4))
            if sc["sc"] and sc["sc"]["data"]["revenue"] == max_rev:
                sfx.append((s_ + 1.6, "cha_ching", 0.45))
        elif k == "plan":
            for i in range(4):
                sfx.append((s_ + 0.4 + D * (0.12 + 0.22 * i), "ding", 0.3))
        elif k == "close":
            sfx.append((s_ + 0.3, "tada", 0.5))
    ctx["maxRevenue"] = max_rev
    print(f"  timing: scenes matched to {method} ({len(segs)} scenes, {len(voice)/SR:.0f}s of voice)")
    return dict(ctx=ctx, scenes=scenes, sfx=sfx, voice=voice, T_V=T_V, T_TOTAL=T_TOTAL, T_END=T_END,
                max_rev=max_rev, method=method)


def render_scene(img, d, sc, lt, dur, ctx, t, T_TOTAL):
    k = sc["kind"]
    if k == "intro":
        draw_intro(img, d, lt, ctx)
        return
    if k == "endcard":
        draw_endcard(img, d, lt, dur, ctx, sc)
        return
    data = sc["sc"]
    data_for = data
    if k == "open":
        draw_open(img, d, lt, dur, ctx, data_for)
    elif k == "target":
        draw_target(img, d, lt, dur, ctx, data_for)
    elif k == "streams":
        draw_streams(img, d, lt, dur, ctx, data_for)
    elif k == "funnel":
        draw_funnel(img, d, lt, dur, ctx, data_for)
    elif k == "coverage":
        draw_coverage(img, d, lt, dur, ctx, data_for)
    elif k == "offer":
        o = dict(data_for["data"])
        o["maxRevenue"] = ctx["maxRevenue"]
        draw_offer(img, d, lt, dur, ctx, dict(sc=None, data=o))
    elif k == "plan":
        draw_plan(img, d, lt, dur, ctx, data_for, sc.get("seg"))
    elif k == "close":
        draw_close(img, d, lt, dur, ctx, data_for, sc.get("seg"))


def caption_for(sc):
    if sc.get("seg") is None:
        return None
    return sc["seg"]["text"]


def caption_shown(text, progress):
    return int(len(text.split()) * clamp(progress)) + 1


FIGURE_WORDS = {"lakh", "crore", "rupees", "per", "cent", "buyers", "buyer", "trials", "leads"}


def is_figure(w, prev_fig):
    core = w.strip(".,!?:;").lower()
    return any(ch.isdigit() for ch in core) or core in ("lakh", "crore", "rupees") or (
        core in FIGURE_WORDS and prev_fig)


def caption_window(text, progress, maxw, f, max_lines=3):
    """Long sections scroll: show the 3 lines around the spoken word."""
    lines = wrap(text, f, maxw)
    shown = caption_shown(text, progress)
    acc, cur = 0, 0
    for i, ln in enumerate(lines):
        if acc + len(ln.split()) >= shown:
            cur = i
            break
        acc += len(ln.split())
    else:
        cur = len(lines) - 1
    start = max(0, min(cur - 1, len(lines) - max_lines))
    skip = sum(len(ln.split()) for ln in lines[:start])
    return lines[start:start + max_lines], shown - skip


def draw_caption(img, d, text, progress, oy=0):
    f = font(F_SANS, 36)
    fb = font(F_BOLD, 36)
    lines, shown = caption_window(text, progress, 1640, f)
    y_bottom = 1040
    y = y_bottom - len(lines) * 52 - oy
    wi, prev = 0, False
    for ln in lines:
        x = 140
        for w in ln.split():
            fig = is_figure(w, prev)
            if w[-1:] in ".,!?:;":
                prev_end = True
            else:
                prev_end = False
            ff = fb if fig else f
            base = GOLD if fig else INK
            col = base if wi < shown else mix(BG, base, 0.4)
            d.text((x, y), w, font=ff, fill=col, anchor="la")
            wl = ff.getlength(w)
            if wi == shown - 1:
                d.line((x, y + 44, x + wl, y + 44), fill=GOLD, width=3)
            x += wl + f.getlength(" ")
            prev = fig and not prev_end
            wi += 1
        y += 52


def write_audio(path, tl):
    n = int(tl["T_TOTAL"] * SR) + SR
    rng = np.random.default_rng(7)
    voice = np.zeros(n, np.float32)
    i0 = int(tl["T_V"] * SR)
    voice[i0: i0 + len(tl["voice"])] += tl["voice"]
    bed = make_bed(n, rng)
    fx = np.zeros(n, np.float32)
    cache = {}
    for at, name, gain in tl["sfx"]:
        if name not in cache:
            cache[name] = SFX[name](rng)
        clip = cache[name]
        i0 = int(at * SR)
        if i0 >= n:
            continue
        m = min(len(clip), n - i0)
        fx[i0: i0 + m] += clip[:m] * gain
    # duck the music bed and effects under the voice
    env = np.abs(voice)
    k = int(SR * 0.25)
    env = np.convolve(env, np.ones(k) / k, mode="same")
    duck = 1.0 - 0.6 * np.clip(env / 0.05, 0, 1)
    mono = voice * 1.0 + bed * 0.9 * duck + fx * (0.5 + 0.5 * duck)
    mono = np.tanh(mono * 1.1).astype(np.float32)
    stereo = np.stack([mono, mono], axis=1).astype("<f4")
    path.write_bytes(stereo.tobytes())


def render_month(slug, mm):
    script = json.loads((SCRIPTS / f"{slug}-{mm}.json").read_text())
    narr = json.loads((NARR / f"{slug}-{mm}.json").read_text())
    narr["slug"] = f"{slug}-{mm}"
    narr["audio"] = find_audio(narr["slug"])
    if narr["audio"] is None:
        raise SystemExit(f"no recording for {slug}-{mm}: add public/explainer/audio/{slug}-{mm}.mp3")
    if "segments" not in narr:
        raise SystemExit(f"{slug}-{mm}: old narration format; run scripts/explainer/build_narration.py")
    tl = build_timeline(script, narr)
    ctx = tl["ctx"]
    VIDEO.mkdir(parents=True, exist_ok=True)
    out = VIDEO / f"{slug}-{mm}.mp4"
    tmp_audio = VIDEO / f".{slug}-{mm}.f32"
    write_audio(tmp_audio, tl)
    bg = make_background()
    band = make_band()
    # The caption band is static: bake it into the background once instead of compositing per frame.
    bottom = Image.alpha_composite(bg.crop((0, H - 300, W, H)).convert("RGBA"), band).convert("RGB")
    bg.paste(bottom, (0, H - 300))
    cmd = [FFMPEG, "-y", "-v", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(tmp_audio),
           "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "160k",
           "-t", f"{tl['T_TOTAL']:.2f}", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    limit = float(os.environ.get("RENDER_LIMIT", tl["T_TOTAL"]))
    total = int(min(tl["T_TOTAL"], limit) * FPS)
    scenes = tl["scenes"]
    strip_key, strip_img = None, None
    for fi in range(total):
        t = fi / FPS
        sc = next((s for s in scenes if s["s"] <= t < s["e"]), scenes[-1])
        dur = sc["e"] - sc["s"]
        lt = t - sc["s"]
        img = bg.copy()
        draw_particles(img, t)
        fade_from = img.copy() if lt < 0.35 else None
        render_scene(img, ImageDraw.Draw(img), sc, lt, dur, ctx, t, tl["T_TOTAL"])
        if fade_from is not None:
            img = Image.blend(fade_from, img, eo(lt / 0.35))
        hd = ImageDraw.Draw(img)
        header(hd, ctx, t / tl["T_TOTAL"])
        chapter_rail(hd, scenes, sc, t)
        caption = caption_for(sc)
        if caption:
            prog = lt / dur if dur > 0 else 1
            key = (id(sc), caption_shown(caption, prog))
            if key != strip_key:
                strip_img = bottom.copy()
                draw_caption(strip_img, ImageDraw.Draw(strip_img), caption, prog, oy=H - 300)
                strip_key = key
            img.paste(strip_img, (0, H - 300))
        proc.stdin.write(img.tobytes())
    proc.stdin.close()
    rc = proc.wait()
    tmp_audio.unlink(missing_ok=True)
    if rc != 0:
        raise SystemExit(f"ffmpeg failed for {slug}-{mm}")
    print(f"wrote {out.relative_to(ROOT)}  ({tl['T_TOTAL']:.0f}s)")


def rebuild_manifest():
    data = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    videos = {}
    for f in sorted(VIDEO.glob("*-[0-9][0-9].mp4")):
        slug, mm = f.stem.rsplit("-", 1)
        videos.setdefault(slug, {})[str(int(mm))] = f"/explainer/video/{f.name}"
    data["videos"] = videos
    MANIFEST.write_text(json.dumps(data, indent=2) + "\n")
    print("manifest: videos for", len(videos), "locations")


def main(argv):
    if argv and argv[0] == "--manifest":
        rebuild_manifest()
        return
    if len(argv) == 2:
        render_month(argv[0], argv[1])
        return
    for f in sorted(NARR.glob("*-[0-9][0-9].json")):
        slug, mm = f.stem.rsplit("-", 1)
        if find_audio(f"{slug}-{mm}"):
            render_month(slug, mm)
        else:
            print(f"skip {slug}-{mm}: no recording yet")


if __name__ == "__main__":
    main(sys.argv[1:])
