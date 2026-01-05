// Global Administrative Hierarchy System
// Supports dynamic Country > State/Province > City/District > Ward/Commune

export interface AdminRegion {
  id: string;
  name: string;
  nameLocal: string;
  type: 'country' | 'state' | 'city' | 'ward';
  parentId?: string;
  code?: string;
  coordinates?: [number, number]; // [lat, lng]
}

// Countries supported
export const COUNTRIES: AdminRegion[] = [
  { id: 'VN', name: 'Vietnam', nameLocal: 'Việt Nam', type: 'country', code: 'VN', coordinates: [14.0583, 108.2772] },
  { id: 'TH', name: 'Thailand', nameLocal: 'ประเทศไทย', type: 'country', code: 'TH', coordinates: [15.8700, 100.9925] },
  { id: 'ID', name: 'Indonesia', nameLocal: 'Indonesia', type: 'country', code: 'ID', coordinates: [-0.7893, 113.9213] },
  { id: 'PH', name: 'Philippines', nameLocal: 'Pilipinas', type: 'country', code: 'PH', coordinates: [12.8797, 121.7740] },
  { id: 'MY', name: 'Malaysia', nameLocal: 'Malaysia', type: 'country', code: 'MY', coordinates: [4.2105, 101.9758] },
  { id: 'SG', name: 'Singapore', nameLocal: 'Singapore', type: 'country', code: 'SG', coordinates: [1.3521, 103.8198] },
  { id: 'MM', name: 'Myanmar', nameLocal: 'မြန်မာ', type: 'country', code: 'MM', coordinates: [21.9162, 95.9560] },
  { id: 'KH', name: 'Cambodia', nameLocal: 'កម្ពុជា', type: 'country', code: 'KH', coordinates: [12.5657, 104.9910] },
  { id: 'LA', name: 'Laos', nameLocal: 'ລາວ', type: 'country', code: 'LA', coordinates: [19.8563, 102.4955] },
  { id: 'BN', name: 'Brunei', nameLocal: 'Brunei', type: 'country', code: 'BN', coordinates: [4.5353, 114.7277] },
  // More countries can be added
  { id: 'US', name: 'United States', nameLocal: 'United States', type: 'country', code: 'US', coordinates: [37.0902, -95.7129] },
  { id: 'GB', name: 'United Kingdom', nameLocal: 'United Kingdom', type: 'country', code: 'GB', coordinates: [55.3781, -3.4360] },
  { id: 'FR', name: 'France', nameLocal: 'France', type: 'country', code: 'FR', coordinates: [46.2276, 2.2137] },
  { id: 'DE', name: 'Germany', nameLocal: 'Deutschland', type: 'country', code: 'DE', coordinates: [51.1657, 10.4515] },
  { id: 'JP', name: 'Japan', nameLocal: '日本', type: 'country', code: 'JP', coordinates: [36.2048, 138.2529] },
  { id: 'KR', name: 'South Korea', nameLocal: '대한민국', type: 'country', code: 'KR', coordinates: [35.9078, 127.7669] },
  { id: 'AU', name: 'Australia', nameLocal: 'Australia', type: 'country', code: 'AU', coordinates: [-25.2744, 133.7751] },
  { id: 'IN', name: 'India', nameLocal: 'भारत', type: 'country', code: 'IN', coordinates: [20.5937, 78.9629] },
  { id: 'BR', name: 'Brazil', nameLocal: 'Brasil', type: 'country', code: 'BR', coordinates: [-14.2350, -51.9253] },
  { id: 'CN', name: 'China', nameLocal: '中国', type: 'country', code: 'CN', coordinates: [35.8617, 104.1954] }
];

