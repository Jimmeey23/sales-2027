#!/usr/bin/env python3
"""Renders the month explainer videos.

Reads `public/explainer/scripts/<slug>-<MM>.json` (built by build-explainer-scripts.ts)
and block audio `public/explainer/audio/<slug>-<MM>-[ab].mp3`, writes
`public/explainer/video/<slug>-<MM>.mp4` — one narrated animated video per studio-month.

Visual language mirrors the app's explainer: dark ground #0c0b09, ink #f7f3ea, gold
#c9a15a, champagne #e6d5ae, teal #57a38c, rose #cb7a62, blue #7c9fb6; big figures in
DejaVu. Animated chart builds (bars/ring/funnel draw in), a caption strip per scene, and
a slow ken-burns zoom. Block audio (A = figures block, B = offers/plan block) plays
continuously; scenes are timed proportionally to the script's own scene durations, the
same map the in-app player uses against a recorded track.

Usage:
    python3 scripts/render-video.py                 # all 48 months
    python3 scripts/render-video.py bandra 01       # one month
    python3 scripts/render-video.py --manifest      # add video entries to manifest.json
"""

import json, math, os, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "public" / "explainer" / "scripts"
AUDIO = ROOT / "public" / "explainer" / "audio"
VIDEO = ROOT / "public" / "explainer" / "video"
MANIFEST = ROOT / "public" / "explainer" / "manifest.json"
FFMPEG = "/home/user/ffmpeg-build/bin/ffmpeg"

W, H = 1920, 1080
BG = (12, 11, 9)
INK = (247, 243, 234)
DIM = (247, 243, 234, 150)
FAINT = (247, 243, 234, 80)
GOLD = (201, 161, 90)
CHAMP = (230, 213, 174)
TEAL = (87, 163, 140)
ROSE = (203, 122, 98)
BLUE = (124, 159, 182)
INK_RGB_ON_DARK = (20, 18, 14)

SLOT_TONE = {
    "newcomer": TEAL, "new_client": TEAL,
    "renewal": GOLD, "retention": GOLD,
    "lapsed": ROSE, "reactivation": ROSE,
    "upsell": BLUE, "spot": GOLD,
}
SLOT_LABELS = {
    "newcomer": "New clients", "new_client": "New clients",
    "lapsed": "Win-backs", "reactivation": "Win-backs",
    "renewal": "Renewals", "retention": "Renewals",
    "upsell": "Revenue boost", "spot": "Revenue boost",
}

F_SANS_B = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
F_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
F_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"
F_SERIF_B = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"

from PIL import Image, ImageDraw, ImageFont

def font(path, size):
    return ImageFont.truetype(path, int(size))

def trim(v, digits):
    return str(round(float(v), digits))

def spoken_money(v):
    v = float(v or 0)
    if v <= 0: return "\u20b90"
    if v >= 1e7: return f"\u20b9{trim(v/1e7, 2)} Cr"
    if v >= 1e5: return f"\u20b9{trim(v/1e5, 1 if v >= 1e6 else 2)}L"
    return f"\u20b9{round(v):,}"

def inr(v):
    return f"\u20b9{round(float(v or 0)):,}"

def pct(v):
    return f"{round(float(v or 0)*100)}%"

