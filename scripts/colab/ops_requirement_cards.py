# Physique 57 India — 2027 operational requirements: illustrated reference cards, in Google Colab.
#
# Runtime → Change runtime type → T4 GPU (free tier is fine; not the TPU). Paste this whole file into one Colab cell and run.
# For every line in the 2027 Operational Requirements doc it:
#   1. renders a product-style reference image of the item (Qwen-Image by default; see MODEL below),
#   2. lays it onto a styled reference card: month, offer/event, purpose, priority badge, total and per-studio split,
#      "needed by" date, category colour band,
#   3. builds one contact sheet per month and a single PDF lookbook of every card,
#   4. zips everything and downloads it.
# Output: /content/p57-ops/cards/<MM>-<item>.png (1600x2000), /content/p57-ops/sheets/<MM>-<Mon>.png, p57-ops-lookbook.pdf.
#
# Model (MODEL below), all free:
#   'juggernaut' Juggernaut XL v9 (SDXL fine-tune, CreativeML Open RAIL++-M: commercial use allowed). DEFAULT for a T4:
#                photo-real product shots, ~35-45 s an image, the whole list in about 45 min.
#   'qwen'       Qwen-Image (Apache-2.0). Best quality but needs an A100 (Colab Pro); will not load on a T4.
#   'flux'       FLUX.1-schnell (Apache-2.0). Needs an L4/A100; too big for a T4's system RAM.
# The TPU (v5e) runtime does not run these diffusers pipelines; use the T4.
#
# Optional: add HF_TOKEN in Colab Secrets (key icon) to avoid Hugging Face rate limits.
# Re-running skips images already rendered; set ONLY_MONTHS = ['Apr'] etc. to do part of the list.

import subprocess, sys
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '-U', 'transformers', 'accelerate',
                'sentencepiece', 'protobuf', 'pillow', 'git+https://github.com/huggingface/diffusers'], check=True)

import os, re, math, shutil, zipfile, textwrap, urllib.request
import torch
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ONLY_MONTHS = []          # e.g. ['Apr', 'Aug']; empty = all twelve
SKIP_CATEGORIES = {'Digital'}   # templates/set-ups have nothing to photograph; they still get a text-only card
MODEL = 'juggernaut'      # 'juggernaut' (T4), 'qwen' (A100), 'flux' (L4/A100)
SEED = 57
OUT = '/content/p57-ops'
for d in ('raw', 'cards', 'sheets', 'fonts'):
    os.makedirs(f'{OUT}/{d}', exist_ok=True)