// Vietnam Provinces/Cities
export const VIETNAM_STATES: AdminRegion[] = [
  { id: 'VN-SG', name: 'Ho Chi Minh City', nameLocal: 'TP. Hồ Chí Minh', type: 'state', parentId: 'VN', coordinates: [10.8231, 106.6297] },
  { id: 'VN-HN', name: 'Hanoi', nameLocal: 'Hà Nội', type: 'state', parentId: 'VN', coordinates: [21.0285, 105.8542] },
  { id: 'VN-DN', name: 'Da Nang', nameLocal: 'Đà Nẵng', type: 'state', parentId: 'VN', coordinates: [16.0544, 108.2022] },
  { id: 'VN-HP', name: 'Hai Phong', nameLocal: 'Hải Phòng', type: 'state', parentId: 'VN', coordinates: [20.8449, 106.6881] },
  { id: 'VN-CT', name: 'Can Tho', nameLocal: 'Cần Thơ', type: 'state', parentId: 'VN', coordinates: [10.0452, 105.7469] },
  { id: 'VN-BDG', name: 'Binh Duong', nameLocal: 'Bình Dương', type: 'state', parentId: 'VN', coordinates: [11.0039, 106.6519] },
  { id: 'VN-DNA', name: 'Dong Nai', nameLocal: 'Đồng Nai', type: 'state', parentId: 'VN', coordinates: [10.9454, 107.2483] },
  // Add more provinces as needed
];

// Ho Chi Minh City Districts
export const HCMC_DISTRICTS: AdminRegion[] = [
  { id: 'VN-SG-Q1', name: 'District 1', nameLocal: 'Quận 1', type: 'city', parentId: 'VN-SG', coordinates: [10.7756, 106.7009] },
  { id: 'VN-SG-Q2', name: 'District 2 (Thu Duc City)', nameLocal: 'Quận 2 (TP. Thủ Đức)', type: 'city', parentId: 'VN-SG', coordinates: [10.7874, 106.7513] },
  { id: 'VN-SG-Q3', name: 'District 3', nameLocal: 'Quận 3', type: 'city', parentId: 'VN-SG', coordinates: [10.7866, 106.6847] },
  { id: 'VN-SG-Q4', name: 'District 4', nameLocal: 'Quận 4', type: 'city', parentId: 'VN-SG', coordinates: [10.7578, 106.7009] },
  { id: 'VN-SG-Q5', name: 'District 5', nameLocal: 'Quận 5', type: 'city', parentId: 'VN-SG', coordinates: [10.7558, 106.6650] },
  { id: 'VN-SG-Q6', name: 'District 6', nameLocal: 'Quận 6', type: 'city', parentId: 'VN-SG', coordinates: [10.7481, 106.6346] },
  { id: 'VN-SG-Q7', name: 'District 7', nameLocal: 'Quận 7', type: 'city', parentId: 'VN-SG', coordinates: [10.7364, 106.7218] },
  { id: 'VN-SG-Q8', name: 'District 8', nameLocal: 'Quận 8', type: 'city', parentId: 'VN-SG', coordinates: [10.7224, 106.6286] },
  { id: 'VN-SG-Q10', name: 'District 10', nameLocal: 'Quận 10', type: 'city', parentId: 'VN-SG', coordinates: [10.7726, 106.6669] },
  { id: 'VN-SG-Q11', name: 'District 11', nameLocal: 'Quận 11', type: 'city', parentId: 'VN-SG', coordinates: [10.7640, 106.6505] },
  { id: 'VN-SG-Q12', name: 'District 12', nameLocal: 'Quận 12', type: 'city', parentId: 'VN-SG', coordinates: [10.8671, 106.6413] },
  { id: 'VN-SG-BT', name: 'Binh Tan', nameLocal: 'Quận Bình Tân', type: 'city', parentId: 'VN-SG', coordinates: [10.7652, 106.6037] },
  { id: 'VN-SG-TB', name: 'Tan Binh', nameLocal: 'Quận Tân Bình', type: 'city', parentId: 'VN-SG', coordinates: [10.8013, 106.6528] },
  { id: 'VN-SG-TP', name: 'Tan Phu', nameLocal: 'Quận Tân Phú', type: 'city', parentId: 'VN-SG', coordinates: [10.7900, 106.6280] },
  { id: 'VN-SG-PN', name: 'Phu Nhuan', nameLocal: 'Quận Phú Nhuận', type: 'city', parentId: 'VN-SG', coordinates: [10.7991, 106.6806] },
  { id: 'VN-SG-GV', name: 'Go Vap', nameLocal: 'Quận Gò Vấp', type: 'city', parentId: 'VN-SG', coordinates: [10.8388, 106.6652] },
  { id: 'VN-SG-BTH', name: 'Binh Thanh', nameLocal: 'Quận Bình Thạnh', type: 'city', parentId: 'VN-SG', coordinates: [10.8105, 106.7091] },
  { id: 'VN-SG-BC', name: 'Binh Chanh', nameLocal: 'Huyện Bình Chánh', type: 'city', parentId: 'VN-SG', coordinates: [10.6838, 106.5936] },
  { id: 'VN-SG-CC', name: 'Cu Chi', nameLocal: 'Huyện Củ Chi', type: 'city', parentId: 'VN-SG', coordinates: [10.9738, 106.4935] },
  { id: 'VN-SG-HM', name: 'Hoc Mon', nameLocal: 'Huyện Hóc Môn', type: 'city', parentId: 'VN-SG', coordinates: [10.8866, 106.5925] },
  { id: 'VN-SG-NB', name: 'Nha Be', nameLocal: 'Huyện Nhà Bè', type: 'city', parentId: 'VN-SG', coordinates: [10.6937, 106.7287] },
  { id: 'VN-SG-CG', name: 'Can Gio', nameLocal: 'Huyện Cần Giờ', type: 'city', parentId: 'VN-SG', coordinates: [10.4113, 106.9534] },
  { id: 'VN-SG-TD', name: 'Thu Duc City', nameLocal: 'TP. Thủ Đức', type: 'city', parentId: 'VN-SG', coordinates: [10.8453, 106.7596] }
];

