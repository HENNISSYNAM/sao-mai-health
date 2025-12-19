import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    console.log(`Fetching environment data for location: ${lat}, ${lon}`);

    const WINDY_API_KEY = Deno.env.get('WINDY_API_KEY');
    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    const AIR_QUALITY_API_KEY = Deno.env.get('AIR_QUALITY_API_KEY');

    let weatherData = null;

    // Primary: OpenWeatherMap API (more reliable)
    if (OPENWEATHER_API_KEY) {
      try {
        console.log('Fetching weather data from OpenWeatherMap...');
        const owmResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (owmResponse.ok) {
          const owmData = await owmResponse.json();
          console.log('OpenWeatherMap data received:', JSON.stringify(owmData));
          
          weatherData = {
            temperature: owmData.main?.temp,
            humidity: owmData.main?.humidity,
            pressure: owmData.main?.pressure,
            windSpeed: owmData.wind?.speed ? owmData.wind.speed * 3.6 : null, // m/s to km/h
            feelsLike: owmData.main?.feels_like,
            visibility: owmData.visibility ? owmData.visibility / 1000 : null, // m to km
            clouds: owmData.clouds?.all,
            description: owmData.weather?.[0]?.description,
          };
          console.log('Processed OpenWeatherMap data:', JSON.stringify(weatherData));
        } else {
          const errorText = await owmResponse.text();
          console.error('OpenWeatherMap API error:', owmResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching from OpenWeatherMap:', error);
      }
    }

    // Fallback: Windy API
    if (!weatherData && WINDY_API_KEY) {
      try {
        console.log('Fetching weather data from Windy API (fallback)...');
        const windyResponse = await fetch('https://api.windy.com/api/point-forecast/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat, lon,
            model: 'gfs',
            parameters: ['temp', 'wind', 'pressure', 'rh'],
            levels: ['surface'],
            key: WINDY_API_KEY,
          }),
        });
        
        if (windyResponse.ok) {
          const windyData = await windyResponse.json();
          const tempSurface = windyData['temp-surface'];
          const pressureSurface = windyData['pressure-surface'];
          const rhSurface = windyData['rh-surface'];
          
          weatherData = {
            temperature: tempSurface?.[0] ? (tempSurface[0] - 273.15) : null,
            humidity: rhSurface?.[0] || null,
            pressure: pressureSurface?.[0] ? (pressureSurface[0] / 100) : null,
            windSpeed: null,
          };
          console.log('Processed Windy weather data:', JSON.stringify(weatherData));
        }
      } catch (error) {
        console.error('Error fetching from Windy:', error);
      }
    }

    // Air quality from IQAir
    let airQualityData = null;
    if (AIR_QUALITY_API_KEY) {
      try {
        console.log('Fetching air quality data from IQAir...');
        const aqResponse = await fetch(
          `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${AIR_QUALITY_API_KEY}`
        );
        
        if (aqResponse.ok) {
          airQualityData = await aqResponse.json();
          console.log('Air quality data fetched successfully');
        }
      } catch (error) {
        console.error('Error fetching air quality:', error);
      }
    }

    // Additional: OpenWeatherMap Air Pollution API
    let owmAirPollution = null;
    if (OPENWEATHER_API_KEY) {
      try {
        console.log('Fetching air pollution from OpenWeatherMap...');
        const pollutionResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
        );
        
        if (pollutionResponse.ok) {
          owmAirPollution = await pollutionResponse.json();
          console.log('OpenWeatherMap pollution data:', JSON.stringify(owmAirPollution));
        }
      } catch (error) {
        console.error('Error fetching OWM pollution:', error);
      }
    }

    // Combine all data
    const pollution = airQualityData?.data?.current?.pollution;
    const owmPollutionData = owmAirPollution?.list?.[0]?.components;
    
    const result = {
      timestamp: new Date().toISOString(),
      location: { lat, lon },
      weather: weatherData,
      airQuality: {
        aqi: pollution?.aqius || (owmAirPollution?.list?.[0]?.main?.aqi * 50) || null,
        mainPollutant: pollution?.mainus || 'p2',
        pm25: owmPollutionData?.pm2_5 || pollution?.aqius || null,
        pm10: owmPollutionData?.pm10 || null,
        no2: owmPollutionData?.no2 || null,
        so2: owmPollutionData?.so2 || null,
        co: owmPollutionData?.co || null,
        o3: owmPollutionData?.o3 || null,
      },
    };

    console.log('Combined environment data:', JSON.stringify(result));

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
