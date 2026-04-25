import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ====== TYPES ======
interface ProvinceProfile {
  population: number;
  population_density: number;
  urban_index: number;
  health_capacity_index: number;
  mobility_index: number;
  climate_zone: 'north' | 'central' | 'south';
  seasonality_factor: number;
}

interface ProvinceHospitalData {
  total_beds: number;
  icu_beds: number;
  hospitals: Array<{
    name: string;
    lat: number;
    lng: number;
    type: 'central' | 'provincial' | 'district' | 'clinic';
    beds: number;
    icu_beds: number;
  }>;
}

interface CountryProfile {
  lat: number;
  lng: number;
  bbox: number[];
  population: number;
  urban_index: number;
  health_capacity_index: number;
  mobility_index: number;
  border_neighbors: string[];
}

type RegionScope = 'vietnam' | 'asean' | 'china' | 'cross-border';
type ForecastMode = 'epidemiology' | 'policy';
type Granularity = 'country' | 'province';

// ====== VIETNAM PROVINCE PROFILES ======
const provinceProfiles: Record<string, ProvinceProfile> = {
  'ho chi minh': { population: 9500000, population_density: 0.95, urban_index: 0.95, health_capacity_index: 0.85, mobility_index: 0.95, climate_zone: 'south', seasonality_factor: 0.85 },
  'binh duong': { population: 2600000, population_density: 0.7, urban_index: 0.75, health_capacity_index: 0.55, mobility_index: 0.8, climate_zone: 'south', seasonality_factor: 0.8 },
  'dong nai': { population: 3200000, population_density: 0.55, urban_index: 0.6, health_capacity_index: 0.5, mobility_index: 0.7, climate_zone: 'south', seasonality_factor: 0.75 },
  'ba ria vung tau': { population: 1200000, population_density: 0.45, urban_index: 0.55, health_capacity_index: 0.5, mobility_index: 0.6, climate_zone: 'south', seasonality_factor: 0.7 },
  'long an': { population: 1700000, population_density: 0.35, urban_index: 0.3, health_capacity_index: 0.35, mobility_index: 0.55, climate_zone: 'south', seasonality_factor: 0.8 },
  'tay ninh': { population: 1200000, population_density: 0.3, urban_index: 0.25, health_capacity_index: 0.3, mobility_index: 0.5, climate_zone: 'south', seasonality_factor: 0.75 },
  'binh phuoc': { population: 1050000, population_density: 0.15, urban_index: 0.2, health_capacity_index: 0.25, mobility_index: 0.35, climate_zone: 'south', seasonality_factor: 0.7 },
  'can tho': { population: 1250000, population_density: 0.6, urban_index: 0.65, health_capacity_index: 0.6, mobility_index: 0.6, climate_zone: 'south', seasonality_factor: 0.85 },
  'an giang': { population: 1900000, population_density: 0.45, urban_index: 0.3, health_capacity_index: 0.35, mobility_index: 0.45, climate_zone: 'south', seasonality_factor: 0.85 },
  'kien giang': { population: 1800000, population_density: 0.3, urban_index: 0.3, health_capacity_index: 0.3, mobility_index: 0.4, climate_zone: 'south', seasonality_factor: 0.8 },
  'tien giang': { population: 1800000, population_density: 0.55, urban_index: 0.35, health_capacity_index: 0.4, mobility_index: 0.55, climate_zone: 'south', seasonality_factor: 0.8 },
  'ben tre': { population: 1300000, population_density: 0.45, urban_index: 0.25, health_capacity_index: 0.3, mobility_index: 0.4, climate_zone: 'south', seasonality_factor: 0.8 },
  'vinh long': { population: 1050000, population_density: 0.55, urban_index: 0.3, health_capacity_index: 0.35, mobility_index: 0.4, climate_zone: 'south', seasonality_factor: 0.8 },
  'dong thap': { population: 1700000, population_density: 0.4, urban_index: 0.25, health_capacity_index: 0.3, mobility_index: 0.4, climate_zone: 'south', seasonality_factor: 0.85 },
  'soc trang': { population: 1200000, population_density: 0.35, urban_index: 0.25, health_capacity_index: 0.25, mobility_index: 0.35, climate_zone: 'south', seasonality_factor: 0.8 },
  'tra vinh': { population: 1050000, population_density: 0.4, urban_index: 0.2, health_capacity_index: 0.25, mobility_index: 0.35, climate_zone: 'south', seasonality_factor: 0.8 },
  'bac lieu': { population: 920000, population_density: 0.35, urban_index: 0.3, health_capacity_index: 0.25, mobility_index: 0.3, climate_zone: 'south', seasonality_factor: 0.8 },
  'ca mau': { population: 1200000, population_density: 0.25, urban_index: 0.25, health_capacity_index: 0.2, mobility_index: 0.3, climate_zone: 'south', seasonality_factor: 0.8 },
  'hau giang': { population: 750000, population_density: 0.4, urban_index: 0.2, health_capacity_index: 0.2, mobility_index: 0.3, climate_zone: 'south', seasonality_factor: 0.8 },
  'ha noi': { population: 8400000, population_density: 0.85, urban_index: 0.85, health_capacity_index: 0.9, mobility_index: 0.9, climate_zone: 'north', seasonality_factor: 0.7 },
  'hai phong': { population: 2100000, population_density: 0.65, urban_index: 0.7, health_capacity_index: 0.6, mobility_index: 0.7, climate_zone: 'north', seasonality_factor: 0.65 },
  'quang ninh': { population: 1400000, population_density: 0.2, urban_index: 0.5, health_capacity_index: 0.45, mobility_index: 0.55, climate_zone: 'north', seasonality_factor: 0.6 },
  'bac ninh': { population: 1450000, population_density: 0.85, urban_index: 0.7, health_capacity_index: 0.5, mobility_index: 0.75, climate_zone: 'north', seasonality_factor: 0.65 },
  'hai duong': { population: 1900000, population_density: 0.7, urban_index: 0.45, health_capacity_index: 0.4, mobility_index: 0.6, climate_zone: 'north', seasonality_factor: 0.65 },
  'hung yen': { population: 1300000, population_density: 0.75, urban_index: 0.4, health_capacity_index: 0.35, mobility_index: 0.55, climate_zone: 'north', seasonality_factor: 0.65 },
  'thai binh': { population: 1900000, population_density: 0.75, urban_index: 0.3, health_capacity_index: 0.35, mobility_index: 0.45, climate_zone: 'north', seasonality_factor: 0.6 },
  'nam dinh': { population: 1900000, population_density: 0.65, urban_index: 0.3, health_capacity_index: 0.35, mobility_index: 0.45, climate_zone: 'north', seasonality_factor: 0.6 },
  'ninh binh': { population: 1000000, population_density: 0.5, urban_index: 0.3, health_capacity_index: 0.35, mobility_index: 0.4, climate_zone: 'north', seasonality_factor: 0.6 },
  'vinh phuc': { population: 1200000, population_density: 0.6, urban_index: 0.5, health_capacity_index: 0.4, mobility_index: 0.55, climate_zone: 'north', seasonality_factor: 0.6 },
  'bac giang': { population: 1900000, population_density: 0.45, urban_index: 0.35, health_capacity_index: 0.3, mobility_index: 0.5, climate_zone: 'north', seasonality_factor: 0.6 },
  'phu tho': { population: 1500000, population_density: 0.35, urban_index: 0.3, health_capacity_index: 0.35, mobility_index: 0.4, climate_zone: 'north', seasonality_factor: 0.55 },
  'thai nguyen': { population: 1400000, population_density: 0.35, urban_index: 0.45, health_capacity_index: 0.45, mobility_index: 0.45, climate_zone: 'north', seasonality_factor: 0.55 },
  'tuyen quang': { population: 800000, population_density: 0.15, urban_index: 0.2, health_capacity_index: 0.25, mobility_index: 0.25, climate_zone: 'north', seasonality_factor: 0.5 },
  'lang son': { population: 800000, population_density: 0.1, urban_index: 0.2, health_capacity_index: 0.25, mobility_index: 0.35, climate_zone: 'north', seasonality_factor: 0.5 },
  'cao bang': { population: 540000, population_density: 0.08, urban_index: 0.15, health_capacity_index: 0.2, mobility_index: 0.2, climate_zone: 'north', seasonality_factor: 0.45 },
  'ha giang': { population: 900000, population_density: 0.1, urban_index: 0.1, health_capacity_index: 0.15, mobility_index: 0.15, climate_zone: 'north', seasonality_factor: 0.45 },
  'lao cai': { population: 750000, population_density: 0.1, urban_index: 0.25, health_capacity_index: 0.25, mobility_index: 0.3, climate_zone: 'north', seasonality_factor: 0.5 },
  'yen bai': { population: 850000, population_density: 0.12, urban_index: 0.2, health_capacity_index: 0.25, mobility_index: 0.25, climate_zone: 'north', seasonality_factor: 0.5 },
  'son la': { population: 1300000, population_density: 0.09, urban_index: 0.15, health_capacity_index: 0.2, mobility_index: 0.2, climate_zone: 'north', seasonality_factor: 0.45 },
  'dien bien': { population: 620000, population_density: 0.06, urban_index: 0.15, health_capacity_index: 0.15, mobility_index: 0.15, climate_zone: 'north', seasonality_factor: 0.45 },
  'lai chau': { population: 480000, population_density: 0.05, urban_index: 0.1, health_capacity_index: 0.1, mobility_index: 0.1, climate_zone: 'north', seasonality_factor: 0.4 },
  'hoa binh': { population: 870000, population_density: 0.18, urban_index: 0.2, health_capacity_index: 0.25, mobility_index: 0.3, climate_zone: 'north', seasonality_factor: 0.55 },
  'bac kan': { population: 340000, population_density: 0.07, urban_index: 0.15, health_capacity_index: 0.2, mobility_index: 0.15, climate_zone: 'north', seasonality_factor: 0.45 },
  'da nang': { population: 1200000, population_density: 0.75, urban_index: 0.85, health_capacity_index: 0.7, mobility_index: 0.75, climate_zone: 'central', seasonality_factor: 0.75 },
  'thua thien hue': { population: 1150000, population_density: 0.2, urban_index: 0.45, health_capacity_index: 0.55, mobility_index: 0.45, climate_zone: 'central', seasonality_factor: 0.7 },
  'quang nam': { population: 1500000, population_density: 0.15, urban_index: 0.3, health_capacity_index: 0.3, mobility_index: 0.4, climate_zone: 'central', seasonality_factor: 0.7 },
  'quang ngai': { population: 1250000, population_density: 0.2, urban_index: 0.25, health_capacity_index: 0.25, mobility_index: 0.35, climate_zone: 'central', seasonality_factor: 0.7 },
  'binh dinh': { population: 1500000, population_density: 0.25, urban_index: 0.35, health_capacity_index: 0.35, mobility_index: 0.4, climate_zone: 'central', seasonality_factor: 0.7 },
  'phu yen': { population: 900000, population_density: 0.15, urban_index: 0.25, health_capacity_index: 0.25, mobility_index: 0.3, climate_zone: 'central', seasonality_factor: 0.65 },
  'khanh hoa': { population: 1250000, population_density: 0.2, urban_index: 0.55, health_capacity_index: 0.45, mobility_index: 0.55, climate_zone: 'central', seasonality_factor: 0.7 },
  'ninh thuan': { population: 600000, population_density: 0.15, urban_index: 0.25, health_capacity_index: 0.2, mobility_index: 0.3, climate_zone: 'central', seasonality_factor: 0.65 },
  'binh thuan': { population: 1250000, population_density: 0.15, urban_index: 0.3, health_capacity_index: 0.3, mobility_index: 0.4, climate_zone: 'central', seasonality_factor: 0.7 },
  'thanh hoa': { population: 3700000, population_density: 0.3, urban_index: 0.25, health_capacity_index: 0.3, mobility_index: 0.4, climate_zone: 'central', seasonality_factor: 0.65 },
  'nghe an': { population: 3400000, population_density: 0.2, urban_index: 0.2, health_capacity_index: 0.3, mobility_index: 0.35, climate_zone: 'central', seasonality_factor: 0.6 },
  'ha tinh': { population: 1300000, population_density: 0.2, urban_index: 0.2, health_capacity_index: 0.25, mobility_index: 0.3, climate_zone: 'central', seasonality_factor: 0.65 },
  'quang binh': { population: 900000, population_density: 0.1, urban_index: 0.2, health_capacity_index: 0.25, mobility_index: 0.25, climate_zone: 'central', seasonality_factor: 0.65 },
  'quang tri': { population: 650000, population_density: 0.12, urban_index: 0.2, health_capacity_index: 0.25, mobility_index: 0.25, climate_zone: 'central', seasonality_factor: 0.65 },
  'gia lai': { population: 1550000, population_density: 0.1, urban_index: 0.2, health_capacity_index: 0.2, mobility_index: 0.25, climate_zone: 'central', seasonality_factor: 0.6 },
  'kon tum': { population: 580000, population_density: 0.06, urban_index: 0.2, health_capacity_index: 0.2, mobility_index: 0.2, climate_zone: 'central', seasonality_factor: 0.55 },
  'dak lak': { population: 2000000, population_density: 0.15, urban_index: 0.3, health_capacity_index: 0.3, mobility_index: 0.35, climate_zone: 'central', seasonality_factor: 0.65 },
  'dak nong': { population: 700000, population_density: 0.1, urban_index: 0.2, health_capacity_index: 0.2, mobility_index: 0.25, climate_zone: 'central', seasonality_factor: 0.6 },
  'lam dong': { population: 1300000, population_density: 0.12, urban_index: 0.4, health_capacity_index: 0.35, mobility_index: 0.4, climate_zone: 'central', seasonality_factor: 0.55 },
};

