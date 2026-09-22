-- ============================================================
-- OM SARAVANA CRANES — OMS DATABASE SCHEMA
-- Run this ENTIRE script in your new Supabase project:
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- OPERATORS
-- ─────────────────────────────────────────
create table if not exists oms_operators (
  id               uuid primary key default uuid_generate_v4(),
  business_id      text not null default 'om-saravana-oms-v1',
  operator_code    text not null,
  full_name        text not null,
  phone            text,
  alternate_phone  text,
  joining_date     date,
  salary           numeric(10,2) default 0,
  salary_type      text default 'MONTHLY',   -- MONTHLY | DAILY | PER_SHIFT
  status           text default 'ACTIVE',    -- ACTIVE | INACTIVE
  address          text,
  emergency_contact text,
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─────────────────────────────────────────
-- OPERATOR DOCUMENTS
-- ─────────────────────────────────────────
create table if not exists oms_operator_documents (
  id            uuid primary key default uuid_generate_v4(),
  business_id   text not null default 'om-saravana-oms-v1',
  operator_id   uuid not null references oms_operators(id) on delete cascade,
  document_type text not null,
  -- MEDICAL_CERT | DRIVING_LICENSE | ID_PROOF | TRAINING_CERT | SAFETY_CERT | AADHAAR | OTHER
  file_name     text not null,
  file_url      text,
  upload_date   date default current_date,
  expiry_date   date,
  description   text,
  uploaded_by   text,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- VEHICLES
-- ─────────────────────────────────────────
create table if not exists oms_vehicles (
  id                  uuid primary key default uuid_generate_v4(),
  business_id         text not null default 'om-saravana-oms-v1',
  vehicle_code        text not null,           -- FL001, CR001
  registration_number text,
  vehicle_type        text not null,           -- FORKLIFT | CRANE | OTHER
  capacity            text,                    -- 5 TON, 10 TON
  model               text,
  status              text default 'AVAILABLE',
  -- AVAILABLE | MONTHLY_RENTAL | DAILY_RENTAL | MAINTENANCE | INACTIVE
  notes               text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ─────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────
create table if not exists oms_customers (
  id              uuid primary key default uuid_generate_v4(),
  business_id     text not null default 'om-saravana-oms-v1',
  customer_code   text not null,               -- CUS001
  company_name    text not null,
  contact_person  text,
  phone           text,
  email           text,
  location        text,
  address         text,
  billing_details text,
  status          text default 'ACTIVE',       -- ACTIVE | INACTIVE
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- RENTAL ASSIGNMENTS
-- ─────────────────────────────────────────
create table if not exists oms_rental_assignments (
  id              uuid primary key default uuid_generate_v4(),
  business_id     text not null default 'om-saravana-oms-v1',
  assignment_code text not null,
  vehicle_id      uuid references oms_vehicles(id),
  customer_id     uuid references oms_customers(id),
  operator_id     uuid references oms_operators(id),
  rental_type     text not null,               -- MONTHLY | DAILY
  start_date      date not null,
  end_date        date,
  status          text default 'ACTIVE',       -- ACTIVE | CLOSED | SUSPENDED
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- WORK LOGS  ← CRITICAL: NO unique on (operator_id, date)
-- Multiple entries per operator per date are REQUIRED
-- ─────────────────────────────────────────
create table if not exists oms_work_logs (
  id           uuid primary key default uuid_generate_v4(),
  business_id  text not null default 'om-saravana-oms-v1',
  work_date    date not null,
  operator_id  uuid not null references oms_operators(id),
  vehicle_id   uuid references oms_vehicles(id),
  customer_id  uuid references oms_customers(id),
  rental_type  text,                           -- MONTHLY | DAILY
  work_status  text not null default 'PRESENT', -- PRESENT | ABSENT
  shift_count  numeric(4,2) default 1,         -- 0 for absent, >=1 for present
  ot_hours     numeric(4,2) default 0,
  ot_rate      numeric(8,2) default 0,         -- snapshot from settings at entry time
  ot_amount    numeric(10,2) default 0,        -- calculated: ot_hours * ot_rate
  start_time   time,
  end_time     time,
  remarks      text,
  created_by   text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- ─────────────────────────────────────────
-- PAYROLL RECORDS — SNAPSHOT (never recalculate after finalize)
-- ─────────────────────────────────────────
create table if not exists oms_payroll_records (
  id                 uuid primary key default uuid_generate_v4(),
  business_id        text not null default 'om-saravana-oms-v1',
  operator_id        uuid not null references oms_operators(id),
  month              text not null,            -- YYYY-MM
  total_shifts       numeric(6,2) default 0,
  ot_hours           numeric(6,2) default 0,
  ot_rate_snapshot   numeric(8,2) default 0,  -- rate at time of finalization
  ot_amount          numeric(10,2) default 0,
  base_earnings      numeric(10,2) default 0,
  allowances         numeric(10,2) default 0,
  advance_recovery   numeric(10,2) default 0,
  other_deductions   numeric(10,2) default 0,
  gross_earnings     numeric(10,2) default 0,
  final_payable      numeric(10,2) default 0,
  status             text default 'DRAFT',    -- DRAFT | FINALIZED
  notes              text,
  finalized_at       timestamptz,
  finalized_by       text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique(operator_id, month)
);

-- ─────────────────────────────────────────
-- ADVANCE TRANSACTIONS
-- ─────────────────────────────────────────
create table if not exists oms_advance_transactions (
  id                uuid primary key default uuid_generate_v4(),
  business_id       text not null default 'om-saravana-oms-v1',
  operator_id       uuid not null references oms_operators(id),
  transaction_date  date not null default current_date,
  transaction_type  text not null,             -- ADVANCE | RECOVERY
  amount            numeric(10,2) not null,
  payment_method    text,                      -- CASH | BANK | UPI
  reason            text,
  remarks           text,
  created_by        text,
  created_at        timestamptz default now()
);

-- ─────────────────────────────────────────
-- BUSINESS SETTINGS (key-value)
-- ─────────────────────────────────────────
create table if not exists oms_business_settings (
  id            uuid primary key default uuid_generate_v4(),
  business_id   text not null default 'om-saravana-oms-v1',
  setting_key   text not null,
  setting_value text,
  updated_at    timestamptz default now(),
  unique(business_id, setting_key)
);

-- ─────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────
create table if not exists oms_notifications (
  id                uuid primary key default uuid_generate_v4(),
  business_id       text not null default 'om-saravana-oms-v1',
  notification_type text not null,
  -- WORK_REMINDER | DOCUMENT_EXPIRY | PAYROLL | SYSTEM
  title             text not null,
  message           text,
  status            text default 'UNREAD',    -- UNREAD | READ
  triggered_at      timestamptz default now()
);

-- ─────────────────────────────────────────
-- AUDIT LOGS
-- ─────────────────────────────────────────
create table if not exists oms_audit_logs (
  id            uuid primary key default uuid_generate_v4(),
  business_id   text not null default 'om-saravana-oms-v1',
  user_name     text,
  action        text not null,
  -- CREATE | UPDATE | DELETE | FINALIZE | SETTINGS_CHANGE
  entity_type   text not null,
  -- OPERATOR | VEHICLE | CUSTOMER | WORK_LOG | PAYROLL | ADVANCE | SETTINGS | RENTAL
  entity_id     text,
  previous_value jsonb,
  new_value      jsonb,
  created_at    timestamptz default now()
);

-- ─────────────────────────────────────────
-- ENABLE ROW LEVEL SECURITY
-- ─────────────────────────────────────────
alter table oms_operators           enable row level security;
alter table oms_operator_documents  enable row level security;
alter table oms_vehicles            enable row level security;
alter table oms_customers           enable row level security;
alter table oms_rental_assignments  enable row level security;
alter table oms_work_logs           enable row level security;
alter table oms_payroll_records     enable row level security;
alter table oms_advance_transactions enable row level security;
alter table oms_business_settings   enable row level security;
alter table oms_notifications       enable row level security;
alter table oms_audit_logs          enable row level security;

-- ─────────────────────────────────────────
-- RLS POLICIES — Allow all for our business ID
-- ─────────────────────────────────────────
create policy "oms_operators_policy"           on oms_operators           for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_operator_documents_policy"  on oms_operator_documents  for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_vehicles_policy"            on oms_vehicles            for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_customers_policy"           on oms_customers           for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_rental_assignments_policy"  on oms_rental_assignments  for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_work_logs_policy"           on oms_work_logs           for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_payroll_records_policy"     on oms_payroll_records     for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_advance_transactions_policy" on oms_advance_transactions for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_business_settings_policy"   on oms_business_settings   for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_notifications_policy"       on oms_notifications       for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');
create policy "oms_audit_logs_policy"          on oms_audit_logs          for all using (business_id = 'om-saravana-oms-v1') with check (business_id = 'om-saravana-oms-v1');

-- ─────────────────────────────────────────
-- SEED DEFAULT SETTINGS
-- ─────────────────────────────────────────
insert into oms_business_settings (business_id, setting_key, setting_value) values
  ('om-saravana-oms-v1', 'ot_rate_per_hour',           '500'),
  ('om-saravana-oms-v1', 'ot_enabled',                 'true'),
  ('om-saravana-oms-v1', 'min_ot_hours',               '0'),
  ('om-saravana-oms-v1', 'present_default_shift',      '1'),
  ('om-saravana-oms-v1', 'absent_shift_value',         '0'),
  ('om-saravana-oms-v1', 'allowed_shift_values',       '1,1.5,2'),
  ('om-saravana-oms-v1', 'work_reminder_enabled',      'true'),
  ('om-saravana-oms-v1', 'work_reminder_time',         '20:00'),
  ('om-saravana-oms-v1', 'document_expiry_reminder_days', '30'),
  ('om-saravana-oms-v1', 'salary_calculation_method',  'SHIFT_BASED'),
  ('om-saravana-oms-v1', 'standard_monthly_shifts',    '26'),
  ('om-saravana-oms-v1', 'advance_recovery_method',    'MANUAL')
on conflict (business_id, setting_key) do nothing;

-- ─────────────────────────────────────────
-- Create Supabase Storage bucket for operator documents
-- Run this separately in Supabase Dashboard → Storage → New Bucket:
-- Name: oms-documents
-- Public: false (private, authenticated access only)
-- ─────────────────────────────────────────
