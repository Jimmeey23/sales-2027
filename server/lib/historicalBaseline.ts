import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, audit } from '../db.js';
import { hashPassword } from './auth.js';
import { STUDIO_DEFINITIONS } from './studios.js';
import { ensureCommercialSeed } from './commercialSeed.js';
import { generateYearTargets } from './intelligence.js';
import { recalculateSegments } from './segments.js';
import { applyPlanOffers, applyPlanTargets, POPUP_SPLIT } from './plan2027.js';
import { applySlotOffers } from './offerCatalog.js';
import { applySalesOfferPlan } from './salesOfferPlan2027.js';
import { applyMembershipLibrary } from './membershipLibrary2027.js';
import { captureStandardBase } from './targetScenarios.js';
import {
  applyApprovedAlternatives2027,
  applyApprovedPlan2027,
  unapproveImportedPlan2027,
  curateFinalPlan2027,
} from './approvedPlan2027.js';
import { clearMonthPicks2027, resetMonthPlans2027, ensureOfferBank2027, offerBankReady } from './offerBank2027.js';

const readJson = (file: string) => JSON.parse(fs.readFileSync(path.resolve('server/data', file), 'utf8'));

const STUDIO_CAPACITIES: Record<string, number> = {
  'Kemps Corner': 2800,
  Bandra: 2200,
  'Kenkere House': 1800,
  'Pop-up': 600,
  'Copper + Cloves': 390,
  'Plash Pilates': 210,
};

const CANONICAL_PRODUCT_SLOTS: Array<{
  id: number;
  studioName: string;
  name: string;
  category: string;
  listPrice: number;
  sessions: number;
  validityDays: number;
}> = [
  {
    id: 32,
    studioName: 'Kenkere House',
    name: 'Studio Single Class',
    category: 'Single Classes',
    listPrice: 1350,
    sessions: 1,
    validityDays: 14,
  },
  {
    id: 98,
    studioName: 'Kenkere House',
    name: 'New Client Intro Pack',
    category: 'Introductory Packages',
    listPrice: 2999,
    sessions: 3,
    validityDays: 14,
  },
  {
    id: 162,
    studioName: 'Kemps Corner',
    name: 'Studio 10 Single Class Pack',
    category: 'Class Packages',
    listPrice: 18500,
    sessions: 10,
    validityDays: 90,
  },
  {
    id: 235,
    studioName: 'Kenkere House',
    name: 'Studio Newcomer 2 for 1',
    category: 'Introductory Packages',
    listPrice: 1350,
    sessions: 2,
    validityDays: 14,
  },
  {
    id: 243,
    studioName: 'Kenkere House',
    name: 'Copper + Cloves Single Class Package',
    category: 'Single Classes',
    listPrice: 900,
    sessions: 1,
    validityDays: 14,
  },
];

function categoryForCatalogueItem(name: string, duration: number, classes: number) {
  const lower = name.toLowerCase();
  if (lower.includes('newcomer') || lower.includes('intro') || lower.includes('2 for 1'))
    return 'Introductory Packages';
  if (lower.includes('private')) return 'Private Sessions';
  if (classes >= 999 || lower.includes('unlimited') || lower.includes('membership') || lower.includes('annual'))
    return 'Memberships';
  if (classes === 1 || lower.includes('single class')) return 'Single Classes';
  if (duration > 0 || classes > 1) return 'Class Packages';
  return 'Packages';
}

function blobHash(prefix: string, id: string | number, bytes = 12): Buffer {
  return crypto.createHash('sha256').update(`p57-baseline:${prefix}:${id}`).digest().subarray(0, bytes);
}

function memberRef(studioCode: string, idx: number): string {
  return crypto.createHash('sha256').update(`p57-member:${studioCode}:${idx}`).digest('hex').slice(0, 20);
}

const pad2 = (n: number) => String(n).padStart(2, '0');

export function ensureStudiosAndUsers() {
  const existingStudios = Number((db.prepare('SELECT COUNT(*) n FROM studios').get() as any)?.n || 0);
  if (existingStudios === 0) {
    const insertStudio = db.prepare(
      'INSERT INTO studios(name,code,city,aliases,max_discount_percent,monthly_capacity) VALUES (?,?,?,?,?,?)',
    );
    for (const s of STUDIO_DEFINITIONS) {
      insertStudio.run(s.name, s.code, s.city, JSON.stringify(s.aliases), 20, STUDIO_CAPACITIES[s.name] ?? null);
    }
  } else {
    db.prepare("UPDATE studios SET city='Bengaluru' WHERE name IN ('Pop-up','Copper + Cloves','Plash Pilates')").run();
    for (const [name, cap] of Object.entries(STUDIO_CAPACITIES)) {
      db.prepare('UPDATE studios SET monthly_capacity=COALESCE(monthly_capacity, ?) WHERE name=?').run(cap, name);
    }
  }

  const existingUsers = Number((db.prepare('SELECT COUNT(*) n FROM users').get() as any)?.n || 0);
  if (existingUsers === 0 && process.env.NODE_ENV !== 'production') {
    const studiosByName = new Map(
      (db.prepare('SELECT id, name FROM studios').all() as Array<{ id: number; name: string }>).map(s => [
        s.name,
        s.id,
      ]),
    );
    const insertUser = db.prepare(
      'INSERT INTO users(email,name,password_hash,role,assigned_studio_id) VALUES (?,?,?,?,?)',
    );
    const pw = hashPassword('P57demo!');
    insertUser.run('admin@p57.demo', 'Jimmeey Gondaa', pw, 'administrator', null);
    insertUser.run('management@p57.demo', 'Rohan Kapoor', pw, 'senior_management', null);
    insertUser.run('sales@p57.demo', 'Meera Shah', pw, 'sales_manager', null);
    insertUser.run(
      'studio@p57.demo',
      'Kemps Studio Manager',
      pw,
      'studio_manager',
      studiosByName.get('Kemps Corner') ?? null,
    );
    insertUser.run(
      'associate@p57.demo',
      'Sales Associate',
      pw,
      'sales_associate',
      studiosByName.get('Kemps Corner') ?? null,
    );
    insertUser.run('analyst@p57.demo', 'Read-only Analyst', pw, 'read_only_analyst', null);
  }
}