// ====== ASEAN COUNTRY PROFILES ======
const aseanProfiles: Record<string, CountryProfile> = {
  'cambodia':   { lat: 11.55, lng: 104.92, bbox: [102.3, 10.4, 107.6, 14.7], population: 17000000, urban_index: 0.25, health_capacity_index: 0.25, mobility_index: 0.4, border_neighbors: ['vietnam', 'thailand', 'laos'] },
  'laos':       { lat: 17.97, lng: 102.63, bbox: [100.1, 13.9, 107.7, 22.5], population: 7500000, urban_index: 0.15, health_capacity_index: 0.15, mobility_index: 0.3, border_neighbors: ['vietnam', 'cambodia', 'thailand', 'china'] },
  'thailand':   { lat: 15.87, lng: 100.99, bbox: [97.3, 5.6, 105.6, 20.5], population: 72000000, urban_index: 0.55, health_capacity_index: 0.65, mobility_index: 0.7, border_neighbors: ['cambodia', 'laos', 'myanmar', 'malaysia'] },
  'myanmar':    { lat: 19.76, lng: 96.08, bbox: [92.2, 9.8, 101.2, 28.5], population: 54000000, urban_index: 0.3, health_capacity_index: 0.2, mobility_index: 0.35, border_neighbors: ['thailand', 'laos', 'china'] },
  'malaysia':   { lat: 4.21, lng: 101.98, bbox: [99.6, 0.85, 119.3, 7.4], population: 33000000, urban_index: 0.65, health_capacity_index: 0.7, mobility_index: 0.75, border_neighbors: ['thailand', 'indonesia', 'singapore'] },
  'singapore':  { lat: 1.35, lng: 103.82, bbox: [103.6, 1.2, 104.1, 1.5], population: 5900000, urban_index: 0.95, health_capacity_index: 0.95, mobility_index: 0.95, border_neighbors: ['malaysia'] },
  'indonesia':  { lat: -2.5, lng: 118.0, bbox: [95.0, -11.0, 141.0, 6.1], population: 275000000, urban_index: 0.45, health_capacity_index: 0.4, mobility_index: 0.5, border_neighbors: ['malaysia'] },
  'philippines': { lat: 12.88, lng: 121.77, bbox: [116.9, 4.6, 126.6, 21.1], population: 115000000, urban_index: 0.5, health_capacity_index: 0.4, mobility_index: 0.55, border_neighbors: [] },
  'brunei':     { lat: 4.94, lng: 114.95, bbox: [114.0, 4.0, 115.4, 5.1], population: 450000, urban_index: 0.75, health_capacity_index: 0.7, mobility_index: 0.5, border_neighbors: ['malaysia'] },
};

