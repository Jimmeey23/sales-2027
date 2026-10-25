# Physique 57 India — campaign image generator for Google Colab.
#
# Runtime → Change runtime type → GPU (L4 or A100 recommended; T4 works with SDXL fallback).
# Paste this whole file into one Colab cell and run. It generates on-brand studio photography for each
# collateral pool (newcomer / lapsed / renewal × barre / cycle / strength / duo / calm), saves them as
# p57/pro-gen/<pool>-<n>.jpg at 1600px, zips everything and downloads the zip in one go.
#
# Model: FLUX.1-schnell (Apache-2.0). Accept its licence on Hugging Face first and add an HF token
# in Colab secrets as HF_TOKEN. If FLUX does not fit the GPU, it falls back to SDXL base.
#
# After download: unzip into public/p57/ and add the new ids to PHOTOS in src/components/MarketingCollaterals.tsx
# (tags = pool names, pos = focal point; generated images are composed with faces in the upper third, so '50% 25%').

import subprocess, sys
subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'diffusers>=0.30', 'transformers', 'accelerate', 'sentencepiece', 'protobuf'], check=True)

import os, shutil, torch
from google.colab import files, userdata

try:
    os.environ['HF_TOKEN'] = userdata.get('HF_TOKEN')
except Exception:
    pass

PER_PROMPT = 2          # images per prompt
WIDTH, HEIGHT = 1024, 1280   # 4:5 portrait crops cleanly to square, 2:1 hero and A5
OUT = '/content/p57/pro-gen'
os.makedirs(OUT, exist_ok=True)

STYLE = (
    'editorial fitness photography for Physique 57 India, luxury boutique barre studio in Mumbai, '
    'Indian women and men in their 20s to 40s, natural skin texture, real proportions, black and soft cyan '
    'athleisure, pale wood ballet barre, light blue foam balls, mirrored wall, soft daylight, shallow depth of field, '
    'shot on Canon R5 85mm, faces fully in frame in the upper third, generous negative space at the bottom for text, '
    'no text, no logos, no watermark'
)
NEGATIVE = 'text, watermark, logo, extra limbs, distorted hands, cropped head, cut-off face, children, cartoon, oversaturated'

POOLS = {
    'newcomer-barre': [
        'smiling first-timer at the barre in a tuck position, instructor gently correcting her posture',
        'small group class of four women doing plie at the barre, laughing together, morning light',
        'woman holding light dumbbells in a lunge, calm focused smile, bright white studio',
    ],
    'newcomer-calm': [
        'woman seated on a mat stretching sideways, relaxed and happy, soft window light',
        'pregnant woman doing a gentle supported stretch at the barre, serene expression',
    ],
    'lapsed-cycle': [
        'man on an indoor power cycle grinning mid-sprint, moody blue and cyan studio light',
        'two friends on stationary bikes side by side, high-five, energetic neon cyan lighting',
    ],
    'lapsed-duo': [
        'two women friends walking into a boutique studio with mats, warm welcome, candid laughter',
        'duo doing synchronized lunges with kettlebells, black and white high-contrast editorial',
    ],
    'renewal-strength': [
        'confident woman holding a kettlebell at chest height, strong shoulders, dark studio with cyan rim light',
        'man doing bicep curls with dumbbells, determined look, black background, dramatic side light',
        'woman in a deep squat holding a dumbbell, poised and strong, minimalist white studio with barre',
    ],
    'renewal-barre': [
        'woman in an elegant arabesque at the barre, long lines, graceful, golden hour light',
        'member side plank on a mat smiling at camera, cyan floor graphic, bright studio',
    ],
    'studio': [
        'empty luxury barre studio interior, mirrored walls, pale wood barres, light blue balls arranged neatly, daylight',
    ],
}

def load():
    try:
        from diffusers import FluxPipeline
        pipe = FluxPipeline.from_pretrained('black-forest-labs/FLUX.1-schnell', torch_dtype=torch.bfloat16)
        pipe.enable_model_cpu_offload()
        return pipe, dict(num_inference_steps=4, guidance_scale=0.0, max_sequence_length=256), False
    except Exception as e:
        print('FLUX unavailable, using SDXL:', e)
        from diffusers import StableDiffusionXLPipeline
        pipe = StableDiffusionXLPipeline.from_pretrained(
            'stabilityai/stable-diffusion-xl-base-1.0', torch_dtype=torch.float16, variant='fp16').to('cuda')
        return pipe, dict(num_inference_steps=30, guidance_scale=6.5), True

pipe, kw, takes_negative = load()
n = 0
for pool, prompts in POOLS.items():
    for i, prompt in enumerate(prompts):
        for k in range(PER_PROMPT):
            g = torch.Generator('cpu').manual_seed(5700 + n)
            extra = {'negative_prompt': NEGATIVE} if takes_negative else {}
            img = pipe(prompt=f'{prompt}, {STYLE}', width=WIDTH, height=HEIGHT, generator=g, **kw, **extra).images[0]
            img = img.resize((1280, 1600))
            name = f'{OUT}/{pool}-{i + 1}{chr(97 + k)}.jpg'
            img.save(name, quality=86, optimize=True, progressive=True)
            n += 1
            print('saved', name)

shutil.make_archive('/content/p57-generated', 'zip', '/content/p57')
files.download('/content/p57-generated.zip')
