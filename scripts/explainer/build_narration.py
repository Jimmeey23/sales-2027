#!/usr/bin/env python3
"""Writes the two-host narration for every studio-month explainer video.

Source of truth: public/explainer/scripts/<slug>-<MM>.json (the same numbers the app shows).
Output:          public/explainer/narration/<slug>-<MM>.json

Host A (figures):  open, target, streams, funnel, coverage
Host B (offers):   each offer, the weekly plan, the close

Each host block is one text the TTS voice reads in a single clip (kept under 1,500 chars).
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "public/explainer/scripts"
OUT = ROOT / "public/explainer/narration"

MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
WORDS = {1:"One",2:"Two",3:"Three",4:"Four",5:"Five",6:"Six",7:"Seven",8:"Eight",9:"Nine",10:"Ten"}

MONTH_OPEN = {
  1: "New year, same you, better spreadsheet. Let's see what January wants from us.",
  2: "February is short, so the plan is short on drama and long on follow-through.",
  3: "March. The month that starts with good intentions and ends with a playlist on repeat.",
  4: "April, the anniversary month. The confetti budget has been approved.",
  5: "May. Warm enough to skip the jacket, cool enough to skip nothing.",
  6: "June. Long evenings, Pride energy, and a plan that wants people to stay.",
  7: "July. The monsoon is here to test your willpower. The plan brought an umbrella.",
  8: "August. Half the city is on holiday. The other half is on our waitlist.",
  9: "September. Back to routine, and the routine is the product.",
  10: "October. Festive season is knocking, with gifting questions behind it.",
  11: "November. Black Friday, Diwali leftovers, and a lot of good resolutions.",
  12: "December. Gifts, goals and very festive sweat. Let's close the year properly.",
}
TARGET_UP = ["Up on last year. The plan has a plan for that.", "A stretch, but a friendly one."]
TARGET_DOWN = ["Down on last year. Not a crisis, just a smaller mountain.", "Lower than last year, and the plan says that's fine. Let's make it count."]
STREAM_QUIP = ["Existing members are doing the heavy lifting. Be nice to them.", "The loyal crowd carries this month. Thank them, then sell them something lovely."]
FUNNEL_QUIP = ["Every trial is a person who showed up. Welcome them, then sell gently.", "Trials are the warm-up. Buyers are the main set."]
COVER_QUIP = ["Offers do the heavy lifting. Full-price sales do the encore."]
SLOT_QUIP = {
  "Revenue boost": ["Flash energy, zero fake countdown timers. Well, almost.", "A sale with a spine. Spend it fast, or it spends you.", "The kind of deal that makes people ask, wait, is this real?"],
  "New clients": ["Give first-timers a reason to come back for class two.", "Step one is the awkward class. Step two is the good one.", "The welcome mat is out. Please wipe your feet."],
  "Win-backs": ["This one says we missed you, politely, with a discount attached.", "The mat has been waiting. Be kind, come back.", "A gentle nudge, with a discount on the nudge."],
  "Renewals": ["This one rewards the people who already picked us. Respect.", "The easiest sale is the member already in the building.", "Loyalty, but make it financially reasonable."],
}
DEFAULT_QUIP = ["Let's get this one on the board."]

def num(x):
    x = round(float(x), 1)
    return str(int(x)) if x == int(x) else f"{x:.1f}"

def lakh(v):
    v = float(v or 0)
    if v >= 1e7:
        return f"{v/1e7:.2f}".rstrip("0").rstrip(".") + " crore"
    if v >= 1e5:
        return f"{v/1e5:.2f}".rstrip("0").rstrip(".") + " lakh"
    return None

def say_money(v):
    l = lakh(v)
    if l: return f"{l} rupees"
    return f"{round(float(v or 0)):,} rupees"

def disp_money(v):
    v = float(v or 0)
    if v >= 1e5:
        return "\u20b9" + f"{v/1e5:.2f}".rstrip("0").rstrip(".") + "L"
    return f"\u20b9{round(v):,}"

def clean_name(n):
    n = n.replace("\u2192", " to ").replace("(", ", ").replace(")", "").replace("  ", " ")
    n = re.sub(r"\s+,", ",", n).strip().rstrip(",")
    return n.rstrip(".")

def pick(pool, seed):
    return pool[seed % len(pool)]

def build(slug_path):
    d = json.load(open(slug_path))
    m = d["month"]; mname = MONTHS[m-1]; studio = d["studioName"]
    scenes = {s["id"]: s for s in d["script"]["scenes"]}
    op = scenes["open"]["data"]; tg = scenes["target"]["data"]; st = scenes["streams"]["data"]
    fn = scenes["funnel"]["data"]; cv = scenes["coverage"]["data"]
    offers = [s for s in d["script"]["scenes"] if s["kind"] == "offer"]
    plan = [s for s in d["script"]["scenes"] if s["kind"] == "plan"][0]
    target = tg["target"]; ly = tg["lastYear"]; yoy = tg["yoy"]
    n_off = len(offers)
    seed = m * 7 + len(studio)

    a_segments = []
    a_segments.append({"id":"open","kicker":f"{studio} \u00b7 2027","title":mname,
        "text": f"{mname} 2027 at {studio}. The theme is {op['theme']}. {MONTH_OPEN[m]}"})
    direction = "above" if yoy >= 0 else "below"
    pctv = round(abs(yoy) * 100)
    quip_t = pick(TARGET_UP if yoy >= 0 else TARGET_DOWN, seed)
    a_segments.append({"id":"target","kicker":"What the month has to do","title":disp_money(target),
        "text": f"The target is {say_money(target)}. That is {pctv} per cent {direction} the {say_money(ly)} of last {mname}. {quip_t}"})
    s = sorted(st["streams"], key=lambda x: -x["value"])
    label = {"renewal":"renewals","newClient":"new clients","reactivation":"comeback","other":"other"}
    parts = [f"{label.get(x['key'], x['label'].lower())} at {say_money(x['value'])}, {num(x['share'])} per cent" for x in s]
    lead = f"{s[0]['label']} lead" if s[0]['key']!='renewal' else "Renewals lead"
    a_segments.append({"id":"streams","kicker":"Where it comes from","title":f"{len(s)} streams",
        "text": f"{'Renewals' if s[0]['key']=='renewal' else s[0]['label']} lead at {say_money(s[0]['value'])}, {num(s[0]['share'])} per cent. Then " + ", ".join(parts[1:]) + ". " + pick(STREAM_QUIP, seed)})
    a_segments.append({"id":"funnel","kicker":"Who has to walk in","title":f"{fn['buyers']} buyers",
        "text": f"{fn['leads']} leads, {fn['trials']} trials, {fn['buyers']} buyers, and {num(fn['trialToBuyer']*100)} per cent of trials convert. " + pick(FUNNEL_QUIP, seed)})
    cov_pct = round(cv["share"] * 100)
    a_segments.append({"id":"coverage","kicker":"What the offers carry","title":f"{cov_pct}%",
        "text": f"{WORDS.get(n_off, str(n_off))} offers carry {say_money(cv['offerRevenue'])}, {cov_pct} per cent of the {say_money(target)} target. The other {say_money(cv['standard'])} is expected at full price. " + pick(COVER_QUIP, seed)})

    b_segments = []
    for k, sc in enumerate(offers):
        o = sc["data"]; name = clean_name(o["name"]); slot = o["slotLabel"]
        quip = pick(SLOT_QUIP.get(slot, DEFAULT_QUIP), seed + k)
        b_segments.append({"id":sc["id"],"kicker":f"Offer {k+1} of {n_off} \u00b7 {slot}","title":o["name"],
            "text": f"Offer {k+1} of {n_off}. {name}. {slot}. {o['buyers']} buyers at {round(o['ticket']):,} rupees, that is {say_money(o['revenue'])}, with {num(o['discount'])} per cent off. {quip}"})
    wk = {"W1":"Week one, launch the offers.","W2":"Week two, check sell-out and redemptions every week.","W3":None,"W4":"Week four, close the month, tag every redemption, and brief next month."}
    steps = []
    for stp in plan["data"]["steps"]:
        if stp["label"] == "W3":
            steps.append(f"Week three, a mid-month review against {say_money(target)}.")
        else:
            steps.append(wk[stp["label"]])
    b_segments.append({"id":"plan","kicker":"How the month runs","title":"4 moves",
        "text": "How the month runs. " + " ".join(steps)})
    b_segments.append({"id":"close","kicker":f"{mname} 2027","title":"That is the plan",
        "text": f"That's {mname} at {studio}: {say_money(target)} across {WORDS.get(n_off, str(n_off))} offers, and {fn['buyers']} buyers to find. Go find them."})

    def block(segs):
        return {"text": " ".join(x["text"] for x in segs), "segments": segs}
    return {
        "slug": slug_path.stem,
        "studio": studio,
        "month": m,
        "monthName": mname,
        "year": 2027,
        "target": target, "lastYear": ly, "yoy": yoy,
        "offers": n_off,
        "buyers": fn["buyers"],
        "targetTrend": "up" if yoy >= 0 else "down",
        "blocks": {"a": block(a_segments), "b": block(b_segments)},
    }

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]  # optional slugs like bandra-01
    files = sorted(SCRIPTS.glob("*-[0-9][0-9].json"))
    for f in files:
        if only and f.stem not in only: continue
        doc = build(f)
        (OUT / f"{f.stem}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1))
        a, b = doc["blocks"]["a"]["text"], doc["blocks"]["b"]["text"]
        flag = "" if max(len(a), len(b)) <= 1450 else "  <-- OVER 1450, split needed"
        print(f"{f.stem}: A={len(a)} B={len(b)}{flag}")
    print("wrote", len(files), "narration files")

if __name__ == "__main__":
    main()