// ====== SOUTH CHINA PROVINCE PROFILES ======
const chinaProvinceProfiles: Record<string, CountryProfile> = {
  'guangdong': { lat: 23.13, lng: 113.27, bbox: [109.6, 20.2, 117.2, 25.5], population: 127000000, urban_index: 0.8, health_capacity_index: 0.75, mobility_index: 0.9, border_neighbors: ['vietnam'] },
  'guangxi':   { lat: 22.82, lng: 108.32, bbox: [104.3, 20.5, 112.1, 26.4], population: 50000000, urban_index: 0.4, health_capacity_index: 0.45, mobility_index: 0.6, border_neighbors: ['vietnam'] },
  'yunnan':     { lat: 25.04, lng: 102.71, bbox: [97.5, 21.1, 106.2, 29.2], population: 47000000, urban_index: 0.35, health_capacity_index: 0.4, mobility_index: 0.5, border_neighbors: ['vietnam', 'laos', 'myanmar'] },
  'hainan':     { lat: 19.2, lng: 109.75, bbox: [108.6, 18.1, 111.3, 20.2], population: 10400000, urban_index: 0.5, health_capacity_index: 0.5, mobility_index: 0.55, border_neighbors: [] },
  'fujian':     { lat: 26.1, lng: 119.3, bbox: [115.8, 23.5, 120.7, 28.3], population: 41500000, urban_index: 0.55, health_capacity_index: 0.6, mobility_index: 0.65, border_neighbors: [] },
};

// ====== BORDER WEIGHTS ======
const borderWeights: Record<string, Record<string, number>> = {
  'vietnam':   { 'cambodia': 0.7, 'laos': 0.5, 'china': 0.4, 'guangxi': 0.6, 'yunnan': 0.5, 'guangdong': 0.3 },
  'cambodia':  { 'vietnam': 0.7, 'thailand': 0.5, 'laos': 0.4 },
  'laos':      { 'vietnam': 0.5, 'cambodia': 0.4, 'thailand': 0.5, 'china': 0.3, 'yunnan': 0.4 },
  'thailand':  { 'cambodia': 0.5, 'laos': 0.5, 'myanmar': 0.4, 'malaysia': 0.3 },
  'guangxi':   { 'vietnam': 0.6, 'guangdong': 0.4 },
  'yunnan':    { 'vietnam': 0.5, 'laos': 0.4, 'myanmar': 0.3 },
  'guangdong': { 'guangxi': 0.4, 'fujian': 0.3 },
};

// ====== REGION-SPECIFIC COEFFICIENTS ======
const regionCoefficients: Record<string, { urban: number; mobility: number; seasonality: number; health: number }> = {
  north:   { urban: 0.15, mobility: 0.10, seasonality: 0.15, health: 0.12 },
  central: { urban: 0.20, mobility: 0.15, seasonality: 0.10, health: 0.10 },
  south:   { urban: 0.25, mobility: 0.20, seasonality: 0.08, health: 0.08 },
};

