import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useDebounce } from './useDebounce'

export interface SurveillanceCase {
  id: string
  occurred_at: string
  disease_code: string
  patient_hash: string | null
  patient_age_bucket: string | null
  patient_gender: string | null
  symptoms: any
  ward_id: string | null
  district_id: string | null
  facility_id: string | null
  patient_name: string | null
  patient_phone: string | null
  facility_name: string | null
  status: string
  source: string | null
}

interface UseSurveillanceSearchOptions {
  searchTerm: string
  diseaseFilter: string
  statusFilter: string
  dateFrom?: string
  dateTo?: string
  districtFilter?: string
  ageFilter?: string
  genderFilter?: string
  pageSize: number
  currentPage: number
}

export function useSurveillanceSearch({
  searchTerm,
  diseaseFilter, 
  statusFilter,
  dateFrom,
  dateTo,
  districtFilter,
  ageFilter,
  genderFilter,
  pageSize,
  currentPage
}: UseSurveillanceSearchOptions) {
  const [cases, setCases] = useState<SurveillanceCase[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    suspected: 0,
    todayCases: 0
  })
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  const searchQuery = useMemo(() => {
    let query = supabase
      .from('case_events')
      .select(`
        id,
        occurred_at,
        disease_code,
        patient_hash,
        patient_age_bucket,
        patient_gender,
        symptoms,
        ward_id,
        district_id,
        facility_id,
        source,
        patients(full_name, phone),
        health_facilities(name)
      `, { count: 'exact' })
      .order('occurred_at', { ascending: false })

    // Search filter
    if (debouncedSearchTerm) {
      query = query.or(`
        id.ilike.%${debouncedSearchTerm}%,
        patient_hash.ilike.%${debouncedSearchTerm}%,
        disease_code.ilike.%${debouncedSearchTerm}%,
        ward_id.ilike.%${debouncedSearchTerm}%,
        district_id.ilike.%${debouncedSearchTerm}%
      `)
    }

    // Disease filter
    if (diseaseFilter && diseaseFilter !== 'all') {
      query = query.eq('disease_code', diseaseFilter)
    }

    // Status filter - derived from symptoms
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'confirmed') {
        query = query.contains('symptoms', { confirmed: true })
      } else if (statusFilter === 'probable') {
        query = query.contains('symptoms', { probable: true })
      } else if (statusFilter === 'suspected') {
        query = query.not('symptoms', 'cs', { confirmed: true, probable: true })
      }
    }

    // Date range filter
    if (dateFrom) {
      query = query.gte('occurred_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('occurred_at', dateTo + 'T23:59:59')
    }

    // District filter
    if (districtFilter && districtFilter !== 'all') {
      query = query.eq('district_id', districtFilter)
    }

    // Age filter
    if (ageFilter && ageFilter !== 'all') {
      query = query.eq('patient_age_bucket', ageFilter)
    }

    // Gender filter
    if (genderFilter && genderFilter !== 'all') {
      query = query.eq('patient_gender', genderFilter)
    }

    // Pagination
    const from = (currentPage - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    return query
  }, [debouncedSearchTerm, diseaseFilter, statusFilter, dateFrom, dateTo, districtFilter, ageFilter, genderFilter, currentPage, pageSize])

  useEffect(() => {
    const fetchCases = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const { data, error: fetchError, count } = await searchQuery
        
        if (fetchError) {
          throw fetchError
        }

        const formattedCases: SurveillanceCase[] = (data || []).map(caseEvent => ({
          id: caseEvent.id,
          occurred_at: caseEvent.occurred_at,
          disease_code: caseEvent.disease_code,
          patient_hash: caseEvent.patient_hash,
          patient_age_bucket: caseEvent.patient_age_bucket,
          patient_gender: caseEvent.patient_gender,
          symptoms: caseEvent.symptoms,
          ward_id: caseEvent.ward_id,
          district_id: caseEvent.district_id,
          facility_id: caseEvent.facility_id,
          source: caseEvent.source,
          patient_name: (caseEvent.patients as any)?.full_name || null,
          patient_phone: (caseEvent.patients as any)?.phone || null,
          facility_name: (caseEvent.health_facilities as any)?.name || null,
          status: (caseEvent.symptoms as any)?.confirmed ? 'confirmed' : 
                 (caseEvent.symptoms as any)?.probable ? 'probable' : 'suspected'
        }))

        setCases(formattedCases)
        setTotalCount(count || 0)

        // Calculate stats
        const confirmed = formattedCases.filter(c => c.status === 'confirmed').length
        const suspected = formattedCases.filter(c => c.status === 'suspected').length
        const today = new Date().toISOString().split('T')[0]
        const todayCases = formattedCases.filter(c => c.occurred_at.startsWith(today)).length

        setStats({
          total: count || 0,
          confirmed,
          suspected,
          todayCases
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        setCases([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchCases()
  }, [searchQuery])

  const exportToCSV = () => {
    const headers = [
      'Mã ca',
      'Bệnh nhân', 
      'Tuổi/Giới',
      'Bệnh',
      'Trạng thái',
      'Cơ sở y tế',
      'Địa điểm',
      'Nguồn',
      'Ngày báo cáo'
    ]
    
    const csvData = cases.map(case_ => [
      case_.id,
      case_.patient_name || case_.patient_hash || 'N/A',
      `${case_.patient_age_bucket || 'N/A'}/${case_.patient_gender || 'N/A'}`,
      case_.disease_code,
      case_.status === 'confirmed' ? 'Xác nhận' : 
      case_.status === 'probable' ? 'Có thể' : 'Nghi ngờ',
      case_.facility_name || 'N/A',
      `${case_.ward_id || 'N/A'}, ${case_.district_id || 'N/A'}`,
      case_.source || 'N/A',
      new Date(case_.occurred_at).toLocaleDateString('vi-VN')
    ])

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `surveillance_cases_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return {
    cases,
    totalCount,
    loading,
    error,
    stats,
    exportToCSV
  }
}
