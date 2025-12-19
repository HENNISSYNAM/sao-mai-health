import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon } = await req.json();
    
    console.log(`Fetching environment data for location: ${lat}, ${lon}`);

    const WINDY_API_KEY = Deno.env.get('WINDY_API_KEY');
    const AIR_QUALITY_API_KEY = Deno.env.get('AIR_QUALITY_API_KEY');

    // Fetch weather data from Windy API
    let weatherData = null;
    if (WINDY_API_KEY) {
      try {
        console.log('Fetching weather data from Windy API...');
        const windyResponse = await fetch('https://api.windy.com/api/point-forecast/v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lat: lat,
            lon: lon,
            model: 'gfs',
            parameters: ['temp', 'wind', 'pressure', 'rh', 'dewpoint', 'precip'],
            levels: ['surface'],
            key: WINDY_API_KEY,
          }),
        });
        
        if (windyResponse.ok) {
          const windyData = await windyResponse.json();
          console.log('Windy raw data:', JSON.stringify(windyData));
          
          // Extract the first (current) values from Windy response
          if (windyData) {
            const tempSurface = windyData['temp-surface'];
            const windSurface = windyData['wind_u-surface'];
            const pressureSurface = windyData['pressure-surface'];
            const rhSurface = windyData['rh-surface'];
            
            weatherData = {
              temperature: tempSurface?.[0] ? (tempSurface[0] - 273.15) : null, // Convert Kelvin to Celsius
              humidity: rhSurface?.[0] || null,
              pressure: pressureSurface?.[0] ? (pressureSurface[0] / 100) : null, // Convert Pa to hPa
              windSpeed: windSurface?.[0] ? Math.abs(windSurface[0]) * 3.6 : null, // Convert m/s to km/h
            };
            console.log('Processed Windy weather data:', JSON.stringify(weatherData));
          }
        } else {
          const errorText = await windyResponse.text();
          console.error('Windy API error:', windyResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching from Windy:', error);
      }
    } else {
      console.log('WINDY_API_KEY not configured, skipping weather data');
    }

    // Fetch air quality data from IQAir
    let airQualityData = null;
    if (AIR_QUALITY_API_KEY) {
      try {
        console.log('Fetching air quality data from IQAir...');
        const airQualityResponse = await fetch(
          `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${AIR_QUALITY_API_KEY}`
        );
        
        if (airQualityResponse.ok) {
          airQualityData = await airQualityResponse.json();
          console.log('Air quality data fetched successfully');
        } else {
          console.error('Air quality API error:', airQualityResponse.status);
        }
      } catch (error) {
        console.error('Error fetching air quality:', error);
      }
    }

    // Process and combine the data
    const result = {
      timestamp: new Date().toISOString(),
      location: { lat, lon },
      weather: weatherData ? {
        temperature: weatherData.temperature,
        humidity: weatherData.humidity,
        pressure: weatherData.pressure,
        windSpeed: weatherData.windSpeed,
      } : null,
      airQuality: airQualityData?.data?.current?.pollution ? {
        aqi: airQualityData.data.current.pollution.aqius,
        mainPollutant: airQualityData.data.current.pollution.mainus,
        pm25: airQualityData.data.current.pollution.aqius,
        pm10: airQualityData.data.current.pollution.aqicn || null,
      } : null,
    };

    console.log('Combined environment data:', JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in fetch-environment-data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