// ====== VIETNAM PROVINCE HOSPITAL DATA ======
const provinceHospitalData: Record<string, ProvinceHospitalData> = {
  'ho chi minh': {
    total_beds: 42000, icu_beds: 3200,
    hospitals: [
      { name: 'BV Chợ Rẫy', lat: 10.7553, lng: 106.6600, type: 'central', beds: 1800, icu_beds: 220 },
      { name: 'BV Đại học Y Dược', lat: 10.7567, lng: 106.6627, type: 'central', beds: 1200, icu_beds: 180 },
      { name: 'BV Nhân dân 115', lat: 10.7792, lng: 106.6656, type: 'central', beds: 1500, icu_beds: 200 },
      { name: 'BV Nhi đồng 1', lat: 10.7726, lng: 106.6847, type: 'central', beds: 1400, icu_beds: 150 },
      { name: 'BV Nhi đồng 2', lat: 10.7885, lng: 106.6550, type: 'central', beds: 1000, icu_beds: 120 },
      { name: 'BV Thống Nhất', lat: 10.7989, lng: 106.6629, type: 'central', beds: 1200, icu_beds: 140 },
      { name: 'BV Nhân dân Gia Định', lat: 10.8142, lng: 106.6943, type: 'provincial', beds: 800, icu_beds: 80 },
      { name: 'BV Q.Thủ Đức', lat: 10.8531, lng: 106.7611, type: 'district', beds: 500, icu_beds: 40 },
      { name: 'BV Q.Bình Tân', lat: 10.7652, lng: 106.6037, type: 'district', beds: 300, icu_beds: 25 },
      { name: 'BV Q.7', lat: 10.7364, lng: 106.7218, type: 'district', beds: 350, icu_beds: 30 },
    ],
  },
  'ha noi': {
    total_beds: 38000, icu_beds: 2800,
    hospitals: [
      { name: 'BV Bạch Mai', lat: 21.0001, lng: 105.8395, type: 'central', beds: 2200, icu_beds: 300 },
      { name: 'BV Việt Đức', lat: 21.0135, lng: 105.8478, type: 'central', beds: 1800, icu_beds: 200 },
      { name: 'BV Nhi Trung ương', lat: 21.0267, lng: 105.8311, type: 'central', beds: 1200, icu_beds: 150 },
      { name: 'BV E', lat: 21.0381, lng: 105.8019, type: 'central', beds: 1000, icu_beds: 100 },
      { name: 'BV Xanh Pôn', lat: 21.0289, lng: 105.8398, type: 'provincial', beds: 700, icu_beds: 60 },
      { name: 'BV Thanh Nhàn', lat: 21.0087, lng: 105.8610, type: 'provincial', beds: 600, icu_beds: 50 },
      { name: 'BV Đống Đa', lat: 21.0134, lng: 105.8285, type: 'district', beds: 400, icu_beds: 30 },
      { name: 'BV Hà Đông', lat: 20.9710, lng: 105.7789, type: 'district', beds: 350, icu_beds: 25 },
    ],
  },
  'da nang': {
    total_beds: 8500, icu_beds: 620,
    hospitals: [
      { name: 'BV Đà Nẵng', lat: 16.0693, lng: 108.2211, type: 'central', beds: 1500, icu_beds: 180 },
      { name: 'BV C Đà Nẵng', lat: 16.0600, lng: 108.2135, type: 'provincial', beds: 600, icu_beds: 60 },
      { name: 'BV Phụ sản Nhi', lat: 16.0550, lng: 108.2100, type: 'provincial', beds: 500, icu_beds: 50 },
    ],
  },
  'hai phong': {
    total_beds: 7200, icu_beds: 480,
    hospitals: [
      { name: 'BV Việt Tiệp', lat: 20.8562, lng: 106.6783, type: 'central', beds: 1200, icu_beds: 120 },
      { name: 'BV Trẻ em HP', lat: 20.8489, lng: 106.6850, type: 'provincial', beds: 500, icu_beds: 50 },
    ],
  },
  'can tho': {
    total_beds: 5500, icu_beds: 380,
    hospitals: [
      { name: 'BV Đa khoa TW Cần Thơ', lat: 10.0345, lng: 105.7685, type: 'central', beds: 1100, icu_beds: 100 },
      { name: 'BV ĐH Y Dược CT', lat: 10.0290, lng: 105.7580, type: 'provincial', beds: 600, icu_beds: 60 },
    ],
  },
  'binh duong': {
    total_beds: 4800, icu_beds: 280,
    hospitals: [
      { name: 'BV Đa khoa Bình Dương', lat: 11.0039, lng: 106.6519, type: 'provincial', beds: 800, icu_beds: 80 },
      { name: 'BV Đa khoa Mỹ Phước', lat: 11.1280, lng: 106.5885, type: 'district', beds: 300, icu_beds: 25 },
    ],
  },
  'dong nai': {
    total_beds: 5200, icu_beds: 320,
    hospitals: [
      { name: 'BV Đa khoa Đồng Nai', lat: 10.9454, lng: 106.8243, type: 'provincial', beds: 1000, icu_beds: 100 },
      { name: 'BV Đa khoa Thống Nhất', lat: 10.9580, lng: 106.8420, type: 'provincial', beds: 600, icu_beds: 50 },
    ],
  },
  'khanh hoa': {
    total_beds: 4000, icu_beds: 250,
    hospitals: [
      { name: 'BV Đa khoa Khánh Hòa', lat: 12.2580, lng: 109.1893, type: 'provincial', beds: 800, icu_beds: 80 },
    ],
  },
  'thanh hoa': {
    total_beds: 6500, icu_beds: 380,
    hospitals: [
      { name: 'BV Đa khoa Thanh Hóa', lat: 19.8070, lng: 105.7767, type: 'provincial', beds: 1000, icu_beds: 100 },
    ],
  },
  'nghe an': {
    total_beds: 5800, icu_beds: 350,
    hospitals: [
      { name: 'BV Hữu nghị Đa khoa NA', lat: 18.6733, lng: 105.6813, type: 'provincial', beds: 1200, icu_beds: 120 },
    ],
  },
  'quang ninh': {
    total_beds: 3500, icu_beds: 220,
    hospitals: [
      { name: 'BV Đa khoa Quảng Ninh', lat: 20.9543, lng: 107.0800, type: 'provincial', beds: 800, icu_beds: 80 },
    ],
  },
  'thua thien hue': {
    total_beds: 5000, icu_beds: 380,
    hospitals: [
      { name: 'BV TW Huế', lat: 16.4622, lng: 107.5857, type: 'central', beds: 2500, icu_beds: 250 },
    ],
  },
  'lam dong': {
    total_beds: 2200, icu_beds: 120,
    hospitals: [
      { name: 'BV Đa khoa Lâm Đồng', lat: 11.9462, lng: 108.4416, type: 'provincial', beds: 600, icu_beds: 50 },
    ],
  },
};

// ====== PROMPT REGION COORDINATES ======
const regionCoords: Record<string, { lat: number; lng: number; bbox: number[]; population: number }> = {
  'hcmc': { lat: 10.82, lng: 106.63, bbox: [106.3, 10.5, 107.0, 11.1], population: 9500000 },
  'tp hcm': { lat: 10.82, lng: 106.63, bbox: [106.3, 10.5, 107.0, 11.1], population: 9500000 },
  'ho chi minh': { lat: 10.82, lng: 106.63, bbox: [106.3, 10.5, 107.0, 11.1], population: 9500000 },
  'hanoi': { lat: 21.02, lng: 105.85, bbox: [105.3, 20.5, 106.4, 21.5], population: 8400000 },
  'ha noi': { lat: 21.02, lng: 105.85, bbox: [105.3, 20.5, 106.4, 21.5], population: 8400000 },
  'da nang': { lat: 16.05, lng: 108.2, bbox: [107.8, 15.8, 108.5, 16.3], population: 1200000 },
  'mien bac': { lat: 21.0, lng: 105.8, bbox: [102, 20, 108, 23.5], population: 25000000 },
  'mien trung': { lat: 16.0, lng: 108.0, bbox: [104, 11.5, 110, 20], population: 20000000 },
  'mien nam': { lat: 10.8, lng: 106.7, bbox: [104, 8.5, 108, 11.5], population: 36000000 },
  'viet nam': { lat: 16.0, lng: 106.5, bbox: [102, 8, 110, 24], population: 100000000 },
  'vietnam': { lat: 16.0, lng: 106.5, bbox: [102, 8, 110, 24], population: 100000000 },
  // ASEAN
  'asean': { lat: 10.0, lng: 108.0, bbox: [92, -11, 141, 28], population: 680000000 },
  'dong nam a': { lat: 10.0, lng: 108.0, bbox: [92, -11, 141, 28], population: 680000000 },
  'southeast asia': { lat: 10.0, lng: 108.0, bbox: [92, -11, 141, 28], population: 680000000 },
  'cambodia': { lat: 11.55, lng: 104.92, bbox: [102.3, 10.4, 107.6, 14.7], population: 17000000 },
  'campuchia': { lat: 11.55, lng: 104.92, bbox: [102.3, 10.4, 107.6, 14.7], population: 17000000 },
  'laos': { lat: 17.97, lng: 102.63, bbox: [100.1, 13.9, 107.7, 22.5], population: 7500000 },
  'lao': { lat: 17.97, lng: 102.63, bbox: [100.1, 13.9, 107.7, 22.5], population: 7500000 },
  'thailand': { lat: 15.87, lng: 100.99, bbox: [97.3, 5.6, 105.6, 20.5], population: 72000000 },
  'thai lan': { lat: 15.87, lng: 100.99, bbox: [97.3, 5.6, 105.6, 20.5], population: 72000000 },
  'myanmar': { lat: 19.76, lng: 96.08, bbox: [92.2, 9.8, 101.2, 28.5], population: 54000000 },
  'malaysia': { lat: 4.21, lng: 101.98, bbox: [99.6, 0.85, 119.3, 7.4], population: 33000000 },
  'singapore': { lat: 1.35, lng: 103.82, bbox: [103.6, 1.2, 104.1, 1.5], population: 5900000 },
  'indonesia': { lat: -2.5, lng: 118.0, bbox: [95.0, -11.0, 141.0, 6.1], population: 275000000 },
  'philippines': { lat: 12.88, lng: 121.77, bbox: [116.9, 4.6, 126.6, 21.1], population: 115000000 },
  // China
  'china': { lat: 23.0, lng: 110.0, bbox: [97, 18, 121, 30], population: 300000000 },
  'trung quoc': { lat: 23.0, lng: 110.0, bbox: [97, 18, 121, 30], population: 300000000 },
  'guangdong': { lat: 23.13, lng: 113.27, bbox: [109.6, 20.2, 117.2, 25.5], population: 127000000 },
  'quang dong': { lat: 23.13, lng: 113.27, bbox: [109.6, 20.2, 117.2, 25.5], population: 127000000 },
  'guangxi': { lat: 22.82, lng: 108.32, bbox: [104.3, 20.5, 112.1, 26.4], population: 50000000 },
  'quang tay': { lat: 22.82, lng: 108.32, bbox: [104.3, 20.5, 112.1, 26.4], population: 50000000 },
  'yunnan': { lat: 25.04, lng: 102.71, bbox: [97.5, 21.1, 106.2, 29.2], population: 47000000 },
  'van nam': { lat: 25.04, lng: 102.71, bbox: [97.5, 21.1, 106.2, 29.2], population: 47000000 },
  // Cross-border
  'cross-border': { lat: 16.0, lng: 106.5, bbox: [92, -11, 141, 30], population: 900000000 },
  'bien gioi': { lat: 16.0, lng: 106.5, bbox: [97, 8, 117, 27], population: 400000000 },
  'xuyen bien gioi': { lat: 16.0, lng: 106.5, bbox: [97, 8, 117, 27], population: 400000000 },
};

