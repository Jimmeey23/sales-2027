# NotebookLM video packs — 2027 explainers

One pack per studio and month (48), built from the plan in the app by `node scripts/build-notebooklm-packs.mjs`. Rerun that after any plan change. Kemps Corner already has videos; its packs are here in case any need redoing.

## For each folder

1. Open https://notebooklm.google.com and create a **new notebook** (one notebook per month — never reuse one, or months bleed into each other).
2. **Add source** → upload the `SOURCE - ….md` file from the folder.
3. In the Studio panel, open **Video Overview** → the pencil / **Customize** option.
4. Paste everything in `PASTE INTO NOTEBOOKLM.txt` into the instructions box, then **Generate**.
5. Watch the title card: it must say the right studio and **2027**. If it says 2026 or the wrong studio, delete it and generate again.
6. Download the video and drop it into `docs/notebooklm/_finished/` (ideally named as in `SAVE VIDEO AS.txt`).

Then tell Claude, and it will check each video and put it in the app.

## The instructions used for every video

```
Make this an upbeat, energetic team briefing for the <Studio> studio of Physique 57 India, covering its <Month> 2027 sales plan.

- Title it exactly: "<Studio>: <Month> 2027 Sales Plan". The year is 2027. Never say or show 2026 as the plan year.
- Name the studio (<Studio>) on the title card and in the closing.
- Follow this order: the theme, the revenue target, where the money comes from, the leads-to-trials-to-buyers funnel, what the offers carry, each offer in turn, the four-week plan, and a closing call to action.
- Use the exact numbers in the source. Do not round, invent or add any figures.
- Show money in Indian rupees using lakh (for example ₹35L).
- Keep the playful tone and the offer names exactly as written.
- Audience: studio managers and the sales team. Aim for 5 to 7 minutes.
```
