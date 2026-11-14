"""Frame drawing for the month explainer videos (used by scripts/render-video.py).

Look: warm black with a drifting aurora, film grain and a vignette; frosted-glass cards with soft
shadows; Didot for display type, Montserrat for figures and labels, Noteworthy for hand-written
annotations. Every curve is drawn at 2x and scaled down, so edges stay smooth.

Each scene draws onto a transparent layer; the layer slides in, then drifts with a slow camera
push. Annotations (circles, arrows, sticky notes, highlighter, spotlight) land as the narrator
reaches the thing they point at.
"""
import calendar
import datetime as dt
import math
import os
import re
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1920, 1080

# ---------------------------------------------------------------- palette
BG = (13, 9, 30)            # midnight indigo
INK = (250, 247, 255)
SOFT = (196, 188, 222)
MUTE = (128, 118, 162)
GOLD = (255, 176, 59)       # mango: the hero accent
GOLD_HI = (255, 214, 120)
CHAMP = (255, 228, 196)     # warm cream for notes
TEAL = (52, 222, 170)       # mint
ROSE = (255, 99, 132)       # coral pink
BLUE = (139, 112, 255)      # electric violet
SKY = (80, 184, 255)
TRACK = (44, 36, 78)
SLOT_COL = {"Revenue boost": GOLD, "New clients": TEAL, "Win-backs": ROSE, "Renewals": BLUE}
STREAM_COL = {"renewal": GOLD, "newClient": TEAL, "reactivation": ROSE, "other": BLUE}


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rgba(c, a):
    return (c[0], c[1], c[2], int(max(0, min(1, a)) * 255))


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
    return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2


# ---------------------------------------------------------------- fonts
def _first(*paths):
    for p in paths:
        if p and os.path.exists(p):
            return p
    return None


def _dejavu(name):
    try:
        import matplotlib
        return os.path.join(os.path.dirname(matplotlib.__file__), "mpl-data/fonts/ttf", name)
    except Exception:
        return "/usr/share/fonts/truetype/dejavu/" + name


SUP = "/System/Library/Fonts/Supplemental/"
FONT_FILES = {
    # name: (path, index)
    "display": (_first(SUP + "Didot.ttc"), 2),
    "display_r": (_first(SUP + "Didot.ttc"), 0),
    "display_i": (_first(SUP + "Didot.ttc"), 1),
    "light": (_first("/Library/Fonts/Montserrat-Light.otf"), 0),
    "sans": (_first("/Library/Fonts/Montserrat-Regular.otf"), 0),
    "medium": (_first("/Library/Fonts/Montserrat-Medium.otf"), 0),
    "semi": (_first("/Library/Fonts/Montserrat-SemiBold.otf"), 0),
    "bold": (_first("/Library/Fonts/Montserrat-Bold.otf"), 0),
    "heavy": (_first("/Library/Fonts/Montserrat-ExtraBold.otf"), 0),
    "hand": (_first("/System/Library/Fonts/Noteworthy.ttc"), 1),
}
FALLBACK = {
    "display": _dejavu("DejaVuSerif-Bold.ttf"), "display_r": _dejavu("DejaVuSerif.ttf"),
    "display_i": _dejavu("DejaVuSerif.ttf"), "hand": _dejavu("DejaVuSans-Bold.ttf"),
}


@lru_cache(maxsize=512)
def F(name, size):
    path, idx = FONT_FILES.get(name, (None, 0))
    size = max(6, int(size))
    if path:
        try:
            return ImageFont.truetype(path, size, index=idx)
        except Exception:
            pass
    fb = FALLBACK.get(name) or _dejavu("DejaVuSans-Bold.ttf" if name in ("bold", "heavy", "semi") else "DejaVuSans.ttf")
    return ImageFont.truetype(fb, size)


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


def tracked(d, xy, text, fnt, fill, spacing=0.12, anchor="la"):
    """Letter-spaced caps, the way labels look in print."""
    x, y = xy
    sp = fnt.size * spacing
    total = sum(fnt.getlength(c) for c in text) + sp * (len(text) - 1)
    if anchor[0] == "m":
        x -= total / 2
    elif anchor[0] == "r":
        x -= total
    for c in text:
        d.text((x, y), c, font=fnt, fill=fill, anchor="l" + anchor[1])
        x += fnt.getlength(c) + sp
    return total


# ---------------------------------------------------------------- money
def lakh(v, dec=2):
    v = float(v or 0)
    if abs(v) >= 1e7:
        return "₹" + f"{v/1e7:.{dec}f}".rstrip("0").rstrip(".") + "Cr"
    if abs(v) >= 1e5:
        return "₹" + f"{v/1e5:.{dec}f}".rstrip("0").rstrip(".") + "L"
    return f"₹{round(v):,}"


def num1(x):
    x = round(float(x), 1)
    return str(int(x)) if x == int(x) else f"{x:.1f}"


# ---------------------------------------------------------------- compositing helpers
def paste(L, patch, x, y, alpha=1.0):
    """Alpha-composite a small RGBA patch onto layer L at (x, y), clipped to the frame."""
    if alpha <= 0.003:
        return
    if alpha < 0.999:
        a = patch.getchannel("A").point(lambda v: int(v * alpha))
        patch = patch.copy()
        patch.putalpha(a)
    x, y = int(round(x)), int(round(y))
    pw, ph = patch.size
    cx0, cy0 = max(0, -x), max(0, -y)
    cx1, cy1 = min(pw, W - x), min(ph, H - y)
    if cx1 <= cx0 or cy1 <= cy0:
        return
    if (cx0, cy0, cx1, cy1) != (0, 0, pw, ph):
        patch = patch.crop((cx0, cy0, cx1, cy1))
    L.alpha_composite(patch, (x + cx0, y + cy0))


