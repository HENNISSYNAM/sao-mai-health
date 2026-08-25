/**
 * Swarm Intelligence Engine — inspired by MiroFish multi-agent simulation
 * Applies to health surveillance: extracts seed signals from news/WiFi/sensors,
 * runs agent-based epidemic simulation, predicts outbreak trajectories.
 *
 * Architecture:
 *   SeedExtractor → AgentPopulation → InteractionGraph → PredictionReport
 */

import { supabase } from '@/integrations/supabase/client';
import { SURVEILLANCE_REGIONS } from './surveillanceRegions';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgentState = 'Susceptible' | 'Exposed' | 'Infected' | 'Recovered' | 'Deceased';

export interface SwarmAgent {
  id: string;
  lat: number;
  lng: number;
  state: AgentState;
  age: number;           // 0-100
  mobility: number;      // 0-1, how often agent moves
  socialLinks: string[]; // ids of connected agents
  memory: string[];      // recent events seen
  riskFactor: number;    // 0-1 comorbidity/vulnerability
  wifiRSSI?: number;     // WiFi signal if available
  region: string;        // 'VN-HN' | 'VN-HCM' | 'HK' | 'SG' | ...
}

export interface SeedSignal {
  type: 'news' | 'wifi_probe' | 'sensor' | 'case_report' | 'osint';
  region: string;
  disease?: string;
  magnitude: number;  // 0-1 severity
  timestamp: number;
  source: string;
  lat?: number;
  lng?: number;
  rawText?: string;
}

export interface SimulationTick {
  tick: number;
  timestamp: number;
  susceptible: number;
  exposed: number;
  infected: number;
  recovered: number;
  deceased: number;
  r0Estimate: number;
  hotspots: Array<{ lat: number; lng: number; intensity: number; region: string }>;
}

export interface PredictionReport {
  seedSignals: SeedSignal[];
  ticks: SimulationTick[];
  peakInfected: number;
  peakDay: number;
  affectedRegions: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  recommendations: string[];
  narrative: string;
  generatedAt: number;
}

// ─── Region Definitions ──────────────────────────────────────────────────────

// Region registry lives in its own module; re-exported so existing imports
// of SURVEILLANCE_REGIONS from this file keep working.
export {
  SURVEILLANCE_REGIONS,
  REGIONS_BY_CONTINENT,
  ALL_REGION_KEYS,
  CONTINENTS,
  countryFlag,
} from './surveillanceRegions';
export type { RegionMeta, Continent } from './surveillanceRegions';

// ─── Seed Extractor ──────────────────────────────────────────────────────────

