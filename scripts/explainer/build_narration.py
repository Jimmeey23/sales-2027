#!/usr/bin/env python3
"""Writes the narration for every studio-month explainer video (one narrator, one recording).

Source of truth: public/explainer/scripts/<slug>-<MM>.json   (the same numbers the app shows)
Voice:           scripts/explainer/narration_copy.py                   (hand-written month and offer copy)
Output:
  public/explainer/narration/<slug>-<MM>.json   segments the renderer animates, one per scene
  docs/explainer-scripts/<slug>-<MM>.md         the read-aloud script for the recording
  docs/explainer-scripts/README.md              index with word counts and estimated run time

Recording contract: one file per month, public/explainer/audio/<slug>-<MM>.mp3 (or .m4a/.wav).
Leave a clear pause (about one second) at every "· · ·" so the renderer can line scenes up with
the voice. Without clean pauses it falls back to timing scenes by word count.

Usage: python3 scripts/explainer/build_narration.py [bandra-01 ...]
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import narration_copy as C  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "public/explainer/scripts"
OUT = ROOT / "public/explainer/narration"
DOCS = ROOT / "docs/explainer-scripts"

WPM = 145  # a relaxed, clear read
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
          "September", "October", "November", "December"]
WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight"}
ORD = {"first": "First up", "mid": ["Next", "Then", "Also this month", "After that"], "last": "And finally"}


def num(x):
    x = round(float(x), 1)
    return str(int(x)) if x == int(x) else f"{x:.1f}"


def money(v, unit=True):
    """Spoken money: '17.6 lakh rupees', '45,000 rupees'."""
    v = float(v or 0)
    if v >= 1e7:
        s = f"{v/1e7:.2f}".rstrip("0").rstrip(".") + " crore"
    elif v >= 1e5:
        s = f"{v/1e5:.{2 if v < 1e6 else 1}f}".rstrip("0").rstrip(".") + " lakh"
    else:
        s = f"{int(round(v, -2)):,}"
    return s + (" rupees" if unit else "")


def disp_money(v):
    v = float(v or 0)
    if v >= 1e5:
        return "₹" + f"{v/1e5:.2f}".rstrip("0").rstrip(".") + "L"
    return f"₹{round(v):,}"


def pick(pool, seed):
    return pool[seed % len(pool)]


SEQ_WORDS = re.compile(r"^(First up|First|Then|Next|And finally|Finally|And)\s*,?\s+", re.I)


def plan_beats(m, names):
    out = []
    for i, beat in enumerate(C.MONTHS[m]["plan"]):
        need = C.PLAN_NEEDS.get(m, [None] * 4)[i]
        beat = beat if (need is None or need in names) else C.PLAN_FALLBACK[i]
        out.append(beat)
    return out


def offer_line(o, k, n, seed):
    name = o["name"]
    c = C.OFFERS.get(name)
    if c is None:  # an offer the copy library has not met yet: use the plan's own headline
        c = dict(hook=f"{name}.", how=o.get("headline") or "")
        print(f"  ! no hand-written copy for offer: {name}", file=sys.stderr)
    hook = SEQ_WORDS.sub("", c["hook"].strip())
    first = hook.split(" ", 1)[0]
    if first in ("For", "The", "Our", "And"):
        hook = hook[0].lower() + hook[1:]
    if n == 1:
        lead = "Our one offer this month"
        hook = f"{lead}: {hook[0].upper() + hook[1:]}"
    elif k == 0:
        hook = f"{ORD['first']}, {hook}"
    elif k == n - 1:
        hook = f"{ORD['last']}, {hook}"
    else:
        hook = f"{pick(ORD['mid'], k - 1)}, {hook}"
    hook = hook[0].upper() + hook[1:]
    how = c["how"]
    if n >= 5:  # busy months: keep only the mechanic, drop the joke tail
        how = re.split(r"(?<=[.?!])\s+", how)[0]
    b = o["buyers"]
    who = f"{b} {'buyer' if b == 1 else 'buyers'}"
    figure = (f"That's {who}, for {money(o['revenue'])}." if n >= 5 else
              f"The plan is {who} at about {money(o['ticket'], unit=False)}, so {money(o['revenue'])}.")
    return f"{hook} {how} {figure}"


def build(path):
    d = json.load(open(path))
    m = d["month"]
    mname = MONTHS[m - 1]
    studio = d["studioName"]
    mc = C.MONTHS[m]
    scenes = {s["id"]: s for s in d["script"]["scenes"]}
    op, tg, st = scenes["open"]["data"], scenes["target"]["data"], scenes["streams"]["data"]
    fn, cv = scenes["funnel"]["data"], scenes["coverage"]["data"]
    offers = [s for s in d["script"]["scenes"] if s["kind"] == "offer"]
    n = len(offers)
    target, ly, yoy = tg["target"], tg["lastYear"], tg["yoy"]
    seed = m * 7 + len(studio)
    segs = []

    def add(id_, kicker, title, text, notes=None, **extra):
        segs.append(dict(id=id_, kicker=kicker, title=title, text=re.sub(r"\s+", " ", text).strip(),
                         **({"notes": notes} if notes else {}), **extra))

    # open
    add("open", f"{studio} · 2027", mname,
        f"Hello {studio}! {mc['open']}")

    # target
    pct = round(abs(yoy) * 100)
    if pct < 2:
        trend = pick(C.TARGET_FLAT, seed)
    elif yoy > 0:
        trend = pick(C.TARGET_UP, seed)
    else:
        trend = pick(C.TARGET_DOWN, seed)
    add("target", "The number", disp_money(target),
        f"So, the number. Our {mname} target for {studio} is {money(target)}. "
        + trend.format(pct=pct, month=mname))

    # streams
    s = sorted(st["streams"], key=lambda x: -x["value"])
    label = {"renewal": "renewals", "newClient": "new clients", "reactivation": "comebacks", "other": "everything else"}
    lead = s[0]
    rest = [f"{label.get(x['key'], x['label'].lower())} {money(x['value'], unit=False)}" for x in s[1:] if x["value"] > 0]
    rest_txt = (", ".join(rest[:-1]) + (", and " if len(rest) > 1 else "") + rest[-1]) if rest else ""
    tenth = round(lead["share"] / 10)
    add("streams", "Where it comes from", f"{len(s)} streams",
        f"Where does it come from? {label.get(lead['key'], lead['label']).capitalize()} lead the way with {money(lead['value'])}. "
        f"That's {tenth} of every 10 rupees. "
        + (f"Then {rest_txt}. " if rest_txt else "")
        + C.STREAM_LEAD.get(lead["key"], ""))

    # funnel
    conv = fn["trialToBuyer"] * 100
    add("funnel", "Who has to walk in", f"{fn['buyers']} buyers",
        f"Behind the number are people: {fn['leads']} leads, {fn['trials']} trials, "
        f"and {fn['buyers']} buyers, with about {round(conv)} per cent of trials converting. "
        + pick(C.FUNNEL_TAIL, seed))

    # coverage
    cov = round(cv["share"] * 100)
    add("coverage", "What the offers carry", f"{cov}%",
        f"Here's where the offers come in. {WORDS.get(n, str(n)).capitalize()} "
        f"{'offer carries' if n == 1 else 'offers carry'} {money(cv['offerRevenue'])}, which is {cov} per cent of our target. "
        + pick(C.COVER_TAIL, seed) + (" Let's meet them." if n > 1 else " Let's meet it."))

    # offers
    for k, sc in enumerate(offers):
        o = sc["data"]
        add(sc["id"], f"Offer {k+1} of {n} · {o['slotLabel']}", o["name"], offer_line(o, k, n, seed + k),
            notes=o.get("audience"))

    # plan
    beats = plan_beats(m, {o["data"]["name"] for o in offers})
    add("plan", "How the month runs", "4 weeks", "How does the month run? " + " ".join(beats),
        beats=[re.sub(r"^Week \w+, ", "", b) for b in beats])

    # close
    add("close", f"{mname} 2027", "That's the plan",
        f"That's {mname} at {studio}. {money(target)}, {WORDS.get(n, str(n))} "
        f"{'offer' if n == 1 else 'offers'}, and {fn['buyers']} buyers to welcome. {mc['close']}", signoff=mc["close"])

    words = sum(len(x["text"].split()) for x in segs)
    return {
        "slug": path.stem,
        "studio": studio,
        "month": m,
        "monthName": mname,
        "year": 2027,
        "theme": op["theme"],
        "target": target, "lastYear": ly, "yoy": yoy,
        "offers": n,
        "buyers": fn["buyers"],
        "targetTrend": "up" if yoy >= 0 else "down",
        "words": words,
        "estSeconds": round(words / WPM * 60),
        "segments": segs,
    }


def mmss(sec):
    return f"{sec // 60}:{sec % 60:02d}"


def write_doc(doc):
    lines = [f"# {doc['monthName']} 2027 · {doc['studio']}", "",
             f"**Theme:** {doc['theme']}  ",
             f"**Read time:** about {mmss(doc['estSeconds'])} ({doc['words']} words at a relaxed pace)  ",
             f"**Save the recording as:** `public/explainer/audio/{doc['slug']}.mp3`", "",
             "> Read warmly, smile on the jokes, and pause for a full beat at every `· · ·`. "
             "Those pauses are how the video knows when to change scenes.", ""]
    for i, s in enumerate(doc["segments"]):
        lines.append(f"### {i+1}. {s['kicker']} — {s['title']}")
        lines.append("")
        lines.append(s["text"])
        lines.append("")
        if i < len(doc["segments"]) - 1:
            lines.append("· · ·")
            lines.append("")
    (DOCS / f"{doc['slug']}.md").write_text("\n".join(lines))


def write_index(docs):
    rows = ["# 2027 month explainer scripts", "",
            "One script per studio-month. Record each one as a single take and save it as "
            "`public/explainer/audio/<slug>.mp3`, then run `./scripts/render-all.sh`.", "",
            "| Script | Theme | Offers | Words | Read time |", "|---|---|---|---|---|"]
    for d in docs:
        rows.append(f"| [{d['monthName']} · {d['studio']}]({d['slug']}.md) | {d['theme']} | {d['offers']} | "
                    f"{d['words']} | {mmss(d['estSeconds'])} |")
    (DOCS / "README.md").write_text("\n".join(rows) + "\n")


def write_all(docs):
    """Every script in one document, month by month, for review and recording."""
    out = ["# Sales Plan 2027 — Explainer Video Scripts", "",
           "All 48 scripts: 12 months × 4 studios. Each runs about 2 to 3 minutes at a relaxed pace.", "",
           "**Recording notes:** one take per script, warm and smiling on the jokes. Pause for a full beat at "
           "every `· · ·` (that's how the video changes scenes). Save as `public/explainer/audio/<file>.mp3`.", ""]
    for m in range(1, 13):
        group = [d for d in docs if d["month"] == m]
        if not group:
            continue
        out += ["---", "", f"# {MONTHS[m-1]} — {group[0]['theme']}", ""]
        for d in group:
            out += [f"## {d['monthName']} · {d['studio']}", "",
                    f"*Read time ≈ {mmss(d['estSeconds'])} · {d['words']} words · save as `{d['slug']}.mp3`*", ""]
            for i, sg in enumerate(d["segments"]):
                out += [f"**{sg['kicker']} — {sg['title']}**", "", sg["text"], ""]
                if i < len(d["segments"]) - 1:
                    out += ["· · ·", ""]
    (DOCS / "ALL-SCRIPTS.md").write_text("\n".join(out) + "\n")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    DOCS.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]
    docs = []
    for f in sorted(SCRIPTS.glob("*-[0-9][0-9].json")):
        if only and f.stem not in only:
            continue
        doc = build(f)
        (OUT / f"{f.stem}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1))
        write_doc(doc)
        docs.append(doc)
        flag = "" if 120 <= doc["estSeconds"] <= 185 else "   <-- outside 2:00-3:05"
        print(f"{f.stem}: {doc['words']} words, ~{mmss(doc['estSeconds'])}{flag}")
    if not only:
        write_index(docs)
        write_all(docs)
    print("wrote", len(docs), "narrations")


if __name__ == "__main__":
    main()
