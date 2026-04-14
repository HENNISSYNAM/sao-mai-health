-- Create health schema and all required tables with proper constraints and indexes
CREATE SCHEMA IF NOT EXISTS health;

-- Create enum types
CREATE TYPE health.role_type AS ENUM ('admin_doh', 'hospital_data_admin', 'epi_officer_cdc', 'health_worker_ward', 'research_analyst');
CREATE TYPE health.consent_status AS ENUM ('active', 'inactive', 'revoked', 'expired');
CREATE TYPE health.appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE health.alert_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE health.audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'SELECT');

-- Facilities table
CREATE TABLE health.facilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- hospital, clinic, laboratory, etc.
    address TEXT,
    district TEXT,
    ward TEXT,
    coordinates POINT,
    capacity INTEGER DEFAULT 0,
    icu_capacity INTEGER DEFAULT 0,
    contact_info JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients table
CREATE TABLE health.patients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id TEXT UNIQUE NOT NULL, -- External patient identifier
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    gender TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    district TEXT,
    ward TEXT,
    emergency_contact JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patient identifiers for MPI
CREATE TABLE health.patient_identifiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES health.patients(id) ON DELETE CASCADE,
    identifier_type TEXT NOT NULL, -- national_id, passport, insurance, etc.
    identifier_value TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(identifier_type, identifier_value)
);

