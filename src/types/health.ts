// Shared health types used across BioVault components

export interface UserHealthProfile {
  id: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  medications: string[];
  lastUpdated: string;
  documents: HealthDocument[];
  extractedMetrics: ExtractedMetric[];
  bioShieldScore: number;
}

export interface HealthDocument {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  status: 'processing' | 'analyzed' | 'error';
  extractedData?: Record<string, any>;
  icd11Codes?: string[];
}

export interface ExtractedMetric {
  id: string;
  name: string;
  value: string | number;
  unit?: string;
  category: 'blood' | 'vital' | 'metabolic' | 'organ' | 'allergy';
  icd11Code?: string;
  riskLevel: 'normal' | 'warning' | 'critical';
  extractedFrom: string;
  date: string;
}
