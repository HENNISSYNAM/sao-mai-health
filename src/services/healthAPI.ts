import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

// Type definitions for all health modules
export type CaseIntakeData = {
  name_hash: string
  dob: string
  gender: string
  address_hash: string
  phone_hash: string
  disease_code: 'dengue' | 'tcm' | 'ari' | 'covid19' | 'influenza' | 'measles' | 'other'
  status?: 'suspected' | 'probable' | 'confirmed' | 'ruled_out' | 'pending'
  onset_date: string
  report_date?: string
  district_id: string
  ward_id: string
  facility_id: string
  lat?: number
  lng?: number
}

export type LabData = {
  case_id: string
  loinc_code: string
  value: string
  unit: string
  observed_date?: string
}

export type BedData = {
  id: string
  status: 'available' | 'occupied' | 'maintenance' | 'reserved'
  patient_id?: string
}

export type CampaignData = {
  name: string
  type: string
  start_date: string
  end_date: string
  target_population: number
}

// Health API Service with all RPC functions
export class HealthAPI {
  // Module A: Dashboard Metrics
  static async getDashboardMetrics() {
    const { data, error } = await supabase.rpc('fn_get_dashboard_metrics')
    if (error) throw error
    return data
  }

  // Module B: Case Intake (30s entry)
  static async intakeCaseFast(caseData: CaseIntakeData) {
    const { data, error } = await supabase.rpc('fn_cases_intake_fast', {
      p_data: caseData
    })
    if (error) throw error
    return data[0] // First row contains the result
  }

  // Module C: Lab Bulk Ingest
  static async ingestLabResults(labRows: LabData[]) {
    const { data, error } = await supabase.rpc('fn_lab_bulk_ingest', {
      p_rows: labRows
    })
    if (error) throw error
    return data[0]
  }

  // Module D: Alert Management
  static async acknowledgeAlert(alertId: string, assigneeId?: string) {
    const { data, error } = await supabase.rpc('fn_alert_acknowledge', {
      p_alert_id: alertId,
      p_assignee: assigneeId
    })
    if (error) throw error
    return data[0]
  }

  // Module E: Bed Management
  static async bulkUpdateBeds(beds: BedData[]) {
    const { data, error } = await supabase.rpc('fn_bed_bulk_update', {
      p_beds: beds
    })
    if (error) throw error
    return data[0]
  }

  // Module F: Inventory Management
  static async reserveInventory(itemId: string, quantity: number, campaignId?: string) {
    const { data, error } = await supabase.rpc('fn_inventory_reserve', {
      p_item_id: itemId,
      p_quantity: quantity,
      p_campaign_id: campaignId
    })
    if (error) throw error
    return data[0]
  }

  // Module G: Campaign Scheduling
  static async scheduleCampaign(campaignData: CampaignData) {
    const { data, error } = await supabase.rpc('fn_schedule_campaign', {
      p_campaign: campaignData
    })
    if (error) throw error
    return data[0]
  }

  // CRUD operations for all health tables
  static async getCases(filters?: {
    disease_code?: string
    status?: string
    district_id?: string
    limit?: number
  }) {
    let query = supabase
      .from('cases')
      .select(`
        *,
        patients(name_hash, dob, gender),
        facilities(name, code)
      `)
      .order('created_at', { ascending: false })

    if (filters?.disease_code) {
      query = query.eq('disease_code', filters.disease_code)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.district_id) {
      query = query.eq('district_id', filters.district_id)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getAlerts(filters?: {
    status?: string
    priority?: string
    limit?: number
  }) {
    let query = supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters?.limit) {
      query = query.limit(filters.limit)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getBeds(facilityId?: string) {
    let query = supabase
      .from('beds')
      .select(`
        *,
        facilities(name, code)
      `)
      .order('bed_number')

    if (facilityId) {
      query = query.eq('facility_id', facilityId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getCampaigns(status?: string) {
    let query = supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getStocks(facilityId?: string) {
    let query = supabase
      .from('stocks')
      .select(`
        *,
        inventory_items(name, code, type),
        facilities(name, code)
      `)
      .order('last_movement_at', { ascending: false })

    if (facilityId) {
      query = query.eq('facility_id', facilityId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getDataQualityErrors(status?: string) {
    let query = supabase
      .from('dq_errors')
      .select(`
        *,
        data_quality_rules(name, description)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getETLQueue(status?: string) {
    let query = supabase
      .from('etl_queue')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getFacilities(type?: string) {
    let query = supabase
      .from('facilities')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getOutbreaks(status?: string) {
    let query = supabase
      .from('outbreaks')
      .select(`
        *,
        outbreak_cases(
          cases(id, disease_code, lat, lng, report_date)
        )
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getAppointments(facilityId?: string, date?: string) {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        patients(name_hash, phone_hash),
        facilities(name, code)
      `)
      .order('scheduled_time')

    if (facilityId) {
      query = query.eq('facility_id', facilityId)
    }
    if (date) {
      query = query.gte('scheduled_time', `${date}T00:00:00`)
        .lt('scheduled_time', `${date}T23:59:59`)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getEncounters(facilityId?: string, status?: string) {
    let query = supabase
      .from('encounters')
      .select(`
        *,
        patients(name_hash, dob, gender),
        facilities(name, code)
      `)
      .order('created_at', { ascending: false })

    if (facilityId) {
      query = query.eq('facility_id', facilityId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  static async getAIOutputs(type?: string, targetTable?: string) {
    let query = supabase
      .from('ai_outputs')
      .select('*')
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }
    if (targetTable) {
      query = query.eq('target_table', targetTable)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }
}