// ====== DISEASE & SEASONALITY ======
const diseaseKeywords: Record<string, string[]> = {
  dengue: ['dengue', 'sot xuat huyet', 'sxh', 'muoi'],
  tcm: ['tay chan mieng', 'tcm', 'hand foot mouth', 'hfmd'],
  covid19: ['covid', 'corona', 'sars'],
  influenza: ['cum', 'influenza', 'flu', 'h5n1', 'h1n1'],
  measles: ['soi', 'measles'],
  ari: ['ho hap', 'viem phoi', 'ari', 'respiratory'],
  rabies: ['dai', 'rabies', 'cho can'],
  tuberculosis: ['lao', 'tuberculosis', 'tb'],
};

const seasonalityIndex: Record<string, number[]> = {
  dengue:      [0.2, 0.15, 0.1, 0.15, 0.3, 0.5, 0.7, 0.85, 0.95, 1.0, 0.9, 0.5],
  tcm:         [0.3, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.9, 0.6, 0.4],
  covid19:     [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  influenza:   [0.9, 0.8, 0.6, 0.4, 0.3, 0.2, 0.2, 0.3, 0.4, 0.6, 0.8, 1.0],
  measles:     [0.8, 0.9, 1.0, 0.9, 0.7, 0.4, 0.2, 0.2, 0.3, 0.4, 0.5, 0.7],
  ari:         [0.9, 0.8, 0.6, 0.4, 0.3, 0.3, 0.3, 0.3, 0.5, 0.7, 0.8, 1.0],
  rabies:      [0.5, 0.5, 0.5, 0.6, 0.7, 0.8, 0.8, 0.7, 0.6, 0.5, 0.5, 0.5],
  tuberculosis:[0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
  all:         [0.5, 0.5, 0.5, 0.5, 0.5, 0.6, 0.6, 0.7, 0.7, 0.7, 0.6, 0.5],
};

// ====== NORMALIZER ======
function normalize(s: string): string {
  const map: Record<string, string> = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
    'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a','è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e','ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o','ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u','ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y','đ':'d',
  };
  let r = s.toLowerCase().trim();
  for (const [a, b] of Object.entries(map)) r = r.replaceAll(a, b);
  return r;
}

// ====== PROMPT PARSER (Extended) ======
function parsePrompt(prompt: string): {
  disease: string;
  region: string;
  regionCoord: { lat: number; lng: number; bbox: number[]; population: number } | null;
  forecast_days: number;
  region_scope: RegionScope;
  granularity: Granularity;
  mode: ForecastMode;
  signals: string[];
} {
  const norm = normalize(prompt);

  let disease = 'all';
  for (const [code, keywords] of Object.entries(diseaseKeywords)) {
    if (keywords.some(k => norm.includes(k))) { disease = code; break; }
  }

  // Region scope detection
  let region_scope: RegionScope = 'vietnam';
  if (norm.includes('cross') || norm.includes('xuyen bien gioi') || norm.includes('bien gioi') || norm.includes('lan truyen')) {
    region_scope = 'cross-border';
  } else if (norm.includes('asean') || norm.includes('dong nam a') || norm.includes('southeast asia')) {
    region_scope = 'asean';
  } else if (norm.includes('trung quoc') || norm.includes('china') || norm.includes('guangdong') || norm.includes('quang dong') || norm.includes('guangxi') || norm.includes('quang tay') || norm.includes('yunnan') || norm.includes('van nam')) {
    region_scope = 'china';
  }

  // Mode detection
  let mode: ForecastMode = 'epidemiology';
  if (norm.includes('chinh sach') || norm.includes('policy') || norm.includes('can thiep') || norm.includes('intervention') || norm.includes('chuan bi') || norm.includes('preparedness')) {
    mode = 'policy';
  }

  // Granularity
  let granularity: Granularity = 'province';
  if (region_scope === 'asean' || (norm.includes('quoc gia') || norm.includes('country'))) {
    granularity = 'country';
  }

  let region = 'vietnam';
  let regionCoord = regionCoords['vietnam'];
  // Try matching specific region coordinates
  for (const [key, coord] of Object.entries(regionCoords)) {
    if (key.length > 2 && norm.includes(normalize(key))) { region = key; regionCoord = coord; break; }
  }

  let forecast_days = 14;
  const dayMatch = norm.match(/(\d+)\s*(ngay|day|tuan|week)/);
  if (dayMatch) {
    const num = parseInt(dayMatch[1]);
    if (dayMatch[2].includes('tuan') || dayMatch[2].includes('week')) forecast_days = num * 7;
    else forecast_days = num;
  }
  forecast_days = Math.min(forecast_days, 30);

  const signals: string[] = [];
  if (norm.includes('mua') || norm.includes('rain')) signals.push('rain');
  if (norm.includes('do am') || norm.includes('humidity') || norm.includes('am')) signals.push('humidity');
  if (norm.includes('aqi') || norm.includes('khong khi') || norm.includes('o nhiem')) signals.push('aqi');
  if (norm.includes('tin') || norm.includes('news') || norm.includes('bao')) signals.push('news');
  if (signals.length === 0) signals.push('rain', 'humidity', 'aqi', 'news');

  return { disease, region, regionCoord, forecast_days, region_scope, granularity, mode, signals };
}

// ====== DATA FETCHERS ======
async function fetchWeatherForecast(lat: number, lng: number, days: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=rain_sum,relative_humidity_2m_mean,temperature_2m_mean&forecast_days=${Math.min(days, 16)}&current=temperature_2m,relative_humidity_2m,rain`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather API failed');
    const data = await res.json();
    const dailyRain = data.daily?.rain_sum || [];
    const dailyHumidity = data.daily?.relative_humidity_2m_mean || [];
    const avgRain = dailyRain.length > 0 ? dailyRain.reduce((a: number, b: number) => a + (b || 0), 0) / dailyRain.length : 0;
    const avgHumidity = dailyHumidity.length > 0 ? dailyHumidity.reduce((a: number, b: number) => a + (b || 0), 0) / dailyHumidity.length : 70;
    return { rain_index: Math.min(avgRain / 15, 1), humidity: avgHumidity / 100, temperature: data.current?.temperature_2m || 30 };
  } catch {
    return { rain_index: 0.3, humidity: 0.7, temperature: 30 };
  }
}

async function fetchAQI(lat: number, lng: number): Promise<number> {
  try {
    const res = await fetch(`https://api.waqi.info/feed/geo:${lat};${lng}/?token=demo`);
    const data = await res.json();
    return Math.min((data?.data?.aqi || 50) / 300, 1);
  } catch { return 0.3; }
}