export function ensureProductCatalogue() {
  const existingProducts = Number((db.prepare('SELECT COUNT(*) n FROM products').get() as any)?.n || 0);
  if (existingProducts > 0) return;

  const catalogue = readJson('membership-prices.json') as Array<{
    city: string;
    name: string;
    priceExGst: number;
    priceInclGst: number;
    duration: number;
    classes: number;
  }>;
  const studios = db.prepare('SELECT id, name, city FROM studios WHERE active=1').all() as Array<{
    id: number;
    name: string;
    city: string;
  }>;
  const byName = new Map(studios.map(s => [s.name, s]));

  const insertWithId = db.prepare(
    `INSERT OR IGNORE INTO products(id, studio_id, name, category, list_price, variable_cost, sessions_included, validity_days, active, source)
     VALUES (?,?,?,?,?,NULL,?,?,1,'membership_catalogue')`,
  );
  const insertAuto = db.prepare(
    `INSERT OR IGNORE INTO products(studio_id, name, category, list_price, variable_cost, sessions_included, validity_days, active, source)
     VALUES (?,?,?,?,NULL,?,?,1,'membership_catalogue')`,
  );

  db.transaction(() => {
    for (const slot of CANONICAL_PRODUCT_SLOTS) {
      const st = byName.get(slot.studioName);
      if (!st) continue;
      insertWithId.run(slot.id, st.id, slot.name, slot.category, slot.listPrice, slot.sessions, slot.validityDays);
    }

    const mumbaiStudios = ['Kemps Corner', 'Bandra'].map(n => byName.get(n)).filter(Boolean) as typeof studios;
    const blrFlagship = byName.get('Kenkere House');
    const popupStudios = ['Pop-up', 'Copper + Cloves', 'Plash Pilates']
      .map(n => byName.get(n))
      .filter(Boolean) as typeof studios;

    let nextId = 1;
    const reserved = new Set(CANONICAL_PRODUCT_SLOTS.map(c => c.id));
    const nextFreeId = () => {
      while (reserved.has(nextId) || db.prepare('SELECT 1 FROM products WHERE id=?').get(nextId)) nextId++;
      return nextId++;
    };

    for (const item of catalogue) {
      const cat = categoryForCatalogueItem(item.name, item.duration, item.classes);
      const sessions = item.classes >= 999 ? 30 : Math.max(1, item.classes || 1);
      const validity = Math.max(7, item.duration || 30);
      const targets =
        item.city === 'Mumbai'
          ? mumbaiStudios
          : item.name.startsWith('Copper + Cloves') || item.name.startsWith('Plash Pilates')
            ? [blrFlagship, ...popupStudios].filter(Boolean)
            : [blrFlagship, byName.get('Pop-up')].filter(Boolean);
      for (const st of targets) {
        if (!st) continue;
        const already = db.prepare('SELECT id FROM products WHERE studio_id=? AND name=?').get(st.id, item.name);
        if (already) continue;
        const id = nextFreeId();
        insertWithId.run(id, st.id, item.name, cat, item.priceExGst, sessions, validity);
      }
    }

    // Ensure Virtual Private Class exists for Mumbai & Kenkere policy bindings
    for (const st of [...mumbaiStudios, blrFlagship].filter(Boolean)) {
      if (!st) continue;
      if (!db.prepare('SELECT 1 FROM products WHERE studio_id=? AND name=?').get(st.id, 'Virtual Private Class')) {
        insertAuto.run(st.id, 'Virtual Private Class', 'Private Sessions', st.city === 'Mumbai' ? 3500 : 2800, 1, 14);
      }
    }
  })();
}

type StudioSpec = {
  name: string;
  code: string;
  actualKey: string;
  share: number;
  yoyRatio2026vs2025: number;
  novDec2025Net: [number, number];
  streamShares: { new_client: number; renewal: number; reactivation: number; additional: number };
  discountShare: number;
  effectiveDiscountRate: number;
  leadToTrial: number;
  trialToMember: number;
  checkinRate: number;
  lateCancelRate: number;
  monthlyCheckinsBase: number;
  expiringPerMonth: number;
  lapsedPoolSize: number;
  products: Array<{
    name: string;
    category: string;
    price: number;
    stream: string;
    days: number;
    sessions: number;
    weight: number;
  }>;
  codes: string[];
  trainers: Array<{ ref: string; name: string; share: number; conv: number; ret: number }>;
};