# ---------------------------------------------------------------- data (from the 2027 Operational Requirements doc)
# (month, item, category, offer/event, what it is for, priority, KC, BA, KH, PU, needed by)
ROWS = [
    ('Jan', 'Delulu Club sticker cards', 'Print', 'The January Delulu Club', 'One card per new member on the studio wall; a sticker per class to 20', 'P1', 34, 27, 20, 0, '26 Dec'),
    ('Jan', 'Class stickers (sheets of 20)', 'Print', 'The January Delulu Club', 'One sheet per card', 'P2', 34, 27, 20, 0, '26 Dec'),
    ('Jan', 'Delulu Club wall board', 'Fixture', 'The January Delulu Club', 'Wall board for the cards', 'P1', 1, 1, 1, 0, '26 Dec'),
    ('Jan', 'Grip socks (pair)', 'Merch', "New Year's Regret Window", 'Free pair with the 3-Month', 'P1', 4, 0, 0, 0, '26 Dec'),
    ('Jan', 'Countdown clock (desk display)', 'Equipment', "New Year's Regret Window", 'Countdown at the front desk', 'P2', 1, 0, 0, 0, '26 Dec'),
    ('Jan', 'Guest pass cards', 'Print', 'Stockholm Syndrome: Annual Pass', '2 per annual buyer', 'P2', 20, 5, 5, 0, '26 Dec'),
    ('Jan', 'Form-check sheets', 'Print', 'Reset Week (4–10 Jan)', 'Free form check for every member', 'P3', 150, 100, 80, 0, '2 Jan'),
    ('Jan', '"u up?" WhatsApp template + trainer roster', 'Digital', 'Texting Your Toxic Ex', '9 pm personal message from the old trainer', 'P1', 1, 1, 1, 0, '31 Dec'),
    ('Jan', 'Kenkere free-class vouchers', 'Print', 'Big City Upgrade (all year)', 'Pop-up → Kenkere transfer; 2 a month', 'P3', 0, 0, 0, 24, '26 Dec'),
    ('Feb', 'Stronger in 30 leaderboard board', 'Fixture', 'Stronger in 30 2.0 (1 Feb–2 Mar)', 'Weekly leaderboard, members only', 'P1', 1, 1, 1, 0, '28 Jan'),
    ('Feb', 'Revenge Tour posters', 'Print', 'Post-Breakup Revenge Tour', 'One poster per come-back buyer on the challenge wall', 'P2', 9, 9, 6, 0, '28 Jan'),
    ('Feb', 'Guest pass cards', 'Print', 'Libido Litmus Test', '1 per date who buys', 'P1', 21, 15, 15, 0, '28 Jan'),
    ('Feb', 'Guest pass cards', 'Print', "Galentine's 24-Hour Alibi", '1 per 10-class pack', 'P2', 4, 0, 0, 0, '28 Jan'),
    ('Feb', '"Custody Agreement" cards', 'Print', 'The Shared Custody Package', 'One per member of each pair', 'P2', 8, 10, 5, 0, '28 Jan'),
    ('Feb', "Galentine's referral cards (class bags)", 'Print', "Galentine's Bring-a-Friend class (13 Feb)", 'One per class bag in the week', 'P3', 150, 120, 100, 0, '6 Feb'),
    ('Feb', "Event kit: Galentine's class (décor, snacks)", 'Event', "Galentine's Bring-a-Friend class (13 Feb)", 'One class per studio', 'P3', 1, 1, 1, 0, '10 Feb'),
    ('Mar', 'Grip socks (pair)', 'Merch', 'The Situationship Starter Kit', 'Starter Kit for newcomers', 'P1', 10, 10, 8, 0, '25 Feb'),
    ('Mar', 'Printed 2-week trainer plan', 'Print', 'The Situationship Starter Kit', 'Starter Kit for newcomers', 'P1', 10, 10, 8, 0, '25 Feb'),
    ('Mar', 'Monogrammed tote', 'Merch', 'Kemps Corner Heiress Retainer Fee', 'With the Heiress Bundle (lead time ~3 weeks)', 'P2', 3, 0, 0, 0, '15 Feb'),
    ('Mar', 'Guest speaker + class kit', 'Event', "International Women's Day class (8 Mar)", 'One per studio', 'P2', 1, 1, 1, 0, '1 Mar'),
    ('Mar', 'Platinum list on the anniversary wall', 'Print', 'Platinum Tier Delusion (reveal 25 Mar)', 'Names of every March renewer', 'P2', 1, 1, 1, 0, '24 Mar'),
    ('Apr', 'Thermal receipt printer', 'Equipment', 'The Receipt (all April offers)', '≈₹4,000 each; receipt engine from Momence via n8n', 'P1', 1, 1, 1, 1, '15 Mar'),
    ('Apr', 'Receipt paper rolls', 'Consumable', 'The Receipt', 'One receipt per client per month', 'P1', 6, 4, 3, 1, '15 Mar'),
    ('Apr', 'Gold receipt stock (rolls)', 'Consumable', 'Founding Witness + 150+ renewers', 'Gold receipts', 'P2', 1, 1, 1, 1, '15 Mar'),
    ('Apr', 'ACCOUNT OPENED stamp + desk bell', 'Equipment', 'Suspiciously Clean Record', 'Newcomer photo moment', 'P1', 1, 1, 1, 1, '25 Mar'),
    ('Apr', 'ACCOUNT OPENED board', 'Fixture', 'Suspiciously Clean Record', 'Stamped receipts go on the board', 'P2', 1, 1, 1, 1, '25 Mar'),
    ('Apr', 'Numbered brass keys', 'Merch', 'Nine Month Sentence', '99 per city; Bengaluru set pending price sign-off', 'P1', 99, 0, 99, 0, '10 Mar'),
    ('Apr', 'Lease Wall + live key counter screen', 'Fixture', 'Nine Month Sentence', 'Names of buyers; counter on the studio screen', 'P1', 1, 1, 1, 0, '25 Mar'),
    ('Apr', 'Settle Your Account dare cards', 'Print', 'Certified Insufferable + Your Future Self Is Unreliable', 'One per renewer', 'P1', 70, 38, 35, 3, '25 Mar'),
    ('Apr', 'Anniversary hoodie', 'Merch', 'Certified Insufferable (150+ tier)', 'Estimate: 1 in 5 renewers in the top tier', 'P2', 9, 5, 3, 0, '15 Mar'),
    ('Apr', 'Plank timer + siren', 'Equipment', 'Plank Or Pay (9:09 windows on 9 Apr)', 'Stopwatch display at the desk; siren for the windows', 'P1', 1, 1, 1, 1, '25 Mar'),
    ('Apr', 'Win-back record card + suppression list', 'Digital', 'Last Seen Wearing Leggings', 'respond.io image; injury/pregnancy/bereavement flagged first', 'P1', 1, 1, 1, 1, '8 Apr'),
    ('May', 'Ransom-note locker cards', 'Print', 'The 16-Class Hostage Situation', 'One per new member', 'P1', 38, 23, 22, 0, '25 Apr'),
    ('May', 'Tour pass cards + desk stamp', 'Print', 'The "Look What You Lost" Tour', 'Four stops; stamped at the desk', 'P1', 11, 6, 6, 0, '25 Apr'),
    ('May', 'Photographer (glow-up shoot)', 'Service', 'The "Look What You Lost" Tour', 'For finishers who upgrade', 'P3', 1, 1, 1, 0, '15 May'),
    ('May', 'Frame-able 4-class gift cards for mothers', 'Print', "Mother's Day Guilt Trip / Humiliate Me in Private, Coach", 'One per qualifying 3-Month buyer', 'P2', 4, 2, 2, 0, '1 May'),
    ('May', 'Guest pass cards', 'Print', "Mom's Gone Rogue", '1 per pack', 'P3', 0, 0, 0, 5, '1 May'),
    ('May', "Event kit: Afterparty social class + Mother's Day pair class (9 May)", 'Event', 'The Afterparty', 'Two events per studio', 'P3', 2, 2, 2, 0, '5 May'),
    ('Jun', 'Physique 57 hoodie', 'Merch', 'Big Glute Energy (Unregulated)', 'With the 6-Month upgrade', 'P1', 9, 4, 3, 0, '25 May'),
    ('Jun', 'Dad Bod 4-class gift cards', 'Print', 'Dad Bod Intervention', 'Gift for partners', 'P2', 5, 0, 0, 0, '1 Jun'),
    ('Jun', 'Hotel-room routine (20-min PDF)', 'Digital', 'Out of Office, Not Out of Shape', 'Sent to every member who freezes', 'P3', 1, 1, 1, 0, '1 Jun'),
    ('Jun', "Event kit: Father's Day class (20 Jun)", 'Event', 'Dad Bod Intervention', 'One class per studio', 'P3', 1, 0, 0, 0, '15 Jun'),
    ('Jun', 'Printed trainer plan (2-week)', 'Print', 'The Newcomers Honey Trap', 'Written plan on day one', 'P1', 16, 12, 10, 0, '25 May'),
    ('Jul', '"On Time, Every Time" water bottle', 'Merch', 'Punctuality Is My Love Language', 'Renewers with zero late cancels/no-shows (all buyers covered)', 'P1', 15, 11, 8, 0, '20 Jun'),
    ('Jul', 'Monsoon class-count board', 'Fixture', 'Sweating Through Your Dignity for Cash', 'Credit totals updated daily', 'P2', 1, 1, 1, 0, '28 Jun'),
    ('Jul', '3-instalment payment plan in Momence', 'Digital', 'The Broke Baddie Bailout', 'Set up before 1 Jul', 'P1', 1, 1, 1, 0, '28 Jun'),
    ('Aug', 'Offer tent cards (6 designs)', 'Print', 'The Excuse Amnesty (all August offers)', 'A-frame cards with Momence QR; reception, changing room, floor', 'P1', 24, 24, 24, 12, '17 Jul'),
    ('Aug', 'Exit cards (one-line "what we got wrong")', 'Print', 'Dump Us Later', 'Filled in at the desk by anyone using the break-up clause', 'P2', 50, 35, 20, 10, '25 Jul'),
    ('Aug', 'Blame Cards', 'Print', 'Peer Pressure, But Make It Barre', 'One per buying friend, with the member\'s name on it', 'P2', 11, 7, 4, 2, '25 Jul'),
    ('Aug', 'Event kit: Bring-A-Victim Day squad classes (1 Aug)', 'Event', 'Peer Pressure, But Make It Barre', 'Squad classes all day; friends free', 'P2', 1, 1, 1, 1, '28 Jul'),
    ('Aug', 'Amnesty Day call script + lapsed 61–365 day list', 'Digital', 'The Ghosting Amnesty (Amnesty Day 9 Aug)', 'Desk calls every lapsed client; expired-class lookup ready', 'P1', 1, 1, 1, 1, '5 Aug'),
    ('Aug', '2028 price-lock certificates', 'Print', 'The Insufferably Smug Annual (13–17 Aug)', 'One per annual buyer, signed at the desk', 'P2', 5, 3, 1, 0, '10 Aug'),
    ('Aug', 'Annual installment route in Momence (₹14,438 x 12)', 'Digital', 'The Insufferably Smug Annual', 'Card on file, non-cancellable 12 months', 'P1', 1, 1, 1, 0, '10 Aug'),
    ('Aug', 'Freeze-block vouchers (giftable after 30 Nov)', 'Print', 'Quitting Is For Cowards', 'One per renewer; unused blocks convert to guest classes', 'P2', 37, 24, 15, 6, '28 Jul'),
    ('Aug', 'Event kit: Sibling Rivalry Barre pairs class (17 Aug)', 'Event', 'The Excuse Amnesty', 'One pairs class per studio', 'P3', 1, 1, 1, 0, '14 Aug'),
    ('Aug', 'Format Infidelity Week signage + upgrade-gap sheet', 'Print', 'Monogamy Is Overrated (24–31 Aug)', 'Desk sheet with the price gap per format; floor signage', 'P2', 1, 1, 1, 0, '20 Aug'),
    ('Sep', 'Heart-rate monitors / assessment kit', 'Equipment', 'Heart Check week (1–7 Sep) + Palpitations Pricing', 'Free assessment for every member; start/end test for buyers', 'P1', 2, 1, 1, 0, '25 Aug'),
    ('Sep', '"Partners in Crime" tees', 'Merch', 'Partners in Crime & Joint Inflammation', '1 per returning client who renews', 'P2', 14, 8, 4, 0, '25 Aug'),
    ('Sep', 'Guest pass cards', 'Print', 'Partners in Crime & Joint Inflammation', '1 per returning client', 'P2', 14, 8, 4, 0, '25 Aug'),
    ('Sep', 'Insulated studio bottle', 'Merch', 'Thirty, Thirsty & Traumatized', 'With the 30-class pack', 'P2', 3, 2, 3, 0, '25 Aug'),
    ('Sep', 'Guest pass cards', 'Print', 'Thirty, Thirsty & Traumatized', '2 per pack', 'P3', 5, 3, 5, 0, '25 Aug'),
    ('Sep', 'Event kit: World Heart Day class (29 Sep)', 'Event', 'Heart Month', 'One class per studio', 'P3', 1, 1, 1, 0, '22 Sep'),
    ('Oct', 'Gold-foil membership card', 'Print', 'FOMO, Fatso (one day only)', 'Annual buyers', 'P2', 2, 0, 0, 0, '25 Sep'),
    ('Oct', 'Physique 57 hoodie', 'Merch', 'FOMO, Fatso (one day only)', 'With every Annual sold on the day', 'P2', 2, 0, 0, 0, '25 Sep'),
    ('Oct', '1-Month gift cards (Diwali)', 'Print', "Mothers I'd Like to Tuck", 'Gift-card desk', 'P1', 11, 5, 4, 4, '25 Sep'),
    ('Oct', 'Diwali gifting desk (décor, card display)', 'Fixture', 'Gift of Strength (1–28 Oct)', 'In studio', 'P2', 1, 1, 1, 0, '28 Sep'),
    ('Oct', 'Team leaderboard + team-class kit', 'Event', '"Per My Last Nervous Breakdown" (corporate)', 'Orders of 10+ packs', 'P2', 1, 0, 0, 0, '1 Oct'),
    ('Oct', 'Event kit: festive community class', 'Event', 'Gift of Strength', 'Before Diwali week', 'P3', 1, 1, 1, 0, '20 Oct'),
    ('Nov', 'Countdown pricing on studio screens', 'Digital', 'The Booty Black Market (26–29 Nov)', '20% → 14%, falling daily', 'P1', 1, 1, 1, 1, '18 Nov'),
    ('Nov', 'Guest pass cards', 'Print', 'The Booty Black Market', '1 per 3-Month buyer', 'P2', 8, 5, 3, 4, '18 Nov'),
    ('Nov', 'Guest pass cards', 'Print', 'The Glute Custody Battle', '2–6 per renewer by term (4 on a 6-Month)', 'P2', 20, 11, 15, 0, '18 Nov'),
    ('Nov', 'Studio wallet cards', 'Print', 'Assets Before Liabilities', '₹50,000 wallet', 'P3', 4, 4, 4, 0, '18 Nov'),
    ('Nov', '"Caught you" DM template', 'Digital', 'Wanted: Dead or Deadlifting', 'From 1 Nov', 'P2', 1, 1, 1, 0, '31 Oct'),
    ('Dec', 'Passive-aggressive message cards', 'Print', 'The Class Cartel', 'Choice of cards with each gift card', 'P1', 5, 4, 3, 0, '1 Dec'),
    ('Dec', 'Gift-card wall', 'Fixture', 'The Class Cartel', 'In studio', 'P2', 1, 1, 1, 0, '1 Dec'),
    ('Dec', 'Printable 1-Month gift card (WhatsApp)', 'Digital', 'The Christmas Eve Extortion', 'Sent in minutes', 'P2', 1, 0, 0, 0, '1 Dec'),
    ('Dec', '12 Days of Barre-mas perk kit', 'Event', 'The Pre-Solution (12–23 Dec)', 'One daily perk for members', 'P2', 1, 1, 1, 0, '8 Dec'),
    ('Dec', 'Receipt paper rolls (year in review)', 'Consumable', 'Year in review (reuses the April printer)', 'One per active member; doubles as January send', 'P3', 6, 4, 3, 1, '15 Dec')
]

