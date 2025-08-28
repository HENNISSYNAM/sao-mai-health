import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { sha256Hex } from '@/lib/crypto'
import type { RealtimeChannel } from '@supabase/supabase-js'

// Types
interface DailyCount {
  day: string
  disease_code: string
  ward_id: string
  district_id: string
  cases: number
  created_at: string
}

interface Alert {
  id: string
  disease_code: string
  day: string
  cases: number
  status: string
  rule?: string
  district_id?: string
  ward_id?: string
  avg7?: number
  created_at: string
  closed_at?: string
}

interface Prediction {
  id: string
  lat: number
  lon: number
  predicted: number
  label: string
  h3?: string
  created_at: string
  model_version?: string
}

interface AlertCandidate {
  disease_code: string
  day: string
  cases: number
  rule: string
  district_id?: string
  ward_id?: string
  avg7?: number
  threshold_daily?: number
  threshold_growth?: number
}

// Global state
interface HealthRealtimeState {
  dailyCounts: DailyCount[]
  alerts: Alert[]
  predictions: Prediction[]
  latestByCell: Map<string, Prediction>
  lastTick: string
  isConnected: boolean
  loading: boolean
}

// Actions
interface HealthRealtimeActions {
  addPatientAndCase: (params: AddPatientParams) => Promise<void>
  closeAlert: (id: string) => Promise<void>
  createAlertFromCandidate: (candidate: AlertCandidate) => Promise<void>
  refreshCandidates: () => Promise<AlertCandidate[]>
  searchNominatim: (query: string) => Promise<any[]>
}

interface AddPatientParams {
  full_name: string
  mpi_raw: string
  birth_year?: number
  gender: 'M' | 'F' | 'O'
  phone?: string
  disease_code: string
  facility_code?: string
  lat?: number
  lon?: number
  symptoms_json?: string
}

interface HealthRealtimeContextType extends HealthRealtimeState, HealthRealtimeActions {}

const HealthRealtimeContext = createContext<HealthRealtimeContextType | null>(null)

// Utility functions
const cellKeyOf = (lat: number, lon: number, h3?: string): string => {
  return h3 || `${lat.toFixed(3)}_${lon.toFixed(3)}`
}

