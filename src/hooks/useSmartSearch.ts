import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchSuggestion {
  id: string;
  label: string;
  type: 'appointment' | 'campaign';
  icon: string;
  data: Record<string, any>;
}

interface AppointmentData {
  id: string;
  patient_name: string;
  facility: string;
  appointment_date: string;
}

interface CampaignData {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

// Function to normalize search term (remove accents, lowercase, trim)
const normalizeSearchTerm = (term: string): string => {
  if (!term || term.length < 2) return '';
  
  // Simple accent removal for Vietnamese characters
  const accents: Record<string, string> = {
    'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
    'đ': 'd'
  };
  
  let normalized = term.toLowerCase().trim();
  
  // Replace accented characters
  for (const [accented, plain] of Object.entries(accents)) {
    const regex = new RegExp(accented, 'g');
    normalized = normalized.replace(regex, plain);
  }
  
  return normalized;
};

export const useSmartSearch = (term: string) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce search term to avoid too many API calls
  const debouncedTerm = useDebounce(term, 250);
  
  // Normalize the search term
  const normalizedTerm = useMemo(() => normalizeSearchTerm(debouncedTerm), [debouncedTerm]);
  
  const searchFunction = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Search pattern for PostgreSQL ILIKE
      const searchPattern = `%${searchTerm}%`;
      
      // Search appointments
      const appointmentsResponse = await supabase
        .from('appointments')
        .select('id, patient_name, facility, appointment_date')
        .or(`patient_name.ilike.${searchPattern},facility.ilike.${searchPattern}`)
        .limit(5);
      
      // Search campaigns
      const campaignsResponse = await supabase
        .from('campaigns')
        .select('id, name, description, status')
        .or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`)
        .limit(5);
      
      const combinedSuggestions: SearchSuggestion[] = [];
      
      // Add appointment suggestions
      if (appointmentsResponse.data) {
        const appointments = appointmentsResponse.data as AppointmentData[];
        appointments.forEach((appointment) => {
          combinedSuggestions.push({
            id: appointment.id,
            label: `${appointment.patient_name} - ${appointment.facility} (${appointment.appointment_date})`,
            type: 'appointment',
            icon: 'Calendar',
            data: appointment
          });
        });
      }
      
      // Add campaign suggestions
      if (campaignsResponse.data) {
        const campaigns = campaignsResponse.data as CampaignData[];
        campaigns.forEach((campaign) => {
          combinedSuggestions.push({
            id: campaign.id,
            label: `${campaign.name} - ${campaign.status}`,
            type: 'campaign',
            icon: 'Megaphone',
            data: campaign
          });
        });
      }
      
      setSuggestions(combinedSuggestions);
      
      // Log any errors but don't throw
      if (appointmentsResponse.error) {
        console.error('Appointments search error:', appointmentsResponse.error);
      }
      if (campaignsResponse.error) {
        console.error('Campaigns search error:', campaignsResponse.error);
      }
      
    } catch (err) {
      console.error('Search error:', err);
      setError('Lỗi tìm kiếm');
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    searchFunction(normalizedTerm);
  }, [normalizedTerm, searchFunction]);
  
  // Function to handle selection (navigate to appointment or campaign)
  const handleSelect = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'appointment') {
      window.location.href = '/appointments';
    } else if (suggestion.type === 'campaign') {
      window.location.href = '/campaigns';
    }
  }, []);
  
  return {
    suggestions,
    loading,
    error,
    handleSelect,
    normalizedTerm
  };
};