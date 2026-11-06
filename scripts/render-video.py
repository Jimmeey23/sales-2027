#!/usr/bin/env python3
"""Renders the month explainer videos: one narrated, animated MP4 per studio-month.

Inputs (all produced by this repo's tooling):
  public/explainer/scripts/<slug>-<MM>.json     the month's figures (from the app's plan data)
  public/explainer/narration/<slug>-<MM>.json   two-host narration, one block per host
  public/explainer/audio/<slug>-<MM>-a.mp3      host A (figures)
  public/explainer/audio/<slug>-<MM>-b.mp3      host B (offers and plan)

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
HAND = 1.6     # handoff card between the two hosts
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

FD = "/usr/share/fonts/truetype/dejavu/"
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


def draw_handoff(img, d, lt, ctx):
    a = eo(lt / 0.5)
    d.text((960, 380), "Now, the offers", font=font(F_SERIFB, 120), fill=mix(BG, INK, a), anchor="mm")
    d.text((960, 480), f"{ctx['offers']} offers, one at a time", font=font(F_SANS, 42),
           fill=mix(BG, MUTE, a), anchor="mm")
    for i in range(3):
        x = 880 + i * 80 + ((lt * 240) % 80) - 40
        col = mix(BG, GOLD, eo((lt - 0.2) / 0.4) * (0.3 + 0.7 * i / 2))
        d.polygon([(x, 600), (x + 26, 620), (x, 640), (x + 10, 620)], fill=col)


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
    d.text((1450, 760), f"Gap to last year: {sign}{lakh_disp(abs(gap))}",
           font=font(F_SANS, 34), fill=mix(BG, INK, eo((lt - 1.8) / 0.6)), anchor="ma")


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
    d.text((90, 760), f"{leads} leads became {trials} trials and {buyers} buyers.",
           font=font(F_SANS, 32), fill=mix(BG, MUTE, eo((lt - 2.2) / 0.6)), anchor="la")


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
    kpi = clean_title(o.get("kpi", ""))[:150]
    if kpi:
        d.text((90, 760), f"Watch: {kpi}", font=font(F_SANS, 26), fill=mix(BG, CHAMP, eo((lt - 1.2) / 0.6)),
               anchor="la")


def draw_plan(img, d, lt, dur, ctx, sc):
    kicker(d, "How the month runs")
    d.text((90, 175), "4 moves", font=font(F_BOLD, 120), fill=INK, anchor="la")
    xs = [330, 760, 1190, 1620]
    d.line((xs[0], 380, xs[0] + (xs[-1] - xs[0]) * eo((lt - 0.2) / 1.6), 380), fill=GOLD, width=6)
    steps = [("W1", "Launch", "Set up every offer, so it is live from day one."),
             ("W2", "Track weekly", "Check sell-out and redemptions every week."),
             ("W3", "Mid-month check", f"Review against the {ctx['target_say']} target."),
             ("W4", "Close and brief", "Tag every redemption by offer ID, then brief next month.")]
    for i, (lab, head, body) in enumerate(steps):
        a = eo((lt - 0.4 - i * 0.45) / 0.6)
        if a <= 0:
            continue
        x = xs[i]
        r = 56 * back(clamp((lt - 0.4 - i * 0.45) / 0.7))
        d.ellipse((x - r, 380 - r, x + r, 380 + r), fill=mix(BG, GOLD, a))
        d.text((x, 380), lab, font=font(F_BOLD, int(34 * max(0.2, r / 56))), fill=BG, anchor="mm")
        d.text((x, 490), head, font=font(F_BOLD, 40), fill=mix(BG, INK, a), anchor="ma")
        for j, ln in enumerate(wrap(body, font(F_SANS, 30), 380)):
            d.text((x, 550 + j * 42), ln, font=font(F_SANS, 30), fill=mix(BG, MUTE, a), anchor="ma")


def draw_close(img, d, lt, dur, ctx, sc):
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
    d.text((90, 640), "Go find them.", font=font(F_SERIFB, 104), fill=mix(BG, CHAMP, g), anchor="la")
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


def build_timeline(script, narr):
    scenes_by_id = {s["id"]: s for s in script["script"]["scenes"]}
    ctx = dict(
        monthName=narr["monthName"], month=narr["month"], studio=narr["studio"], offers=narr["offers"],
        buyers=narr["buyers"], target=narr["target"], offersWord=None,
        theme=scenes_by_id["open"]["data"]["theme"], seed=narr["month"] * 31 + len(narr["studio"]),
    )
    ctx["target_say"] = lakh_disp(narr["target"])
    ctx["offerRevenue"] = scenes_by_id["coverage"]["data"]["offerRevenue"]
    ctx["offers_word"] = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six"}.get(narr["offers"], str(narr["offers"]))
    offer_rev = [s["data"]["revenue"] for s in script["script"]["scenes"] if s["kind"] == "offer"]
    max_rev = max(offer_rev) if offer_rev else 1
    top_offer = max(offer_rev) if offer_rev else None
    a_audio = decode(AUDIO / f"{narr['slug']}-a.mp3")
    b_audio = decode(AUDIO / f"{narr['slug']}-b.mp3")
    dA, dB = len(a_audio) / SR, len(b_audio) / SR
    T_A = PRE
    T_H = T_A + dA
    T_B = T_H + HAND
    T_END = T_B + dB
    T_TOTAL = T_END + OUTRO
    scenes, sfx = [], []
    scenes.append(dict(kind="intro", s=0.0, e=PRE, seg=None, sc=None))
    sfx.append((0.15, "whoosh", 0.6))
    sfx.append((0.7, "tada", 0.5))

    def add_block(segs, start, dur):
        total = sum(len(x["text"]) for x in segs)
        acc = 0
        for seg in segs:
            s = start + dur * acc / total
            acc += len(seg["text"])
            e = start + dur * acc / total
            kind = "offer" if seg["id"].startswith("offer-") else seg["id"]
            scenes.append(dict(kind=kind, s=s, e=e, seg=seg, sc=scenes_by_id.get(seg["id"])))
            sfx.append((s, "whoosh", 0.35))
    add_block(narr["blocks"]["a"]["segments"], T_A, dA)
    scenes.append(dict(kind="handoff", s=T_H, e=T_B, seg=None, sc=None))
    sfx.append((T_H + 0.05, "record_scratch", 0.7))
    add_block(narr["blocks"]["b"]["segments"], T_B, dB)
    scenes.append(dict(kind="endcard", s=T_END, e=T_TOTAL, seg=None, sc=None))
    sfx.append((T_END + 0.2, "ding", 0.6))

    # sound effect cues on the scenes that deserve a meme
    for sc in scenes:
        k, s, e = sc["kind"], sc["s"], sc["e"]
        D = e - s
        if k == "target":
            if narr["targetTrend"] == "up":
                sfx.append((s + 0.6 * D, "cha_ching", 0.8))
            else:
                sfx.append((s + 0.35 * D, "sad_trombone", 0.9))
        elif k == "streams":
            for i in range(4):
                sfx.append((s + D * (0.15 + 0.13 * i), "pop", 0.45))
        elif k == "funnel":
            sfx.append((s + 0.2 * D, "drum_roll", 0.6))
            sfx.append((s + 0.78 * D, "rimshot", 0.9))
        elif k == "coverage":
            sfx.append((s + 0.25 * D, "ding", 0.6))
            sfx.append((s + 0.55 * D, "cha_ching", 0.8))
        elif k == "offer":
            sfx.append((s + 0.12 * D, "pop", 0.6))
            sfx.append((s + 0.5 * D, "cha_ching", 0.75))
            if sc["sc"] and sc["sc"]["data"]["revenue"] == top_offer:
                sfx.append((s + 0.12 * D, "vine_boom", 0.9))
        elif k == "plan":
            for i in range(4):
                sfx.append((s + D * (0.12 + 0.2 * i), "ding", 0.55))
        elif k == "close":
            sfx.append((s + 0.08 * D, "airhorn", 0.85))
            sfx.append((s + 0.75 * D, "tada", 0.6))
    ctx["maxRevenue"] = max_rev
    return dict(ctx=ctx, scenes=scenes, sfx=sfx, a=a_audio, b=b_audio, T_A=T_A, T_B=T_B, T_TOTAL=T_TOTAL,
                dA=dA, dB=dB, T_END=T_END, max_rev=max_rev)


def render_scene(img, d, sc, lt, dur, ctx, t, T_TOTAL):
    k = sc["kind"]
    if k == "intro":
        draw_intro(img, d, lt, ctx)
        return
    if k == "handoff":
        draw_handoff(img, d, lt, ctx)
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
        draw_plan(img, d, lt, dur, ctx, data_for)
    elif k == "close":
        draw_close(img, d, lt, dur, ctx, data_for)


def caption_for(sc):
    if sc.get("seg") is None:
        return None
    return sc["seg"]["text"]


def draw_caption(img, d, text, progress):
    f = font(F_SANS, 36)
    lines = wrap(text, f, 1640)
    words_total = len(text.split())
    shown = int(words_total * clamp(progress)) + 1
    y_bottom = 1040
    y = y_bottom - len(lines) * 52
    wi = 0
    for ln in lines:
        x = 140
        for w in ln.split():
            col = INK if wi < shown else mix(BG, INK, 0.45)
            d.text((x, y), w, font=f, fill=col, anchor="la")
            x += f.getlength(w + " ")
            wi += 1
        y += 52


def write_audio(path, tl):
    n = int(tl["T_TOTAL"] * SR) + SR
    rng = np.random.default_rng(7)
    voice = np.zeros(n, np.float32)
    voice[int(tl["T_A"] * SR): int(tl["T_A"] * SR) + len(tl["a"])] += tl["a"]
    voice[int(tl["T_B"] * SR): int(tl["T_B"] * SR) + len(tl["b"])] += tl["b"]
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
    mono = voice * 1.0 + bed * 0.9 + fx
    mono = np.tanh(mono * 1.1).astype(np.float32)
    stereo = np.stack([mono, mono], axis=1).astype("<f4")
    path.write_bytes(stereo.tobytes())


def render_month(slug, mm):
    script = json.loads((SCRIPTS / f"{slug}-{mm}.json").read_text())
    narr = json.loads((NARR / f"{slug}-{mm}.json").read_text())
    narr["slug"] = f"{slug}-{mm}"
    tl = build_timeline(script, narr)
    ctx = tl["ctx"]
    VIDEO.mkdir(parents=True, exist_ok=True)
    out = VIDEO / f"{slug}-{mm}.mp4"
    tmp_audio = VIDEO / f".{slug}-{mm}.f32"
    write_audio(tmp_audio, tl)
    bg = make_background()
    band = make_band()
    cmd = [FFMPEG, "-y", "-v", "error",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
           "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(tmp_audio),
           "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "160k",
           "-t", f"{tl['T_TOTAL']:.2f}", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    total = int(tl["T_TOTAL"] * FPS)
    scenes = tl["scenes"]
    for fi in range(total):
        t = fi / FPS
        sc = next((s for s in scenes if s["s"] <= t < s["e"]), scenes[-1])
        dur = sc["e"] - sc["s"]
        lt = t - sc["s"]
        img = bg.copy()
        draw_particles(img, t)
        img.paste(Image.alpha_composite(img.crop((0, H - 300, W, H)).convert("RGBA"), band).convert("RGB"),
                  (0, H - 300))
        scene_img = img.copy()
        sd = ImageDraw.Draw(scene_img)
        render_scene(scene_img, sd, sc, lt, dur, ctx, t, tl["T_TOTAL"])
        a = eo(lt / 0.35)
        img = Image.blend(img, scene_img, a) if a < 1 else scene_img
        d = ImageDraw.Draw(img)
        caption = caption_for(sc)
        header(d, ctx, t / tl["T_TOTAL"])
        if caption:
            draw_caption(img, d, caption, lt / dur if dur > 0 else 1)
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
        if (AUDIO / f"{slug}-{mm}-b.mp3").exists() and (AUDIO / f"{slug}-{mm}-a.mp3").exists():
            render_month(slug, mm)


if __name__ == "__main__":
    main(sys.argv[1:])