# ---------------------------------------------------------------- brand look
INK, PAPER, CREAM = (24, 22, 28), (250, 247, 242), (243, 236, 226)
CAT = {   # category → (band colour, art direction for the image)
    'Merch':      ((196, 68, 98),  'premium boutique fitness merchandise product shot'),
    'Print':      ((58, 92, 168),  'beautifully designed printed stationery, flat lay, letterpress texture'),
    'Fixture':    ((210, 140, 40), 'in-studio wall installation inside a luxury barre studio'),
    'Equipment':  ((40, 140, 120), 'sleek front-desk equipment on a marble reception counter'),
    'Consumable': ((120, 96, 160), 'close-up of consumable supplies on a reception counter'),
    'Event':      ((222, 92, 60),  'joyful styled event setup in a bright boutique barre studio'),
    'Service':    ((90, 90, 90),   'behind-the-scenes photo shoot setup in a bright fitness studio'),
    'Digital':    ((60, 60, 70),   ''),
}
PRI = {'P1': ((205, 45, 60), 'MUST HAVE'), 'P2': ((230, 150, 30), 'SHOULD HAVE'), 'P3': ((110, 150, 120), 'NICE TO HAVE')}
STUDIOS = [('KC', 'Kemps Corner'), ('BA', 'Bandra'), ('KH', 'Kenkere House'), ('PU', 'Pop-up')]
MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