class Canvas:
    def __init__(self, w=W, h=H, bg=BG):
        self.img = Image.new("RGBA", (w, h), bg + (255,))
        self.w, self.h = w, h
    @property
    def d(self):
        return ImageDraw.Draw(self.img)
    def save(self, path):
        self.img.convert("RGB").save(path, "PPM")  # PPM: ffmpeg has a built-in decoder
    def _composite(self, layer):
        self.img = Image.alpha_composite(self.img, layer)
    def rect(self, xy, fill, radius=None):
        a = fill[3] if len(fill) == 4 else 255
        if a == 255:
            self.d.rounded_rectangle(xy, radius=radius or 0, fill=fill)
        else:
            layer = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
            dd = ImageDraw.Draw(layer)
            if radius: dd.rounded_rectangle(xy, radius=radius, fill=fill)
            else: dd.rectangle(xy, fill=fill)
            self._composite(layer)
    def ellipse(self, bbox, fill):
        a = fill[3] if len(fill) == 4 else 255
        if a == 255:
            self.d.ellipse(bbox, fill=fill)
        else:
            layer = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
            ImageDraw.Draw(layer).ellipse(bbox, fill=fill)
            self._composite(layer)
    def text(self, xy, text, fnt, fill, anchor=None):
        a = fill[3] if len(fill) == 4 else 255
        if a == 255:
            self.d.text(xy, text, font=fnt, fill=fill, anchor=anchor)
        else:
            layer = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
            ImageDraw.Draw(layer).text(xy, text, font=fnt, fill=fill, anchor=anchor)
            self._composite(layer)
    def measure(self, text, fnt):
        return self.d.textlength(text, font=fnt)
    def wrap(self, text, fnt, max_w):
        words = text.split(); lines, cur = [], ""
        for w_ in words:
            t = (cur + " " + w_).strip()
            if self.measure(t, fnt) <= max_w or not cur:
                cur = t
            else:
                lines.append(cur); cur = w_
        if cur: lines.append(cur)
        return lines
    def text_box(self, xy, text, fnt, fill, max_w, line_gap=6):
        x, y = xy
        for line in self.wrap(text, fnt, max_w):
            self.text((x, y), line, fnt, fill)
            bb = self.d.textbbox((0, 0), line, font=fnt)
            y += (bb[3] - bb[1]) + line_gap
        return y
    def arc(self, bbox, start, end, color, width):
        layer = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        ImageDraw.Draw(layer).arc(bbox, start, end, fill=color, width=width)
        self._composite(layer)

def kicker(c, text, y=80, tone=CHAMP):
    c.text((64, y), text.upper(), font(F_SANS, 23), tone + (205,))

# ---------------------------------------------------------------- scene renderers

def render_open(c, sc):
    d = sc["data"]
    kicker(c, f"{d.get('studio','')} · {d.get('year','')}")
    c.text((64, 225), d.get("monthName", "Month"), font(F_SERIF_B, 152), INK)
    yy = 400
    theme = d.get("theme")
    if theme:
        c.text((64, yy), theme, font(F_SERIF, 40), GOLD + (235,)); yy += 62
    desc = d.get("description")
    if desc:
        c.text_box((64, yy), desc, font(F_SANS, 26), DIM, 1060, line_gap=10); yy += 130
    offers = d.get("offers", 0); target = d.get("target", 0)
    foot = f"{offers} offer{'s' if offers != 1 else ''}   ·   {spoken_money(target)} target"
    c.text((64, H - 140), foot, font(F_MONO, 24), FAINT)

def render_target(c, sc):
    d = sc["data"]
    kicker(c, sc["kicker"])
    c.text((64, 245), spoken_money(d.get("target", 0)), font(F_SERIF_B, 168), INK)
    last = d.get("lastYear", 0); target = d.get("target", 0); maxv = max(last, target, 1)
    bx = 64
    def bar(y, v, color):
        c.rect((bx, y, bx + int((v / maxv) * 760), y + 44), color)
    bar(400, last, (247, 243, 234, 55)); bar(478, target, GOLD)
    c.text((bx, 368), f"Last {d.get('monthName','year')}", font(F_SANS, 22), DIM)
    c.text((bx, 446), "Target", font(F_SANS, 22), CHAMP)
    c.text((bx + 800, 400), inr(last), font(F_MONO, 22), DIM)
    c.text((bx + 800, 478), inr(target), font(F_MONO, 22), CHAMP)
    yoy = d.get("yoy")
    if yoy is not None:
        arr = "▲" if yoy >= 0 else "▼"
        col = TEAL if yoy >= 0 else ROSE
        c.text((64, 560), f"{arr} {abs(round(yoy*100))}% vs last year   ·   {inr(abs(target-last))} {'more than' if yoy >= 0 else 'below'} last year", font(F_SANS, 26), col + (235,))