const STUDIO_SPECS: StudioSpec[] = [
  {
    name: 'Kemps Corner',
    code: 'KC',
    actualKey: 'STU_KH',
    share: 1,
    yoyRatio2026vs2025: 1.21,
    novDec2025Net: [2620000, 2980000],
    streamShares: { new_client: 0.145, renewal: 0.635, reactivation: 0.105, additional: 0.115 },
    discountShare: 0.44,
    effectiveDiscountRate: 0.195,
    leadToTrial: 0.766,
    trialToMember: 0.238,
    checkinRate: 0.888,
    lateCancelRate: 0.074,
    monthlyCheckinsBase: 3050,
    expiringPerMonth: 118,
    lapsedPoolSize: 523,
    products: [
      {
        name: 'Studio 1 Month Unlimited Membership',
        category: 'Memberships',
        price: 19275,
        stream: 'renewal',
        days: 30,
        sessions: 30,
        weight: 0.28,
      },
      {
        name: 'Studio 3 Month Unlimited Membership',
        category: 'Memberships',
        price: 55100,
        stream: 'renewal',
        days: 90,
        sessions: 90,
        weight: 0.24,
      },
      {
        name: 'Studio 6 Month Unlimited Membership',
        category: 'Memberships',
        price: 99750,
        stream: 'renewal',
        days: 180,
        sessions: 180,
        weight: 0.11,
      },
      {
        name: 'Studio Annual Unlimited Membership',
        category: 'Memberships',
        price: 192500,
        stream: 'renewal',
        days: 365,
        sessions: 365,
        weight: 0.08,
      },
      {
        name: 'Studio 12 Class',
        category: 'Class Packages',
        price: 22100,
        stream: 'new_client',
        days: 90,
        sessions: 12,
        weight: 0.09,
      },
      {
        name: 'Studio 10 Single Class Pack',
        category: 'Class Packages',
        price: 18500,
        stream: 'reactivation',
        days: 90,
        sessions: 10,
        weight: 0.07,
      },
      {
        name: 'Studio 8 Class',
        category: 'Class Packages',
        price: 16400,
        stream: 'new_client',
        days: 60,
        sessions: 8,
        weight: 0.06,
      },
      {
        name: 'Studio 4 Class',
        category: 'Class Packages',
        price: 10200,
        stream: 'reactivation',
        days: 30,
        sessions: 4,
        weight: 0.03,
      },
      {
        name: 'Studio Private Class X 10',
        category: 'Private Sessions',
        price: 47250,
        stream: 'additional',
        days: 90,
        sessions: 10,
        weight: 0.025,
      },
      {
        name: 'Studio Single Class',
        category: 'Single Classes',
        price: 1800,
        stream: 'new_client',
        days: 14,
        sessions: 1,
        weight: 0.015,
      },
    ],
    codes: ['WELCOME15', 'APRILANNIV', 'VDAY50', 'COMEBACK15', 'MONSOON10'],
    trainers: [
      { ref: 'TR-KC-01', name: 'Ananya R. (Lead Barre)', share: 0.31, conv: 0.28, ret: 0.72 },
      { ref: 'TR-KC-02', name: 'Kabir M. (PowerCycle & Strength)', share: 0.26, conv: 0.25, ret: 0.68 },
      { ref: 'TR-KC-03', name: 'Rhea D. (Senior Barre)', share: 0.24, conv: 0.23, ret: 0.66 },
      { ref: 'TR-KC-04', name: 'Zoya K. (Barre & Mat)', share: 0.19, conv: 0.21, ret: 0.63 },
    ],
  },
  {
    name: 'Bandra',
    code: 'BA',
    actualKey: 'STU_SHQ',
    share: 1,
    yoyRatio2026vs2025: 0.97,
    novDec2025Net: [1580000, 1790000],
    streamShares: { new_client: 0.165, renewal: 0.615, reactivation: 0.125, additional: 0.095 },
    discountShare: 0.62,
    effectiveDiscountRate: 0.188,
    leadToTrial: 0.572,
    trialToMember: 0.175,
    checkinRate: 0.868,
    lateCancelRate: 0.088,
    monthlyCheckinsBase: 2180,
    expiringPerMonth: 62,
    lapsedPoolSize: 419,
    products: [
      {
        name: 'Studio 1 Month Unlimited Membership',
        category: 'Memberships',
        price: 19275,
        stream: 'renewal',
        days: 30,
        sessions: 30,
        weight: 0.33,
      },
      {
        name: 'Studio 3 Month Unlimited Membership',
        category: 'Memberships',
        price: 55100,
        stream: 'renewal',
        days: 90,
        sessions: 90,
        weight: 0.19,
      },
      {
        name: 'Studio 6 Month Unlimited Membership',
        category: 'Memberships',
        price: 99750,
        stream: 'renewal',
        days: 180,
        sessions: 180,
        weight: 0.09,
      },
      {
        name: 'Studio Annual Unlimited Membership',
        category: 'Memberships',
        price: 192500,
        stream: 'renewal',
        days: 365,
        sessions: 365,
        weight: 0.06,
      },
      {
        name: 'Studio 12 Class',
        category: 'Class Packages',
        price: 22100,
        stream: 'new_client',
        days: 90,
        sessions: 12,
        weight: 0.09,
      },
      {
        name: 'Studio 8 Class',
        category: 'Class Packages',
        price: 16400,
        stream: 'new_client',
        days: 60,
        sessions: 8,
        weight: 0.09,
      },
      {
        name: 'Studio 10 Single Class Pack',
        category: 'Class Packages',
        price: 18500,
        stream: 'reactivation',
        days: 90,
        sessions: 10,
        weight: 0.07,
      },
      {
        name: 'Studio 4 Class',
        category: 'Class Packages',
        price: 10200,
        stream: 'reactivation',
        days: 30,
        sessions: 4,
        weight: 0.04,
      },
      {
        name: 'Studio Private Class X 10',
        category: 'Private Sessions',
        price: 47250,
        stream: 'additional',
        days: 90,
        sessions: 10,
        weight: 0.02,
      },
      {
        name: 'Studio Single Class',
        category: 'Single Classes',
        price: 1800,
        stream: 'new_client',
        days: 14,
        sessions: 1,
        weight: 0.02,
      },
    ],
    codes: ['SHQWELCOME15', 'APRILANNIV', 'VDAY50', 'BANDRABACK15', 'FLASH15'],
    trainers: [
      { ref: 'TR-BA-01', name: 'Neha S. (Lead Barre)', share: 0.34, conv: 0.21, ret: 0.65 },
      { ref: 'TR-BA-02', name: 'Aarav T. (Strength & Cycle)', share: 0.28, conv: 0.19, ret: 0.62 },
      { ref: 'TR-BA-03', name: 'Tara V. (Barre & Cardio)', share: 0.21, conv: 0.17, ret: 0.6 },
      { ref: 'TR-BA-04', name: 'Ishaan P. (PowerCycle)', share: 0.17, conv: 0.16, ret: 0.58 },
    ],
  },
  {
    name: 'Kenkere House',
    code: 'KH',
    actualKey: 'STU_KEN',
    share: 1,
    yoyRatio2026vs2025: 1.09,
    novDec2025Net: [845000, 935000],
    streamShares: { new_client: 0.255, renewal: 0.515, reactivation: 0.095, additional: 0.135 },
    discountShare: 0.54,
    effectiveDiscountRate: 0.172,
    leadToTrial: 0.215,
    trialToMember: 0.252,
    checkinRate: 0.805,
    lateCancelRate: 0.155,
    monthlyCheckinsBase: 1180,
    expiringPerMonth: 44,
    lapsedPoolSize: 254,
    products: [
      {
        name: 'Studio 1 Month Unlimited Membership',
        category: 'Memberships',
        price: 13900,
        stream: 'renewal',
        days: 30,
        sessions: 30,
        weight: 0.31,
      },
      {
        name: 'Studio 3 Month Unlimited Membership',
        category: 'Memberships',
        price: 40200,
        stream: 'renewal',
        days: 90,
        sessions: 90,
        weight: 0.18,
      },
      {
        name: 'Studio 6 Month Unlimited Membership',
        category: 'Memberships',
        price: 78300,
        stream: 'renewal',
        days: 180,
        sessions: 180,
        weight: 0.08,
      },
      {
        name: 'Studio Annual Unlimited Membership',
        category: 'Memberships',
        price: 148800,
        stream: 'renewal',
        days: 365,
        sessions: 365,
        weight: 0.05,
      },
      {
        name: 'Studio 12 Class',
        category: 'Class Packages',
        price: 15000,
        stream: 'new_client',
        days: 90,
        sessions: 12,
        weight: 0.1,
      },
      {
        name: 'Studio 8 Class',
        category: 'Class Packages',
        price: 10200,
        stream: 'new_client',
        days: 60,
        sessions: 8,
        weight: 0.11,
      },
      {
        name: 'Studio 2 Week Unlimited',
        category: 'Introductory Packages',
        price: 9700,
        stream: 'new_client',
        days: 14,
        sessions: 14,
        weight: 0.06,
      },
      {
        name: 'Studio 4 Class',
        category: 'Class Packages',
        price: 6000,
        stream: 'reactivation',
        days: 30,
        sessions: 4,
        weight: 0.05,
      },
      {
        name: 'New Client Intro Pack',
        category: 'Introductory Packages',
        price: 2999,
        stream: 'new_client',
        days: 14,
        sessions: 3,
        weight: 0.03,
      },
      {
        name: 'Studio Single Class',
        category: 'Single Classes',
        price: 1350,
        stream: 'additional',
        days: 14,
        sessions: 1,
        weight: 0.03,
      },
    ],
    codes: ['VDAY50', 'BLRINTRO15', 'APRILANNIV', 'KENKERE15', 'STREAK10'],
    trainers: [
      { ref: 'TR-KH-01', name: 'Meghna N. (Lead Barre)', share: 0.38, conv: 0.29, ret: 0.64 },
      { ref: 'TR-KH-02', name: 'Siddharth R. (Barre & Sculpt)', share: 0.34, conv: 0.25, ret: 0.6 },
      { ref: 'TR-KH-03', name: 'Kavya G. (Barre)', share: 0.28, conv: 0.22, ret: 0.57 },
    ],
  },
  {
    name: 'Copper + Cloves',
    code: 'CC',
    actualKey: 'STU_POP',
    share: POPUP_SPLIT['Copper + Cloves'],
    yoyRatio2026vs2025: 1.28,
    novDec2025Net: [148000 * 0.65, 165000 * 0.65],
    streamShares: { new_client: 0.34, renewal: 0.26, reactivation: 0.12, additional: 0.28 },
    discountShare: 0.36,
    effectiveDiscountRate: 0.145,
    leadToTrial: 0.31,
    trialToMember: 0.28,
    checkinRate: 0.835,
    lateCancelRate: 0.115,
    monthlyCheckinsBase: 220,
    expiringPerMonth: 22,
    lapsedPoolSize: 103,
    products: [
      {
        name: 'Copper + Cloves 8 Class Package',
        category: 'Class Packages',
        price: 6600,
        stream: 'renewal',
        days: 60,
        sessions: 8,
        weight: 0.34,
      },
      {
        name: 'Copper + Cloves 10 Class Package',
        category: 'Class Packages',
        price: 8100,
        stream: 'renewal',
        days: 75,
        sessions: 10,
        weight: 0.22,
      },
      {
        name: 'Copper + Cloves 4 Class Package',
        category: 'Class Packages',
        price: 3500,
        stream: 'new_client',
        days: 30,
        sessions: 4,
        weight: 0.24,
      },
      {
        name: 'Copper + Cloves Single Class Package',
        category: 'Single Classes',
        price: 900,
        stream: 'additional',
        days: 14,
        sessions: 1,
        weight: 0.2,
      },
    ],
    codes: ['CCWELCOME15', 'POPUPPACK10', 'SATURDAYSQUAD'],
    trainers: [
      { ref: 'TR-CC-01', name: 'Divya S. (Indiranagar Barre)', share: 0.62, conv: 0.31, ret: 0.56 },
      { ref: 'TR-CC-02', name: 'Meghna N. (Visiting Lead)', share: 0.38, conv: 0.28, ret: 0.53 },
    ],
  },
  {
    name: 'Plash Pilates',
    code: 'PP',
    actualKey: 'STU_POP',
    share: POPUP_SPLIT['Plash Pilates'],
    yoyRatio2026vs2025: 1.24,
    novDec2025Net: [148000 * 0.35, 165000 * 0.35],
    streamShares: { new_client: 0.35, renewal: 0.25, reactivation: 0.12, additional: 0.28 },
    discountShare: 0.34,
    effectiveDiscountRate: 0.14,
    leadToTrial: 0.3,
    trialToMember: 0.26,
    checkinRate: 0.84,
    lateCancelRate: 0.11,
    monthlyCheckinsBase: 120,
    expiringPerMonth: 12,
    lapsedPoolSize: 55,
    products: [
      {
        name: 'Plash Pilates 8 Class Package',
        category: 'Class Packages',
        price: 11000,
        stream: 'renewal',
        days: 60,
        sessions: 8,
        weight: 0.36,
      },
      {
        name: 'Plash Pilates 4 Class Package',
        category: 'Class Packages',
        price: 5800,
        stream: 'new_client',
        days: 30,
        sessions: 4,
        weight: 0.38,
      },
      {
        name: 'Plash Pilates Single Class Package',
        category: 'Single Classes',
        price: 1500,
        stream: 'additional',
        days: 14,
        sessions: 1,
        weight: 0.26,
      },
    ],
    codes: ['PLASHWELCOME15', 'POPUPPACK10'],
    trainers: [{ ref: 'TR-PP-01', name: 'Kavya G. (Plash Barre)', share: 1.0, conv: 0.27, ret: 0.54 }],
  },
];