def font(name, size):
    urls = {'serif': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf',
            'sans': 'https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf'}
    p = f'{OUT}/fonts/{name}.ttf'
    if not os.path.exists(p):
        try: urllib.request.urlretrieve(urls[name], p)
        except Exception: return ImageFont.load_default()
    return ImageFont.truetype(p, size)

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60]

def prompt_for(item, cat, offer, purpose):
    look = CAT[cat][1]
    return (f'{look}: {item}, for a Physique 57 barre studio promotion called "{offer}" ({purpose}). '
            'Editorial product photography, soft natural window light, warm cream and blush palette with gold accents, '
            'shallow depth of field, crisp detail, minimalist luxury styling, playful and witty mood, '
            'no people faces, no readable text, no logos, high resolution, photographed on a Hasselblad, 85mm lens, '
            'award-winning commercial product photography.')

# ---------------------------------------------------------------- 1. images
rows = [r for r in ROWS if not ONLY_MONTHS or r[0] in ONLY_MONTHS]
todo = [r for r in rows if r[2] not in SKIP_CATEGORIES
        and not os.path.exists(f'{OUT}/raw/{MONTHS.index(r[0])+1:02d}-{slug(r[1]+" "+r[3])}.png')]
if todo:
    from google.colab import userdata
    try: tok = userdata.get('HF_TOKEN')
    except Exception: tok = None
    vram = torch.cuda.get_device_properties(0).total_memory / 1e9 if torch.cuda.is_available() else 0
    if MODEL == 'juggernaut':
        from diffusers import StableDiffusionXLPipeline, DPMSolverMultistepScheduler
        pipe = StableDiffusionXLPipeline.from_pretrained('RunDiffusion/Juggernaut-XL-v9', torch_dtype=torch.float16,
                                                         variant='fp16', token=tok)
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True,
                                                                 algorithm_type='sde-dpmsolver++')
        pipe.enable_vae_tiling()
        NEG = ('text, letters, words, watermark, logo, signature, blurry, lowres, jpeg artifacts, deformed, '
               'distorted, extra objects, cluttered, oversaturated, cartoon, 3d render, plastic, people, face, hands')
        def render(prompt, seed):
            return pipe(prompt=prompt, negative_prompt=NEG, width=896, height=1152, num_inference_steps=32,
                        guidance_scale=5.0, generator=torch.Generator('cuda').manual_seed(seed)).images[0]
        big = 0                                    # fits a 15 GB T4 in fp16
    elif MODEL == 'qwen':
        from diffusers import DiffusionPipeline
        pipe = DiffusionPipeline.from_pretrained('Qwen/Qwen-Image', torch_dtype=torch.bfloat16, token=tok)
        NEG = 'blurry, low quality, distorted, deformed, text, watermark, logo, cluttered, oversaturated, cartoon'
        def render(prompt, seed):
            return pipe(prompt=prompt + ' Ultra HD, 4K, cinematic composition.', negative_prompt=NEG,
                        width=1104, height=1472, num_inference_steps=40, true_cfg_scale=4.0,
                        generator=torch.Generator('cpu').manual_seed(seed)).images[0]
        big = 75
    else:
        from diffusers import FluxPipeline
        pipe = FluxPipeline.from_pretrained('black-forest-labs/FLUX.1-schnell', torch_dtype=torch.bfloat16, token=tok)
        def render(prompt, seed):
            return pipe(prompt, height=1280, width=960, num_inference_steps=4, guidance_scale=0.0,
                        max_sequence_length=256, generator=torch.Generator('cpu').manual_seed(seed)).images[0]
        big = 40
    if vram >= big or big == 0: pipe.to('cuda')
    else: pipe.enable_model_cpu_offload()      # A100-40GB / L4 / T4
    print(f'{MODEL} on {vram:.0f} GB GPU · {len(todo)} images to render')
    for i, (mon, item, cat, offer, purpose, *_rest) in enumerate(todo, 1):
        key = f'{MONTHS.index(mon)+1:02d}-{slug(item+" "+offer)}'
        print(f'[{i}/{len(todo)}] {mon} · {item}')
        render(prompt_for(item, cat, offer, purpose), SEED + i).save(f'{OUT}/raw/{key}.png')
    del pipe; torch.cuda.empty_cache()

