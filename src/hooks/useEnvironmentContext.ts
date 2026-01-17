/**
 * ENVIRONMENT CONTEXT HOOK
 * 
 * Fetches and manages environmental data for Digital Twin integration.
 * Privacy-first: Only coarse location, no tracking history.
 * Time-aware: Includes circadian and seasonal context.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  EnvironmentContext,
  PhysiologicalStressFactors,
  mapEnvironmentToPhysiology,
  getTimeContext,
  classifyAQI,
  coarsenLocation,
  WeatherCondition
} from '@/lib/environmentalContext';

interface UseEnvironmentContextOptions {
  // Refresh interval in ms (default 5 minutes)
  refreshInterval?: number;
  // Enable location tracking
  enableLocation?: boolean;
  // User profile for personalized stress calculation
  userProfile?: {
    age?: number;
    chronicConditions?: string[];
    allergies?: string[];
    medications?: string[];
  };
}

interface UseEnvironmentContextReturn {
  // Current environment context
  environment: EnvironmentContext | null;
  // Physiological stress factors derived from environment
  stress: PhysiologicalStressFactors | null;
  // Loading state
  isLoading: boolean;
  // Error state
  error: string | null;
  // Last update time
  lastUpdated: Date | null;
  // Manual refresh trigger
  refresh: () => Promise<void>;
  // Data freshness
  freshness: 'live' | 'recent' | 'cached' | 'stale';
}

// Cache key for localStorage
const CACHE_KEY = 'dt_environment_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useEnvironmentContext(
  options: UseEnvironmentContextOptions = {}
): UseEnvironmentContextReturn {
  const {
    refreshInterval = 5 * 60 * 1000, // 5 minutes default
    enableLocation = true,
    userProfile
  } = options;

  const [environment, setEnvironment] = useState<EnvironmentContext | null>(null);
  const [stress, setStress] = useState<PhysiologicalStressFactors | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [freshness, setFreshness] = useState<'live' | 'recent' | 'cached' | 'stale'>('stale');

  const locationRef = useRef<{ lat: number; lon: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load cached data
  const loadFromCache = useCallback((): EnvironmentContext | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const age = Date.now() - new Date(data.timestamp).getTime();
        if (age < CACHE_DURATION) {
          setFreshness('cached');
          return {
            ...data.environment,
            timestamp: new Date(data.environment.timestamp),
            meta: {
              ...data.environment.meta,
              freshness: 'cached',
              lastUpdated: new Date(data.environment.meta.lastUpdated)
            }
          };
        }
      }
    } catch (e) {
      console.error('Failed to load environment cache:', e);
    }
    return null;
  }, []);

  // Save to cache
  const saveToCache = useCallback((env: EnvironmentContext) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: new Date().toISOString(),
        environment: env
      }));
    } catch (e) {
      console.error('Failed to save environment cache:', e);
    }
  }, []);

  // Get current location (coarse)
  const getCurrentLocation = useCallback((): Promise<{ lat: number; lon: number }> => {
    return new Promise((resolve, reject) => {
      // Check if we already have location
      if (locationRef.current) {
        resolve(locationRef.current);
        return;
      }

      // Default to Ho Chi Minh City if geolocation not available
      const defaultLocation = { lat: 10.82, lon: 106.63 };

      if (!navigator.geolocation || !enableLocation) {
        locationRef.current = defaultLocation;
        resolve(defaultLocation);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coarse = coarsenLocation(
            position.coords.latitude,
            position.coords.longitude
          );
          locationRef.current = coarse;
          resolve(coarse);
        },
        () => {
          // Fallback to default on error
          locationRef.current = defaultLocation;
          resolve(defaultLocation);
        },
        {
          enableHighAccuracy: false, // Coarse location is fine
          timeout: 5000,
          maximumAge: 10 * 60 * 1000 // 10 minute cache
        }
      );
    });
  }, [enableLocation]);

  // Fetch environment data
  const fetchEnvironmentData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get location
      const location = await getCurrentLocation();

      // Fetch from edge function
      const { data, error: fetchError } = await supabase.functions.invoke(
        'fetch-environment-data',
        {
          body: { lat: location.lat, lon: location.lon }
        }
      );

      if (fetchError) throw fetchError;

      // Get time context
      const timeContext = getTimeContext(new Date(), location.lat);

      // Determine weather condition from data
      let conditions: WeatherCondition = 'clear';
      if (data.weather?.cloudCover > 80) conditions = 'clouds';
      if (data.airQuality?.aqi > 150) conditions = 'haze';

      // Build environment context
      const envContext: EnvironmentContext = {
        timestamp: new Date(),
        location: {
          city: 'Ho Chi Minh City', // Could be geocoded
          region: 'Vietnam',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          lat: location.lat,
          lon: location.lon
        },
        weather: {
          temperature: data.weather?.temperature ?? 30,
          humidity: data.weather?.humidity ?? 75,
          pressure: data.weather?.pressure ?? 1013,
          pressureChange1h: 0, // Would need historical data
          pressureChange24h: 0,
          uvIndex: data.weather?.uvIndex ?? 5,
          windSpeed: data.weather?.windSpeed ?? 10,
          cloudCover: 50,
          visibility: 10,
          conditions
        },
        airQuality: {
          aqi: data.airQuality?.aqi ?? 50,
          pm25: data.airQuality?.pm25 ?? 20,
          pm10: data.airQuality?.pm10 ?? 30,
          o3: data.airQuality?.o3 ?? 30,
          no2: data.airQuality?.no2 ?? 20,
          so2: data.airQuality?.so2 ?? 5,
          co: data.airQuality?.co ?? 300,
          mainPollutant: 'pm25',
          category: classifyAQI(data.airQuality?.aqi ?? 50)
        },
        timeContext,
        meta: {
          sources: [data.sources?.weather || 'API', data.sources?.airQuality || 'API'],
          freshness: 'live',
          lastUpdated: new Date(),
          accuracy: 'high'
        }
      };

      // Calculate physiological stress
      const stressFactors = mapEnvironmentToPhysiology(envContext, userProfile);

      // Update state
      setEnvironment(envContext);
      setStress(stressFactors);
      setLastUpdated(new Date());
      setFreshness('live');

      // Save to cache
      saveToCache(envContext);

    } catch (e) {
      console.error('Failed to fetch environment data:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch environment data');

      // Try to load from cache on error
      const cached = loadFromCache();
      if (cached) {
        setEnvironment(cached);
        setStress(mapEnvironmentToPhysiology(cached, userProfile));
        setFreshness('cached');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentLocation, userProfile, saveToCache, loadFromCache]);

  // Manual refresh
  const refresh = useCallback(async () => {
    await fetchEnvironmentData();
  }, [fetchEnvironmentData]);

  // Initial load and interval setup
  useEffect(() => {
    // Try cache first for instant display
    const cached = loadFromCache();
    if (cached) {
      setEnvironment(cached);
      setStress(mapEnvironmentToPhysiology(cached, userProfile));
      setIsLoading(false);
    }

    // Then fetch fresh data
    fetchEnvironmentData();

    // Set up refresh interval
    intervalRef.current = setInterval(() => {
      fetchEnvironmentData();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchEnvironmentData, loadFromCache, refreshInterval, userProfile]);

  // Update stress when userProfile changes
  useEffect(() => {
    if (environment) {
      setStress(mapEnvironmentToPhysiology(environment, userProfile));
    }
  }, [environment, userProfile]);

  // Update freshness over time
  useEffect(() => {
    if (!lastUpdated) return;

    const checkFreshness = () => {
      const age = Date.now() - lastUpdated.getTime();
      if (age < 60000) setFreshness('live');
      else if (age < 5 * 60000) setFreshness('recent');
      else if (age < 30 * 60000) setFreshness('cached');
      else setFreshness('stale');
    };

    checkFreshness();
    const interval = setInterval(checkFreshness, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return {
    environment,
    stress,
    isLoading,
    error,
    lastUpdated,
    refresh,
    freshness
  };
}
