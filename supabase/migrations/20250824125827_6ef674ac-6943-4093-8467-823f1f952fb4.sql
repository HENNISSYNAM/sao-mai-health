-- Drop existing policies and recreate the complete health schema with all 14 modules

-- Create health schema if not exists
CREATE SCHEMA IF NOT EXISTS health;

-- Create enums for the health system
CREATE TYPE health.case_status AS ENUM ('suspected', 'probable', 'confirmed', 'ruled_out', 'pending');
CREATE TYPE health.disease_code AS ENUM ('dengue', 'tcm', 'ari', 'covid19', 'influenza', 'measles', 'other');
CREATE TYPE health.priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE health.alert_status AS ENUM ('backlog', 'acknowledged', 'assigned', 'investigating', 'resolved');
CREATE TYPE health.user_role AS ENUM ('admin_doh', 'hospital_data_admin', 'epi_officer_cdc', 'health_worker_ward', 'research_analyst');
CREATE TYPE health.bed_status AS ENUM ('available', 'occupied', 'maintenance', 'reserved');
CREATE TYPE health.stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock', 'expired');

-- A. Dashboard & KPIs Tables
CREATE TABLE health.metrics_cases_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    district_id TEXT,
    ward_id TEXT,
    facility_id UUID,
    disease_code health.disease_code,
    case_count INTEGER DEFAULT 0,
    rt_7d DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, district_id, ward_id, facility_id, disease_code)
);

CREATE TABLE health.metrics_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    new_cases_today INTEGER DEFAULT 0,
    rt_7d DECIMAL(5,2),
    bed_occupancy_rate DECIMAL(5,2),
    icu_occupancy_rate DECIMAL(5,2),
    vaccination_coverage DECIMAL(5,2),
    vaccine_stock_level DECIMAL(5,2),
    open_alerts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- B. Disease Surveillance
CREATE TABLE health.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID,
    case_number TEXT UNIQUE,
    disease_code health.disease_code NOT NULL,
    status health.case_status DEFAULT 'suspected',
    onset_date DATE,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    district_id TEXT,
    ward_id TEXT,
    facility_id UUID,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    reporter_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_code TEXT UNIQUE,
    name_hash TEXT, -- For privacy
    dob DATE,
    gender TEXT,
    address_hash TEXT, -- For privacy  
    phone_hash TEXT, -- For privacy
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES health.cases(id),
    encounter_id UUID,
    loinc_code TEXT,
    value TEXT,
    unit TEXT,
    observed_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. Alerts & Anomaly Detection
CREATE TABLE health.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- 'anomaly', 'outbreak', 'threshold', 'quality'
    title TEXT NOT NULL,
    description TEXT,
    priority health.priority_level DEFAULT 'medium',
    status health.alert_status DEFAULT 'backlog',
    source_table TEXT,
    source_id UUID,
    location TEXT,
    district_id TEXT,
    ward_id TEXT,
    facility_id UUID,
    disease_code health.disease_code,
    assigned_to UUID,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    sla_due_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.alert_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES health.alerts(id),
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. Outbreaks & Clusters
CREATE TABLE health.outbreaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    disease_code health.disease_code,
    status TEXT DEFAULT 'active',
    center_lat DECIMAL(10,8),
    center_lng DECIMAL(11,8),
    radius_meters INTEGER,
    case_count INTEGER DEFAULT 0,
    confidence_score DECIMAL(5,3),
    algorithm_used TEXT, -- 'HDBSCAN', 'manual'
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.outbreak_cases (
    outbreak_id UUID REFERENCES health.outbreaks(id),
    case_id UUID REFERENCES health.cases(id),
    PRIMARY KEY (outbreak_id, case_id)
);

-- E. User Management & RBAC  
CREATE TABLE health.users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role health.user_role,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.user_facilities (
    user_id UUID REFERENCES health.users(id),
    facility_id UUID,
    PRIMARY KEY (user_id, facility_id)
);

CREATE TABLE health.user_wards (
    user_id UUID REFERENCES health.users(id),
    ward_id TEXT,
    PRIMARY KEY (user_id, ward_id)
);

-- F. Facilities 
CREATE TABLE health.facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT, -- 'hospital', 'clinic', 'health_station'
    address TEXT,
    district_id TEXT,
    ward_id TEXT,
    lat DECIMAL(10,8),
    lng DECIMAL(11,8),
    capacity INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. Encounters
