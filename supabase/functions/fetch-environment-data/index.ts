import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch with timeout helper
async function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Fetch weather data - try multiple sources in priority order
async function fetchWeatherData(lat: number, lon: number): Promise<{ data: any; source: string }> {
  const TOMORROW_API_KEY = Deno.env.get('TOMORROW_API_KEY');
  const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

  // Strategy: Try Open-Meteo first (fastest, free, no rate limits)
  // Then fallback to paid APIs if needed
  
  // Open-Meteo (FREE, fastest, reliable)
  try {
    console.log('Fetching weather from Open-Meteo...');
    const response = await fetchWithTimeout(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,uv_index&timezone=auto`,
      4000
    );

    if (response.ok) {
      const data = await response.json();
      const current = data?.current;
      if (current) {
        return {
          data: {
            temperature: current.temperature_2m ?? null,
            humidity: current.relative_humidity_2m ?? null,
            pressure: current.surface_pressure ?? null,
            windSpeed: current.wind_speed_10m ?? null,
            uvIndex: current.uv_index ?? null,
          },
          source: 'Open-Meteo'
        };
      }
    }
  } catch (error) {
    console.error('Open-Meteo weather error:', error);
  }

  // Tomorrow.io (backup)
  if (TOMORROW_API_KEY) {
    try {
      console.log('Fetching weather from Tomorrow.io...');
      const response = await fetchWithTimeout(
        `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${TOMORROW_API_KEY}`,
        4000
      );

      if (response.ok) {
        const data = await response.json();
        const values = data?.data?.values;
        if (values) {
          return {
            data: {
              temperature: values.temperature,
              humidity: values.humidity,
              pressure: values.pressureSurfaceLevel,
              windSpeed: values.windSpeed ? values.windSpeed * 3.6 : null,
              uvIndex: values.uvIndex,
            },
            source: 'Tomorrow.io'
          };
        }
      }
    } catch (error) {
      console.error('Tomorrow.io error:', error);
    }
  }

  // OpenWeatherMap (backup)
  if (OPENWEATHER_API_KEY) {
    try {
      console.log('Fetching weather from OpenWeatherMap...');
      const response = await fetchWithTimeout(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`,
        4000
      );

      if (response.ok) {
        const data = await response.json();
        return {
          data: {
            temperature: data.main?.temp ?? null,
            humidity: data.main?.humidity ?? null,
            pressure: data.main?.pressure ?? null,
            windSpeed: data.wind?.speed ? data.wind.speed * 3.6 : null,
            uvIndex: null,
          },
          source: 'OpenWeatherMap'
        };
      }
    } catch (error) {
      console.error('OpenWeatherMap error:', error);
    }
  }

  return { data: null, source: 'None' };
}

// Fetch air quality data - try multiple sources
async function fetchAirQualityData(lat: number, lon: number): Promise<{ data: any; source: string }> {
  const AIR_QUALITY_API_KEY = Deno.env.get('AIR_QUALITY_API_KEY');
  const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');

  // Strategy: Try Open-Meteo first (fastest, free)
  
  // Open-Meteo Air Quality (FREE, fastest)
  try {
    console.log('Fetching air quality from Open-Meteo...');
    const response = await fetchWithTimeout(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,us_aqi,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide`,
      4000
    );

    if (response.ok) {
      const data = await response.json();
      const current = data?.current;
      if (current) {
        return {
          data: {
            aqi: current.us_aqi ?? null,
            pm25: current.pm2_5 ?? null,
            pm10: current.pm10 ?? null,
            no2: current.nitrogen_dioxide ?? null,
            so2: current.sulphur_dioxide ?? null,
            o3: current.ozone ?? null,
            co: current.carbon_monoxide ?? null,
            mainPollutant: 'p2',
          },
          source: 'Open-Meteo'
        };
      }
    }
  } catch (error) {
    console.error('Open-Meteo AQ error:', error);
  }

  // IQAir (backup)
  if (AIR_QUALITY_API_KEY) {
    try {
      console.log('Fetching air quality from IQAir...');
      const response = await fetchWithTimeout(
        `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${AIR_QUALITY_API_KEY}`,
        4000
      );

      if (response.ok) {
        const data = await response.json();
        const pollution = data?.data?.current?.pollution;
        if (pollution) {
          return {
            data: {
              aqi: pollution.aqius,
              pm25: pollution.aqius,
              mainPollutant: pollution.mainus,
            },
            source: 'IQAir'
          };
        }
      }
    } catch (error) {
      console.error('IQAir error:', error);
    }
  }

  // OpenWeatherMap Pollution (backup)
  if (OPENWEATHER_API_KEY) {
    try {
      console.log('Fetching air quality from OpenWeatherMap...');
      const response = await fetchWithTimeout(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`,
        4000
      );

      if (response.ok) {
        const data = await response.json();
        const components = data?.list?.[0]?.components;
        const aqi = data?.list?.[0]?.main?.aqi;
        if (components) {
          return {
            data: {
              aqi: aqi ? aqi * 50 : null,
              pm25: components.pm2_5,
              pm10: components.pm10,
              no2: components.no2,
              so2: components.so2,
              co: components.co,
              o3: components.o3,
              mainPollutant: 'p2',
            },
            source: 'OpenWeatherMap'
          };
        }
      }
    } catch (error) {
      console.error('OpenWeatherMap AQ error:', error);
    }
  }

  return { data: null, source: 'None' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    console.log(`Fetching environment data for: ${lat}, ${lon}`);
    const startTime = Date.now();

    // PARALLEL fetch - weather and air quality at the same time
    const [weatherResult, airQualityResult] = await Promise.all([
      fetchWeatherData(lat, lon),
      fetchAirQualityData(lat, lon)
    ]);

    const elapsed = Date.now() - startTime;
    console.log(`Data fetched in ${elapsed}ms - Weather: ${weatherResult.source}, AQ: ${airQualityResult.source}`);

    const result = {
      timestamp: new Date().toISOString(),
      location: { lat, lon },
      sources: {
        weather: weatherResult.source,
        airQuality: airQualityResult.source,
      },
      weather: weatherResult.data,
      airQuality: airQualityResult.data || {
        aqi: null,
        pm25: null,
        pm10: null,
        no2: null,
        so2: null,
        co: null,
        o3: null,
        mainPollutant: 'p2',
      },
      fetchTimeMs: elapsed
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-environment-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