class AA:
    """Draw on a 2x patch over `box`, then scale down and composite: smooth curves for cheap.
    Use: with AA(L, box) as (d, s): d.ellipse(s((x0, y0, x1, y1)), ...)"""

    def __init__(self, L, box, alpha=1.0, k=2):
        x0, y0, x1, y1 = box
        self.L, self.alpha, self.k = L, alpha, k
        self.x0, self.y0 = int(math.floor(x0)), int(math.floor(y0))
        self.w, self.h = max(2, int(math.ceil(x1 - self.x0))), max(2, int(math.ceil(y1 - self.y0)))

    def __enter__(self):
        self.img = Image.new("RGBA", (self.w * self.k, self.h * self.k), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        k, ox, oy = self.k, self.x0, self.y0

        def s(v):
            if isinstance(v, (int, float)):
                return v * k
            out = []
            for i, c in enumerate(v):
                if isinstance(c, (tuple, list)):
                    out.append((( c[0] - ox) * k, (c[1] - oy) * k))
                else:
                    out.append((c - (ox if i % 2 == 0 else oy)) * k)
            return out if isinstance(v[0], (tuple, list)) else tuple(out)

        return self.d, s

    def __exit__(self, *a):
        small = self.img.resize((self.w, self.h), Image.LANCZOS)
        paste(self.L, small, self.x0, self.y0, self.alpha)


@lru_cache(maxsize=256)
def _shadow(w, h, r, blur, strength):
    pad = blur * 3
    img = Image.new("L", (w + pad * 2, h + pad * 2), 0)
    ImageDraw.Draw(img).rounded_rectangle((pad, pad, pad + w, pad + h), radius=r, fill=strength)
    img = img.filter(ImageFilter.GaussianBlur(blur))
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.putalpha(img)
    return out, pad


def card(L, box, r=28, fill=(30, 24, 58), a=0.78, border=None, border_a=0.35, shadow=True, alpha=1.0, glow=None):
    """Frosted-glass card with a soft shadow and a fine top highlight."""
    if alpha <= 0.01:
        return
    x0, y0, x1, y1 = [int(v) for v in box]
    w, h = x1 - x0, y1 - y0
    if w < 4 or h < 4:
        return
    if shadow:
        sh, pad = _shadow(w, h, r, 22, 150)
        paste(L, sh, x0 - pad, y0 - pad + 16, alpha)
    if glow is not None:
        gl, pad = _shadow(w, h, r, 26, 120)
        tint = Image.new("RGBA", gl.size, glow + (0,))
        tint.putalpha(gl.getchannel("A"))
        paste(L, tint, x0 - pad, y0 - pad, alpha * 0.8)
    with AA(L, (x0 - 2, y0 - 2, x1 + 2, y1 + 2), alpha) as (d, s):
        d.rounded_rectangle(s((x0, y0, x1, y1)), radius=s(r), fill=rgba(fill, a),
                            outline=rgba(border or (255, 255, 255), border_a if border else 0.07), width=int(s(2)))
        d.line(s((x0 + r, y0 + 1.5, x1 - r, y0 + 1.5)), fill=(255, 255, 255, 30), width=int(s(1.5)))


@lru_cache(maxsize=128)
def _glow_sprite(text, fname, size, color, blur):
    f = F(fname, size)
    bb = f.getbbox(text)
    pad = blur * 3
    img = Image.new("RGBA", (bb[2] - bb[0] + pad * 2, bb[3] - bb[1] + pad * 2), color + (0,))
    a = Image.new("L", img.size, 0)
    ImageDraw.Draw(a).text((pad - bb[0], pad - bb[1]), text, font=f, fill=255)
    img.putalpha(a.filter(ImageFilter.GaussianBlur(blur)))
    return img, pad, bb


def glow_text(L, x, y, text, fname, size, color, glow=0.7, blur=18, alpha=1.0):
    """Text with a soft halo; (x, y) is the left/top of the ink."""
    spr, pad, bb = _glow_sprite(text, fname, int(size), color, blur)
    paste(L, spr, x - pad, y - pad, glow * alpha)
    d = ImageDraw.Draw(L)
    d.text((x - bb[0], y - bb[1]), text, font=F(fname, size), fill=rgba(color, alpha))
    return bb[2] - bb[0], bb[3] - bb[1]


def text(L, xy, s, fname, size, color, alpha=1.0, anchor="la"):
    if alpha <= 0.01:
        return
    ImageDraw.Draw(L).text(xy, s, font=F(fname, size), fill=rgba(color, alpha), anchor=anchor)


def reveal_text(L, x, y, s, fname, size, color, p, alpha=1.0):
    """Wipe text in from the left with a soft edge."""
    if p <= 0:
        return
    f = F(fname, size)
    bb = f.getbbox(s)
    w, h = bb[2] + 20, bb[3] + 20
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((0, 0), s, font=f, fill=rgba(color, 1))
    edge = int(w * eo(p))
    mask = np.zeros((h, w), np.float32)
    if edge > 0:
        mask[:, :edge] = 1.0
        ramp = min(60, edge)
        mask[:, edge - ramp:edge] = np.linspace(1, 0, ramp)[None, :]
    a = (np.asarray(img.getchannel("A"), np.float32) * mask * alpha).astype(np.uint8)
    img.putalpha(Image.fromarray(a))
    L.alpha_composite(img, (int(x), int(y)))


def highlighter(L, box, p, col=GOLD, a=0.32):
    """A marker swipe behind text."""
    if p <= 0:
        return
    x0, y0, x1, y1 = box
    xe = x0 + (x1 - x0) * eo(p)
    with AA(L, (x0 - 10, y0 - 10, x1 + 10, y1 + 10)) as (d, s):
        d.polygon(s([(x0, y0 + 6), (xe, y0), (xe + 4, y1 - 4), (x0 - 4, y1)]), fill=rgba(col, a))


def scribble(L, box, p, col=CHAMP, width=4.5, seed=0, alpha=1.0):
    """Hand-drawn circle around box, drawn like a pen stroke."""
    if p <= 0:
        return
    x0, y0, x1, y1 = box
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 26, (y1 - y0) / 2 + 18
    n = 120
    end = int(n * 1.1 * clamp(p))
    pts = []
    for i in range(end + 1):
        a = -2.4 + 2 * math.pi * i / n
        wob = 1 + 0.03 * math.sin(i * 0.29 + seed) + 0.045 * (i / n)
        pts.append((cx + rx * wob * math.cos(a), cy + ry * wob * math.sin(a)))
    if len(pts) < 2:
        return
    with AA(L, (cx - rx * 1.2 - 10, cy - ry * 1.2 - 10, cx + rx * 1.2 + 10, cy + ry * 1.2 + 10), alpha) as (d, s):
        d.line(s(pts), fill=rgba(col, 0.95), width=int(s(width)), joint="curve")


def hand_arrow(L, p0, p1, p, col=CHAMP, width=4, bend=0.25, alpha=1.0):
    if p <= 0:
        return
    (x0, y0), (x1, y1) = p0, p1
    mx, my = (x0 + x1) / 2 - (y1 - y0) * bend, (y0 + y1) / 2 + (x1 - x0) * bend
    n = 48
    k = max(2, int(n * clamp(p)))
    pts = [((1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1)
           for t in (i / n for i in range(k + 1))]
    xs, ys = [q[0] for q in pts] + [x1], [q[1] for q in pts] + [y1]
    with AA(L, (min(xs) - 40, min(ys) - 40, max(xs) + 40, max(ys) + 40), alpha) as (d, s):
        d.line(s(pts), fill=rgba(col, 0.95), width=int(s(width)), joint="curve")
        if p >= 0.97:
            ang = math.atan2(pts[-1][1] - pts[-3][1], pts[-1][0] - pts[-3][0])
            for sgn in (-0.55, 0.55):
                d.line(s([pts[-1], (pts[-1][0] - 22 * math.cos(ang + sgn), pts[-1][1] - 22 * math.sin(ang + sgn))]),
                       fill=rgba(col, 0.95), width=int(s(width)))


def sticky(L, x, y, s, p, col=CHAMP, size=34, maxw=440, angle=-3, anchor="l"):
    """A hand-written note on a slightly rotated sticky card that pops in."""
    if p <= 0:
        return
    f = F("hand", size)
    lines = wrap(s, f, maxw)
    lh = size * 1.18
    w = int(max(f.getlength(ln) for ln in lines) + 56)
    h = int(len(lines) * lh + 40)
    img = Image.new("RGBA", (w * 2, h * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w * 2 - 1, h * 2 - 1), radius=22, fill=rgba(col, 0.96))
    d.rectangle((w - 60, -10, w + 60, 26), fill=(255, 255, 255, 70))  # tape
    f2 = F("hand", size * 2)
    for i, ln in enumerate(lines):
        d.text((56 // 1, 34 + i * lh * 2), ln, font=f2, fill=(34, 28, 22, 255))
    img = img.resize((w, h), Image.LANCZOS)
    sc = 0.6 + 0.4 * back(clamp(p / 0.8))
    img = img.resize((max(2, int(w * sc)), max(2, int(h * sc))), Image.LANCZOS).rotate(angle, Image.BICUBIC, expand=True)
    sh = img.getchannel("A").filter(ImageFilter.GaussianBlur(10)).point(lambda v: int(v * 0.5))
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow.putalpha(sh)
    xx = x if anchor == "l" else (x - img.size[0] if anchor == "r" else x - img.size[0] / 2)
    paste(L, shadow, xx + 6, y + 14, clamp(p * 2))
    paste(L, img, xx, y, clamp(p * 2))
    return img.size


def spotlight(L, box, p, r=30, dim=0.55):
    """Dim everything outside box."""
    if p <= 0:
        return
    m = Image.new("L", (W, H), int(255 * dim * eo(p)))
    ImageDraw.Draw(m).rounded_rectangle([int(v) for v in box], radius=r, fill=0)
    m = m.filter(ImageFilter.GaussianBlur(14))
    ov = Image.new("RGBA", (W, H), BG + (0,))
    ov.putalpha(m)
    L.alpha_composite(ov)


def ring(L, cx, cy, r, width, frac, col, track=TRACK, start=-90, alpha=1.0):
    with AA(L, (cx - r - 6, cy - r - 6, cx + r + 6, cy + r + 6), alpha) as (d, s):
        d.ellipse(s((cx - r, cy - r, cx + r, cy + r)), outline=rgba(track, 1), width=int(s(width)))
        if frac > 0.002:
            d.arc(s((cx - r, cy - r, cx + r, cy + r)), start=start, end=start + 360 * frac, fill=rgba(col, 1),
                  width=int(s(width)))


def icon(L, kind, cx, cy, size, col, alpha=1.0):
    """Tiny vector icons for the offer types."""
    r = size / 2
    with AA(L, (cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4), alpha) as (d, s):
        c = rgba(col, 1)
        if kind == "Revenue boost":  # lightning bolt
            pts = [(0.15, -1), (-0.55, 0.12), (-0.02, 0.12), (-0.2, 1), (0.55, -0.15), (0.03, -0.15), (0.15, -1)]
            d.polygon(s([(cx + x * r, cy + y * r) for x, y in pts]), fill=c)
        elif kind == "New clients":  # sparkle
            for k in range(4):
                a = k * math.pi / 2
                d.polygon(s([(cx, cy), (cx + math.cos(a - 0.35) * r * 0.32, cy + math.sin(a - 0.35) * r * 0.32),
                             (cx + math.cos(a) * r, cy + math.sin(a) * r),
                             (cx + math.cos(a + 0.35) * r * 0.32, cy + math.sin(a + 0.35) * r * 0.32)]), fill=c)
        elif kind == "Win-backs":  # heart
            pts = []
            for i in range(60):
                t = 2 * math.pi * i / 60
                x = 16 * math.sin(t) ** 3
                y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
                pts.append((cx + x / 17 * r, cy + y / 17 * r))
            d.polygon(s(pts), fill=c)
        else:  # renewal loop
            d.arc(s((cx - r * 0.8, cy - r * 0.8, cx + r * 0.8, cy + r * 0.8)), 40, 330, fill=c, width=int(s(r * 0.28)))
            ax, ay = cx + r * 0.8 * math.cos(math.radians(40)), cy + r * 0.8 * math.sin(math.radians(40))
            d.polygon(s([(ax + r * 0.35, ay - r * 0.05), (ax - r * 0.3, ay - r * 0.25), (ax - r * 0.05, ay + r * 0.4)]),
                      fill=c)


def check(L, cx, cy, size, p, col=TEAL):
    if p <= 0:
        return
    pts = [(cx - size * 0.45, cy), (cx - size * 0.1, cy + size * 0.35), (cx + size * 0.5, cy - size * 0.4)]
    a = clamp(p * 2)
    b = clamp(p * 2 - 1)
    seg = [pts[0], (pts[0][0] + (pts[1][0] - pts[0][0]) * a, pts[0][1] + (pts[1][1] - pts[0][1]) * a)]
    if b > 0:
        seg = [pts[0], pts[1], (pts[1][0] + (pts[2][0] - pts[1][0]) * b, pts[1][1] + (pts[2][1] - pts[1][1]) * b)]
    with AA(L, (cx - size, cy - size, cx + size, cy + size)) as (d, s):
        d.line(s(seg), fill=rgba(col, 1), width=int(s(size * 0.16)), joint="curve")


# ---------------------------------------------------------------- background
class Backdrop:
    """Drifting aurora at low resolution, scaled up, with grain and vignette baked in."""

    def __init__(self, seed=0):
        self.lw, self.lh = 240, 135
        yy, xx = np.mgrid[0:self.lh, 0:self.lw].astype(np.float32)
        self.xx, self.yy = xx / self.lw, yy / self.lh
        rng = np.random.default_rng(seed)
        self.blobs = [(BLUE, 0.18, 0.2, 0.36, 0.75), (ROSE, 0.85, 0.12, 0.28, 0.45), (TEAL, 0.88, 0.9, 0.34, 0.4),
                      (GOLD, 0.3, 0.95, 0.26, 0.28), (SKY, 0.55, 0.5, 0.4, 0.18)]
        self.phase = rng.uniform(0, 6.28, (len(self.blobs), 2))
        g = rng.normal(0, 1, (H, W)).astype(np.float32)
        vy, vx = np.mgrid[0:H, 0:W].astype(np.float32)
        v = ((vx - W / 2) / (W * 0.62)) ** 2 + ((vy - H / 2) / (H * 0.62)) ** 2
        self.vig = np.clip(1 - 0.55 * v, 0.35, 1)[..., None]
        self.grain = (g * 4.0)[..., None]
        self.cache_t = None

    def frame(self, t):
        base = np.zeros((self.lh, self.lw, 3), np.float32) + np.array(BG, np.float32)
        for i, (col, x, y, r, strength) in enumerate(self.blobs):
            px = x + 0.08 * math.sin(t * 0.07 + self.phase[i, 0])
            py = y + 0.08 * math.cos(t * 0.05 + self.phase[i, 1])
            g = np.exp(-(((self.xx - px) * 1.78) ** 2 + (self.yy - py) ** 2) / (2 * r * r))
            base += g[..., None] * (np.array(col, np.float32) * 0.42 * strength)
        img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
        arr = np.asarray(img, np.float32) * self.vig + self.grain
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).convert("RGBA")


# ---------------------------------------------------------------- chrome
def header(L, ctx, prog):
    d = ImageDraw.Draw(L)
    wm = tracked(d, (90, 52), "PHYSIQUE 57", F("heavy", 22), rgba(GOLD, 1), 0.28)
    tracked(d, (90 + wm + 28, 52), "SALES PLAN 2027", F("medium", 22), rgba(SOFT, 0.8), 0.22)
    tracked(d, (W - 90, 52), f"{ctx['monthName'].upper()}  ·  {ctx['studio'].upper()}", F("semi", 22),
            rgba(SOFT, 0.85), 0.22, anchor="ra")
    d.rectangle((0, 0, W, 3), fill=(255, 255, 255, 18))
    d.rectangle((0, 0, int(W * prog), 3), fill=rgba(GOLD, 1))


def rail(L, scenes, cur, t):
    named = [s for s in scenes if s.get("seg")]
    n = len(named)
    if not n:
        return
    gap = 30
    x0 = W / 2 - (n - 1) * gap / 2
    with AA(L, (x0 - 30, 54, x0 + (n - 1) * gap + 30, 76)) as (d, s):
        for i, sc in enumerate(named):
            x = x0 + i * gap
            if sc is cur:
                p = clamp((t - sc["s"]) / max(0.1, sc["e"] - sc["s"]))
                d.rounded_rectangle(s((x - 13, 61, x + 13, 69)), radius=s(4), fill=rgba(TRACK, 1))
                d.rounded_rectangle(s((x - 13, 61, x - 13 + 26 * p, 69)), radius=s(4), fill=rgba(GOLD, 1))
            else:
                done = sc["e"] <= t
                d.ellipse(s((x - 4, 61, x + 4, 69)), fill=rgba(CHAMP if done else TRACK, 1))


FIGS = {"lakh", "crore", "rupees"}
FOLLOW = {"per", "cent", "buyers", "buyer", "trials", "leads"}


def caption(L, s_text, prog, alpha=1.0):
    """Frosted lower-third with the spoken word highlighted; long sections scroll two lines."""
    if not s_text or alpha <= 0.01:
        return
    f, fb = F("medium", 34), F("bold", 34)
    maxw = 1500
    lines = wrap(s_text, fb, maxw)
    total = sum(len(l.split()) for l in lines)
    shown = int(total * clamp(prog)) + 1
    acc, cur = 0, len(lines) - 1
    for i, ln in enumerate(lines):
        if acc + len(ln.split()) >= shown:
            cur = i
            break
        acc += len(ln.split())
    start = max(0, min(cur, len(lines) - 2))
    vis = lines[start:start + 2]
    skip = sum(len(l.split()) for l in lines[:start])
    y0 = 912
    box = (190, y0 - 26, W - 190, y0 + len(vis) * 52 + 22)
    card(L, box, r=26, fill=(20, 15, 44), a=0.74, shadow=False, alpha=alpha)
    d = ImageDraw.Draw(L)
    wi, prev = skip, False
    for li, ln in enumerate(vis):
        words = ln.split()
        widths = []
        figs = []
        for w in words:
            core = w.strip(".,!?:;").lower()
            fig = any(c.isdigit() for c in core) or core in FIGS or (core in FOLLOW and prev)
            prev = fig and w[-1:] not in ".,!?:;"
            figs.append(fig)
            widths.append((fb if fig else f).getlength(w))
        lw = sum(widths) + f.getlength(" ") * (len(words) - 1)
        x = W / 2 - lw / 2
        y = y0 + li * 52
        for w, ww, fig in zip(words, widths, figs):
            spoken = wi < shown
            if wi == shown - 1:
                with AA(L, (x - 14, y - 6, x + ww + 14, y + 46)) as (dd, s):
                    dd.rounded_rectangle(s((x - 9, y - 2, x + ww + 9, y + 42)), radius=s(10), fill=rgba(GOLD, 0.24 * alpha))
            col = (GOLD_HI if fig else INK) if spoken else (MUTE if not fig else mix(BG, GOLD, 0.5))
            d.text((x, y), w, font=fb if fig else f, fill=rgba(col, alpha))
            x += ww + f.getlength(" ")
            wi += 1


def kicker(L, s, a=1.0, y=128):
    d = ImageDraw.Draw(L)
    d.rounded_rectangle((90, y + 8, 90 + 34, y + 12), radius=2, fill=rgba(GOLD, a))
    tracked(d, (140, y), s.upper(), F("bold", 22), rgba(GOLD, a), 0.26)


# ---------------------------------------------------------------- scenes
def s_intro(L, lt, ctx):
    a = eo(lt / 0.8)
    d = ImageDraw.Draw(L)
    # light sweep across the wordmark
    tracked(d, (W / 2, 330), "PHYSIQUE 57", F("heavy", 46), rgba(GOLD, a), 0.42, anchor="ma")
    with AA(L, (W / 2 - 300, 400, W / 2 + 300, 412)) as (dd, s):
        w = 520 * eo((lt - 0.2) / 1.0)
        dd.rounded_rectangle(s((W / 2 - w / 2, 404, W / 2 + w / 2, 407)), radius=s(2), fill=rgba(GOLD, 0.8))
    tracked(d, (W / 2, 440), "SALES PLAN 2027", F("medium", 28), rgba(SOFT, eo((lt - 0.4) / 0.6)), 0.4, anchor="ma")
    name = ctx["monthName"]
    f = F("display_i", 190)
    tw = f.getlength(name)
    reveal_text(L, W / 2 - tw / 2, 500, name, "display_i", 190, INK, (lt - 0.6) / 1.2)
    tracked(d, (W / 2, 760), ctx["studio"].upper(), F("semi", 30), rgba(CHAMP, eo((lt - 1.2) / 0.6)), 0.4, anchor="ma")


def s_open(L, lt, dur, ctx, data, seg):
    kicker(L, "This month", eo(lt / 0.5))
    name = ctx["monthName"]
    size = 230
    while F("display", size).getlength(name) > 1000:
        size -= 6
    reveal_text(L, 84, 170, name, "display", size, INK, lt / 1.1)
    # theme
    theme = data["theme"]
    ft = F("display_i", 58)
    lines = wrap(theme, ft, 960)
    y = 170 + size * 1.25
    for i, ln in enumerate(lines[:2]):
        reveal_text(L, 92, y + i * 70, ln, "display_i", 58, CHAMP, (lt - 0.8 - i * 0.3) / 1.0)
    hl_w = ft.getlength(lines[0]) if lines else 0
    highlighter(L, (88, y + 34, 100 + hl_w, y + 66), (lt - 1.8) / 0.8, GOLD, 0.22)
    # stat chips
    chips = [(lakh(ctx["target"]), "target"), (str(ctx["offers"]), "offers"), (str(ctx["buyers"]), "buyers")]
    cy = y + len(lines[:2]) * 70 + 50
    x = 92
    for i, (v, lab) in enumerate(chips):
        p = eo((lt - 2.0 - i * 0.18) / 0.6)
        if p <= 0:
            continue
        fv = F("heavy", 40)
        w = fv.getlength(v) + F("medium", 22).getlength(lab) + 72
        card(L, (x, cy + (1 - p) * 20, x + w, cy + 76 + (1 - p) * 20), r=38, alpha=p)
        text(L, (x + 28, cy + 38 + (1 - p) * 20), v, "heavy", 40, GOLD_HI, p, "lm")
        text(L, (x + 40 + fv.getlength(v), cy + 41 + (1 - p) * 20), lab, "medium", 22, SOFT, p, "lm")
        x += w + 20
    # calendar card
    m = ctx["month"]
    x0, y0, cw, ch = 1190, 230, 86, 72
    pa = eo((lt - 0.4) / 0.8)
    card(L, (x0 - 44, y0 - 70 + (1 - pa) * 30, x0 + 7 * cw + 44, y0 + 6 * ch + 76 + (1 - pa) * 30), r=34, alpha=pa)
    d = ImageDraw.Draw(L)
    tracked(d, (x0, y0 - 40), f"{name.upper()} 2027", F("bold", 20), rgba(GOLD, pa), 0.3)
    for i, lab in enumerate("MTWTFSS"):
        d.text((x0 + i * cw + cw / 2, y0 + 8), lab, font=F("semi", 20), fill=rgba(MUTE, pa), anchor="ma")
    first = dt.date(2027, m, 1)
    days = calendar.monthrange(2027, m)[1]
    lit = days * eo((lt - 1.0) / max(1.5, dur * 0.35))
    with AA(L, (x0 - 10, y0 + 30, x0 + 7 * cw + 10, y0 + 46 + 6 * ch + 10), pa) as (dd, s):
        for day in range(1, days + 1):
            idx = first.weekday() + day - 1
            cx = x0 + (idx % 7) * cw + cw / 2
            cy2 = y0 + 46 + (idx // 7) * ch + ch / 2 - 6
            k = clamp(lit - day + 1)
            if k > 0:
                col = TEAL if idx % 7 >= 5 else GOLD
                r = 27 * (0.6 + 0.4 * back(k))
                dd.ellipse(s((cx - r, cy2 - r, cx + r, cy2 + r)), fill=rgba(col, 0.28 + 0.62 * k))
            dd.text(s((cx, cy2)), str(day), font=F("semi", 46), fill=rgba(INK if k > 0 else MUTE, 1), anchor="mm")
    sticky(L, 1500, 760, f"{ctx['offers']} offers, {ctx['buyers']} buyers to find!", (lt - 3.2) / 0.6,
           col=CHAMP, size=30, maxw=360, angle=3)


def s_target(L, lt, dur, ctx, data, seg):
    tgt, ly, yoy = data["target"], data["lastYear"], data["yoy"]
    kicker(L, "The number", eo(lt / 0.5))
    shown = lakh(tgt * eo(lt / 1.4))
    w, h = glow_text(L, 92, 190, shown, "heavy", 210, GOLD_HI, glow=0.55 * eo(lt / 1.4))
    text(L, (96, 450), f"{ctx['monthName']} 2027 target", "medium", 34, SOFT, eo((lt - 0.6) / 0.6))
    real_w = F("heavy", 210).getlength(lakh(tgt))
    scribble(L, (92, 200, 92 + real_w, 200 + h), (lt - 1.6) / 1.0, CHAMP, seed=2)
    # verdict
    up = yoy >= 0
    pc = eo((lt - 1.0) / 0.6)
    col = TEAL if up else ROSE
    pill_txt = f"{'▲' if up else '▼'}  {abs(round(yoy * 100))}% vs last year"
    pw = F("bold", 34).getlength(pill_txt) + 64
    card(L, (92, 530, 92 + pw, 610), r=40, fill=col, a=0.9 * pc, shadow=True, alpha=pc)
    text(L, (92 + pw / 2, 570), pill_txt, "bold", 34, BG, pc, "mm")
    gap = tgt - ly
    text(L, (96, 650), f"{'+' if gap >= 0 else '−'}{lakh(abs(gap))} {'more than' if gap >= 0 else 'less than'} "
                       f"last {ctx['monthName']}", "medium", 32, SOFT, eo((lt - 1.4) / 0.6))
    # bars card
    bx0, by0, bx1, by1 = 1180, 170, 1830, 820
    pa = eo((lt - 0.3) / 0.7)
    card(L, (bx0, by0, bx1, by1), r=34, alpha=pa)
    mx = max(tgt, ly)
    base = by1 - 110
    hmax = 430
    bars = [("Last year", ly, (96, 86, 140), 1300), ("2027", tgt, GOLD, 1580)]
    for i, (lab, v, c, cx) in enumerate(bars):
        g = eo((lt - 0.6 - i * 0.35) / 1.1)
        hh = hmax * v / mx * g
        with AA(L, (cx - 90, base - hmax - 10, cx + 90, base + 4), pa) as (dd, s):
            dd.rounded_rectangle(s((cx - 80, base - max(hh, 6), cx + 80, base)), radius=s(18), fill=rgba(c, 1))
        text(L, (cx, base - hh - 22), lakh(v), "bold", 36, INK if i else SOFT, g * pa, "ms")
        text(L, (cx, base + 46), lab, "semi", 26, SOFT, pa, "ms")
    # bracket annotation between bar tops
    pb = (lt - 2.4) / 0.8
    if pb > 0:
        t_ly = base - hmax * ly / mx
        t_t = base - hmax * tgt / mx
        hand_arrow(L, (1390, t_ly - 60), (1490, t_t - 50), pb, CHAMP, bend=-0.35)
        sticky(L, 1210, 200, f"{'+' if yoy >= 0 else '−'}{abs(round(yoy * 100))}% on last year",
               (lt - 2.9) / 0.6, col=col, size=30, maxw=300, angle=-4)


def s_streams(L, lt, dur, ctx, data, seg):
    streams = sorted([s for s in data["streams"] if s["value"] > 0], key=lambda x: -x["value"])
    kicker(L, "Where it comes from", eo(lt / 0.5))
    total = sum(s["value"] for s in streams) or 1
    # donut
    cx, cy, r = 470, 520, 250
    pa = eo((lt - 0.2) / 0.6)
    card(L, (150, 200, 790, 840), r=40, alpha=pa)
    grow = eio((lt - 0.4) / 1.6)
    with AA(L, (cx - r - 50, cy - r - 50, cx + r + 50, cy + r + 50), pa) as (d, s):
        d.ellipse(s((cx - r, cy - r, cx + r, cy + r)), outline=rgba(TRACK, 1), width=int(s(64)))
        a0 = -90
        for i, st in enumerate(streams):
            sweep = 360 * st["value"] / total * grow
            if sweep > 0.5:
                rr = r + (10 if i == 0 and lt > 2.4 else 0)
                d.arc(s((cx - rr, cy - rr, cx + rr, cy + rr)), a0 + 0.8, a0 + sweep - 0.8,
                      fill=rgba(STREAM_COL.get(st["key"], BLUE), 1), width=int(s(64)))
            a0 += sweep
    glow_text(L, cx - F("heavy", 64).getlength(lakh(total)) / 2, cy - 52, lakh(total), "heavy", 64, INK, glow=0.25,
              alpha=pa)
    text(L, (cx, cy + 46), "this month", "medium", 26, SOFT, pa, "mm")
    # legend
    for i, st in enumerate(streams):
        p = eo((lt - 0.9 - i * 0.3) / 0.6)
        if p <= 0:
            continue
        y = 270 + i * 130
        x = 900 + (1 - p) * 40
        col = STREAM_COL.get(st["key"], BLUE)
        with AA(L, (x - 4, y - 4, x + 40, y + 40), p) as (d, s):
            d.ellipse(s((x, y + 6, x + 26, y + 32)), fill=rgba(col, 1))
        text(L, (x + 46, y), st["label"], "semi", 40, INK, p)
        text(L, (1830, y + 2), lakh(st["value"]), "bold", 40, INK, p, "ra")
        bw = 880
        with AA(L, (x + 46, y + 66, x + 46 + bw, y + 82), p) as (d, s):
            d.rounded_rectangle(s((x + 46, y + 68, x + 46 + bw, y + 80)), radius=s(6), fill=rgba(TRACK, 1))
            d.rounded_rectangle(s((x + 46, y + 68, x + 46 + max(12, bw * st["share"] / 100 * eo((lt - 1.1 - i * 0.3) / 1)), y + 80)),
                                radius=s(6), fill=rgba(col, 1))
        text(L, (x + 46 + bw + 0, y + 98), f"{num1(st['share'])}%", "medium", 24, SOFT, p, "ra")
    if streams:
        lead = streams[0]
        lw = F("semi", 40).getlength(lead["label"])
        scribble(L, (930, 266, 960 + lw, 316), (lt - 2.6) / 0.9, CHAMP, seed=4)
        hand_arrow(L, (880, 420), (cx + r * 0.75, cy - r * 0.85), (lt - 3.0) / 0.6, CHAMP, bend=0.3)
        sticky(L, 1830, 790, f"{round(lead['share'] / 10)} of every ₹10 is {lead['label'].lower()}",
               (lt - 3.4) / 0.6, col=CHAMP, size=30, maxw=420, angle=-3, anchor="r")


def s_funnel(L, lt, dur, ctx, data, seg):
    leads, trials, buyers = data["leads"], data["trials"], data["buyers"]
    kicker(L, "Who has to walk in", eo(lt / 0.5))
    rows = [("leads", leads, BLUE), ("trials", trials, TEAL), ("buyers", buyers, GOLD)]
    cx, top, rh, gap = 600, 200, 170, 26
    full = 980
    widths = [full, full * max(0.42, math.sqrt(trials / leads)), full * max(0.24, math.sqrt(buyers / leads))]
    widths.append(widths[-1] * 0.7)
    for i, (lab, v, col) in enumerate(rows):
        p = eo((lt - 0.3 - i * 0.45) / 0.7)
        if p <= 0:
            continue
        y0 = top + i * (rh + gap) + (1 - p) * 30
        w0, w1 = widths[i], widths[i + 1]
        with AA(L, (cx - w0 / 2 - 30, y0 - 10, cx + w0 / 2 + 30, y0 + rh + 30), p) as (d, s):
            d.polygon(s([(cx - w0 / 2, y0 + 14), (cx + w0 / 2, y0 + 14), (cx + w1 / 2, y0 + rh + 14), (cx - w1 / 2, y0 + rh + 14)]),
                      fill=(0, 0, 0, 90))
            d.polygon(s([(cx - w0 / 2, y0), (cx + w0 / 2, y0), (cx + w1 / 2, y0 + rh), (cx - w1 / 2, y0 + rh)]),
                      fill=rgba(col, 0.92))
        shown = int(v * eo((lt - 0.3 - i * 0.45) / 1.1))
        text(L, (cx, y0 + rh / 2 - 14), f"{shown:,}", "heavy", 64, BG, p, "mm")
        text(L, (cx, y0 + rh / 2 + 40), lab.upper(), "bold", 22, BG, p * 0.85, "mm")
    # flowing dots
    if lt > 1.6:
        rng = np.random.default_rng(3)
        with AA(L, (cx - full / 2, top, cx + full / 2, top + 3 * (rh + gap))) as (d, s):
            for k in range(26):
                ph = (lt * 0.22 + rng.uniform()) % 1
                y = top + ph * 3 * (rh + gap) - 10
                seg_i = min(2, int(ph * 3))
                half = (widths[seg_i] + (widths[seg_i + 1] - widths[seg_i]) * ((ph * 3) % 1)) / 2 - 40
                x = cx + (rng.uniform() * 2 - 1) * half
                if ph < 0.98:
                    d.ellipse(s((x - 4, y - 4, x + 4, y + 4)), fill=(255, 255, 255, int(110 * (1 - ph))))
    # conversion chips
    convs = [(f"{num1(data['leadToTrial'] * 100)}%", "book a trial", 1), (f"{num1(data['trialToBuyer'] * 100)}%", "of trials buy", 2)]
    for v, lab, i in convs:
        p = eo((lt - 1.6 - i * 0.4) / 0.6)
        if p <= 0:
            continue
        y = top + i * (rh + gap) - gap / 2 - 50
        card(L, (1260, y, 1700, y + 100), r=26, alpha=p)
        text(L, (1300, y + 50), v, "heavy", 48, CHAMP, p, "lm")
        text(L, (1310 + F("heavy", 48).getlength(v), y + 52), lab, "medium", 28, SOFT, p, "lm")
        hand_arrow(L, (1250, y + 50), (cx + widths[i] / 2 + 20, y + 50 + 10), (lt - 2.0 - i * 0.4) / 0.5, CHAMP, bend=0.15)
    per = max(1, round(1 / max(data["trialToBuyer"], 0.01)))
    sticky(L, 1250, 690, f"1 in {per} trials buys. The first class wins it!", (lt - 3.2) / 0.6, col=TEAL, size=30,
           maxw=420, angle=-3)


def s_coverage(L, lt, dur, ctx, data, seg):
    share = data["share"]
    kicker(L, "What the offers carry", eo(lt / 0.5))
    cx, cy, r = 520, 520, 270
    pa = eo((lt - 0.2) / 0.6)
    grow = eio((lt - 0.3) / 1.8)
    ring(L, cx, cy, r, 54, share * grow, GOLD, alpha=pa)
    pct = f"{round(share * 100 * grow)}%"
    glow_text(L, cx - F("heavy", 140).getlength(pct) / 2, cy - 90, pct, "heavy", 140, GOLD_HI, glow=0.4, alpha=pa)
    text(L, (cx, cy + 90), "of the target", "medium", 30, SOFT, pa, "mm")
    # tiles
    tiles = [(lakh(data["offerRevenue"]), f"from {ctx['offers_word']} offers", GOLD),
             (lakh(data["standard"]), "at full price", BLUE)]
    for i, (v, lab, col) in enumerate(tiles):
        p = eo((lt - 0.9 - i * 0.4) / 0.6)
        y = 230 + i * 220
        card(L, (1000, y + (1 - p) * 30, 1830, y + 180 + (1 - p) * 30), r=30, alpha=p)
        with AA(L, (1030, y + 40, 1046, y + 150), p) as (d, s):
            d.rounded_rectangle(s((1030, y + 40 + (1 - p) * 30, 1040, y + 140 + (1 - p) * 30)), radius=s(5), fill=rgba(col, 1))
        text(L, (1080, y + 40 + (1 - p) * 30), v, "heavy", 76, INK, p)
        text(L, (1082, y + 132 + (1 - p) * 30), lab, "medium", 28, SOFT, p)
    # stacked bar
    pb = eo((lt - 1.8) / 0.8)
    bw = 830
    with AA(L, (1000, 700, 1830, 740), pb) as (d, s):
        d.rounded_rectangle(s((1000, 706, 1000 + bw, 734)), radius=s(14), fill=rgba(BLUE, 0.9))
        d.rounded_rectangle(s((1000, 706, 1000 + bw * share * pb, 734)), radius=s(14), fill=rgba(GOLD, 1))
    text(L, (1000, 770), f"of the {lakh(data['target'])} target", "medium", 26, SOFT, pb)
    hand_arrow(L, (990, 300), (cx + r * 0.72, cy - r * 0.72), (lt - 2.6) / 0.6, CHAMP, bend=0.25)
    sticky(L, 1830, 745, "Offers are the boost, not the crutch", (lt - 3.2) / 0.6, col=CHAMP, size=28, maxw=420,
           angle=-2, anchor="r")


def s_offer(L, lt, dur, ctx, data, seg):
    o = data
    slot = o["slotLabel"]
    col = SLOT_COL.get(slot, GOLD)
    # chip with icon
    p = eo(lt / 0.5)
    chip = f"OFFER {o['index'] + 1} OF {o['count']}  ·  {slot.upper()}"
    fw = sum(F("bold", 20).getlength(c) for c in chip) + 0.24 * 20 * len(chip)
    card(L, (90, 118, 90 + fw + 100, 172), r=27, fill=col, a=0.95 * p, shadow=False, alpha=p)
    icon(L, slot, 120, 145, 26, BG, p)
    tracked(ImageDraw.Draw(L), (146, 145), chip, F("bold", 20), rgba(BG, p), 0.24, anchor="lm")
    # title
    name = o["name"].replace("→", "to")
    size = 108
    lines = wrap(name, F("display", size), 1300)
    while len(lines) > 2 and size > 66:
        size -= 6
        lines = wrap(name, F("display", size), 1300)
    y = 200
    for i, ln in enumerate(lines):
        reveal_text(L, 84, y, ln, "display", size, INK, (lt - 0.15 - i * 0.25) / 0.9)
        y += size * 1.08
    head = o.get("headline") or ""
    if head and "{" not in head:
        hl = wrap(head, F("display_i", 38), 1240)[:2]
        for i, ln in enumerate(hl):
            reveal_text(L, 92, y + 14 + i * 48, ln, "display_i", 38, CHAMP, (lt - 0.8 - i * 0.2) / 0.9)
    # discount badge
    bp = (lt - 0.6) / 0.6
    if o.get("discount") and bp > 0:
        k = back(clamp(bp))
        cx, cy, R = 1680, 330, 128 * k
        rot = lt * 8
        with AA(L, (cx - 150, cy - 150, cx + 150, cy + 150), clamp(bp * 2)) as (d, s):
            pts = []
            for i in range(72):
                a = math.radians(rot + i * 5)
                rr = R * (1 if i % 2 == 0 else 0.93)
                pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
            d.polygon(s(pts), fill=rgba(col, 1))
            d.ellipse(s((cx - R * 0.8, cy - R * 0.8, cx + R * 0.8, cy + R * 0.8)), outline=rgba(BG, 0.35), width=int(s(2)))
        if k > 0.6:
            dtxt = f"−{num1(o['discount'])}%"
            fs = 62 * k
            while F("heavy", fs).getlength(dtxt) > R * 1.45 and fs > 20:
                fs -= 2
            text(L, (cx, cy - 12), dtxt, "heavy", fs, BG, 1, "mm")
            text(L, (cx, cy + 46), "OFF", "bold", 22 * k, BG, 0.9, "mm")
    # stat tiles
    biggest = o["revenue"] == o.get("maxRevenue")
    tiles = [("BUYERS", f"{int(o['buyers'] * eo((lt - 0.6) / 1.0))}"), ("TICKET", f"₹{round(o['ticket']):,}"),
             ("REVENUE", lakh(o["revenue"] * eo((lt - 0.8) / 1.2)))]
    ty = 600
    for i, (lab, val) in enumerate(tiles):
        tp = eo((lt - 0.5 - i * 0.15) / 0.6)
        x = 90 + i * 420
        is_rev = i == 2
        card(L, (x, ty + (1 - tp) * 30, x + 390, ty + 170 + (1 - tp) * 30), r=28, alpha=tp,
             border=col if is_rev and biggest else None, border_a=0.8, glow=col if is_rev and biggest and lt > 1.6 else None)
        tracked(ImageDraw.Draw(L), (x + 32, ty + 30 + (1 - tp) * 30), lab, F("bold", 18), rgba(MUTE, tp), 0.26)
        text(L, (x + 30, ty + 66 + (1 - tp) * 30), val, "heavy", 60, INK, tp)
    # share ring
    sp = eo((lt - 0.9) / 0.6)
    ring(L, 1430, ty + 85, 70, 16, o["share"] * eio((lt - 0.9) / 1.2), col, alpha=sp)
    text(L, (1430, ty + 85), f"{round(o['share'] * 100)}%", "heavy", 34, INK, sp, "mm")
    text(L, (1520, ty + 70), "of offer", "medium", 24, SOFT, sp, "lm")
    text(L, (1520, ty + 100), "revenue", "medium", 24, SOFT, sp, "lm")
    if biggest:
        scribble(L, (930, ty, 1260, ty + 170), (lt - 1.8) / 0.8, GOLD_HI, seed=7)
        sticky(L, 1130, 470, "The big one!", (lt - 2.3) / 0.5, col=GOLD_HI, size=32, maxw=300, angle=5)
    who = (o.get("audience") or "").strip()
    if who and not who[:1].isdigit() and "≈" not in who and "effective" not in who and "cap" not in who.lower():
        sticky(L, 1830, 478, f"For: {who}", (lt - 3.0) / 0.6, col=col,
               size=26, maxw=420, angle=-3, anchor="r")


def s_plan(L, lt, dur, ctx, data, seg):
    kicker(L, "How the month runs", eo(lt / 0.5))
    reveal_text(L, 84, 160, "Four weeks, four moves", "display", 84, INK, lt / 1.0)
    beats = (seg or {}).get("beats") or ["Launch every offer.", "Track sell-through weekly.",
                                         "Mid-month check against target.", "Close, tag, and brief next month."]
    xs = [90 + i * 445 for i in range(4)]
    cw, y0 = 415, 380
    at = [0.6 + dur * (0.1 + 0.22 * i) for i in range(4)]
    # progress line
    prog = clamp((lt - at[0]) / max(0.1, at[3] - at[0] + 2))
    with AA(L, (90, y0 - 52, 1830, y0 - 36)) as (d, s):
        d.rounded_rectangle(s((90, y0 - 48, 1830, y0 - 42)), radius=s(3), fill=rgba(TRACK, 1))
        d.rounded_rectangle(s((90, y0 - 48, 90 + 1740 * prog, y0 - 42)), radius=s(3), fill=rgba(GOLD, 1))
    for i, b in enumerate(beats[:4]):
        p = eo((lt - 0.3 - i * 0.12) / 0.6)
        active = at[i] <= lt < (at[i + 1] if i < 3 else 1e9)
        done = i < 3 and lt >= at[i + 1]
        lift = 18 * eo((lt - at[i]) / 0.4) if active else 0
        a = p * (1 if (active or done or lt < at[0]) else 0.55)
        x = xs[i]
        card(L, (x, y0 - lift, x + cw, y0 + 380 - lift), r=30, alpha=a, border=GOLD if active else None, border_a=0.9,
             glow=GOLD if active else None)
        with AA(L, (x + 24, y0 + 24 - lift, x + 100, y0 + 100 - lift), a) as (d, s):
            d.ellipse(s((x + 30, y0 + 30 - lift, x + 94, y0 + 94 - lift)), fill=rgba(GOLD if (active or done) else TRACK, 1))
        text(L, (x + 62, y0 + 62 - lift), f"W{i + 1}", "heavy", 24, BG if (active or done) else SOFT, a, "mm")
        text(L, (x + 114, y0 + 62 - lift), f"Week {['one', 'two', 'three', 'four'][i]}", "bold", 30, INK, a, "lm")
        body = b[0].upper() + b[1:]
        for j, ln in enumerate(wrap(body, F("medium", 28), cw - 60)[:6]):
            text(L, (x + 32, y0 + 130 + j * 40 - lift), ln, "medium", 28, INK if active else SOFT, a)
        if done:
            check(L, x + cw - 50, y0 + 60, 40, (lt - at[i + 1]) / 0.5, TEAL)
        if active:
            highlighter(L, (x + 108, y0 + 44 - lift, x + 114 + F("bold", 30).getlength(f"Week {['one', 'two', 'three', 'four'][i]}"),
                            y0 + 82 - lift), (lt - at[i]) / 0.5, GOLD, 0.25)


def s_close(L, lt, dur, ctx, data, seg, seed=0):
    kicker(L, f"{ctx['monthName']} 2027", eo(lt / 0.5))
    reveal_text(L, 84, 160, "That's the plan", "display", 100, INK, lt / 0.9)
    tgt = ctx["target"]
    glow_text(L, 92, 300, lakh(tgt * eo(lt / 1.2)), "heavy", 170, GOLD_HI, glow=0.6)
    chips = [(str(ctx["offers"]), "offers"), (str(ctx["buyers"]), "buyers to find"), (lakh(ctx["offerRevenue"]), "from offers")]
    x = 1000
    for i, (v, lab) in enumerate(chips):
        p = eo((lt - 0.5 - i * 0.2) / 0.6)
        card(L, (x, 300 + (1 - p) * 30, x + 260, 470 + (1 - p) * 30), r=28, alpha=p)
        text(L, (x + 130, 370 + (1 - p) * 30), v, "heavy", 56, INK, p, "mm")
        text(L, (x + 130, 430 + (1 - p) * 30), lab, "medium", 22, SOFT, p, "mm")
        x += 280
    line = (seg or {}).get("signoff") or "Go find them."
    size = 76
    while F("display_i", size).getlength(line) > 1700 and size > 46:
        size -= 4
    for j, ln in enumerate(wrap(line, F("display_i", size), 1700)[:2]):
        reveal_text(L, 92, 560 + j * size * 1.15, ln, "display_i", size, CHAMP, (lt - 1.4 - j * 0.3) / 1.2)
    # confetti
    if lt > 0.3:
        rnd = np.random.default_rng(seed)
        with AA(L, (0, 0, W, 860), 1, k=1) as (d, s):
            for i in range(90):
                x0 = rnd.uniform(0, W)
                y0 = rnd.uniform(-300, 0)
                sp = rnd.uniform(140, 300)
                rot = rnd.uniform(0, 6.28)
                c = [GOLD, TEAL, ROSE, CHAMP, GOLD_HI][i % 5]
                y = y0 + sp * (lt - 0.3)
                if -20 < y < 860:
                    xx = x0 + 40 * math.sin(lt * 1.8 + i)
                    a = rot + lt * 3
                    pts = [(xx + 8 * math.cos(a + q) , y + 12 * math.sin(a + q)) for q in (0, 1.57, 3.14, 4.71)]
                    d.polygon(pts, fill=rgba(c, 0.85))


def s_end(L, lt, ctx):
    d = ImageDraw.Draw(L)
    a = eo(lt / 0.7)
    tracked(d, (W / 2, 380), "PHYSIQUE 57", F("heavy", 54), rgba(GOLD, a), 0.42, anchor="ma")
    reveal_text(L, W / 2 - F("display_i", 96).getlength("See you on the mat.") / 2, 470, "See you on the mat.",
                "display_i", 96, INK, (lt - 0.4) / 1.0)
    tracked(d, (W / 2, 640), f"SALES PLAN 2027  ·  {ctx['studio'].upper()}", F("medium", 24),
            rgba(SOFT, eo((lt - 1.0) / 0.6)), 0.3, anchor="ma")


# ---------------------------------------------------------------- frame
class Renderer:
    def __init__(self, ctx):
        self.ctx = ctx
        self.bg = Backdrop(ctx.get("seed", 0))

    def frame(self, t, sc, scenes, T_TOTAL):
        img = self.bg.frame(t)
        k = sc["kind"]
        dur = max(0.1, sc["e"] - sc["s"])
        lt = t - sc["s"]
        L = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        data = (sc.get("sc") or {}).get("data", {})
        seg = sc.get("seg")
        ctx = self.ctx
        if k == "intro":
            s_intro(L, lt, ctx)
        elif k == "endcard":
            s_end(L, lt, ctx)
        elif k == "open":
            s_open(L, lt, dur, ctx, data, seg)
        elif k == "target":
            s_target(L, lt, dur, ctx, data, seg)
        elif k == "streams":
            s_streams(L, lt, dur, ctx, data, seg)
        elif k == "funnel":
            s_funnel(L, lt, dur, ctx, data, seg)
        elif k == "coverage":
            s_coverage(L, lt, dur, ctx, data, seg)
        elif k == "offer":
            o = dict(data)
            o["maxRevenue"] = ctx["maxRevenue"]
            s_offer(L, lt, dur, ctx, o, seg)
        elif k == "plan":
            s_plan(L, lt, dur, ctx, data, seg)
        elif k == "close":
            s_close(L, lt, dur, ctx, data, seg, ctx.get("seed", 0))
        # camera: slide in, slow push, quick fade out
        enter = eo(lt / 0.6)
        leave = 1 - eo((lt - (dur - 0.3)) / 0.3) if k not in ("endcard",) else 1
        zoom = 1 + 0.018 * clamp(lt / max(dur, 1))
        if zoom > 1.0005:
            zw, zh = int(W * zoom), int(H * zoom)
            L = L.resize((zw, zh), Image.BILINEAR).crop(((zw - W) // 2, (zh - H) // 2, (zw - W) // 2 + W, (zh - H) // 2 + H))
        alpha = enter * leave
        oy = int((1 - enter) * 40)
        if alpha < 0.999:
            L.putalpha(L.getchannel("A").point(lambda v: int(v * alpha)))
        img.alpha_composite(L, (0, oy) if oy else (0, 0))
        chrome = Image.new("RGBA", (W, 90), (0, 0, 0, 0))
        header(chrome, ctx, t / T_TOTAL)
        rail(chrome, scenes, sc, t)
        img.alpha_composite(chrome)
        if seg:
            cap = Image.new("RGBA", (W, H - 840), (0, 0, 0, 0))
            caption_on(cap, seg["text"], lt / dur, enter)
            img.alpha_composite(cap, (0, 840))
        return img.convert("RGB")


def caption_on(cap, s_text, prog, alpha):
    """caption() draws in frame coordinates; shift into the strip."""
    tmp = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    caption(tmp, s_text, prog, alpha)
    cap.alpha_composite(tmp.crop((0, 840, W, H)))
