# Physique 57 India — edit real trainer photos in Google Colab (new poses, settings, light) while keeping the person.
#
# Runtime → Change runtime type → GPU: A100 (best) or L4. Paste this whole file into one Colab cell and run.
# 1. It asks you to upload p57-source.zip (the real photoshoot JPEGs, e.g. public/p57/pro/p*.jpg).
# 2. Every photo gets EDITS_PER_PHOTO instruction edits (pose, setting, light), with the face, body and outfit kept.
# 3. Results land in /content/p57/pro-edit/<photo>-<edit>.jpg at 1280x1600, zipped and downloaded in one go.
#
# Model (MODEL below):
#   'qwen'    Qwen-Image-Edit (Apache-2.0, fine for paid marketing). Needs ~40 GB VRAM or CPU offload (slow on L4).
#   'kontext' FLUX.1-Kontext-dev. Best identity keeping, but the dev licence is NON-COMMERCIAL: do not publish its output
#             in ads or collaterals without a commercial licence from Black Forest Labs. Accept the licence on Hugging Face
#             and add HF_TOKEN in Colab Secrets.
#
# After download: unzip, check every image for hands, faces and logos, then copy keepers into public/p57/pro/ as e01, e02 ...
# and add them to PHOTOS in src/components/MarketingCollaterals.tsx.

import subprocess, sys
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '-U', 'diffusers>=0.35', 'transformers', 'accelerate',
                'sentencepiece', 'protobuf', 'pillow'], check=True)

import os, glob, random, shutil, zipfile, torch
from PIL import Image, ImageOps
from google.colab import files, userdata

MODEL = 'qwen'            # 'qwen' (commercial-safe) or 'kontext' (non-commercial)
EDITS_PER_PHOTO = 3
SEED = 57
SRC, OUT = '/content/p57/src', '/content/p57/pro-edit'
os.makedirs(SRC, exist_ok=True); os.makedirs(OUT, exist_ok=True)

try:
    os.environ['HF_TOKEN'] = userdata.get('HF_TOKEN')
except Exception:
    pass

# --- 1. Upload source photos --------------------------------------------------------------------------------------
print('Upload p57-source.zip (or individual JPEGs)')
for name in files.upload():
    if name.endswith('.zip'):
        zipfile.ZipFile(name).extractall(SRC)
    else:
        shutil.move(name, f'{SRC}/{name}')
sources = sorted(p for p in glob.glob(f'{SRC}/**/*', recursive=True) if p.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')))
print(len(sources), 'photos')

# --- 2. Edits -----------------------------------------------------------------------------------------------------
# Every prompt says what to keep, so the trainer stays recognisable. Mix of pose, setting and light changes.
KEEP = ('Keep the same person, same face, same skin tone, same hairstyle, same body shape and the same outfit. '
        'Photorealistic editorial fitness photograph, natural skin texture, correct hands and fingers, '
        'face fully in frame, no text, no logos.')
EDITS = {
    'arabesque':  'Change her pose to an elegant arabesque at a pale wood ballet barre, one hand resting lightly on the barre.',
    'plie':       'Change the pose to a deep plie squat at a ballet barre, heels lifted, chest tall, calm confident smile.',
    'tuck':       'Change the pose to a seated tuck at the barre with a small light-blue foam ball between the knees.',
    'plank':      'Change the pose to a forearm plank on a mat, looking at the camera with a warm smile.',
    'weights':    'Change the pose to a standing bicep curl with light 1 kg dumbbells, shoulders relaxed, focused expression.',
    'stretch':    'Change the pose to a seated side stretch on a mat, one arm reaching overhead, serene expression.',
    'cycle':      'Place the person on an indoor power cycle mid-ride, leaning forward, energetic smile, cyan rim light.',
    'walkin':     'Change the pose to walking toward the camera carrying a rolled mat, candid laugh, boutique studio entrance.',
    'studio':     'Move the person into a luxury boutique barre studio in Mumbai with mirrored walls, pale wood barres and '
                  'light-blue balls, soft morning daylight. Keep the pose.',
    'golden':     'Relight the photo with soft golden-hour window light and a shallow depth of field. Keep the pose.',
    'moody':      'Relight the photo with a dark studio background and a soft cyan rim light for a premium editorial look. Keep the pose.',
    'portrait':   'Turn this into a 4:5 waist-up portrait, relaxed arms, genuine smile, plain soft-blue studio wall behind, '
                  'generous empty space above the head for a headline.',
}
NEGATIVE = 'deformed hands, extra fingers, extra limbs, distorted face, different person, cropped head, text, watermark, logo, cartoon'

# --- 3. Model -----------------------------------------------------------------------------------------------------
def load():
    if MODEL == 'kontext':
        from diffusers import FluxKontextPipeline
        pipe = FluxKontextPipeline.from_pretrained('black-forest-labs/FLUX.1-Kontext-dev', torch_dtype=torch.bfloat16)
        run = lambda img, prompt, g: pipe(image=img, prompt=prompt, guidance_scale=2.5, num_inference_steps=28,
                                          generator=g).images[0]
    else:
        from diffusers import QwenImageEditPipeline
        pipe = QwenImageEditPipeline.from_pretrained('Qwen/Qwen-Image-Edit', torch_dtype=torch.bfloat16)
        run = lambda img, prompt, g: pipe(image=img, prompt=prompt, negative_prompt=NEGATIVE, true_cfg_scale=4.0,
                                          num_inference_steps=40, generator=g).images[0]
    vram = torch.cuda.get_device_properties(0).total_memory / 2**30
    if vram < 70:
        pipe.enable_model_cpu_offload()
    else:
        pipe.to('cuda')
    print(f'{MODEL} loaded on {torch.cuda.get_device_name(0)} ({vram:.0f} GB)')
    return run

def fit(path, w=1024, h=1280):
    # Portrait 4:5 crop biased to the top so faces survive, then the model sees a clean, upright image.
    img = ImageOps.exif_transpose(Image.open(path)).convert('RGB')
    return ImageOps.fit(img, (w, h), Image.LANCZOS, centering=(0.5, 0.3))

run = load()
rng = random.Random(SEED)
for i, path in enumerate(sources):
    base = os.path.splitext(os.path.basename(path))[0]
    img = fit(path)
    for key in rng.sample(list(EDITS), EDITS_PER_PHOTO):
        out = f'{OUT}/{base}-{key}.jpg'
        if os.path.exists(out):
            continue  # safe to re-run after a disconnect
        g = torch.Generator('cpu').manual_seed(SEED + i)
        res = run(img, f'{EDITS[key]} {KEEP}', g).resize((1280, 1600), Image.LANCZOS)
        res.save(out, quality=88, optimize=True, progressive=True)
        print('saved', out)

# Side-by-side sheet: original next to its edits, for a quick review before downloading.
thumbs = []
for path in sources:
    base = os.path.splitext(os.path.basename(path))[0]
    row = [fit(path, 256, 320)] + [Image.open(p).resize((256, 320)) for p in sorted(glob.glob(f'{OUT}/{base}-*.jpg'))]
    thumbs.append(row)
cols = 1 + EDITS_PER_PHOTO
sheet = Image.new('RGB', (256 * cols, 320 * len(thumbs)), 'white')
for r, row in enumerate(thumbs):
    for c, t in enumerate(row[:cols]):
        sheet.paste(t, (256 * c, 320 * r))
sheet.save('/content/p57/review-sheet.jpg', quality=80)

shutil.make_archive('/content/p57-edited', 'zip', '/content/p57', 'pro-edit')
files.download('/content/p57-edited.zip')
files.download('/content/p57/review-sheet.jpg')
