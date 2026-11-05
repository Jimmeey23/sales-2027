/* The database is the only source of plan data: targets, offers, month plans, campaigns
   and playbook items. Nothing is rebuilt from the bundled files on boot or on first view,
   so a wipe stays a wipe and every edit stays the edit.

   The old bundled-plan seeding can still be run deliberately, e.g. to rebuild a scratch
   database, with P57_SEED_PLAN=true. */
export const planSeedEnabled = () => process.env.P57_SEED_PLAN === 'true';
