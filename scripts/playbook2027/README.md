# 2027 playbook generator

Rebuilds `src/data/playbook2027.ts` (the Overview → "2027 sales playbook" tab) from the raw exports.

1. Put the exports in one folder with these names: `sales.csv` (Sales – Raw – Sales), `memb.csv` (Memberships),
   `new.csv` (Day End Part 1 – New), `sessions.csv` (Part 3 – Sessions), `leads.csv` (PM – Leads),
   `lapsed.csv` (Lapsed New – Lapsed), `checkins.csv` (Part 4 – Checkins).
2. From that folder: `python3 model.py && python3 levers.py && python3 gen.py`
   (needs pandas + numpy; copy the four .py files next to the CSVs or run them with that folder as cwd).
3. `gen.py` writes `playbook2027.json`; wrap it as `src/data/playbook2027.ts` (see the header of that file).

`levers.py` holds the plan targets used at build time (`APP`); the UI always compares against the live target.
Long-plan expiry counts (`EXP`) and the decay sentences in `gen.py` were computed from the same Sales export on 26 Oct 2026.