def render_streams(c, sc):
    d = sc["data"]
    kicker(c, sc["kicker"])
    streams = d.get("streams", [])
    total = d.get("total", sum(s["value"] for s in streams)) or 1
    c.text((64, 215), spoken_money(total), font(F_SERIF_B, 150), INK)
    c.text((64, 385), "Revenue split by stream", font(F_SANS, 24), CHAMP)
    tones = [GOLD, TEAL, ROSE, BLUE]
    bx = 64; maxv = max(s["value"] for s in streams) or 1
    for i, s in enumerate(streams[:4]):
        y = 455 + i * 88
        c.rect((bx, y, bx + int((s["value"] / maxv) * 540), y + 42), tones[i])
        c.text((bx - 250, y + 9), s["label"], font(F_SANS, 23), DIM)
        c.text((bx + 560, y + 9), inr(s["value"]), font(F_MONO, 21), CHAMP)
        c.text((bx + 780, y + 9), f"{round(s['value']/total*100)}%", font(F_MONO, 21), DIM)
    cx, cy, r = 1450, 560, 168
    c.ellipse((cx - r, cy - r, cx + r, cy + r), (247, 243, 234, 20))
    sweep = 0
    for i, s in enumerate(streams[:4]):
        deg = 360 * s["value"] / total
        c.arc((cx - r, cy - r, cx + r, cy + r), -90 + sweep, -90 + sweep + deg, tones[i], 26)
        sweep += deg
    c.text((cx - 56, cy - 30), f"{round(streams[0]['value']/total*100)}%", font(F_SERIF_B, 42), INK)
    c.text((cx - 80, cy + 26), streams[0]["label"].lower() if streams else "", font(F_SANS, 18), DIM)
    standard = d.get("standard", 0)
    sshare = d.get("standardShare", 0)
    if standard:
        c.text((64, 905), f"Full-price trade: {spoken_money(standard)} — {round(sshare)}% of the month, no offer behind it", font(F_SANS, 21), FAINT)