async function fetchNewsSpike(supabase: any, disease: string): Promise<number> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    let query = supabase.from('health_news_articles').select('id', { count: 'exact', head: true }).gte('published_at', sevenDaysAgo);
    if (disease !== 'all') query = query.eq('disease_type', disease);
    const { count } = await query;
    return Math.min((count || 0) / 10, 1);
  } catch { return 0.2; }
}

async function fetchHistoricalAvg(supabase: any, disease: string, bbox: number[]) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000).toISOString();
    let query = supabase.from('case_events').select('lat, lon, occurred_at')
      .gte('occurred_at', thirtyDaysAgo)
      .gte('lat', bbox[1]).lte('lat', bbox[3])
      .gte('lon', bbox[0]).lte('lon', bbox[2]).limit(500);
    if (disease !== 'all') query = query.eq('disease_code', disease);
    const { data } = await query;
    if (!data || data.length === 0) return { dailyAvg: 2, total30d: 0, trend: 0, clusterCentroids: [] };
    const total30d = data.length;
    const recent = data.filter((c: any) => c.occurred_at >= fifteenDaysAgo).length;
    const older = total30d - recent;
    const trend = older > 0 ? ((recent - older) / older) : 0;
    const gridRes = 0.5;
    const clusters = new Map<string, { latSum: number; lngSum: number; count: number }>();
    for (const c of data) {
      const key = `${Math.floor(c.lat / gridRes) * gridRes},${Math.floor(c.lon / gridRes) * gridRes}`;
      if (!clusters.has(key)) clusters.set(key, { latSum: 0, lngSum: 0, count: 0 });
      const cl = clusters.get(key)!;
      cl.latSum += c.lat; cl.lngSum += c.lon; cl.count++;
    }
    const centroids = [...clusters.values()]
      .map(cl => ({ lat: cl.latSum / cl.count, lng: cl.lngSum / cl.count, weight: cl.count / total30d }))
      .sort((a, b) => b.weight - a.weight).slice(0, 10);
    return { dailyAvg: total30d / 30, total30d, trend, clusterCentroids: centroids };
  } catch { return { dailyAvg: 2, total30d: 0, trend: 0, clusterCentroids: [] }; }
}

// ====== PREDICTION ENGINE ======
function computePredictedCases(histAvg: number, days: number, rain: number, humidity: number, news: number, season: number): number {
  return Math.round(histAvg * days * (1 + rain * 0.25 + humidity * 0.15 + news * 0.2 + season * 0.1));
}

function classifyRisk(predicted: number) {
  if (predicted > 300) return { level: 'critical', color: '#dc2626' };
  if (predicted > 150) return { level: 'high', color: '#ef4444' };
  if (predicted >= 50) return { level: 'medium', color: '#f59e0b' };
  return { level: 'low', color: '#22c55e' };
}

function classifyPolicy(predicted: number, trend: number): string {
  if (predicted > 300 || (predicted > 150 && trend > 0.3)) return 'intervention_recommended';
  if (predicted > 150 || (predicted > 80 && trend > 0.2)) return 'preparedness';
  if (predicted >= 50 || trend > 0.1) return 'watchlist';
  return 'low';
}

function getSuggestedAction(risk: string, disease: string, predicted: number): string {
  if (risk === 'critical') return `🔴 Cảnh báo khẩn: Dự báo ${predicted} ca ${disease}. Tăng cường giám sát, phun thuốc, truyền thông cộng đồng.`;
  if (risk === 'high') return `🟠 Nguy cơ cao: Dự báo ${predicted} ca. Theo dõi chặt chẽ, chuẩn bị phương án ứng phó.`;
  if (risk === 'medium') return `🟡 Trung bình: Dự báo ${predicted} ca. Duy trì giám sát, chuẩn bị nguồn lực.`;
  return `🟢 An toàn: Dự báo ${predicted} ca. Duy trì giám sát thường quy.`;
}

// ====== GRID GENERATORS ======
function generateGrid(bbox: number[], stepDeg = 0.18): Array<{ lat: number; lng: number }> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const latSteps = Math.max(2, Math.min(15, Math.ceil((maxLat - minLat) / stepDeg)));
  const lngSteps = Math.max(2, Math.min(15, Math.ceil((maxLng - minLng) / stepDeg)));
  const points: Array<{ lat: number; lng: number }> = [];
  const latStep = (maxLat - minLat) / latSteps;
  const lngStep = (maxLng - minLng) / lngSteps;
  for (let i = 0; i <= latSteps; i++) {
    for (let j = 0; j <= lngSteps; j++) {
      points.push({
        lat: minLat + i * latStep + (Math.random() - 0.5) * latStep * 0.2,
        lng: minLng + j * lngStep + (Math.random() - 0.5) * lngStep * 0.2,
      });
    }
  }
  return points;
}

function clusterProximityWeight(lat: number, lng: number, centroids: Array<{ lat: number; lng: number; weight: number }>): number {
  if (centroids.length === 0) return 0.5;
  let total = 0;
  for (const c of centroids) {
    total += Math.max(0, 1 - Math.sqrt((lat - c.lat) ** 2 + (lng - c.lng) ** 2) / 2) * c.weight;
  }
  return Math.min(1, total);
}