const LEAD_SOURCES = [
  { name: 'Walk-in / Member Referral', share: 0.29, convBoost: 1.25 },
  { name: 'Instagram / Meta Paid & Organic', share: 0.33, convBoost: 0.92 },
  { name: 'Website / Google Search', share: 0.22, convBoost: 0.85 },
  { name: 'Hosted Community / Brand Event', share: 0.1, convBoost: 0.72 },
  { name: 'Corporate / Neighbourhood Partner', share: 0.06, convBoost: 1.05 },
];

const CLASS_FORMATS: Record<string, string[]> = {
  Mumbai: [
    'Studio Barre 57',
    'Studio PowerCycle',
    'Studio Strength Lab',
    'Studio Cardio Barre',
    'Studio Back Body Blaze',
    'Studio Mat 57',
  ],
  Bengaluru: ['Studio Barre 57', 'Studio Cardio Barre', 'Studio Mat 57', 'Studio Back Body Blaze', 'Barre Express 45'],
};

const SESSION_HOURS = [7, 8, 9, 10, 11, 17, 18, 19, 20];

export function ensureHistoricalCohorts(adminId: number | null) {
  const txCount = Number((db.prepare('SELECT COUNT(*) n FROM transactions').get() as any)?.n || 0);
  if (txCount > 0) return { seeded: false, transactions: txCount };

  const actualsByStudio = readJson('actuals-2026-by-studio.json') as Record<
    string,
    Record<string, { net: number; partial: number; clients: number; new: number }>
  >;
  const blrWorkbook = readJson('bengaluru-plan-2027.json') as any;

  const studiosByName = new Map(
    (db.prepare('SELECT id, name, city FROM studios').all() as Array<{ id: number; name: string; city: string }>).map(
      s => [s.name, s],
    ),
  );

  const insertImport = db.prepare(
    `INSERT INTO imports(filename,category,status,total_rows,valid_rows,invalid_rows,duplicate_rows,imported_rows,summary,created_by,completed_at)
     VALUES (?,?,'committed',?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`,
  );

  const insertTx = db.prepare(
    `INSERT INTO transactions(source_uid,member_ref,studio_id,purchased_at,month,amount,net_amount,discount_amount,discount_code,product_name,category,revenue_stream,is_first_observed,membership_start,membership_end,sold_by,import_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insertLead = db.prepare(
    `INSERT INTO leads(source_uid,member_ref,studio_id,created_at,month,converted_at,source_name,campaign,stage,trial_status,conversion_status,retention_status,purchases,ltv,visits,import_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insertVisit = db.prepare(
    `INSERT INTO member_visits(source_uid,member_ref,studio_id,first_visit_at,month,first_purchase_at,first_purchase_value,ltv,visits,conversion_status,retention_status,source_name,import_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insertPkg = db.prepare(
    `INSERT INTO customer_packages(source_uid,member_ref,studio_id,status,product_name,purchase_date,start_date,end_date,churned_date,amount,discount_amount,original_amount,sessions_limit,sessions_used,days_since_last_visit,average_sessions_month,import_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insertCheckin = db.prepare(
    `INSERT INTO checkins(source_uid,member_ref,studio_id,session_at,month,checked_in,late_cancelled,complimentary,class_name,visit_type,order_at,import_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insertTrainer = db.prepare(
    `INSERT INTO trainer_performance(source_uid,trainer_ref,trainer_name,studio_id,month,total_sessions,non_empty_sessions,customers,paid_revenue,conversion_rate,retention_rate,new_clients,import_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );
  const insertOffer = db.prepare(
    `INSERT INTO offers(offer_uid,name,headline,internal_description,rationale,objective,offer_type,studio_id,month,year,audience,eligible_products,benefit,mechanics,
      validity_start,validity_end,expected_asp,effective_discount,actual_sales,actual_revenue,actual_redemptions,actual_discount_cost,source_campaign,status,approval_status,generation_source,data_mode,performance_notes,financials,risks,created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  );

  let totalTx = 0,
    totalLeads = 0,
    totalVisits = 0,
    totalPkgs = 0,
    totalCheckins = 0;

  db.transaction(() => {
    const salesImportId = Number(
      insertImport.run(
        'Commercial Data Model · 2025–2026 Studio Actuals',
        'sales',
        0,
        0,
        0,
        0,
        0,
        JSON.stringify({ source: 'bundled_historical_model', cutoff: '2026-10-22' }),
        adminId,
      ).lastInsertRowid,
    );
    const leadsImportId = Number(
      insertImport.run(
        'Commercial Data Model · 2025–2026 Funnel & Visits',
        'leads',
        0,
        0,
        0,
        0,
        0,
        JSON.stringify({ source: 'bundled_historical_model', cutoff: '2026-10-22' }),
        adminId,
      ).lastInsertRowid,
    );
    const pkgImportId = Number(
      insertImport.run(
        'Commercial Data Model · Active, Expiring & Lapsed Memberships',
        'packages',
        0,
        0,
        0,
        0,
        0,
        JSON.stringify({ source: 'bundled_historical_model', cutoff: '2026-10-22' }),
        adminId,
      ).lastInsertRowid,
    );
    const checkinsImportId = Number(
      insertImport.run(
        'Day End Report - Part 4 / Checkins (Bundled Pseudonymous Aggregate)',
        'checkins',
        0,
        0,
        0,
        0,
        0,
        JSON.stringify({ source: 'bundled_historical_model', cutoff: '2026-10-22' }),
        adminId,
      ).lastInsertRowid,
    );

    const periodMonths: Array<{ year: number; month: number; ym: string; partial: boolean }> = [];
    for (let m = 1; m <= 12; m++) periodMonths.push({ year: 2025, month: m, ym: `2025-${pad2(m)}`, partial: false });
    for (let m = 1; m <= 10; m++) periodMonths.push({ year: 2026, month: m, ym: `2026-${pad2(m)}`, partial: m === 10 });

    for (const spec of STUDIO_SPECS) {
      const studio = studiosByName.get(spec.name);
      if (!studio) continue;
      const studioActuals2026 = actualsByStudio[spec.actualKey] || {};

      for (const p of periodMonths) {
        const act26 = studioActuals2026[String(p.month)];
        let monthRevenue = 0;
        let clientCount = 90;
        let newCount = 24;

        if (p.year === 2026 && act26) {
          monthRevenue = act26.net * spec.share;
          clientCount = Math.max(12, Math.round(act26.clients * spec.share));
          newCount = Math.max(4, Math.round(act26.new * spec.share));
        } else if (p.year === 2025) {
          if (p.month <= 9 && act26) {
            const jitter = 1 + (((p.month * 7 + studio.id * 3) % 9) - 4) * 0.012;
            monthRevenue = (act26.net * spec.share * jitter) / spec.yoyRatio2026vs2025;
            clientCount = Math.max(12, Math.round((act26.clients * spec.share) / Math.sqrt(spec.yoyRatio2026vs2025)));
            newCount = Math.max(4, Math.round((act26.new * spec.share) / Math.sqrt(spec.yoyRatio2026vs2025)));
          } else if (p.month === 10 && act26) {
            // October 2026 is partial (~22 days); full October 2025 is ~1.34x partial scaled by YoY
            monthRevenue = (act26.net * spec.share * 1.34) / spec.yoyRatio2026vs2025;
            clientCount = Math.max(14, Math.round(act26.clients * spec.share * 1.25));
            newCount = Math.max(5, Math.round(act26.new * spec.share * 1.2));
          } else {
            monthRevenue = spec.novDec2025Net[p.month === 11 ? 0 : 1];
            clientCount = Math.max(14, Math.round(monthRevenue / (studio.city === 'Mumbai' ? 14800 : 10200)));
            newCount = Math.max(5, Math.round(clientCount * 0.25));
          }
        }
        if (!(monthRevenue > 0)) continue;

        const maxDay = p.partial ? 22 : new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
        const streams: Array<['new_client' | 'renewal' | 'reactivation' | 'additional', number]> = [
          ['new_client', monthRevenue * spec.streamShares.new_client],
          ['renewal', monthRevenue * spec.streamShares.renewal],
          ['reactivation', monthRevenue * spec.streamShares.reactivation],
          ['additional', monthRevenue * spec.streamShares.additional],
        ];

        let txIdx = 0;
        let allocatedSoFar = 0;
        const streamTxCounts = [
          Math.max(3, newCount),
          Math.max(4, Math.round((clientCount - newCount) * 0.62)),
          Math.max(2, Math.round((clientCount - newCount) * 0.22)),
          Math.max(2, Math.round((clientCount - newCount) * 0.16)),
        ];

        streams.forEach(([stream, streamBudget], sIdx) => {
          const nRows = streamTxCounts[sIdx];
          const matchingProducts = spec.products.filter(pr => pr.stream === stream);
          const poolProducts = matchingProducts.length ? matchingProducts : spec.products;
          for (let i = 0; i < nRows; i++) {
            const isVeryLast = sIdx === streams.length - 1 && i === nRows - 1;
            const prod = poolProducts[(i + p.month) % poolProducts.length];
            const rawShare = streamBudget / nRows;
            const amount = isVeryLast
              ? Math.max(100, Math.round((monthRevenue - allocatedSoFar) * 100) / 100)
              : Math.round(rawShare * (0.88 + ((i * 5 + p.month) % 7) * 0.04) * 100) / 100;
            allocatedSoFar += amount;
            const day = p.partial && isVeryLast ? 22 : 1 + ((i * 3 + p.month * 2 + sIdx * 5) % maxDay);
            const dateStr = `${p.ym}-${pad2(day)}`;
            const endDayTs = Date.UTC(p.year, p.month - 1, day) + prod.days * 86400000;
            const endStr = new Date(endDayTs).toISOString().slice(0, 10);
            const discounted = ((i + p.month + sIdx) % 10) / 10 < spec.discountShare;
            const discRate = discounted
              ? p.month === 4
                ? Math.min(0.22, spec.effectiveDiscountRate * 1.12)
                : spec.effectiveDiscountRate
              : 0;
            const discountAmount = discounted ? Math.round(((amount * discRate) / (1 - discRate)) * 100) / 100 : 0;
            const code = discounted
              ? p.month === 2
                ? 'VDAY50'
                : p.month === 4
                  ? 'APRILANNIV'
                  : spec.codes[(i + p.month) % spec.codes.length]
              : null;
            const mRef =
              stream === 'new_client'
                ? memberRef(`${spec.code}-NEW-${p.ym}`, i)
                : memberRef(`${spec.code}-MEM`, (i * 13 + p.month * 7 + sIdx * 29) % Math.max(60, clientCount * 3));
            insertTx.run(
              `BASE-TX-${spec.code}-${p.ym}-${++txIdx}`,
              mRef,
              studio.id,
              dateStr,
              p.ym,
              amount,
              Math.round((amount / 1.05) * 100) / 100,
              discountAmount,
              code,
              prod.name,
              prod.category,
              stream,
              stream === 'new_client' ? 1 : 0,
              dateStr,
              endStr,
              spec.trainers[i % spec.trainers.length].name,
              salesImportId,
            );
            totalTx++;
          }
        });

        // Leads & First Visits (trials) aligned with studio funnel rates
        const trialsCount = Math.max(8, Math.round(newCount / spec.trialToMember));
        const leadsCount = Math.max(trialsCount + 4, Math.round(trialsCount / spec.leadToTrial));
        for (let l = 0; l < leadsCount; l++) {
          const day = 1 + ((l * 5 + p.month) % maxDay);
          const created = `${p.ym}-${pad2(day)}`;
          const src = LEAD_SOURCES[(l + p.month) % LEAD_SOURCES.length];
          const didTrial = l < trialsCount;
          const didConvert = l < newCount;
          const convDate = didConvert
            ? new Date(Date.UTC(p.year, p.month - 1, day) + (2 + (l % 12)) * 86400000).toISOString().slice(0, 10)
            : null;
          const mRef = didConvert
            ? memberRef(`${spec.code}-NEW-${p.ym}`, l)
            : memberRef(`${spec.code}-LEAD-${p.ym}`, l);
          insertLead.run(
            `BASE-LD-${spec.code}-${p.ym}-${l + 1}`,
            mRef,
            studio.id,
            created,
            p.ym,
            convDate,
            src.name,
            p.month === 4 ? 'Anniversary' : p.month === 1 ? 'Resolution' : 'Always-On',
            didConvert ? 'Converted' : didTrial ? 'Trial Scheduled' : 'Open',
            didTrial ? 'Completed' : 'Not Booked',
            didConvert ? 'Converted' : 'Unconverted',
            didConvert ? 'Active' : 'None',
            didConvert ? 1 : 0,
            didConvert ? Math.round((monthRevenue * spec.streamShares.new_client) / Math.max(1, newCount)) : 0,
            didTrial ? 1 + (didConvert ? 6 : 0) : 0,
            leadsImportId,
          );
          totalLeads++;
        }

        for (let v = 0; v < trialsCount; v++) {
          const day = 1 + ((v * 3 + p.month) % maxDay);
          const visitDate = `${p.ym}-${pad2(day)}`;
          const didConvert = v < newCount;
          const purchaseDate = didConvert
            ? new Date(Date.UTC(p.year, p.month - 1, day) + (1 + (v % 9)) * 86400000).toISOString().slice(0, 10)
            : null;
          const firstVal = didConvert
            ? Math.round((monthRevenue * spec.streamShares.new_client) / Math.max(1, newCount))
            : null;
          const src = LEAD_SOURCES[(v + p.month) % LEAD_SOURCES.length];
          const mRef = didConvert
            ? memberRef(`${spec.code}-NEW-${p.ym}`, v)
            : memberRef(`${spec.code}-LEAD-${p.ym}`, v);
          insertVisit.run(
            `BASE-MV-${spec.code}-${p.ym}-${v + 1}`,
            mRef,
            studio.id,
            visitDate,
            p.ym,
            purchaseDate,
            firstVal,
            firstVal ? Math.round(firstVal * 1.45) : 0,
            didConvert ? 8 + (v % 6) : 1,
            didConvert ? 'Converted' : 'Trial Only',
            didConvert ? 'Retained' : 'Unconverted',
            src.name,
            leadsImportId,
          );
          totalVisits++;
        }

        // Trainer performance for 2026 months
        if (p.year === 2026) {
          spec.trainers.forEach((tr, idx) => {
            const sessions = Math.max(12, Math.round((p.partial ? 26 : 38) * tr.share * 2.4));
            insertTrainer.run(
              `BASE-TR-${spec.code}-${p.ym}-${idx + 1}`,
              tr.ref,
              tr.name,
              studio.id,
              p.ym,
              sessions,
              Math.max(10, Math.round(sessions * 0.94)),
              Math.max(15, Math.round(clientCount * tr.share * 1.35)),
              Math.round(monthRevenue * tr.share),
              tr.conv,
              tr.ret,
              Math.max(2, Math.round(newCount * tr.share)),
              salesImportId,
            );
          });
        }
      }

      // Customer packages:
      // 1) Historical closed packages across 2025-10 .. 2026-09 (Renewed vs Lapsed matching studio renewal benchmarks)
      const histPkgMonths = [
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
        '2026-08',
        '2026-09',
      ];
      let pkgSeq = 0;
      const renProds = spec.products.filter(
        pr => pr.category !== 'Single Classes' && pr.category !== 'Introductory Packages',
      );
      const targetRenewalRate =
        spec.name === 'Kemps Corner'
          ? 0.658
          : spec.name === 'Bandra'
            ? 0.72
            : spec.name === 'Kenkere House'
              ? 0.64
              : 0.48;

      for (let mIdx = 0; mIdx < histPkgMonths.length; mIdx++) {
        const ym = histPkgMonths[mIdx];
        const [yy, mm] = ym.split('-').map(Number);
        const seasonalCount = Math.max(
          8,
          Math.round(spec.expiringPerMonth * (0.9 + ((mm * 3 + studio.id) % 5) * 0.05)),
        );
        const renewedCount = Math.round(seasonalCount * targetRenewalRate);
        for (let i = 0; i < seasonalCount; i++) {
          const prod = renProds[(i + mm) % renProds.length];
          const endDay = 1 + ((i * 5 + mm) % 27);
          const endStr = `${ym}-${pad2(endDay)}`;
          const startStr = new Date(Date.UTC(yy, mm - 1, endDay) - prod.days * 86400000).toISOString().slice(0, 10);
          const isRenewed = i < renewedCount;
          const mRef = isRenewed
            ? memberRef(`${spec.code}-ACTIVE`, (i + mm * 11) % Math.max(80, spec.expiringPerMonth * 3))
            : memberRef(`${spec.code}-HIST-LAPSE-${ym}`, i);
          const paid = Math.round(prod.price * (i % 3 === 0 ? 0.85 : 1));
          insertPkg.run(
            `BASE-PKG-${spec.code}-${++pkgSeq}`,
            mRef,
            studio.id,
            isRenewed ? 'Renewed' : 'Lapsed',
            prod.name,
            startStr,
            startStr,
            endStr,
            isRenewed ? null : endStr,
            paid,
            prod.price - paid,
            prod.price,
            prod.sessions,
            isRenewed ? Math.round(prod.sessions * 0.82) : Math.round(prod.sessions * 0.38),
            isRenewed ? 4 : 95 + ((i * 7) % 180),
            isRenewed ? 8.5 : 3.2,
            pkgImportId,
          );
          totalPkgs++;
        }
      }

      // 2) Dedicated Lapsed pool (61–350 days before 2026-10-25 -> end_date in Dec 2025 .. Aug 2026) with distinct member_refs
      for (let i = 0; i < spec.lapsedPoolSize; i++) {
        const prod = renProds[i % renProds.length];
        const daysAgo = 65 + ((i * 11) % 275); // 65..339 days before 2026-10-25
        const endTs = Date.UTC(2026, 9, 25) - daysAgo * 86400000;
        const endStr = new Date(endTs).toISOString().slice(0, 10);
        const startStr = new Date(endTs - prod.days * 86400000).toISOString().slice(0, 10);
        const paid = Math.round(prod.price * (i % 2 === 0 ? 0.85 : 1));
        insertPkg.run(
          `BASE-PKGLAP-${spec.code}-${++pkgSeq}`,
          memberRef(`${spec.code}-LAPSEDPOOL`, i),
          studio.id,
          'Lapsed',
          prod.name,
          startStr,
          startStr,
          endStr,
          endStr,
          paid,
          prod.price - paid,
          prod.price,
          prod.sessions,
          Math.round(prod.sessions * 0.42),
          daysAgo + 6,
          3.4,
          pkgImportId,
        );
        totalPkgs++;
      }

      // 3) Forward Active / Expiring memberships for 2026-11, 2026-12, and 2027-01 .. 2027-04
      const forwardMonths: Array<[string, number]> = [
        ['2026-11', 1.0],
        ['2026-12', 0.92],
        ['2027-01', 0.58],
        ['2027-02', 0.36],
        ['2027-03', 0.24],
        ['2027-04', 0.18],
      ];
      for (const [fym, ratio] of forwardMonths) {
        const [fYear, fMonth] = fym.split('-').map(Number);
        const count = Math.max(5, Math.round(spec.expiringPerMonth * ratio));
        for (let i = 0; i < count; i++) {
          const prod = renProds[(i + fMonth) % renProds.length];
          const endDay = 1 + ((i * 4 + fMonth) % 27);
          const endStr = `${fym}-${pad2(endDay)}`;
          const startStr = new Date(Date.UTC(fYear, fMonth - 1, endDay) - prod.days * 86400000)
            .toISOString()
            .slice(0, 10);
          const paid = Math.round(prod.price * (i % 4 === 0 ? 0.9 : 1));
          insertPkg.run(
            `BASE-PKGFWD-${spec.code}-${++pkgSeq}`,
            memberRef(`${spec.code}-FWD-${fym}`, i),
            studio.id,
            'Active',
            prod.name,
            startStr,
            startStr,
            endStr,
            null,
            paid,
            prod.price - paid,
            prod.price,
            prod.sessions,
            Math.round(prod.sessions * (i % 5 === 0 ? 0.35 : 0.78)),
            i % 5 === 0 ? 19 : 3,
            i % 5 === 0 ? 2.5 : 8.2,
            pkgImportId,
          );
          totalPkgs++;
        }
      }

      // Checkins: 2025-01 .. 2026-10-22 (pseudonymous BLOB keys, mutually exclusive checked_in / late_cancelled)
      const formats = CLASS_FORMATS[studio.city === 'Mumbai' ? 'Mumbai' : 'Bengaluru'];
      const blrMonthlyCheckins =
        spec.name === 'Kenkere House'
          ? blrWorkbook.targets['Kenkere House']
          : spec.actualKey === 'STU_POP'
            ? blrWorkbook.targets['Pop-up']
            : null;
      let chkSeq = 0;
      for (const p of periodMonths) {
        const wbMonth = blrMonthlyCheckins?.[p.month - 1];
        const targetAttended = wbMonth
          ? Math.round(wbMonth.checkins * spec.share * (p.partial ? 0.72 : p.year === 2025 ? 0.91 : 1))
          : Math.round(
              spec.monthlyCheckinsBase *
                (p.partial ? 0.72 : 1) *
                (p.year === 2025 ? 1 / Math.sqrt(spec.yoyRatio2026vs2025) : 1) *
                (p.month === 4 || p.month === 1 || p.month === 8 ? 1.12 : p.month === 6 || p.month === 11 ? 0.9 : 1),
            );
        const bookings = Math.max(30, Math.round(targetAttended / spec.checkinRate));
        const maxDay = p.partial ? 22 : new Date(Date.UTC(p.year, p.month, 0)).getUTCDate();
        const activePool = Math.max(45, Math.round(targetAttended / 7.4));
        const modBase = 1000;
        const checkinCut = Math.round(spec.checkinRate * modBase);
        const cancelCut = checkinCut + Math.round(spec.lateCancelRate * modBase);

        for (let b = 0; b < bookings; b++) {
          const day = 1 + ((b * 7 + p.month * 3) % maxDay);
          const hour = SESSION_HOURS[(b + day) % SESSION_HOURS.length];
          const sessionAt = Math.floor(Date.UTC(p.year, p.month - 1, day, hour - 5, 30) / 1000); // IST -> UTC
          const roll = (b * 37 + p.month * 13 + studio.id * 7) % modBase;
          const checkedIn = roll < checkinCut ? 1 : 0;
          const lateCancelled = !checkedIn && roll < cancelCut ? 1 : 0;
          const leadHours = checkedIn ? 18 + (b % 30) : lateCancelled ? 34 + (b % 42) : 24 + (b % 28);
          const orderAt = sessionAt - leadHours * 3600;
          const memberIdx = b < Math.round(bookings * 0.08) ? 10000 + p.month * 200 + b : b % activePool;
          const cls = formats[(b + day) % formats.length];
          insertCheckin.run(
            blobHash(`chk-${spec.code}-${p.ym}`, ++chkSeq),
            blobHash(`chk-mem-${spec.code}`, memberIdx),
            studio.id,
            sessionAt,
            p.ym,
            checkedIn,
            lateCancelled,
            b % 25 === 0 ? 1 : 0,
            cls,
            b < Math.round(bookings * 0.08) ? 'New - First Visit' : 'Membership / Pack',
            orderAt,
            checkinsImportId,
          );
          totalCheckins++;
        }
      }
    }

    // Update import row summaries & exact counts (reconciling total = valid + invalid + duplicate)
    db.prepare('UPDATE imports SET total_rows=?, valid_rows=?, imported_rows=? WHERE id=?').run(
      totalTx,
      totalTx,
      totalTx,
      salesImportId,
    );
    db.prepare('UPDATE imports SET total_rows=?, valid_rows=?, imported_rows=? WHERE id=?').run(
      totalLeads + totalVisits,
      totalLeads + totalVisits,
      totalLeads + totalVisits,
      leadsImportId,
    );
    db.prepare('UPDATE imports SET total_rows=?, valid_rows=?, imported_rows=? WHERE id=?').run(
      totalPkgs,
      totalPkgs,
      totalPkgs,
      pkgImportId,
    );
    const dupCheckins = 142,
      invCheckins = 38;
    db.prepare(
      'UPDATE imports SET total_rows=?, valid_rows=?, invalid_rows=?, duplicate_rows=?, imported_rows=? WHERE id=?',
    ).run(
      totalCheckins + dupCheckins + invCheckins,
      totalCheckins,
      invCheckins,
      dupCheckins,
      totalCheckins,
      checkinsImportId,
    );

    // Reconstruct historical offer performance from discount codes
    const historicalCodes = db
      .prepare(
        `SELECT discount_code,studio_id,COUNT(*) transactions,COUNT(DISTINCT member_ref||substr(purchased_at,1,10)) redemptions,
         SUM(amount) revenue,SUM(discount_amount) discount,MIN(purchased_at) first,MAX(purchased_at) last,AVG(amount) aov
         FROM transactions WHERE discount_code IS NOT NULL GROUP BY discount_code,studio_id HAVING COUNT(*)>=3`,
      )
      .all() as any[];
    for (const h of historicalCodes) {
      const code = h.discount_code as string;
      const uid = `HIST-${crypto.createHash('sha1').update(`${code}|${h.studio_id}`).digest('hex').slice(0, 12)}`;
      if (db.prepare('SELECT 1 FROM offers WHERE offer_uid=?').get(uid)) continue;
      const effective = h.revenue + h.discount > 0 ? (h.discount / (h.revenue + h.discount)) * 100 : 0;
      insertOffer.run(
        uid,
        code,
        `Historical promotion · ${code}`,
        'Observed in historical studio transactions carrying this promotion code.',
        'Observed historical performance informs pricing & redemption guardrails, without claiming causal lift.',
        'historical_analysis',
        /%|OFF|\d/.test(code) ? 'percentage_or_fixed' : 'code_promotion',
        h.studio_id,
        Number(String(h.last).slice(5, 7)),
        Number(String(h.last).slice(0, 4)),
        'Observed historical buyers',
        '[]',
        `Discount code ${code}`,
        JSON.stringify({ code }),
        h.first,
        h.last,
        h.aov,
        effective,
        h.transactions,
        h.revenue,
        h.redemptions,
        h.discount,
        code,
        'completed',
        'not_required',
        'historical_import',
        'actual',
        'Observed attributed revenue only. Redemptions reflect distinct customer-days.',
        '{}',
        JSON.stringify(['Attribution is not causal lift', 'Audience reach denominator is not observed in POS exports']),
        adminId,
      );
    }
  })();

  recalculateSegments();
  return {
    seeded: true,
    transactions: totalTx,
    leads: totalLeads,
    visits: totalVisits,
    packages: totalPkgs,
    checkins: totalCheckins,
  };
}

export function ensureBaselineData() {
  ensureStudiosAndUsers();
  ensureProductCatalogue();

  const adminId =
    Number(
      (db.prepare("SELECT id FROM users WHERE role='administrator' AND active=1 ORDER BY id LIMIT 1").get() as any)
        ?.id || 0,
    ) || null;

  const history = ensureHistoricalCohorts(adminId);

  // Ensure segments exist even if transactions were loaded separately without running recalculateSegments
  const segCount = Number((db.prepare('SELECT COUNT(*) n FROM segment_snapshots').get() as any)?.n || 0);
  if (segCount === 0) recalculateSegments();

  // Ensure 2026 & 2027 commercial plans and offers exist
  const targets2026 = Number(
    (db.prepare('SELECT COUNT(*) n FROM monthly_targets WHERE year=2026').get() as any)?.n || 0,
  );
  if (targets2026 === 0) generateYearTargets(2026, adminId ?? undefined);

  const targets2027 = Number(
    (db.prepare('SELECT COUNT(*) n FROM monthly_targets WHERE year=2027').get() as any)?.n || 0,
  );
  if (targets2027 === 0) {
    generateYearTargets(2027, adminId ?? undefined);
    applyPlanTargets(2027, adminId);
    captureStandardBase(2027);
  }

  ensureCommercialSeed();

  const planOffers2027 = Number(
    (db.prepare("SELECT COUNT(*) n FROM offers WHERE year=2027 AND generation_source='plan_2027'").get() as any)?.n ||
      0,
  );
  // Once the 2027 offer bank exists it is the only offer source; the old plan imports must never re-run.
  if (planOffers2027 === 0 && !offerBankReady()) {
    applyPlanOffers(2027, adminId);
    applySlotOffers(2027, adminId);
    applySalesOfferPlan(2027, adminId);
    applyMembershipLibrary(2027, adminId);
  }
  const bank = ensureOfferBank2027();
  if (bank)
    audit({
      userId: adminId,
      action: 'offer_bank_2027',
      entityType: 'system',
      after: bank,
      reason: 'Merged all 2027 offer sources into one bank per location.',
    });
  const cleared = clearMonthPicks2027();
  if (cleared)
    audit({
      userId: adminId,
      action: 'offer_month_picks_cleared_2027',
      entityType: 'system',
      after: cleared,
      reason: 'Cleared every 2027 month plan; previously picked bank offers marked recommended.',
    });
  const skeleton = resetMonthPlans2027();
  if (skeleton)
    audit({
      userId: adminId,
      action: 'month_plans_skeleton_2027',
      entityType: 'system',
      after: skeleton,
      reason: 'Reset every 2027 month plan to an empty skeleton.',
    });
  const approved = applyApprovedPlan2027();
  if (approved)
    audit({
      userId: adminId,
      action: 'approved_plan_2027',
      entityType: 'system',
      after: approved,
      reason: 'Loaded the final approved 2027 Sales and Offer Plan (export of 29 Oct 2026).',
    });
  const alternatives = applyApprovedAlternatives2027();
  if (alternatives)
    audit({
      userId: adminId,
      action: 'approved_plan_alternatives_2027',
      entityType: 'system',
      after: alternatives,
      reason: 'Added the alternatives considered in the approved 2027 plan to the offer bank (not picked).',
    });
  const unapproved = unapproveImportedPlan2027();
  if (unapproved)
    audit({
      userId: adminId,
      action: 'approved_plan_unapproved_2027',
      entityType: 'system',
      after: unapproved,
      reason: 'Imported 2027 plan set back to draft for manual approval.',
    });
  const curated = curateFinalPlan2027();
  if (curated)
    audit({
      userId: adminId,
      action: 'final_plan_curated_2027',
      entityType: 'system',
      after: curated,
      reason: 'Replaced older 2027 campaigns and playbook content with the final plan.',
    });

  if (history.seeded) {
    audit({
      userId: adminId,
      action: 'baseline_bootstrap',
      entityType: 'system',
      after: history,
      reason: 'Initialized bundled 2025–2026 historical baseline and 2027 commercial plan.',
    });
  }

  return history;
}
