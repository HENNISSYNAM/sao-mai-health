/**
 * Global surveillance region registry.
 *
 * 47 metropolitan areas across 6 continents. Each region carries the endemic
 * disease profile that seeds a simulation even when no news signal is present,
 * so the map is never blank in a region the agents are watching.
 */

export type Continent = 'Asia' | 'Europe' | 'Americas' | 'Africa' | 'Oceania';

export interface RegionMeta {
  lat: number;
  lng: number;
  name: string;
  population: number;
  continent: Continent;
  /** ISO-3166 alpha-2 */
  country: string;
  /** Endemic diseases — used as baseline seeds */
  endemic: string[];
}

export const SURVEILLANCE_REGIONS: Record<string, RegionMeta> = {
  // ── Southeast Asia ────────────────────────────────────────────────────────
  'VN-HN':  { lat: 21.03,  lng: 105.85,  name: 'Hà Nội',         population: 8246600,  continent: 'Asia', country: 'VN', endemic: ['dengue', 'influenza'] },
  'VN-HCM': { lat: 10.78,  lng: 106.69,  name: 'Hồ Chí Minh',    population: 9162900,  continent: 'Asia', country: 'VN', endemic: ['dengue', 'hfmd'] },
  'VN-DN':  { lat: 16.06,  lng: 108.22,  name: 'Đà Nẵng',        population: 1134310,  continent: 'Asia', country: 'VN', endemic: ['dengue'] },
  'VN-CT':  { lat: 10.04,  lng: 105.78,  name: 'Cần Thơ',        population: 1235171,  continent: 'Asia', country: 'VN', endemic: ['dengue'] },
  'HK':     { lat: 22.32,  lng: 114.17,  name: 'Hong Kong',      population: 7413100,  continent: 'Asia', country: 'HK', endemic: ['influenza', 'covid'] },
  'SG':     { lat: 1.35,   lng: 103.82,  name: 'Singapore',      population: 5637022,  continent: 'Asia', country: 'SG', endemic: ['dengue', 'influenza'] },
  'TH-BK':  { lat: 13.76,  lng: 100.50,  name: 'Bangkok',        population: 10539000, continent: 'Asia', country: 'TH', endemic: ['dengue'] },
  'MY-KL':  { lat: 3.14,   lng: 101.69,  name: 'Kuala Lumpur',   population: 1982112,  continent: 'Asia', country: 'MY', endemic: ['dengue'] },
  'ID-JK':  { lat: -6.21,  lng: 106.85,  name: 'Jakarta',        population: 10562088, continent: 'Asia', country: 'ID', endemic: ['dengue', 'tuberculosis'] },
  'PH-MN':  { lat: 14.60,  lng: 120.98,  name: 'Manila',         population: 13484462, continent: 'Asia', country: 'PH', endemic: ['dengue', 'measles'] },

  // ── East / South Asia ─────────────────────────────────────────────────────
  'CN-SZ':  { lat: 22.54,  lng: 114.06,  name: 'Shenzhen',       population: 17494398, continent: 'Asia', country: 'CN', endemic: ['influenza'] },
  'CN-GZ':  { lat: 23.13,  lng: 113.26,  name: 'Guangzhou',      population: 18676605, continent: 'Asia', country: 'CN', endemic: ['influenza', 'dengue'] },
  'CN-SH':  { lat: 31.23,  lng: 121.47,  name: 'Shanghai',       population: 24870895, continent: 'Asia', country: 'CN', endemic: ['influenza'] },
  'CN-BJ':  { lat: 39.90,  lng: 116.41,  name: 'Beijing',        population: 21893095, continent: 'Asia', country: 'CN', endemic: ['influenza'] },
  'TW-TP':  { lat: 25.03,  lng: 121.57,  name: 'Taipei',         population: 2646204,  continent: 'Asia', country: 'TW', endemic: ['influenza', 'dengue'] },
  'JP-TK':  { lat: 35.68,  lng: 139.65,  name: 'Tokyo',          population: 13960000, continent: 'Asia', country: 'JP', endemic: ['influenza'] },
  'KR-SE':  { lat: 37.57,  lng: 126.98,  name: 'Seoul',          population: 9733509,  continent: 'Asia', country: 'KR', endemic: ['influenza'] },
  'IN-DL':  { lat: 28.61,  lng: 77.21,   name: 'New Delhi',      population: 32941000, continent: 'Asia', country: 'IN', endemic: ['dengue', 'tuberculosis', 'malaria'] },
  'IN-MB':  { lat: 19.08,  lng: 72.88,   name: 'Mumbai',         population: 20961000, continent: 'Asia', country: 'IN', endemic: ['dengue', 'tuberculosis'] },
  'BD-DK':  { lat: 23.81,  lng: 90.41,   name: 'Dhaka',          population: 22478000, continent: 'Asia', country: 'BD', endemic: ['dengue', 'cholera'] },
  'PK-KH':  { lat: 24.86,  lng: 67.00,   name: 'Karachi',        population: 16839950, continent: 'Asia', country: 'PK', endemic: ['dengue', 'typhoid'] },

  // ── Middle East ───────────────────────────────────────────────────────────
  'AE-DB':  { lat: 25.20,  lng: 55.27,   name: 'Dubai',          population: 3604030,  continent: 'Asia',   country: 'AE', endemic: ['influenza'] },
  'SA-RY':  { lat: 24.71,  lng: 46.68,   name: 'Riyadh',         population: 7676654,  continent: 'Asia',   country: 'SA', endemic: ['mers', 'influenza'] },
  'TR-IS':  { lat: 41.01,  lng: 28.98,   name: 'Istanbul',       population: 15462452, continent: 'Europe', country: 'TR', endemic: ['influenza'] },

  // ── Europe ────────────────────────────────────────────────────────────────
  'GB-LN':  { lat: 51.51,  lng: -0.13,   name: 'London',         population: 9648110,  continent: 'Europe', country: 'GB', endemic: ['influenza', 'covid'] },
  'FR-PR':  { lat: 48.86,  lng: 2.35,    name: 'Paris',          population: 11142000, continent: 'Europe', country: 'FR', endemic: ['influenza'] },
  'DE-BR':  { lat: 52.52,  lng: 13.40,   name: 'Berlin',         population: 3677472,  continent: 'Europe', country: 'DE', endemic: ['influenza'] },
  'ES-MD':  { lat: 40.42,  lng: -3.70,   name: 'Madrid',         population: 6751000,  continent: 'Europe', country: 'ES', endemic: ['influenza'] },
  'IT-MI':  { lat: 45.46,  lng: 9.19,    name: 'Milan',          population: 4336000,  continent: 'Europe', country: 'IT', endemic: ['influenza'] },
  'NL-AM':  { lat: 52.37,  lng: 4.90,    name: 'Amsterdam',      population: 1166000,  continent: 'Europe', country: 'NL', endemic: ['influenza'] },
  'RU-MW':  { lat: 55.76,  lng: 37.62,   name: 'Moscow',         population: 12655050, continent: 'Europe', country: 'RU', endemic: ['influenza'] },

  // ── Americas ──────────────────────────────────────────────────────────────
  'US-NY':  { lat: 40.71,  lng: -74.01,  name: 'New York',       population: 8336817,  continent: 'Americas', country: 'US', endemic: ['influenza', 'covid'] },
  'US-LA':  { lat: 34.05,  lng: -118.24, name: 'Los Angeles',    population: 3898747,  continent: 'Americas', country: 'US', endemic: ['influenza'] },
  'US-CH':  { lat: 41.88,  lng: -87.63,  name: 'Chicago',        population: 2746388,  continent: 'Americas', country: 'US', endemic: ['influenza'] },
  'CA-TR':  { lat: 43.65,  lng: -79.38,  name: 'Toronto',        population: 2794356,  continent: 'Americas', country: 'CA', endemic: ['influenza'] },
  'MX-MC':  { lat: 19.43,  lng: -99.13,  name: 'Mexico City',    population: 9209944,  continent: 'Americas', country: 'MX', endemic: ['dengue', 'influenza'] },
  'BR-SP':  { lat: -23.55, lng: -46.63,  name: 'São Paulo',      population: 12325232, continent: 'Americas', country: 'BR', endemic: ['dengue', 'yellow_fever'] },
  'BR-RJ':  { lat: -22.91, lng: -43.17,  name: 'Rio de Janeiro', population: 6747815,  continent: 'Americas', country: 'BR', endemic: ['dengue', 'zika'] },
  'AR-BA':  { lat: -34.60, lng: -58.38,  name: 'Buenos Aires',   population: 3075646,  continent: 'Americas', country: 'AR', endemic: ['dengue'] },

  // ── Africa ────────────────────────────────────────────────────────────────
  'EG-CA':  { lat: 30.04,  lng: 31.24,   name: 'Cairo',          population: 10230350, continent: 'Africa', country: 'EG', endemic: ['hepatitis', 'influenza'] },
  'NG-LG':  { lat: 6.52,   lng: 3.38,    name: 'Lagos',          population: 15388000, continent: 'Africa', country: 'NG', endemic: ['malaria', 'cholera', 'lassa'] },
  'KE-NB':  { lat: -1.29,  lng: 36.82,   name: 'Nairobi',        population: 4397073,  continent: 'Africa', country: 'KE', endemic: ['malaria', 'cholera'] },
  'ZA-JB':  { lat: -26.20, lng: 28.05,   name: 'Johannesburg',   population: 5635127,  continent: 'Africa', country: 'ZA', endemic: ['tuberculosis'] },
  'CD-KN':  { lat: -4.44,  lng: 15.27,   name: 'Kinshasa',       population: 17071000, continent: 'Africa', country: 'CD', endemic: ['ebola', 'malaria', 'mpox'] },

  // ── Oceania ───────────────────────────────────────────────────────────────
  'AU-SY':  { lat: -33.87, lng: 151.21,  name: 'Sydney',         population: 5312163,  continent: 'Oceania', country: 'AU', endemic: ['influenza'] },
  'AU-MB':  { lat: -37.81, lng: 144.96,  name: 'Melbourne',      population: 5078193,  continent: 'Oceania', country: 'AU', endemic: ['influenza'] },
  'NZ-AK':  { lat: -36.85, lng: 174.76,  name: 'Auckland',       population: 1652000,  continent: 'Oceania', country: 'NZ', endemic: ['influenza'] },
};

export const ALL_REGION_KEYS = Object.keys(SURVEILLANCE_REGIONS);

/** Region keys grouped by continent — the agent scheduler assigns one agent per continent */
export const REGIONS_BY_CONTINENT: Record<Continent, string[]> = ALL_REGION_KEYS.reduce(
  (acc, key) => {
    const c = SURVEILLANCE_REGIONS[key].continent;
    (acc[c] ??= []).push(key);
    return acc;
  },
  {} as Record<Continent, string[]>
);

export const CONTINENTS = Object.keys(REGIONS_BY_CONTINENT) as Continent[];

/** Flag emoji from an ISO-3166 alpha-2 code */
export function countryFlag(code: string): string {
  if (code.length !== 2) return '🌐';
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(c => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}
