import { supabase } from '@/integrations/supabase/client'

// Type definitions for all health modules
export type CaseIntakeData = {
  name_hash: string
  dob: string
  gender: 'male' | 'female' | 'other'
  address_hash: string
  phone_hash: string
  disease_code: 'dengue' | 'tcm' | 'ari' | 'covid19' | 'influenza' | 'measles' | 'other'
  status: 'suspected' | 'probable' | 'confirmed' | 'ruled_out' | 'pending'
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

// Health API Service with mock implementations for now
export class HealthAPI {
  // Module A: Dashboard Metrics
  static async getDashboardMetrics() {
    return [
      { metric_name: 'Ca mới hôm nay', value: 42, change: { value: 12, type: 'increase' as const }, trend: 42, last_updated: new Date().toISOString() },
      { metric_name: 'Rt 7 ngày', value: 1.2, change: { value: 0.1, type: 'increase' as const }, trend: 1.2, last_updated: new Date().toISOString() },
      { metric_name: 'Công suất giường', value: 85, change: { value: 5, type: 'decrease' as const }, trend: 85, last_updated: new Date().toISOString() },
      { metric_name: 'Bao phủ vaccine', value: 78, change: { value: 2, type: 'increase' as const }, trend: 78, last_updated: new Date().toISOString() },
      { metric_name: 'Cảnh báo tồn kho', value: 3, change: { value: 1, type: 'decrease' as const }, trend: 3, last_updated: new Date().toISOString() },
      { metric_name: 'Cảnh báo mở', value: 7, change: { value: 2, type: 'increase' as const }, trend: 7, last_updated: new Date().toISOString() }
    ]
  }

  // Module B: Case Intake (30s entry)
  static async intakeCaseFast(caseData: CaseIntakeData) {
    return {
      success: true,
      case_id: `case_${Date.now()}`,
      patient_id: `patient_${Date.now()}`,
      message: 'Case created successfully'
    }
  }

  // Mock implementations for all other methods
  static async ingestLabResults(labRows: LabData[]) {
    return { success: true, processed: labRows.length }
  }

  static async acknowledgeAlert(alertId: string, assigneeId?: string) {
    return { success: true, message: 'Alert acknowledged' }
  }

  static async bulkUpdateBeds(beds: BedData[]) {
    return { success: true, updated: beds.length }
  }

  static async reserveInventory(itemId: string, quantity: number, campaignId?: string) {
    return { success: true, reserved: quantity }
  }

  static async scheduleCampaign(campaignData: CampaignData) {
    return { success: true, campaign_id: `campaign_${Date.now()}` }
  }

  static async getCases(filters?: any) {
    return [
      {
        id: 'case_1',
        case_number: 'CASE-001',
        patient_name: 'Nguyen Van A',
        disease_code: 'dengue',
        status: 'confirmed',
        onset_date: '2024-08-20',
        facility_name: 'BV Chợ Rẫy',
        created_at: '2024-08-20T10:00:00Z'
      }
    ]
  }

  static async getAlerts(filters?: any) {
    return [
      {
        id: 'alert_1',
        type: 'outbreak' as const,
        title: 'Potential dengue outbreak',
        description: 'Cluster detected in District 1',
        priority: 'high' as const,
        status: 'backlog' as const,
        location: 'District 1',
        disease_code: 'dengue',
        created_at: '2024-08-20T10:00:00Z'
      }
    ]
  }

  static async getBeds(facilityId?: string) {
    return []
  }

  static async getCampaigns(status?: string) {
    return []
  }

  static async getStocks(facilityId?: string) {
    return []
  }

  static async getDataQualityErrors(status?: string) {
    return []
  }

  static async getETLQueue(status?: string) {
    return []
  }

  static async getFacilities(type?: string) {
    return []
  }

  static async getOutbreaks(status?: string) {
    return []
  }

  static async getAppointments(facilityId?: string, date?: string) {
    return []
  }

  static async getEncounters(facilityId?: string, status?: string) {
    return []
  }

  static async getAIOutputs(type?: string, targetTable?: string) {
    return []
  }
}