# ---------------------------------------------------------------- 2. cards
W, H = 1600, 2000
def wrap(draw, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    return lines + [cur] if cur else lines

def rounded(img, r):
    m = Image.new('L', img.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, *img.size), r, fill=255)
    out = Image.new('RGBA', img.size); out.paste(img, (0, 0), m); return out

def card(r):
    mon, item, cat, offer, purpose, pri, kc, ba, kh, pu, by = r
    key = f'{MONTHS.index(mon)+1:02d}-{slug(item+" "+offer)}'
    band, _ = CAT[cat]; pcol, plabel = PRI[pri]
    c = Image.new('RGB', (W, H), PAPER); d = ImageDraw.Draw(c)
    d.rectangle((0, 0, W, 22), fill=band)
    # header
    d.text((90, 70), f'{mon.upper()} 2027', font=font('sans', 34), fill=band)
    d.text((W - 90, 70), cat.upper(), font=font('sans', 34), fill=(140, 130, 125), anchor='ra')
    # image panel with soft shadow
    raw = f'{OUT}/raw/{key}.png'
    box = (90, 140, W - 90, 140 + 1180)
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle(
        (box[0] + 10, box[1] + 24, box[2] + 10, box[3] + 24), 48, fill=(0, 0, 0, 70))
    c.paste(sh.filter(ImageFilter.GaussianBlur(28)), (0, 0), sh.filter(ImageFilter.GaussianBlur(28)))
    if os.path.exists(raw):
        im = Image.open(raw).convert('RGB'); bw, bh = box[2] - box[0], box[3] - box[1]
        s = max(bw / im.width, bh / im.height); im = im.resize((math.ceil(im.width * s), math.ceil(im.height * s)))
        im = im.crop(((im.width - bw) // 2, (im.height - bh) // 2, (im.width - bw) // 2 + bw, (im.height - bh) // 2 + bh))
        p = rounded(im, 48); c.paste(p, box[:2], p)
    else:   # digital set-ups: typographic panel
        d.rounded_rectangle(box, 48, fill=CREAM)
        d.text(((box[0] + box[2]) // 2, (box[1] + box[3]) // 2), '⌁  SET-UP  ⌁', font=font('serif', 110),
               fill=band, anchor='mm')
    # priority badge on the image
    f = font('sans', 30); tw = d.textlength(f'{pri} · {plabel}', font=f)
    d.rounded_rectangle((box[0] + 36, box[1] + 36, box[0] + 36 + tw + 56, box[1] + 36 + 66), 33, fill=pcol)
    d.text((box[0] + 64, box[1] + 69), f'{pri} · {plabel}', font=f, fill='white', anchor='lm')
    # title + offer
    y = box[3] + 60
    for line in wrap(d, item, font('serif', 76), W - 180)[:2]:
        d.text((90, y), line, font=font('serif', 76), fill=INK); y += 88
    d.text((90, y + 6), offer, font=font('sans', 34), fill=band); y += 60
    for line in wrap(d, purpose, font('sans', 30), W - 180)[:2]:
        d.text((90, y), line, font=font('sans', 30), fill=(95, 88, 84)); y += 42
    # quantity strip
    y = H - 250; total = kc + ba + kh + pu
    d.rounded_rectangle((90, y, W - 90, y + 170), 32, fill=CREAM)
    d.text((140, y + 52), 'TOTAL', font=font('sans', 26), fill=(140, 130, 125))
    d.text((140, y + 112), str(total), font=font('serif', 84), fill=INK, anchor='lm')
    colw = (W - 180 - 380) / 4
    for k, (code, name) in enumerate(STUDIOS):
        n = (kc, ba, kh, pu)[k]; x = 90 + 330 + k * colw + colw / 2
        d.text((x, y + 52), code, font=font('sans', 26), fill=(140, 130, 125), anchor='ma')
        d.text((x, y + 112), str(n) if n else '—', font=font('serif', 64), fill=INK if n else (190, 182, 176), anchor='mm')
    d.text((W - 90, H - 52), f'NEEDED BY {by.upper()}', font=font('sans', 26), fill=band, anchor='rm')
    d.text((90, H - 52), 'PHYSIQUE 57 INDIA · OPERATIONS 2027', font=font('sans', 26), fill=(160, 150, 145), anchor='lm')
    c.save(f'{OUT}/cards/{key}.png'); return c

cards = []
for r in rows:
    cards.append((r[0], card(r)))
print(f'{len(cards)} cards')

# ---------------------------------------------------------------- 3. monthly contact sheets + PDF lookbook
for mon in MONTHS:
    cs = [c for m, c in cards if m == mon]
    if not cs: continue
    cols = 4; rws = math.ceil(len(cs) / cols); tw, th = 400, 500
    sheet = Image.new('RGB', (cols * tw + 120, rws * th + 260), PAPER); d = ImageDraw.Draw(sheet)
    d.text((60, 70), f'{mon} 2027 — operational requirements', font=font('serif', 64), fill=INK)
    d.text((60, 160), f'{len(cs)} items · cards in the lookbook', font=font('sans', 28), fill=(140, 130, 125))
    for i, c in enumerate(cs):
        t = c.resize((tw - 20, th - 20)); sheet.paste(t, (60 + (i % cols) * tw, 230 + (i // cols) * th))
    sheet.save(f'{OUT}/sheets/{MONTHS.index(mon)+1:02d}-{mon}.png')
pdf = f'{OUT}/p57-ops-lookbook.pdf'
imgs = [c.convert('RGB') for _, c in cards]
imgs[0].save(pdf, save_all=True, append_images=imgs[1:], resolution=200)

# ---------------------------------------------------------------- 4. zip + download
z = '/content/p57-ops.zip'
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, _, fs in os.walk(OUT):
        if root.endswith('fonts'): continue
        for f in fs: zf.write(os.path.join(root, f), os.path.relpath(os.path.join(root, f), '/content'))
from google.colab import files
files.download(z)