def render_funnel(c, sc):
    d = sc["data"]
    kicker(c, sc["kicker"])
    c.text((64, 210), f"{d.get('buyers', 0)} buyers", font(F_SERIF_B, 150), INK)
    stages = [("Leads", d.get("leads", 0)), ("Trials", d.get("trials", 0)), ("Buyers", d.get("buyers", 0))]
    rates = [d.get("leadToTrial"), d.get("trialToBuyer")]
    maxv = max(s[1] for s in stages) or 1
    y = 340
    for i, (label, v) in enumerate(stages):
        w_ = int(900 * math.sqrt(v / maxv))
        x = (W - w_) // 2
        tone = [GOLD, TEAL, ROSE][i]
        c.rect((x, y, x + w_, y + 56), tone)
        c.text((x + 34, y + 11), label, font(F_SANS, 25), INK_RGB_ON_DARK)
        c.text((x + w_ + 34, y + 11), str(v), font(F_MONO, 28), CHAMP)
        if i < 2 and rates[i] is not None:
            c.text((W // 2 - 170, y + 76), f"{round(rates[i]*100)}% of {stages[i][0].lower()}s convert", font(F_SANS, 20), DIM)
        y += 138
    if d.get("renewalsDue", 0) > 0:
        cov = d.get("renewalCoverage")
        covtxt = f"{pct(cov)} of renewal value covered" if cov is not None else "coverage unmeasured"
        c.text((64, H - 140), f"{d['renewalsDue']} memberships expire this month · {covtxt}", font(F_SANS, 23), FAINT)

def render_coverage(c, sc):
    d = sc["data"]
    kicker(c, sc["kicker"])
    share = d.get("share", 0)
    c.text((64, 215), f"{round(share*100)}%", font(F_SERIF_B, 150), INK)
    c.text((64, 370), "of the target is carried by offers", font(F_SANS, 24), CHAMP)
    mx, mw, my, mh = 64, 1140, 470, 60
    c.rect((mx, my, mx + mw, my + mh), (247, 243, 234, 36))
    c.rect((mx, my, mx + int(mw * min(share, 1)), my + mh), GOLD)
    c.text((mx, my - 56), "Offers carry", font(F_SANS, 22), DIM)
    or_ = spoken_money(d.get("offerRevenue", 0))
    c.text((mx + mw - c.measure(or_, font(F_MONO, 22)), my - 56), or_, font(F_MONO, 22), CHAMP)
    c.text((mx, my + mh + 22), f"Full-price balance: {spoken_money(d.get('standard', 0))}", font(F_SANS, 22), DIM)
    c.text((64, 630), f"{d.get('offers', 0)} offer{'s' if d.get('offers', 0) != 1 else ''} — the balance is expected from clients buying at full price", font(F_SANS, 23), FAINT)

def render_offer(c, sc):
    d = sc["data"]
    tone = SLOT_TONE.get(d.get("slot", ""), GOLD)
    kicker(c, f"{SLOT_LABELS.get(d.get('slot',''), 'Offer').upper()}   ·   {d.get('name','Offer')}", y=70, tone=tone)
    c.text((64, 150), d.get("name", "Offer"), font(F_SERIF_B, 64), INK)
    yy = 230
    headline = d.get("headline")
    if headline:
        c.text_box((64, yy), headline, font(F_SERIF, 33), CHAMP + (235,), 1120, line_gap=8); yy += 150
    benefit = d.get("benefit")
    if benefit:
        c.rect((64, yy, 1140, yy + 190), (247, 243, 234, 18), radius=14)
        c.text((94, yy + 18), "THE MECHANIC", font(F_SANS, 18), tone + (235,))
        c.text_box((94, yy + 50), benefit, font(F_SANS, 23), DIM, 1000, line_gap=7); yy += 210
    my_ = yy + 20
    c.text((64, my_), "BUYERS  ×  TICKET  =  REVENUE", font(F_SANS, 17), DIM)
    items = [("Buyers", str(d.get("buyers", 0)), font(F_MONO, 46), INK),
             ("Ticket", spoken_money(d.get("ticket", 0)), font(F_MONO, 46), INK),
             ("Revenue", spoken_money(d.get("revenue", 0)), font(F_SERIF_B, 54), tone)]
    x = 64
    for label, value, fnt, col in items:
        c.text((x, my_ + 30), label, font(F_SANS, 17), DIM)
        c.text((x, my_ + 62), value, fnt, col)
        x += c.measure(value, fnt) + 170
    yy = my_ + 150
    meta = []
    if d.get("discount"): meta.append(("Discount", f"{d['discount']}% off"))
    if d.get("audience"): meta.append(("Who", d["audience"]))
    if d.get("validity"): meta.append(("Validity", d["validity"]))
    if d.get("kpi"): meta.append(("Measured by", d["kpi"]))
    x = 64
    for label, val in meta:
        c.text((x, yy), label.upper(), font(F_SANS, 16), DIM)
        c.text_box((x, yy + 24), val, font(F_SANS, 21), DIM, 390, line_gap=6)
        x += 440

def render_plan(c, sc):
    d = sc["data"]
    kicker(c, sc["kicker"])
    c.text((64, 195), sc["title"], font(F_SERIF_B, 68), INK)
    steps = d.get("steps", [])
    y = 300
    for i, st in enumerate(steps[:4]):
        c.rect((64, y, 1050, y + 104), (247, 243, 234, 15), radius=12)
        c.rect((64, y, 88, y + 104), TEAL)
        c.text((106, y + 16), (st.get("label") or f"W{i+1}").upper(), font(F_MONO, 20), GOLD)
        c.text_box((106, y + 50), st.get("text", ""), font(F_SANS, 22), DIM, 960, line_gap=7)
        y += 118

def render_close(c, sc):
    d = sc["data"]
    kicker(c, sc["kicker"])
    c.text((64, 195), "That is the plan", font(F_SERIF_B, 98), INK)
    cards = [("Target", spoken_money(d.get("target", 0)), GOLD),
             ("Offers carry", spoken_money(d.get("offerRevenue", 0)), TEAL),
             ("Buyers to find", str(d.get("buyers", 0)), BLUE)]
    x = 64
    for label, value, col in cards:
        c.rect((x, 370, x + 420, 540), (247, 243, 234, 15), radius=14)
        c.text((x + 32, 394), label.upper(), font(F_SANS, 18), DIM)
        c.text((x + 32, 428), value, font(F_SERIF_B, 46), col)
        x += 440
    c.text((64, 620), sc["title"], font(F_SANS, 26), CHAMP + (235,))

RENDERERS = {
    "open": render_open, "target": render_target, "streams": render_streams,
    "funnel": render_funnel, "coverage": render_coverage, "offer": render_offer,
    "plan": render_plan, "close": render_close,
}

def draw_caption(c, text):
    strip = 132
    c.rect((0, H - strip, W, H), (12, 11, 9, 205))
    c.rect((0, H - strip, W, H - strip + 3), GOLD)
    c.text_box((64, H - strip + 30), text, font(F_SANS, 27), INK, W - 136, line_gap=10)

# ---------------------------------------------------------------- audio timing

import re
_DURATION_RE = re.compile(r"Duration:\s*(\d+):(\d+):([\d.]+)")

def ffprobe_duration(path):
    r = subprocess.run([FFMPEG, "-i", str(path)], capture_output=True, text=True)
    m = _DURATION_RE.search(r.stderr)
    if not m:
        raise RuntimeError(f"cannot read duration of {path}")
    h, mi, s = m.groups()
    return int(h) * 3600 + int(mi) * 60 + float(s)

BLOCK_A_KINDS = {"open", "target", "streams", "funnel"}

def allocate(scenes, kinds, block_dur):
    rel = [s for s in scenes if s["kind"] in kinds]
    total = sum(s["duration"] for s in rel) or 1
    times, acc = [], 0.0
    for i, s in enumerate(rel):
        if i == len(rel) - 1:
            times.append(max(0.6, block_dur - acc))
        else:
            t = max(0.6, block_dur * s["duration"] / total)
            times.append(t); acc += t
    return rel, times

# ---------------------------------------------------------------- rendering

def render_scene(sc, path, caption=False, build=None, build_steps=0):
    """build: (step_index, total_steps) for chart build animation."""
    c = Canvas()
    sc_kind = sc["kind"]
    RENDERERS[sc_kind](c, sc)
    # chart build: fade chart content in by scaling brightness - simple approach:
    # draw a dimming overlay when build is active (chart drawn at full but dimmed)
    if build is not None and build_steps:
        step, total = build
        frac = step / total
        # dim everything except kicker/title: overlay with reducing opacity
        c.rect((0, 140, W, H - 132), (0, 0, 0, int(255 * (1 - frac) * 0.7)))
    if caption:
        draw_caption(c, sc["narration"])
    c.save(path)

def scene_variants(sc, alloc, tmp):
    """Return list of (png_path, duration) variants for one scene, summing to alloc."""
    kind = sc["kind"]
    steps = 3 if kind in ("streams", "target", "funnel", "coverage") else 0
    step_dur = 0.17
    variants = []
    for b in range(1, steps + 1):
        p = tmp / f"{sc['id']}-build{b}.png"
        render_scene(sc, p, caption=False, build=(b, steps), build_steps=steps)
        variants.append((p, step_dur))
    remain = alloc - steps * step_dur - 0.4
    p1 = tmp / f"{sc['id']}-base.png"
    render_scene(sc, p1, caption=False)
    variants.append((p1, 0.4))
    if remain > 0.3:
        p2 = tmp / f"{sc['id']}-cap.png"
        render_scene(sc, p2, caption=True)
        variants.append((p2, remain))
    return variants

def write_list(path, entries):
    with open(path, "w") as f:
        for p, dur in entries:
            f.write(f"file '{p}'\n")
            f.write(f"duration {dur:.4f}\n")
        # concat demuxer needs a final file line without duration for eof timing safety
        if entries:
            f.write(f"file '{entries[-1][0]}'\n")

def encode_block(entries, audio_path, block_dur, out):
    write_list(Path(tempfile.mkdtemp()) / "list.txt", entries) if False else None
    list_path = Path(tempfile.mkdtemp()) / "list.txt"
    write_list(list_path, entries)
    vf = ("zoompan=z='min(zoom+0.0016,1.05)':"
          "x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s=1920x1080:fps=25,"
          f"fade=t=in:st=0:d=0.7,fade=t=out:st={block_dur:.3f}:d=0.7")
    cmd = [FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(list_path),
           "-i", str(audio_path), "-filter_complex", f"[0:v]{vf}[v]",
           "-map", "[v]", "-map", "1:a", "-c:v", "libx264", "-preset", "fast",
           "-crf", "18", "-pix_fmt", "yuv420p", "-r", "25",
           "-c:a", "aac", "-b:a", "128k", "-shortest", str(out)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-2000:]); raise RuntimeError(f"ffmpeg failed for {out}")
    return out

def build_month(slug, month):
    script_path = SCRIPTS / f"{slug}-{month}.json"
    if not script_path.exists():
        print(f"  {slug}-{month}: script missing, skipping"); return None
    data = json.loads(script_path.read_text())
    scenes = data["script"]["scenes"]
    a_audio = AUDIO / f"{slug}-{month}-a.mp3"
    b_audio = AUDIO / f"{slug}-{month}-b.mp3"
    if not a_audio.exists() or not b_audio.exists():
        print(f"  {slug}-{month}: audio missing, skipping"); return None
    dur_a = ffprobe_duration(a_audio); dur_b = ffprobe_duration(b_audio)
    rel_a, times_a = allocate(scenes, BLOCK_A_KINDS, dur_a)
    b_kinds = {s["kind"] for s in scenes} - BLOCK_A_KINDS
    rel_b, times_b = allocate(scenes, b_kinds, dur_b)
    VIDEO.mkdir(parents=True, exist_ok=True)
    tmp = Path(tempfile.mkdtemp(prefix=f"p57-{slug}-{month}-"))
    entries_a, entries_b = [], []
    for sc, t in zip(rel_a, times_a):
        entries_a += scene_variants(sc, t, tmp)
    for sc, t in zip(rel_b, times_b):
        entries_b += scene_variants(sc, t, tmp)
    a_out = tmp / "block-a.mp4"; b_out = tmp / "block-b.mp4"
    print(f"  {slug}-{month}: block A {dur_a:.1f}s ({len(rel_a)} scenes), block B {dur_b:.1f}s ({len(rel_b)} scenes)")
    encode_block(entries_a, a_audio, dur_a, a_out)
    encode_block(entries_b, b_audio, dur_b, b_out)
    final = VIDEO / f"{slug}-{month}.mp4"
    with open(tmp / "blocks.txt", "w") as f:
        f.write(f"file '{a_out}'\nfile '{b_out}'\n")
    subprocess.run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", str(tmp / "blocks.txt"),
                    "-c", "copy", str(final)], check=True, capture_output=True)
    # cleanup tmp
    import shutil; shutil.rmtree(tmp, ignore_errors=True)
    return final

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = [a for a in sys.argv[1:] if a.startswith("--")]
    if "--manifest" in flags:
        rebuild_manifest(); return
    if args:
        slug, month = args[0], args[1].zfill(2)
        out = build_month(slug, month)
        print("  ->", out if out else "skipped")
    else:
        index = json.loads((SCRIPTS / "index.json").read_text())
        for entry in index["scripts"]:
            out = build_month(entry["slug"], str(entry["month"]).zfill(2))
            print("  ->", out.name if out else "skipped")

def rebuild_manifest():
    """Add video file entries to public/explainer/manifest.json."""
    man = json.loads(MANIFEST.read_text())
    for slug in man["studios"]:
        pass
    # video entries are keyed per studio slug -> list of months with mp4s
    videos = {}
    for f in sorted(VIDEO.glob("*.mp4")):
        slug, mm = f.stem.rsplit("-", 1)
        videos.setdefault(slug, []).append(int(mm))
    man["videos"] = {k: sorted(v) for k, v in videos.items()}
    MANIFEST.write_text(json.dumps(man, indent=2) + "\n")
    print("manifest videos:", man["videos"])

if __name__ == "__main__":
    main()