// Get region by ID
export const getRegionById = (id: string): AdminRegion | undefined => {
  return [...COUNTRIES, ...VIETNAM_STATES, ...HCMC_DISTRICTS].find(r => r.id === id);
};

// Get children of a region
export const getChildRegions = (parentId: string): AdminRegion[] => {
  const allRegions = [...COUNTRIES, ...VIETNAM_STATES, ...HCMC_DISTRICTS];
  return allRegions.filter(r => r.parentId === parentId);
};

// Get region hierarchy (breadcrumb)
export const getRegionHierarchy = (regionId: string): AdminRegion[] => {
  const hierarchy: AdminRegion[] = [];
  let currentRegion = getRegionById(regionId);
  
  while (currentRegion) {
    hierarchy.unshift(currentRegion);
    currentRegion = currentRegion.parentId ? getRegionById(currentRegion.parentId) : undefined;
  }
  
  return hierarchy;
};

// Get display name based on language
export const getRegionDisplayName = (region: AdminRegion, language: 'en' | 'vi' = 'en'): string => {
  return language === 'vi' ? region.nameLocal : region.name;
};

// Get type label based on language
export const getTypeLabel = (type: AdminRegion['type'], language: 'en' | 'vi' = 'en'): string => {
  const labels: Record<AdminRegion['type'], { en: string; vi: string }> = {
    country: { en: 'Country', vi: 'Quốc gia' },
    state: { en: 'State/Province', vi: 'Tỉnh/Thành phố' },
    city: { en: 'City/District', vi: 'Quận/Huyện' },
    ward: { en: 'Ward/Commune', vi: 'Phường/Xã' }
  };
  return labels[type][language];
};

// Search regions
export const searchRegions = (query: string): AdminRegion[] => {
  const normalizedQuery = query.toLowerCase();
  const allRegions = [...COUNTRIES, ...VIETNAM_STATES, ...HCMC_DISTRICTS];
  return allRegions.filter(
    r => 
      r.name.toLowerCase().includes(normalizedQuery) ||
      r.nameLocal.toLowerCase().includes(normalizedQuery) ||
      r.id.toLowerCase().includes(normalizedQuery)
  );
};

// Get nearest region from coordinates
export const getNearestRegion = (lat: number, lng: number, type?: AdminRegion['type']): AdminRegion | undefined => {
  let regions = [...COUNTRIES, ...VIETNAM_STATES, ...HCMC_DISTRICTS];
  if (type) {
    regions = regions.filter(r => r.type === type);
  }
  
  let nearest: AdminRegion | undefined;
  let minDistance = Infinity;
  
  regions.forEach(region => {
    if (region.coordinates) {
      const distance = Math.sqrt(
        Math.pow(lat - region.coordinates[0], 2) +
        Math.pow(lng - region.coordinates[1], 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearest = region;
      }
    }
  });
  
  return nearest;
};