function populationDensityWeight(lat: number, lng: number, cLat: number, cLng: number, bbox: number[]): number {
  const maxDist = Math.sqrt((bbox[3] - bbox[1]) ** 2 + (bbox[2] - bbox[0]) ** 2) / 2;
  const dist = Math.sqrt((lat - cLat) ** 2 + (lng - cLng) ** 2);
  return Math.max(0.2, 1 - (dist / (maxDist || 1)) * 0.6);
}

// Compute health_capacity_score for a province
function computeHealthCapacityScore(provinceName: string): { score: number; icu_weight: number; total_beds: number; icu_beds: number; stress_pct: number } {
  const hospitalData = provinceHospitalData[provinceName];
  const profile = provinceProfiles[provinceName];
  if (!hospitalData || !profile) return { score: 0.5, icu_weight: 0.3, total_beds: 0, icu_beds: 0, stress_pct: 50 };
  
  const bedsPerCapita = hospitalData.total_beds / profile.population;
  const icuWeight = Math.min(1, (hospitalData.icu_beds / Math.max(hospitalData.total_beds, 1)) * 10); // ICU ratio amplified
  const score = Math.min(1, bedsPerCapita * 200 + icuWeight * 0.3); // normalized
  return { score, icu_weight: icuWeight, total_beds: hospitalData.total_beds, icu_beds: hospitalData.icu_beds, stress_pct: 0 };
}

// Compute Policy Pressure Index
function computePolicyPressureIndex(predictedCases: number, capacityScore: number): number {
  if (capacityScore <= 0) return predictedCases;
  return Math.round((predictedCases / capacityScore) * 10) / 10;
}

// Province adjustment for Vietnam
function applyProvinceAdjustment(basePred: number, lat: number, lng: number) {
  let bestMatch: string | null = null;
  let bestProfile: ProvinceProfile | null = null;
  let minDist = Infinity;
  for (const [name, profile] of Object.entries(provinceProfiles)) {
    const coord = regionCoords[name];
    if (!coord) continue;
    const dist = Math.sqrt((lat - coord.lat) ** 2 + (lng - coord.lng) ** 2);
    if (dist < minDist) { minDist = dist; bestMatch = name; bestProfile = profile; }
  }
  if (!bestProfile || minDist > 1.0) return { adjusted: basePred, profile: null, provinceName: null, factor: 1.0 };
  const coeff = regionCoefficients[bestProfile.climate_zone] || regionCoefficients['south'];
  const factor = 1 + bestProfile.urban_index * coeff.urban + bestProfile.mobility_index * coeff.mobility + bestProfile.seasonality_factor * coeff.seasonality - bestProfile.health_capacity_index * coeff.health;
  return { adjusted: Math.max(0, Math.round(basePred * factor)), profile: bestProfile, provinceName: bestMatch, factor };
}

// Cross-border propagation
function applyCrossBorderPropagation(localRisk: number, entityName: string, allRisks: Map<string, number>): number {
  const neighbors = borderWeights[entityName];
  if (!neighbors) return localRisk;
  let borderContribution = 0;
  for (const [neighbor, weight] of Object.entries(neighbors)) {
    const neighborRisk = allRisks.get(neighbor) || 0;
    const profile = aseanProfiles[neighbor] || chinaProvinceProfiles[neighbor];
    const mobility = profile?.mobility_index || 0.3;
    borderContribution += neighborRisk * weight * mobility;
  }
  return localRisk + borderContribution;
}

// ====== GENERATE REGIONAL FEATURES ======
function generateCountryFeatures(
  profiles: Record<string, CountryProfile>,
  basePredicted: number,
  forecastDays: number,
  seasonIndex: number,
  weather: { rain_index: number; humidity: number },
  newsSpike: number,
  regionType: 'asean' | 'china',
  mode: ForecastMode,
  trend: number,
): any[] {
  const entries = Object.entries(profiles);
  const features: any[] = [];
  const riskMap = new Map<string, number>();

  // First pass: compute base risks
  for (const [name, profile] of entries) {
    const localMultiplier = 1 + profile.urban_index * 0.2 + profile.mobility_index * 0.15 - profile.health_capacity_index * 0.1;
    const predicted = Math.round((basePredicted / entries.length) * localMultiplier * (1 + (Math.random() - 0.5) * 0.3));
    riskMap.set(name, predicted);
  }

  // Second pass: cross-border propagation
  for (const [name, profile] of entries) {
    const basePred = riskMap.get(name) || 0;
    const adjustedPred = applyCrossBorderPropagation(basePred, name, riskMap);
    const finalPred = Math.round(adjustedPred);
    const risk = classifyRisk(finalPred);
    const policyLevel = classifyPolicy(finalPred, trend);
    const confidence = Math.round(Math.max(25, 60 - entries.length * 2 + (Math.random() - 0.5) * 10));

    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [profile.lng, profile.lat] },
      properties: {
        risk: Math.min(100, Math.round(finalPred / 3)),
        predicted_cases: Math.max(0, finalPred),
        risk_level: risk.level,
        policy_level: policyLevel,
        confidence,
        disease: 'all',
        forecast_days: forecastDays,
        trend: trend > 0.1 ? 'rising' : trend < -0.1 ? 'falling' : 'stable',
        entity_name: name,
        region_type: regionType,
        urban_index: profile.urban_index,
        health_capacity: profile.health_capacity_index,
        mobility_index: profile.mobility_index,
        population: profile.population,
        suggested_action: getSuggestedAction(risk.level, 'all', finalPred),
      },
    });
  }

  return features;
}

