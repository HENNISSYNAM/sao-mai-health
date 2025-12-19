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

    const TOMORROW_API_KEY = Deno.env.get('TOMORROW_API_KEY');
    const AIR_QUALITY_API_KEY = Deno.env.get('AIR_QUALITY_API_KEY');

    if (!TOMORROW_API_KEY) {
      console.error('TOMORROW_API_KEY not configured');
      throw new Error('Weather API key not configured');
    }

    // Fetch weather data from Tomorrow.io
    let weatherData = null;
    try {
      console.log('Fetching weather data from Tomorrow.io...');
      const weatherResponse = await fetch(
        `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${TOMORROW_API_KEY}`
      );
      
      if (weatherResponse.ok) {
        weatherData = await weatherResponse.json();
        console.log('Weather data fetched successfully');
      } else {
        console.error('Weather API error:', weatherResponse.status, await weatherResponse.text());
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    }

    // Fetch air quality data from IQAir (using the provided API key format)
    let airQualityData = null;
    try {
      console.log('Fetching air quality data...');
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

    // Process and combine the data
    const result = {
      timestamp: new Date().toISOString(),
      location: { lat, lon },
      weather: weatherData?.data?.values ? {
        temperature: weatherData.data.values.temperature,
        humidity: weatherData.data.values.humidity,
        pressure: weatherData.data.values.pressureSurfaceLevel,
        windSpeed: weatherData.data.values.windSpeed,
        uvIndex: weatherData.data.values.uvIndex,
      } : null,
      airQuality: airQualityData?.data?.current?.pollution ? {
        aqi: airQualityData.data.current.pollution.aqius,
        mainPollutant: airQualityData.data.current.pollution.mainus,
        pm25: airQualityData.data.current.pollution.aqius, // AQI US is based on PM2.5
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