CREATE TABLE health.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES health.patients(id),
    facility_id UUID REFERENCES health.facilities(id),
    encounter_type TEXT, -- 'outpatient', 'emergency', 'inpatient'
    chief_complaint TEXT,
    triage_level INTEGER, -- ESI 1-5
    status TEXT DEFAULT 'planned', -- 'planned', 'arrived', 'in-progress', 'finished', 'cancelled'
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- H. Appointments
CREATE TABLE health.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES health.patients(id),
    facility_id UUID REFERENCES health.facilities(id),
    practitioner_id UUID,
    appointment_type TEXT,
    scheduled_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'booked', -- 'booked', 'confirmed', 'arrived', 'fulfilled', 'cancelled', 'noshow'
    no_show_risk_score DECIMAL(5,3),
    reminder_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- I. Campaigns
CREATE TABLE health.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT, -- 'vaccination', 'screening', 'education'
    start_date DATE,
    end_date DATE,
    target_population INTEGER,
    status TEXT DEFAULT 'planning', -- 'planning', 'active', 'completed', 'cancelled'
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.campaign_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES health.campaigns(id),
    facility_id UUID REFERENCES health.facilities(id),
    slot_date DATE,
    slot_time TIME,
    capacity INTEGER,
    booked_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- J. Beds Management
CREATE TABLE health.beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES health.facilities(id),
    ward_name TEXT,
    bed_number TEXT,
    bed_type TEXT, -- 'general', 'icu', 'emergency'
    status health.bed_status DEFAULT 'available',
    patient_id UUID,
    barcode TEXT UNIQUE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- K. Inventory & Stocks
CREATE TABLE health.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    type TEXT, -- 'vaccine', 'medication', 'supply'
    unit TEXT,
    manufacturer TEXT,
    cold_chain_required BOOLEAN DEFAULT false,
    shelf_life_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES health.facilities(id),
    item_id UUID REFERENCES health.inventory_items(id),
    batch_number TEXT,
    quantity INTEGER DEFAULT 0,
    reorder_point INTEGER,
    max_stock INTEGER,
    expiry_date DATE,
    status health.stock_status DEFAULT 'in_stock',
    last_movement_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(facility_id, item_id, batch_number)
);

CREATE TABLE health.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES health.facilities(id),
    item_id UUID REFERENCES health.inventory_items(id),
    movement_type TEXT, -- 'in', 'out', 'adjustment', 'expired'
    quantity INTEGER,
    batch_number TEXT,
    reference_id UUID, -- campaign_id, prescription_id, etc
    reason TEXT,
    performed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- L. ETL & Data Ingestion
CREATE TABLE health.etl_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT, -- 'hl7v2', 'csv', 'fhir'
    source_file TEXT,
    target_table TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT,
    processed_rows INTEGER DEFAULT 0,
    total_rows INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- M. Data Quality
CREATE TABLE health.data_quality_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    table_name TEXT,
    column_name TEXT,
    rule_type TEXT, -- 'required', 'format', 'range', 'reference'
    rule_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.dq_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES health.data_quality_rules(id),
    table_name TEXT,
    record_id UUID,
    column_name TEXT,
    error_type TEXT,
    error_message TEXT,
    current_value TEXT,
    suggested_value TEXT,
    status TEXT DEFAULT 'open', -- 'open', 'fixed', 'accepted'
    fixed_by UUID,
    fixed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- N. AI Outputs
CREATE TABLE health.ai_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT, -- 'forecast', 'anomaly', 'cluster', 'no_show'
    target_table TEXT,
    target_id UUID,
    algorithm_used TEXT,
    p10 DECIMAL(10,4),
    p50 DECIMAL(10,4),
    p90 DECIMAL(10,4),
    score DECIMAL(10,4),
    explanation TEXT,
    confidence DECIMAL(5,3),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Trail
CREATE TABLE health.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    table_name TEXT,
    record_id UUID,
    action TEXT, -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_cases_disease_date ON health.cases(disease_code, report_date);
CREATE INDEX idx_cases_location ON health.cases(district_id, ward_id, facility_id);
CREATE INDEX idx_cases_spatial ON health.cases(lat, lng);
CREATE INDEX idx_alerts_status_priority ON health.alerts(status, priority);
CREATE INDEX idx_metrics_date_location ON health.metrics_cases_daily(date, district_id, ward_id);
CREATE INDEX idx_appointments_time ON health.appointments(scheduled_time);
CREATE INDEX idx_stocks_facility_item ON health.stocks(facility_id, item_id);
CREATE INDEX idx_etl_queue_status ON health.etl_queue(status);
CREATE INDEX idx_dq_errors_status ON health.dq_errors(status);

-- Enable RLS on all tables
ALTER TABLE health.metrics_cases_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.metrics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.alert_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.outbreaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.outbreak_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.user_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.user_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.campaign_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.etl_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.data_quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.dq_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.ai_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health.audit_log ENABLE ROW LEVEL SECURITY;