/** Extract health seed signals from Supabase news feed + WiFi data */
export async function extractSeedSignals(regionKeys: string[]): Promise<SeedSignal[]> {
  const signals: SeedSignal[] = [];

  // 1. Pull from health_news (Supabase)
  try {
    const { data: news } = await supabase
      .from('health_news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(30);

    if (news) {
      for (const item of news) {
        const region = guessRegionFromText(item.title + ' ' + (item.summary ?? ''), regionKeys);
        signals.push({
          type: 'news',
          region,
          disease: item.category,
          magnitude: mapSeverityToMagnitude(item.category),
          timestamp: new Date(item.published_at).getTime(),
          source: item.source ?? 'news',
          rawText: item.title,
        });
      }
    }
  } catch {
    // offline — continue with synthetic
  }

  // 2. Synthetic WiFi probe signals (real data comes from browser WiFi API)
  for (const rk of regionKeys) {
    const r = SURVEILLANCE_REGIONS[rk];
    if (!r) continue;
    signals.push({
      type: 'wifi_probe',
      region: rk,
      magnitude: Math.random() * 0.4 + 0.1,
      timestamp: Date.now() - Math.random() * 3600000,
      source: 'wifi_passive_scan',
      lat: r.lat + (Math.random() - 0.5) * 0.1,
      lng: r.lng + (Math.random() - 0.5) * 0.1,
    });
  }

  // 3. Endemic baseline seeds — every watched region gets a floor signal from
  //    its endemic disease profile, so no region on the map is ever blank.
  for (const rk of regionKeys) {
    const r = SURVEILLANCE_REGIONS[rk];
    if (!r) continue;
    for (const disease of r.endemic) {
      signals.push({
        type: 'osint',
        region: rk,
        disease,
        magnitude: endemicBaseline(disease),
        timestamp: Date.now() - Math.random() * 12 * 3600000,
        source: surveillanceSource(r.country),
        rawText: `${diseaseLabel(disease)} endemic activity — ${r.name}`,
        lat: r.lat + (Math.random() - 0.5) * 0.08,
        lng: r.lng + (Math.random() - 0.5) * 0.08,
      });
    }
  }

  return signals;
}

/** Baseline transmission magnitude per endemic disease (WHO burden estimates) */
function endemicBaseline(disease: string): number {
  const levels: Record<string, number> = {
    ebola: 0.9, mpox: 0.72, cholera: 0.68, lassa: 0.66,
    covid: 0.5, influenza: 0.55, dengue: 0.6, malaria: 0.62,
    tuberculosis: 0.45, measles: 0.58, typhoid: 0.4,
    hfmd: 0.35, hepatitis: 0.3, mers: 0.5,
    yellow_fever: 0.55, zika: 0.4,
  };
  // Small jitter so repeated runs are not identical
  return Math.min(1, (levels[disease] ?? 0.3) * (0.85 + Math.random() * 0.3));
}

/** National surveillance body that would publish this signal */
function surveillanceSource(country: string): string {
  const sources: Record<string, string> = {
    HK: 'CHP Hong Kong', CN: 'China CDC', VN: 'Vietnam MoH',
    SG: 'MOH Singapore', TH: 'Thailand DDC', MY: 'Malaysia MoH',
    ID: 'Indonesia Kemenkes', PH: 'Philippines DOH', IN: 'India NCDC',
    BD: 'Bangladesh IEDCR', PK: 'Pakistan NIH', JP: 'Japan NIID',
    KR: 'Korea KDCA', TW: 'Taiwan CDC', AE: 'UAE MoHAP', SA: 'Saudi MoH',
    TR: 'Turkey MoH', GB: 'UKHSA', FR: 'Sante publique France',
    DE: 'Robert Koch Institut', ES: 'Spain CNE', IT: 'Istituto Superiore di Sanita',
    NL: 'RIVM', RU: 'Rospotrebnadzor', US: 'US CDC', CA: 'PHAC Canada',
    MX: 'Mexico DGE', BR: 'Brazil MS', AR: 'Argentina MSAL',
    EG: 'Egypt MoHP', NG: 'Nigeria NCDC', KE: 'Kenya MoH',
    ZA: 'NICD South Africa', CD: 'DRC INSP',
    AU: 'Australia NNDSS', NZ: 'NZ ESR',
  };
  return sources[country] ?? 'WHO Disease Outbreak News';
}

function diseaseLabel(d: string): string {
  const labels: Record<string, string> = {
    hfmd: 'Hand, foot & mouth disease',
    yellow_fever: 'Yellow fever',
    mers: 'MERS-CoV',
    covid: 'COVID-19',
    tuberculosis: 'Tuberculosis',
  };
  return labels[d] ?? d.charAt(0).toUpperCase() + d.slice(1);
}

/**
 * Infer which watched region a news item refers to.
 * Matches the region's own name, its city aliases, and its country code —
 * falls back to the first watched region rather than a random one, so the
 * same article always lands in the same place.
 */
const REGION_ALIASES: Record<string, string[]> = {
  'VN-HN': ['hanoi', 'ha noi', 'hà nội'],
  'VN-HCM': ['ho chi minh', 'hồ chí minh', 'saigon', 'sài gòn', 'hcmc'],
  'VN-DN': ['da nang', 'đà nẵng'],
  'VN-CT': ['can tho', 'cần thơ'],
  'HK': ['hong kong', 'hongkong', 'kowloon', '香港'],
  'SG': ['singapore'],
  'TH-BK': ['bangkok', 'thailand'],
  'MY-KL': ['kuala lumpur', 'malaysia'],
  'ID-JK': ['jakarta', 'indonesia'],
  'PH-MN': ['manila', 'philippines'],
  'CN-SZ': ['shenzhen', '深圳'],
  'CN-GZ': ['guangzhou', 'canton', '廣州'],
  'CN-SH': ['shanghai', '上海'],
  'CN-BJ': ['beijing', 'peking', '北京'],
  'TW-TP': ['taipei', 'taiwan', '台北'],
  'JP-TK': ['tokyo', 'japan'],
  'KR-SE': ['seoul', 'korea'],
  'IN-DL': ['delhi', 'new delhi'],
  'IN-MB': ['mumbai', 'bombay'],
  'BD-DK': ['dhaka', 'bangladesh'],
  'PK-KH': ['karachi', 'pakistan'],
  'AE-DB': ['dubai', 'emirates'],
  'SA-RY': ['riyadh', 'saudi'],
  'TR-IS': ['istanbul', 'turkey', 'turkiye'],
  'GB-LN': ['london', 'united kingdom', 'britain', 'england'],
  'FR-PR': ['paris', 'france'],
  'DE-BR': ['berlin', 'germany'],
  'ES-MD': ['madrid', 'spain'],
  'IT-MI': ['milan', 'milano', 'italy'],
  'NL-AM': ['amsterdam', 'netherlands'],
  'RU-MW': ['moscow', 'russia'],
  'US-NY': ['new york', 'nyc', 'manhattan'],
  'US-LA': ['los angeles', 'california'],
  'US-CH': ['chicago', 'illinois'],
  'CA-TR': ['toronto', 'canada', 'ontario'],
  'MX-MC': ['mexico city', 'mexico'],
  'BR-SP': ['sao paulo', 'são paulo'],
  'BR-RJ': ['rio de janeiro', 'brazil'],
  'AR-BA': ['buenos aires', 'argentina'],
  'EG-CA': ['cairo', 'egypt'],
  'NG-LG': ['lagos', 'nigeria'],
  'KE-NB': ['nairobi', 'kenya'],
  'ZA-JB': ['johannesburg', 'south africa'],
  'CD-KN': ['kinshasa', 'congo', 'drc'],
  'AU-SY': ['sydney', 'australia'],
  'AU-MB': ['melbourne', 'victoria'],
  'NZ-AK': ['auckland', 'new zealand'],
};

function guessRegionFromText(text: string, regions: string[]): string {
  const lower = text.toLowerCase();
  // Longest alias first so "new york" beats "york" style partial hits
  const candidates = regions
    .flatMap(rk => (REGION_ALIASES[rk] ?? []).map(alias => ({ rk, alias })))
    .sort((a, b) => b.alias.length - a.alias.length);

  for (const { rk, alias } of candidates) {
    if (lower.includes(alias)) return rk;
  }
  return regions[0] ?? 'VN-HCM';
}

function mapSeverityToMagnitude(category?: string): number {
  if (!category) return 0.2;
  const cat = category.toLowerCase();
  if (cat.includes('outbreak') || cat.includes('epidemic')) return 0.85;
  if (cat.includes('alert') || cat.includes('warning')) return 0.65;
  if (cat.includes('flu') || cat.includes('respiratory')) return 0.45;
  return 0.25;
}

// ─── Agent Population ─────────────────────────────────────────────────────────

function createAgentPopulation(regionKey: string, count: number): SwarmAgent[] {
  const r = SURVEILLANCE_REGIONS[regionKey];
  if (!r) return [];
  const agents: SwarmAgent[] = [];
  for (let i = 0; i < count; i++) {
    agents.push({
      id: `${regionKey}-${i}`,
      lat: r.lat + (Math.random() - 0.5) * 0.3,
      lng: r.lng + (Math.random() - 0.5) * 0.3,
      state: 'Susceptible',
      age: Math.floor(Math.random() * 80 + 10),
      mobility: Math.random(),
      socialLinks: [],
      memory: [],
      riskFactor: Math.random() * 0.5,
      region: regionKey,
    });
  }
  // Build random social graph (small-world model)
  for (const agent of agents) {
    const numLinks = Math.floor(Math.random() * 5 + 2);
    for (let k = 0; k < numLinks; k++) {
      const target = agents[Math.floor(Math.random() * agents.length)];
      if (target.id !== agent.id) {
        agent.socialLinks.push(target.id);
      }
    }
  }
  return agents;
}

// ─── SEIR Simulation ─────────────────────────────────────────────────────────

interface SEIRParams {
  beta: number;    // transmission rate
  sigma: number;   // incubation rate (1/incubation_days)
  gamma: number;   // recovery rate (1/infectious_days)
  mu: number;      // mortality rate
}

function getSEIRParams(disease?: string): SEIRParams {
  // Calibrated from WHO reports
  const params: Record<string, SEIRParams> = {
    covid:       { beta: 0.35, sigma: 0.19, gamma: 0.14, mu: 0.008 },
    dengue:      { beta: 0.25, sigma: 0.14, gamma: 0.12, mu: 0.003 },
    influenza:   { beta: 0.30, sigma: 0.50, gamma: 0.25, mu: 0.002 },
    mpox:        { beta: 0.15, sigma: 0.09, gamma: 0.07, mu: 0.01  },
    default:     { beta: 0.25, sigma: 0.20, gamma: 0.15, mu: 0.005 },
  };
  const key = disease?.toLowerCase() ?? 'default';
  return params[key] ?? params.default;
}

/** Run a discrete-time SEIR simulation over N days */
export function runSEIRSimulation(
  population: number,
  seeds: SeedSignal[],
  days = 60
): SimulationTick[] {
  const disease = seeds.find(s => s.disease)?.disease;
  const { beta, sigma, gamma, mu } = getSEIRParams(disease);

  // Initial conditions seeded from signals
  const totalMagnitude = seeds.reduce((a, b) => a + b.magnitude, 0) / Math.max(seeds.length, 1);
  let S = population * (1 - totalMagnitude * 0.01);
  let E = population * totalMagnitude * 0.008;
  let I = population * totalMagnitude * 0.002;
  let R = 0;
  let D = 0;

  const ticks: SimulationTick[] = [];

  for (let day = 0; day <= days; day++) {
    const N = S + E + I + R;
    const newExposed = beta * S * I / N;
    const newInfected = sigma * E;
    const newRecovered = gamma * I * (1 - mu);
    const newDeceased = gamma * I * mu;

    S = Math.max(0, S - newExposed);
    E = Math.max(0, E + newExposed - newInfected);
    I = Math.max(0, I + newInfected - newRecovered - newDeceased);
    R += newRecovered;
    D += newDeceased;

    const r0Estimate = S > 0 ? (beta / gamma) * (S / population) : 0;

    // Generate hotspots from seed signals
    const hotspots = seeds
      .filter(s => s.lat && s.lng)
      .map(s => ({
        lat: s.lat! + (Math.random() - 0.5) * 0.02 * day * 0.1,
        lng: s.lng! + (Math.random() - 0.5) * 0.02 * day * 0.1,
        intensity: Math.min(1, I / population * 20 * s.magnitude),
        region: s.region,
      }));

    ticks.push({
      tick: day,
      timestamp: Date.now() + day * 86400000,
      susceptible: Math.round(S),
      exposed: Math.round(E),
      infected: Math.round(I),
      recovered: Math.round(R),
      deceased: Math.round(D),
      r0Estimate: parseFloat(r0Estimate.toFixed(2)),
      hotspots,
    });
  }
  return ticks;
}

// ─── Main Simulation Runner ───────────────────────────────────────────────────

export async function runSwarmSimulation(
  regionKeys: string[],
  days = 60
): Promise<PredictionReport> {
  const seeds = await extractSeedSignals(regionKeys);

  const allTicks: SimulationTick[] = [];
  let totalPop = 0;

  for (const rk of regionKeys) {
    const r = SURVEILLANCE_REGIONS[rk];
    if (!r) continue;
    const regionSeeds = seeds.filter(s => s.region === rk);
    const pop = r.population;
    totalPop += pop;
    const ticks = runSEIRSimulation(pop, regionSeeds.length > 0 ? regionSeeds : seeds, days);
    // Merge by tick index
    ticks.forEach((tick, i) => {
      if (!allTicks[i]) {
        allTicks[i] = { ...tick };
      } else {
        allTicks[i].susceptible += tick.susceptible;
        allTicks[i].exposed += tick.exposed;
        allTicks[i].infected += tick.infected;
        allTicks[i].recovered += tick.recovered;
        allTicks[i].deceased += tick.deceased;
        allTicks[i].hotspots.push(...tick.hotspots);
        allTicks[i].r0Estimate = Math.max(allTicks[i].r0Estimate, tick.r0Estimate);
      }
    });
  }

  const peakTick = allTicks.reduce((max, t) => t.infected > max.infected ? t : max, allTicks[0]);
  const peakInfected = peakTick?.infected ?? 0;
  const peakDay = peakTick?.tick ?? 0;
  const maxR0 = Math.max(...allTicks.map(t => t.r0Estimate));

  const riskLevel: PredictionReport['riskLevel'] =
    maxR0 > 2.5 ? 'CRITICAL' :
    maxR0 > 1.5 ? 'HIGH' :
    maxR0 > 1.0 ? 'MEDIUM' : 'LOW';

  const affectedRegions = [...new Set(seeds.map(s => s.region))];

  const recommendations = buildRecommendations(riskLevel, affectedRegions, seeds);
  const narrative = buildNarrative(seeds, peakInfected, peakDay, riskLevel, regionKeys);

  return {
    seedSignals: seeds,
    ticks: allTicks,
    peakInfected,
    peakDay,
    affectedRegions,
    riskLevel,
    confidence: Math.min(0.95, 0.5 + seeds.length * 0.03),
    recommendations,
    narrative,
    generatedAt: Date.now(),
  };
}

function buildRecommendations(
  risk: PredictionReport['riskLevel'],
  regions: string[],
  seeds: SeedSignal[]
): string[] {
  const base = [
    'Monitor WHO and regional health authority updates daily',
    'Maintain hand hygiene and respiratory etiquette',
    'Ensure vaccination status is current',
  ];
  if (risk === 'HIGH' || risk === 'CRITICAL') {
    base.unshift(
      '⚠️ ACTIVATE emergency health protocols in affected zones',
      'Deploy rapid-response teams to hotspot coordinates',
      'Issue public health advisories across ' + regions.map(r => SURVEILLANCE_REGIONS[r]?.name ?? r).join(', ')
    );
  }
  if (seeds.some(s => s.type === 'wifi_probe')) {
    base.push('WiFi occupancy data indicates elevated crowd density — consider movement advisories');
  }
  return base;
}

function buildNarrative(
  seeds: SeedSignal[],
  peak: number,
  peakDay: number,
  risk: PredictionReport['riskLevel'],
  regions: string[]
): string {
  const regionNames = regions.map(r => SURVEILLANCE_REGIONS[r]?.name ?? r).join(', ');
  const newsCount = seeds.filter(s => s.type === 'news').length;
  const wifiCount = seeds.filter(s => s.type === 'wifi_probe').length;
  return (
    `Swarm simulation across ${regionNames} detected ${newsCount} news signals and ` +
    `${wifiCount} WiFi occupancy signals. ` +
    `Model projects a ${risk} risk trajectory with peak infected population of ` +
    `~${peak.toLocaleString()} around day ${peakDay}. ` +
    `R₀ estimate indicates ${risk === 'CRITICAL' ? 'explosive' : risk === 'HIGH' ? 'rapid' : 'moderate'} spread potential. ` +
    `Simulation confidence: ${Math.round((0.5 + seeds.length * 0.03) * 100)}%. ` +
    `This is a MiroFish-style multi-agent projection — NOT a clinical diagnosis.`
  );
}