export function HealthRealtimeProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<HealthRealtimeState>({
    dailyCounts: [],
    alerts: [],
    predictions: [],
    latestByCell: new Map(),
    lastTick: new Date().toLocaleTimeString('vi-VN'),
    isConnected: false,
    loading: true
  })

  const channels = useRef<RealtimeChannel[]>([])
  const tickInterval = useRef<NodeJS.Timeout>()

  // Update last tick every second
  useEffect(() => {
    tickInterval.current = setInterval(() => {
      setState(prev => ({
        ...prev,
        lastTick: new Date().toLocaleTimeString('vi-VN')
      }))
    }, 1000)

    return () => {
      if (tickInterval.current) {
        clearInterval(tickInterval.current)
      }
    }
  }, [])

  // Initialize data and subscriptions
  useEffect(() => {
    initializeSystem()
    return cleanup
  }, [])

  const initializeSystem = async () => {
    try {
      // Load initial data
      await loadInitialData()
      
      // Setup realtime subscriptions
      setupRealtimeSubscriptions()
      
      setState(prev => ({ ...prev, loading: false, isConnected: true }))
    } catch (error) {
      console.error('Failed to initialize health realtime system:', error)
      setState(prev => ({ ...prev, loading: false, isConnected: false }))
    }
  }

  const loadInitialData = async () => {
    // For now using mock data since tables structure is not fully available
    const mockDailyCounts: DailyCount[] = []
    const mockAlerts: Alert[] = []
    const mockPredictions: Prediction[] = []

    // Generate mock daily counts for last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayStr = date.toISOString().split('T')[0]
      
      mockDailyCounts.push({
        day: dayStr,
        disease_code: 'dengue',
        ward_id: 'phuong_1',
        district_id: 'quan_1',
        cases: Math.floor(Math.random() * 20) + 5,
        created_at: date.toISOString()
      })
    }

    // Mock alerts
    mockAlerts.push({
      id: 'alert-1',
      disease_code: 'dengue',
      day: new Date().toISOString().split('T')[0],
      cases: 45,
      status: 'open',
      rule: 'Vượt ngưỡng hàng ngày',
      district_id: 'quan_1',
      avg7: 32.5,
      created_at: new Date().toISOString()
    })

    // Mock predictions
    for (let i = 0; i < 50; i++) {
      const lat = 10.7756 + (Math.random() - 0.5) * 0.2
      const lon = 106.7009 + (Math.random() - 0.5) * 0.3
      const predicted = Math.floor(Math.random() * 50) + 50
      
      mockPredictions.push({
        id: `pred-${i}`,
        lat,
        lon,
        predicted,
        label: predicted < 60 ? 'low' : predicted < 80 ? 'medium' : 'high',
        h3: `h3-${i}`,
        created_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        model_version: 'mock-v1'
      })
    }

    // Build latestByCell map
    const latestByCell = new Map<string, Prediction>()
    mockPredictions.forEach(pred => {
      const key = cellKeyOf(pred.lat, pred.lon, pred.h3)
      if (!latestByCell.has(key) || 
          new Date(pred.created_at) > new Date(latestByCell.get(key)!.created_at)) {
        latestByCell.set(key, pred)
      }
    })

    setState(prev => ({
      ...prev,
      dailyCounts: mockDailyCounts,
      alerts: mockAlerts,
      predictions: mockPredictions,
      latestByCell
    }))
  }

  const setupRealtimeSubscriptions = () => {
    // Daily counts subscription
    const countsChannel = supabase
      .channel('daily-counts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_counts' },
        (payload) => handleDailyCountsChange(payload)
      )
      .subscribe()

    // Alerts subscription  
    const alertsChannel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'alerts' },
        (payload) => handleAlertsChange(payload)
      )
      .subscribe()

    // Predictions subscription
    const predsChannel = supabase
      .channel('predictions-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'predictions' },
        (payload) => handlePredictionsChange(payload)
      )
      .subscribe()

    channels.current = [countsChannel, alertsChannel, predsChannel]
  }

  const handleDailyCountsChange = (payload: any) => {
    console.log('Daily counts change:', payload)
    setState(prev => {
      const newDailyCounts = [...prev.dailyCounts]
      const key = `${payload.new.day}-${payload.new.disease_code}-${payload.new.ward_id}-${payload.new.district_id}`
      
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const existingIndex = newDailyCounts.findIndex(dc => 
          dc.day === payload.new.day && 
          dc.disease_code === payload.new.disease_code &&
          dc.ward_id === payload.new.ward_id &&
          dc.district_id === payload.new.district_id
        )
        
        if (existingIndex >= 0) {
          newDailyCounts[existingIndex] = payload.new
        } else {
          newDailyCounts.unshift(payload.new)
        }
      }
      
      return { ...prev, dailyCounts: newDailyCounts }
    })
  }

  const handleAlertsChange = (payload: any) => {
    console.log('Alerts change:', payload)
    setState(prev => {
      const newAlerts = [...prev.alerts]
      
      if (payload.eventType === 'INSERT') {
        newAlerts.unshift(payload.new)
      } else if (payload.eventType === 'UPDATE') {
        const index = newAlerts.findIndex(a => a.id === payload.new.id)
        if (index >= 0) {
          newAlerts[index] = payload.new
        }
      }
      
      return { ...prev, alerts: newAlerts }
    })
  }

  const handlePredictionsChange = (payload: any) => {
    console.log('Predictions change:', payload)
    setState(prev => {
      const newPredictions = [payload.new, ...prev.predictions.slice(0, 199)]
      const newLatestByCell = new Map(prev.latestByCell)
      
      const key = cellKeyOf(payload.new.lat, payload.new.lon, payload.new.h3)
      if (!newLatestByCell.has(key) || 
          new Date(payload.new.created_at) > new Date(newLatestByCell.get(key)!.created_at)) {
        newLatestByCell.set(key, payload.new)
      }
      
      return {
        ...prev,
        predictions: newPredictions,
        latestByCell: newLatestByCell
      }
    })
  }

  const cleanup = () => {
    channels.current.forEach(channel => {
      supabase.removeChannel(channel)
    })
    if (tickInterval.current) {
      clearInterval(tickInterval.current)
    }
  }

  // Actions
  const addPatientAndCase = useCallback(async (params: AddPatientParams) => {
    try {
      // Hash MPI
      const mpi_hash = await sha256Hex(params.mpi_raw)
      
      // Parse symptoms
      let symptoms = {}
      if (params.symptoms_json) {
        try {
          symptoms = JSON.parse(params.symptoms_json)
        } catch (e) {
          console.warn('Invalid symptoms JSON:', e)
        }
      }

      // Call RPC (mock for now)
      console.log('Would call add_patient_and_case RPC with:', {
        p_full_name: params.full_name,
        p_mpi_hash: mpi_hash,
        p_birth_year: params.birth_year || null,
        p_gender: params.gender,
        p_phone: params.phone || null,
        p_disease_code: params.disease_code,
        p_facility_code: params.facility_code || null,
        p_lat: params.lat || null,
        p_lon: params.lon || null,
        p_symptoms: symptoms
      })

      // Mock prediction call if coordinates provided
      if (params.lat && params.lon) {
        const API_PREDICT_URL = import.meta.env.VITE_API_PREDICT_URL
        
        if (API_PREDICT_URL) {
          // Real API call
          await fetch(`${API_PREDICT_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              events: [{
                lat: params.lat,
                lon: params.lon,
                observed_at: new Date().toISOString(),
                features: { disease_code: params.disease_code }
              }]
            })
          })
        } else {
          // Mock prediction
          const mockPred: Prediction = {
            id: `mock-${Date.now()}`,
            lat: params.lat,
            lon: params.lon,
            predicted: Math.floor(Math.random() * 50) + 50,
            label: 'medium',
            h3: `mock-h3-${Date.now()}`,
            created_at: new Date().toISOString(),
            model_version: 'mock'
          }
          
          setState(prev => {
            const newPredictions = [mockPred, ...prev.predictions.slice(0, 199)]
            const newLatestByCell = new Map(prev.latestByCell)
            const key = cellKeyOf(mockPred.lat, mockPred.lon, mockPred.h3)
            newLatestByCell.set(key, mockPred)
            
            return {
              ...prev,
              predictions: newPredictions,
              latestByCell: newLatestByCell
            }
          })
        }
      }
    } catch (error) {
      console.error('Error adding patient and case:', error)
      throw error
    }
  }, [])

  const closeAlert = useCallback(async (id: string) => {
    try {
      // Mock UPDATE query
      console.log('Would UPDATE alerts SET status=closed, closed_at=now() WHERE id=', id)
      
      setState(prev => ({
        ...prev,
        alerts: prev.alerts.map(alert =>
          alert.id === id
            ? { ...alert, status: 'closed', closed_at: new Date().toISOString() }
            : alert
        )
      }))
    } catch (error) {
      console.error('Error closing alert:', error)
      throw error
    }
  }, [])

  const createAlertFromCandidate = useCallback(async (candidate: AlertCandidate) => {
    try {
      const newAlert: Alert = {
        id: `alert-${Date.now()}`,
        disease_code: candidate.disease_code,
        day: candidate.day,
        cases: candidate.cases,
        status: 'open',
        rule: candidate.rule,
        district_id: candidate.district_id,
        ward_id: candidate.ward_id,
        avg7: candidate.avg7,
        created_at: new Date().toISOString()
      }
      
      setState(prev => ({
        ...prev,
        alerts: [newAlert, ...prev.alerts]
      }))
    } catch (error) {
      console.error('Error creating alert:', error)
      throw error
    }
  }, [])

  const refreshCandidates = useCallback(async (): Promise<AlertCandidate[]> => {
    // Mock candidates data
    return [
      {
        disease_code: 'dengue',
        day: new Date().toISOString().split('T')[0],
        cases: 45,
        rule: 'Vượt ngưỡng hàng ngày',
        district_id: 'quan_1',
        avg7: 35.2,
        threshold_daily: 40
      },
      {
        disease_code: 'ari',
        day: new Date().toISOString().split('T')[0],
        cases: 32,
        rule: 'Tăng trưởng nhanh',
        district_id: 'quan_3',
        avg7: 22.5,
        threshold_growth: 2.0
      }
    ]
  }, [])

  const searchNominatim = useCallback(async (query: string) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(query)}`
      )
      return await response.json()
    } catch (error) {
      console.error('Nominatim search error:', error)
      return []
    }
  }, [])

  const contextValue: HealthRealtimeContextType = {
    ...state,
    addPatientAndCase,
    closeAlert,
    createAlertFromCandidate,
    refreshCandidates,
    searchNominatim
  }

  return (
    <HealthRealtimeContext.Provider value={contextValue}>
      {children}
    </HealthRealtimeContext.Provider>
  )
}

export function useHealthRealtime() {
  const context = useContext(HealthRealtimeContext)
  if (!context) {
    throw new Error('useHealthRealtime must be used within HealthRealtimeProvider')
  }
  return context
}