// ====== MAIN HANDLER ======
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { prompt } = await req.json();
    if (!prompt) return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const parsed = parsePrompt(prompt);
    console.log('[FORECAST] Parsed:', JSON.stringify(parsed));

    if (!parsed.regionCoord) {
      return new Response(JSON.stringify({ error: 'Không nhận diện được khu vực' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { lat, lng, bbox, population } = parsed.regionCoord;

    // Fetch data in parallel
    const [weather, aqiFactor, newsSpike, historical] = await Promise.all([
      fetchWeatherForecast(lat, lng, parsed.forecast_days),
      fetchAQI(lat, lng),
      fetchNewsSpike(supabase, parsed.disease),
      fetchHistoricalAvg(supabase, parsed.disease, bbox),
    ]);

    const currentMonth = new Date().getMonth();
    const seasonIndex = (seasonalityIndex[parsed.disease] || seasonalityIndex['all'])[currentMonth];
    const totalPredicted = computePredictedCases(historical.dailyAvg, parsed.forecast_days, weather.rain_index, weather.humidity, newsSpike, seasonIndex);

    // ====== GENERATE FEATURES BY SCOPE ======
    let vietnamFeatures: any[] = [];
    let aseanFeatures: any[] = [];
    let chinaFeatures: any[] = [];

    // Vietnam features (always generated for vietnam and cross-border)
    if (parsed.region_scope === 'vietnam' || parsed.region_scope === 'cross-border') {
      const vnBbox = parsed.region_scope === 'vietnam' ? bbox : [102, 8, 110, 24];
      const gridPoints = generateGrid(vnBbox);
      const provinceAdjustments = new Map<string, { total: number; count: number; profile: ProvinceProfile; factor: number }>();

      vietnamFeatures = gridPoints.map(point => {
        const popWeight = populationDensityWeight(point.lat, point.lng, lat, lng, vnBbox);
        const clusterWeight = clusterProximityWeight(point.lat, point.lng, historical.clusterCentroids);
        const combinedWeight = 0.4 * popWeight + 0.6 * clusterWeight;
        const baseCellPred = Math.round((totalPredicted / gridPoints.length) * combinedWeight * (1 + (Math.random() - 0.5) * 0.3) * gridPoints.length / (gridPoints.length * 0.3));
        const { adjusted, profile, provinceName, factor } = applyProvinceAdjustment(baseCellPred, point.lat, point.lng);

        if (provinceName && profile) {
          if (!provinceAdjustments.has(provinceName)) provinceAdjustments.set(provinceName, { total: 0, count: 0, profile, factor });
          const pa = provinceAdjustments.get(provinceName)!;
          pa.total += adjusted; pa.count++;
        }

        const cellRisk = classifyRisk(adjusted);
        const policyLevel = classifyPolicy(adjusted, historical.trend);
        const riskScore = Math.min(100, Math.round((weather.rain_index * 25 + weather.humidity * 15 + newsSpike * 20 + seasonIndex * 10 + clusterWeight * 30)));
        const confidence = Math.round(Math.max(20, Math.min(95, Math.min(85, 40 + historical.total30d * 0.8) + (Math.random() - 0.5) * 10)));

        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [point.lng, point.lat] },
          properties: {
            risk: riskScore,
            predicted_cases: Math.max(0, adjusted),
            risk_level: cellRisk.level,
            policy_level: policyLevel,
            confidence,
            disease: parsed.disease,
            forecast_days: parsed.forecast_days,
            trend: historical.trend > 0.1 ? 'rising' : historical.trend < -0.1 ? 'falling' : 'stable',
            pop_weight: Math.round(popWeight * 100),
            cluster_weight: Math.round(clusterWeight * 100),
            province_name: provinceName || null,
            climate_zone: profile?.climate_zone || null,
            adjustment_factor: Math.round((factor || 1) * 100) / 100,
            region_type: 'vietnam',
            suggested_action: getSuggestedAction(cellRisk.level, parsed.disease, adjusted),
          },
        };
      });
    }

    // ASEAN features
    if (parsed.region_scope === 'asean' || parsed.region_scope === 'cross-border') {
      aseanFeatures = generateCountryFeatures(
        aseanProfiles, totalPredicted * 0.6, parsed.forecast_days,
        seasonIndex, weather, newsSpike, 'asean', parsed.mode, historical.trend
      );
    }

    // China features
    if (parsed.region_scope === 'china' || parsed.region_scope === 'cross-border') {
      chinaFeatures = generateCountryFeatures(
        chinaProvinceProfiles, totalPredicted * 0.4, parsed.forecast_days,
        seasonIndex, weather, newsSpike, 'china', parsed.mode, historical.trend
      );
    }

    // Combine all features
    const allFeatures = [...vietnamFeatures, ...aseanFeatures, ...chinaFeatures];
    const geojson = { type: 'FeatureCollection', features: allFeatures };

    // Province predictions (Vietnam only)
    const vnProvPredictions = parsed.region_scope === 'vietnam' || parsed.region_scope === 'cross-border'
      ? computeProvincePredictions(vietnamFeatures)
      : [];

    // Model confidence
    const allPredicted = allFeatures.map(f => f.properties.predicted_cases);
    const mean = allPredicted.length > 0 ? allPredicted.reduce((a, b) => a + b, 0) / allPredicted.length : 0;
    const variance = allPredicted.length > 0 ? allPredicted.reduce((a, b) => a + (b - mean) ** 2, 0) / allPredicted.length : 0;
    const modelConfidence = Math.round(Math.max(30, 90 - Math.sqrt(variance) * 0.5));
    const totalClassification = classifyRisk(totalPredicted);

    return new Response(JSON.stringify({
      success: true,
      parsed: { ...parsed, regionCoord: undefined }, // Don't send coord details
      geojson,
      provincePredictions: vnProvPredictions,
      meta: {
        mode: parsed.region_scope === 'vietnam' ? 'local_intelligence' : `regional_${parsed.region_scope}`,
        forecast_mode: parsed.mode,
        region_scope: parsed.region_scope,
        granularity: parsed.granularity,
        weather: { rain_index: weather.rain_index, humidity: weather.humidity, temperature: weather.temperature },
        aqi: Math.round(aqiFactor * 300),
        newsSpike: Math.round(newsSpike * 100),
        seasonality: Math.round(seasonIndex * 100),
        historical: {
          dailyAvg: Math.round(historical.dailyAvg * 10) / 10,
          total30d: historical.total30d,
          trend: historical.trend > 0.1 ? 'rising' : historical.trend < -0.1 ? 'falling' : 'stable',
          trendValue: Math.round(historical.trend * 100),
        },
        prediction: {
          totalPredicted,
          riskLevel: totalClassification.level,
          policyLevel: classifyPolicy(totalPredicted, historical.trend),
          forecastDays: parsed.forecast_days,
          modelConfidence,
          formula: 'adjusted = base × (1 + urban×Cᵤ + mobility×Cₘ + season×Cₛ − health×Cₕ)',
        },
        population,
        pointCount: allFeatures.length,
        vietnamPoints: vietnamFeatures.length,
        aseanPoints: aseanFeatures.length,
        chinaPoints: chinaFeatures.length,
        center: { lat, lng },
        bbox,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('[FORECAST] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

// Helper to extract province-level predictions from Vietnam features
function computeProvincePredictions(features: any[]): any[] {
  const map = new Map<string, { total: number; count: number; zone: string; factor: number }>();
  for (const f of features) {
    const name = f.properties.province_name;
    if (!name) continue;
    if (!map.has(name)) map.set(name, { total: 0, count: 0, zone: f.properties.climate_zone || '', factor: f.properties.adjustment_factor || 1 });
    const m = map.get(name)!;
    m.total += f.properties.predicted_cases; m.count++;
  }
  return [...map.entries()]
    .map(([name, data]) => {
      const profile = provinceProfiles[name];
      const capacity = computeHealthCapacityScore(name);
      const ppi = computePolicyPressureIndex(data.total, capacity.score);
      const stressPct = capacity.total_beds > 0 ? Math.min(100, Math.round((data.total / capacity.total_beds) * 100)) : 0;
      const hospitalData = provinceHospitalData[name];
      return {
        province: name,
        predicted_cases: data.total,
        risk_level: classifyRisk(data.total).level,
        policy_level: classifyPolicy(data.total, 0),
        adjustment_factor: Math.round(data.factor * 100) / 100,
        climate_zone: data.zone,
        urban_index: profile?.urban_index || 0,
        health_capacity: profile?.health_capacity_index || 0,
        mobility_index: profile?.mobility_index || 0,
        population: profile?.population || 0,
        node_count: data.count,
        // Hospital infrastructure
        health_capacity_score: Math.round(capacity.score * 100) / 100,
        icu_weight: Math.round(capacity.icu_weight * 100) / 100,
        total_beds: capacity.total_beds,
        icu_beds: capacity.icu_beds,
        capacity_stress_pct: stressPct,
        policy_pressure_index: ppi,
        hospitals: hospitalData?.hospitals || [],
      };
    })
    .sort((a, b) => b.predicted_cases - a.predicted_cases);
}
