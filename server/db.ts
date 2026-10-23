import 'dotenv/config';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const databasePath = process.env.DATABASE_PATH || path.resolve('p57-data/studio.db');
fs.mkdirSync(path.dirname(databasePath), { recursive: true });
export const db = new Database(databasePath);
// WAL needs shared memory that Vercel's /tmp doesn't reliably provide; each instance owns its copy anyway.
db.pragma(process.env.VERCEL ? 'journal_mode = DELETE' : 'journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

export function initSchema() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    password_hash TEXT NOT NULL, role TEXT NOT NULL, assigned_studio_id INTEGER,
    active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS auth_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT UNIQUE NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS studios (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, code TEXT UNIQUE NOT NULL, city TEXT NOT NULL,
    aliases TEXT NOT NULL DEFAULT '[]', active INTEGER NOT NULL DEFAULT 1, max_discount_percent REAL NOT NULL DEFAULT 20,
    monthly_capacity INTEGER, currency TEXT NOT NULL DEFAULT 'INR', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT, studio_id INTEGER REFERENCES studios(id) ON DELETE CASCADE,
    external_id TEXT, name TEXT NOT NULL, category TEXT NOT NULL, list_price REAL,
    variable_cost REAL, sessions_included REAL NOT NULL DEFAULT 1, validity_days INTEGER,
    active INTEGER NOT NULL DEFAULT 1, source TEXT NOT NULL DEFAULT 'import', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(studio_id, name)
  );
  CREATE TABLE IF NOT EXISTS studio_offer_policies (
    studio_id INTEGER PRIMARY KEY REFERENCES studios(id) ON DELETE CASCADE,
    formats TEXT NOT NULL DEFAULT '["barre"]', pricing_zone TEXT NOT NULL DEFAULT 'unconfigured',
    trial_journey TEXT NOT NULL DEFAULT '{}', intro_product_id INTEGER, newcomer_product_id INTEGER,
    single_class_product_id INTEGER, private_product_id INTEGER, virtual_private_product_id INTEGER, retail_product_id INTEGER,
    newcomer_max_discount_percent REAL NOT NULL DEFAULT 50, first_membership_discount REAL NOT NULL DEFAULT 15,
    lapsed_return_discount REAL NOT NULL DEFAULT 15, class_pack_discount REAL NOT NULL DEFAULT 10,
    annual_discount REAL NOT NULL DEFAULT 20, six_month_discount REAL NOT NULL DEFAULT 15,
    annual_perks TEXT NOT NULL DEFAULT '{}', newcomer_lifetime_limit INTEGER,
    default_stacking_rule TEXT NOT NULL DEFAULT 'not_stackable', notes TEXT,
    updated_by INTEGER REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, file_path TEXT, category TEXT,
    worksheet TEXT, mapping TEXT, status TEXT NOT NULL, total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0, invalid_rows INTEGER NOT NULL DEFAULT 0, duplicate_rows INTEGER NOT NULL DEFAULT 0,
    imported_rows INTEGER NOT NULL DEFAULT 0, summary TEXT NOT NULL DEFAULT '{}', error TEXT,
    created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS import_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT, import_id INTEGER NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL, field TEXT, message TEXT NOT NULL, raw_row TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS mapping_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL,
    signature TEXT NOT NULL, mapping TEXT NOT NULL, created_by INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(name, category)
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_uid TEXT UNIQUE NOT NULL, member_ref TEXT NOT NULL,
    studio_id INTEGER NOT NULL REFERENCES studios(id), purchased_at TEXT NOT NULL, month TEXT NOT NULL,
    amount REAL NOT NULL, net_amount REAL, discount_amount REAL NOT NULL DEFAULT 0, discount_code TEXT,
    product_name TEXT, category TEXT, revenue_stream TEXT NOT NULL DEFAULT 'additional', is_first_observed INTEGER NOT NULL DEFAULT 0,
    membership_start TEXT, membership_end TEXT, sold_by TEXT, import_id INTEGER REFERENCES imports(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_uid TEXT UNIQUE NOT NULL, member_ref TEXT,
    studio_id INTEGER NOT NULL REFERENCES studios(id), created_at TEXT NOT NULL, month TEXT NOT NULL,
    converted_at TEXT, source_name TEXT, campaign TEXT, stage TEXT, trial_status TEXT,
    conversion_status TEXT, retention_status TEXT, purchases REAL NOT NULL DEFAULT 0, ltv REAL NOT NULL DEFAULT 0,
    visits REAL NOT NULL DEFAULT 0, import_id INTEGER REFERENCES imports(id)
  );
  CREATE TABLE IF NOT EXISTS member_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_uid TEXT UNIQUE NOT NULL, member_ref TEXT NOT NULL,
    studio_id INTEGER NOT NULL REFERENCES studios(id), first_visit_at TEXT NOT NULL, month TEXT NOT NULL,
    first_purchase_at TEXT, first_purchase_value REAL, ltv REAL, visits REAL,
    conversion_status TEXT, retention_status TEXT, source_name TEXT, import_id INTEGER REFERENCES imports(id)
  );
  CREATE TABLE IF NOT EXISTS class_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_uid TEXT UNIQUE NOT NULL, studio_id INTEGER NOT NULL REFERENCES studios(id),
    session_date TEXT NOT NULL, month TEXT NOT NULL, capacity REAL NOT NULL DEFAULT 0, checked_in REAL NOT NULL DEFAULT 0,
    booked REAL NOT NULL DEFAULT 0, session_name TEXT, session_type TEXT, import_id INTEGER REFERENCES imports(id)
  );
  CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_uid BLOB UNIQUE NOT NULL, member_ref BLOB NOT NULL,
    studio_id INTEGER NOT NULL REFERENCES studios(id), session_at INTEGER NOT NULL, month TEXT NOT NULL,
    checked_in INTEGER NOT NULL DEFAULT 0, late_cancelled INTEGER NOT NULL DEFAULT 0,
    complimentary INTEGER NOT NULL DEFAULT 0, class_name TEXT, visit_type TEXT,
    order_at INTEGER, import_id INTEGER REFERENCES imports(id)
  );
  CREATE TABLE IF NOT EXISTS trainer_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_uid TEXT UNIQUE NOT NULL, trainer_ref TEXT NOT NULL, trainer_name TEXT,
    studio_id INTEGER NOT NULL REFERENCES studios(id), month TEXT NOT NULL, total_sessions REAL, non_empty_sessions REAL,
    customers REAL, paid_revenue REAL, conversion_rate REAL, retention_rate REAL, new_clients REAL, import_id INTEGER REFERENCES imports(id)
  );
  CREATE TABLE IF NOT EXISTS customer_packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, source_uid TEXT UNIQUE NOT NULL, member_ref TEXT NOT NULL,
    studio_id INTEGER NOT NULL REFERENCES studios(id), status TEXT, product_name TEXT, purchase_date TEXT,
    start_date TEXT, end_date TEXT, churned_date TEXT, amount REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0, original_amount REAL, sessions_limit REAL, sessions_used REAL,
    days_since_last_visit REAL, average_sessions_month REAL, import_id INTEGER REFERENCES imports(id)
  );
  CREATE TABLE IF NOT EXISTS monthly_targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT, studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    year INTEGER NOT NULL, month INTEGER NOT NULL, scenario TEXT NOT NULL DEFAULT 'base',
    historical_revenue REAL, baseline_forecast REAL NOT NULL DEFAULT 0, proposed_target REAL NOT NULL DEFAULT 0,
    approved_target REAL, target_growth REAL, new_client_target REAL NOT NULL DEFAULT 0,
    renewal_target REAL NOT NULL DEFAULT 0, repeat_target REAL NOT NULL DEFAULT 0,
    reactivation_target REAL NOT NULL DEFAULT 0, other_target REAL NOT NULL DEFAULT 0,
    target_transactions REAL, expected_aov REAL, funnel TEXT NOT NULL DEFAULT '{}', assumptions TEXT NOT NULL DEFAULT '{}',
    source TEXT NOT NULL DEFAULT 'recommendation', data_mode TEXT NOT NULL DEFAULT 'derived', version INTEGER NOT NULL DEFAULT 1,
    override_reason TEXT, updated_by INTEGER REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(studio_id, year, month)
  );
  CREATE TABLE IF NOT EXISTS target_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, target_id INTEGER NOT NULL REFERENCES monthly_targets(id) ON DELETE CASCADE,
    version INTEGER NOT NULL, snapshot TEXT NOT NULL, change_reason TEXT, changed_by INTEGER REFERENCES users(id),
    changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, offer_uid TEXT UNIQUE NOT NULL, name TEXT NOT NULL, headline TEXT,
    customer_copy TEXT, internal_description TEXT, rationale TEXT, objective TEXT NOT NULL,
    offer_type TEXT NOT NULL, studio_id INTEGER REFERENCES studios(id), month INTEGER, year INTEGER,
    audience TEXT, excluded_audience TEXT, eligible_products TEXT NOT NULL DEFAULT '[]', benefit TEXT,
    mechanics TEXT NOT NULL DEFAULT '{}', validity_start TEXT, validity_end TEXT, redemption_conditions TEXT,
    target_purchases REAL, expected_asp REAL, expected_revenue REAL, effective_discount REAL,
    margin_impact REAL, required_leads REAL, required_trials REAL, expected_conversion REAL,
    expected_redemptions REAL, revenue_target REAL, actual_sales REAL, actual_revenue REAL,
    actual_redemptions REAL, actual_discount_cost REAL, source_campaign TEXT, original_offer_id INTEGER REFERENCES offers(id),
    version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'draft', approval_status TEXT NOT NULL DEFAULT 'pending',
    generation_source TEXT NOT NULL DEFAULT 'manual', data_mode TEXT NOT NULL DEFAULT 'user', performance_notes TEXT,
    financials TEXT NOT NULL DEFAULT '{}', risks TEXT NOT NULL DEFAULT '[]', success_metrics TEXT NOT NULL DEFAULT '[]', provenance TEXT NOT NULL DEFAULT '{}',
    cta TEXT, created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS offer_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, offer_id INTEGER NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    version INTEGER NOT NULL, snapshot TEXT NOT NULL, changed_by INTEGER REFERENCES users(id), changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS generation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT, fingerprint TEXT NOT NULL, offer_payload TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS offer_experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, studio_id INTEGER NOT NULL REFERENCES studios(id),
    name TEXT NOT NULL, hypothesis TEXT NOT NULL, control_offer_id INTEGER NOT NULL REFERENCES offers(id),
    variant_offer_id INTEGER NOT NULL REFERENCES offers(id), start_date TEXT NOT NULL, end_date TEXT,
    cadence TEXT NOT NULL DEFAULT 'monthly', status TEXT NOT NULL DEFAULT 'draft', minimum_sample INTEGER NOT NULL DEFAULT 30,
    results TEXT NOT NULL DEFAULT '{}', created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, studio_id INTEGER NOT NULL REFERENCES studios(id),
    offer_id INTEGER REFERENCES offers(id), year INTEGER NOT NULL, start_date TEXT NOT NULL, end_date TEXT NOT NULL,
    audience TEXT, objective TEXT, target_revenue REAL NOT NULL DEFAULT 0, expected_purchases REAL,
    status TEXT NOT NULL DEFAULT 'draft', approval_status TEXT NOT NULL DEFAULT 'pending', owner_id INTEGER REFERENCES users(id),
    tasks TEXT NOT NULL DEFAULT '[]', data_mode TEXT NOT NULL DEFAULT 'user', notes TEXT,
    created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(end_date >= start_date)
  );
  CREATE TABLE IF NOT EXISTS campaign_performance (
    id INTEGER PRIMARY KEY AUTOINCREMENT, campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    eligible_audience REAL, customers_reached REAL, responses REAL, redemptions REAL, buyers REAL,
    transactions REAL, revenue REAL, aov REAL, effective_discount REAL, discount_cost REAL,
    subsequent_revenue REAL, notes TEXT, recorded_by INTEGER REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id)
  );
  CREATE TABLE IF NOT EXISTS segment_rules (
    id INTEGER PRIMARY KEY CHECK(id = 1), expiry_days INTEGER NOT NULL DEFAULT 30,
    recently_lapsed_days INTEGER NOT NULL DEFAULT 90, long_lapsed_days INTEGER NOT NULL DEFAULT 180,
    high_value_percentile INTEGER NOT NULL DEFAULT 90, frequent_purchase_count INTEGER NOT NULL DEFAULT 4,
    promo_sensitivity_threshold REAL NOT NULL DEFAULT 0.5, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS segment_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT, studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    segment_key TEXT NOT NULL, segment_name TEXT NOT NULL, audience_size INTEGER NOT NULL DEFAULT 0,
    average_spend REAL, response_rate REAL, expected_revenue REAL, priority TEXT, recommendation TEXT,
    evidence TEXT, limitations TEXT, calculated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(studio_id, segment_key)
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), action TEXT NOT NULL,
    entity_type TEXT NOT NULL, entity_id TEXT, studio_id INTEGER, before TEXT, after TEXT,
    reason TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS copilot_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id),
    studio_id INTEGER REFERENCES studios(id), title TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'deterministic',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS copilot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL REFERENCES copilot_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, content TEXT NOT NULL, attachments TEXT NOT NULL DEFAULT '{}', mode TEXT NOT NULL DEFAULT 'deterministic',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS saved_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, report_id TEXT NOT NULL, studio_id INTEGER REFERENCES studios(id), config TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS monthly_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT, studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    year INTEGER NOT NULL, month INTEGER NOT NULL, theme TEXT, objective TEXT, strategy TEXT,
    actions TEXT NOT NULL DEFAULT '[]', notes TEXT, status TEXT NOT NULL DEFAULT 'draft',
    updated_by INTEGER REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(studio_id, year, month)
  );
  CREATE TABLE IF NOT EXISTS studio_playbook_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, studio_id INTEGER NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    year INTEGER NOT NULL, section TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0, source TEXT,
    updated_by INTEGER REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_playbook_items ON studio_playbook_items(studio_id, year, section, sort);
  CREATE INDEX IF NOT EXISTS idx_saved_reports_user ON saved_reports(user_id,updated_at);
  CREATE INDEX IF NOT EXISTS idx_experiments_studio ON offer_experiments(studio_id,status);
  CREATE INDEX IF NOT EXISTS idx_copilot_user ON copilot_conversations(user_id,updated_at);
  CREATE INDEX IF NOT EXISTS idx_transactions_studio_month ON transactions(studio_id, month);
  CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_ref, purchased_at);
  CREATE INDEX IF NOT EXISTS idx_transactions_offer ON transactions(discount_code, month);
  CREATE INDEX IF NOT EXISTS idx_leads_studio_month ON leads(studio_id, month);
  CREATE INDEX IF NOT EXISTS idx_visits_studio_month ON member_visits(studio_id, month);
  CREATE INDEX IF NOT EXISTS idx_checkins_studio_month ON checkins(studio_id, month);
  CREATE INDEX IF NOT EXISTS idx_checkins_member_month ON checkins(member_ref, month);
  CREATE INDEX IF NOT EXISTS idx_packages_member ON customer_packages(member_ref, end_date);
  CREATE INDEX IF NOT EXISTS idx_packages_studio_status ON customer_packages(studio_id, status, end_date);
  CREATE INDEX IF NOT EXISTS idx_targets_year ON monthly_targets(year, month);
  CREATE INDEX IF NOT EXISTS idx_offers_filter ON offers(studio_id, year, month, status, objective);
  CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(studio_id, start_date, end_date);
  CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id, created_at);
  INSERT OR IGNORE INTO segment_rules(id) VALUES (1);
  INSERT OR IGNORE INTO settings(key, value) VALUES ('planning_year', '2027');
  `);
  const offerColumns = db.pragma('table_info(offers)') as any[];
  const planColumns = db.pragma('table_info(monthly_plans)') as any[];
  // NULL offer_ids = not curated yet: the plan shows that month's imported plan offers.
  if (!planColumns.some(column => column.name === 'offer_ids')) db.exec('ALTER TABLE monthly_plans ADD COLUMN offer_ids TEXT');
  // slots = {"newcomer": offerId, "lapsed": offerId, "renewal": offerId}; NULL = use the month's primary slot offers.
  if (!planColumns.some(column => column.name === 'slots')) db.exec('ALTER TABLE monthly_plans ADD COLUMN slots TEXT');
  const offerCols = db.pragma('table_info(offers)') as any[];
  // plan_slot marks an offer as a month's newcomer / lapsed / renewal option; plan_rank 1 = primary, 2+ = alternates.
  if (!offerCols.some(column => column.name === 'plan_slot')) db.exec('ALTER TABLE offers ADD COLUMN plan_slot TEXT');
  if (!offerCols.some(column => column.name === 'plan_rank')) db.exec('ALTER TABLE offers ADD COLUMN plan_rank INTEGER');
  if (!offerColumns.some(column => column.name === 'provenance')) db.exec("ALTER TABLE offers ADD COLUMN provenance TEXT NOT NULL DEFAULT '{}'");
}
initSchema();

export function audit(entry: { userId?: number | null; action: string; entityType: string; entityId?: unknown; studioId?: number | null; before?: unknown; after?: unknown; reason?: string | null }) {
  db.prepare(`INSERT INTO audit_logs(user_id, action, entity_type, entity_id, studio_id, before, after, reason) VALUES (?,?,?,?,?,?,?,?)`)
    .run(entry.userId || null, entry.action, entry.entityType, entry.entityId === undefined ? null : String(entry.entityId), entry.studioId || null,
      entry.before === undefined ? null : JSON.stringify(entry.before), entry.after === undefined ? null : JSON.stringify(entry.after), entry.reason || null);
}