-- Encounters table
CREATE TABLE health.encounters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES health.patients(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES health.facilities(id),
    encounter_type TEXT NOT NULL, -- admission, outpatient, emergency, etc.
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    diagnosis_primary TEXT,
    diagnosis_secondary TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Observations table
CREATE TABLE health.observations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES health.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES health.encounters(id),
    observation_type TEXT NOT NULL, -- vital_signs, lab_result, etc.
    code TEXT, -- LOINC code
    value_numeric DECIMAL,
    value_text TEXT,
    value_boolean BOOLEAN,
    unit TEXT,
    reference_range TEXT,
    status TEXT DEFAULT 'final',
    observed_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conditions table
CREATE TABLE health.conditions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES health.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES health.encounters(id),
    condition_code TEXT, -- ICD-10 code
    condition_name TEXT NOT NULL,
    severity TEXT,
    onset_date DATE,
    resolution_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab results table
CREATE TABLE health.lab_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES health.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES health.encounters(id),
    test_code TEXT, -- LOINC code
    test_name TEXT NOT NULL,
    result_value TEXT,
    reference_range TEXT,
    unit TEXT,
    status TEXT DEFAULT 'final',
    collection_date TIMESTAMPTZ,
    result_date TIMESTAMPTZ DEFAULT NOW(),
    lab_facility_id UUID REFERENCES health.facilities(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Immunizations table
CREATE TABLE health.immunizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES health.patients(id) ON DELETE CASCADE,
    vaccine_code TEXT NOT NULL, -- CVX code
    vaccine_name TEXT NOT NULL,
    dose_number INTEGER,
    total_doses INTEGER,
    administration_date DATE NOT NULL,
    facility_id UUID REFERENCES health.facilities(id),
    lot_number TEXT,
    expiration_date DATE,
    route TEXT,
    site TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stocks table for inventory management
CREATE TABLE health.stocks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    facility_id UUID REFERENCES health.facilities(id),
    item_type TEXT NOT NULL, -- vaccine, medication, supplies
    item_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    current_stock INTEGER DEFAULT 0,
    minimum_stock INTEGER DEFAULT 0,
    maximum_stock INTEGER DEFAULT 0,
    unit TEXT NOT NULL,
    cost_per_unit DECIMAL(10,2),
    expiration_date DATE,
    batch_number TEXT,
    temperature_range TEXT, -- for cold chain
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cases table for disease surveillance
CREATE TABLE health.cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES health.patients(id) ON DELETE CASCADE,
    disease_code TEXT, -- ICD-10 or custom disease code
    disease_name TEXT NOT NULL,
    case_status TEXT DEFAULT 'suspected', -- suspected, probable, confirmed
    onset_date DATE,
    report_date DATE DEFAULT CURRENT_DATE,
    facility_id UUID REFERENCES health.facilities(id),
    ward TEXT,
    district TEXT,
    coordinates POINT,
    investigation_status TEXT DEFAULT 'pending',
    outcome TEXT, -- recovered, died, unknown
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table for contact tracing
CREATE TABLE health.contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES health.cases(id) ON DELETE CASCADE,
    contact_patient_id UUID REFERENCES health.patients(id),
    contact_type TEXT NOT NULL, -- household, workplace, community
    exposure_date DATE,
    last_contact_date DATE,
    follow_up_start_date DATE,
    follow_up_end_date DATE,
    risk_level TEXT DEFAULT 'low', -- low, medium, high
    monitoring_status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaigns table for vaccination/screening campaigns
CREATE TABLE health.campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL, -- vaccination, screening, education
    target_disease TEXT,
    target_population TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_wards TEXT[],
    target_age_min INTEGER,
    target_age_max INTEGER,
    status TEXT DEFAULT 'planned', -- planned, active, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE health.appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID REFERENCES health.patients(id) ON DELETE CASCADE,
    facility_id UUID REFERENCES health.facilities(id),
    campaign_id UUID REFERENCES health.campaigns(id),
    appointment_type TEXT NOT NULL, -- vaccination, screening, consultation
    scheduled_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status health.appointment_status DEFAULT 'scheduled',
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table for early warning system
CREATE TABLE health.alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alert_type TEXT NOT NULL, -- outbreak, stock_shortage, anomaly
    disease_code TEXT,
    facility_id UUID REFERENCES health.facilities(id),
    ward TEXT,
    district TEXT,
    level health.alert_level DEFAULT 'low',
    title TEXT NOT NULL,
    description TEXT,
    threshold_value DECIMAL,
    current_value DECIMAL,
    alert_date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active', -- active, acknowledged, resolved
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Code tables for standardization
CREATE TABLE health.codes_icd (
    code TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT,
    subcategory TEXT,
    version TEXT DEFAULT 'ICD-10',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.codes_loinc (
    code TEXT PRIMARY KEY,
    long_common_name TEXT NOT NULL,
    short_name TEXT,
    component TEXT,
    property TEXT,
    time_aspect TEXT,
    system TEXT,
    scale_type TEXT,
    method_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE health.codes_snomed (
    code TEXT PRIMARY KEY,
    preferred_term TEXT NOT NULL,
    fully_specified_name TEXT,
    concept_id TEXT,
    semantic_tag TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consent management
CREATE TABLE health.consents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID REFERENCES health.patients(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL, -- research, treatment, data_sharing
    purpose_details TEXT,
    status health.consent_status DEFAULT 'active',
    start_date DATE NOT NULL,
    end_date DATE,
    granted_by TEXT, -- patient, guardian, power_of_attorney
    granted_date TIMESTAMPTZ DEFAULT NOW(),
    revoked_date TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE health.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action health.audit_action NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    changed_columns TEXT[],
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- User roles table for RBAC
CREATE TABLE health.user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL, -- References auth.users
    role health.role_type NOT NULL,
    facility_id UUID REFERENCES health.facilities(id), -- For hospital_data_admin
    ward TEXT, -- For health_worker_ward
    granted_by UUID,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role, facility_id, ward)
);

-- Create indexes for performance
CREATE INDEX idx_patients_patient_id ON health.patients(patient_id);
CREATE INDEX idx_patients_district_ward ON health.patients(district, ward);
CREATE INDEX idx_patient_identifiers_type_value ON health.patient_identifiers(identifier_type, identifier_value);
CREATE INDEX idx_encounters_patient_facility ON health.encounters(patient_id, facility_id);
CREATE INDEX idx_encounters_dates ON health.encounters(start_date, end_date);
CREATE INDEX idx_observations_patient_type ON health.observations(patient_id, observation_type);
CREATE INDEX idx_observations_code ON health.observations(code);
CREATE INDEX idx_observations_date ON health.observations(observed_date);
CREATE INDEX idx_conditions_patient_code ON health.conditions(patient_id, condition_code);
CREATE INDEX idx_lab_results_patient_test ON health.lab_results(patient_id, test_code);
CREATE INDEX idx_lab_results_dates ON health.lab_results(collection_date, result_date);
CREATE INDEX idx_immunizations_patient_vaccine ON health.immunizations(patient_id, vaccine_code);
CREATE INDEX idx_immunizations_date ON health.immunizations(administration_date);
CREATE INDEX idx_stocks_facility_item ON health.stocks(facility_id, item_code);
CREATE INDEX idx_cases_disease_date ON health.cases(disease_code, report_date);
CREATE INDEX idx_cases_location ON health.cases(district, ward);
CREATE INDEX idx_cases_coordinates ON health.cases USING GIST(coordinates);
CREATE INDEX idx_contacts_case_patient ON health.contacts(case_id, contact_patient_id);
CREATE INDEX idx_contacts_dates ON health.contacts(exposure_date, follow_up_start_date, follow_up_end_date);
CREATE INDEX idx_campaigns_dates ON health.campaigns(start_date, end_date);
CREATE INDEX idx_campaigns_target ON health.campaigns USING GIN(target_wards);
CREATE INDEX idx_appointments_patient_facility ON health.appointments(patient_id, facility_id);
CREATE INDEX idx_appointments_scheduled_date ON health.appointments(scheduled_date);
CREATE INDEX idx_alerts_type_level ON health.alerts(alert_type, level);
CREATE INDEX idx_alerts_location ON health.alerts(district, ward);
CREATE INDEX idx_alerts_date ON health.alerts(alert_date);
CREATE INDEX idx_consents_subject_purpose ON health.consents(subject_id, purpose);
CREATE INDEX idx_consents_status_dates ON health.consents(status, start_date, end_date);
CREATE INDEX idx_audit_logs_user_table ON health.audit_logs(user_id, table_name);
CREATE INDEX idx_audit_logs_timestamp ON health.audit_logs(timestamp);
CREATE INDEX idx_user_roles_user_role ON health.user_roles(user_id, role);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION health.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON health.facilities FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON health.patients FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_encounters_updated_at BEFORE UPDATE ON health.encounters FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_observations_updated_at BEFORE UPDATE ON health.observations FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_conditions_updated_at BEFORE UPDATE ON health.conditions FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_lab_results_updated_at BEFORE UPDATE ON health.lab_results FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_immunizations_updated_at BEFORE UPDATE ON health.immunizations FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON health.stocks FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON health.cases FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON health.contacts FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON health.campaigns FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON health.appointments FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON health.alerts FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();
CREATE TRIGGER update_consents_updated_at BEFORE UPDATE ON health.consents FOR EACH ROW EXECUTE FUNCTION health.update_updated_at_column();