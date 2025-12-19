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

    const TOMORROW_API_KEY = Deno.env.get('TOMORROW_API_KEY');
    const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY');
    const AIR_QUALITY_API_KEY = Deno.env.get('AIR_QUALITY_API_KEY');

    let weatherData = null;
    let tomorrowData = null;

    // Primary: Tomorrow.io API (most accurate real-time data)
    if (TOMORROW_API_KEY) {
      try {
        console.log('Fetching weather data from Tomorrow.io...');
        const tomorrowResponse = await fetch(
          `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${TOMORROW_API_KEY}`
        );
        
        if (tomorrowResponse.ok) {
          tomorrowData = await tomorrowResponse.json();
          console.log('Tomorrow.io data received:', JSON.stringify(tomorrowData));
          
          const values = tomorrowData?.data?.values;
          if (values) {
            weatherData = {
              temperature: values.temperature,
              humidity: values.humidity,
              pressure: values.pressureSurfaceLevel,
              windSpeed: values.windSpeed ? values.windSpeed * 3.6 : null, // m/s to km/h
              windDirection: values.windDirection,
              uvIndex: values.uvIndex,
              visibility: values.visibility,
              cloudCover: values.cloudCover,
              dewPoint: values.dewPoint,
              precipitationProbability: values.precipitationProbability,
            };
            console.log('Processed Tomorrow.io data:', JSON.stringify(weatherData));
          }
        } else {
          const errorText = await tomorrowResponse.text();
          console.error('Tomorrow.io API error:', tomorrowResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching from Tomorrow.io:', error);
      }
    }

    // Fallback: OpenWeatherMap API
    if (!weatherData && OPENWEATHER_API_KEY) {
      try {
        console.log('Fetching weather data from OpenWeatherMap (fallback)...');
        const owmResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        if (owmResponse.ok) {
          const owmData = await owmResponse.json();
          console.log('OpenWeatherMap data received');
          
          weatherData = {
            temperature: owmData.main?.temp,
            humidity: owmData.main?.humidity,
            pressure: owmData.main?.pressure,
            windSpeed: owmData.wind?.speed ? owmData.wind.speed * 3.6 : null,
            feelsLike: owmData.main?.feels_like,
            visibility: owmData.visibility ? owmData.visibility / 1000 : null,
            cloudCover: owmData.clouds?.all,
            description: owmData.weather?.[0]?.description,
          };
        }
      } catch (error) {
        console.error('Error fetching from OpenWeatherMap:', error);
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
          console.log('IQAir data fetched successfully');
        }
      } catch (error) {
        console.error('Error fetching IQAir:', error);
      }
    }

    // OpenWeatherMap Air Pollution API for detailed pollutants
    let owmPollution = null;
    if (OPENWEATHER_API_KEY) {
      try {
        console.log('Fetching air pollution from OpenWeatherMap...');
        const pollutionResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
        );
        
        if (pollutionResponse.ok) {
          owmPollution = await pollutionResponse.json();
          console.log('OWM pollution data fetched');
        }
      } catch (error) {
        console.error('Error fetching OWM pollution:', error);
      }
    }

    // Combine all data
    const iqAirPollution = airQualityData?.data?.current?.pollution;
    const owmComponents = owmPollution?.list?.[0]?.components;
    const owmAqi = owmPollution?.list?.[0]?.main?.aqi;
    
    const result = {
      timestamp: new Date().toISOString(),
      location: { lat, lon },
      sources: {
        weather: TOMORROW_API_KEY && tomorrowData ? 'Tomorrow.io' : 'OpenWeatherMap',
        airQuality: AIR_QUALITY_API_KEY && airQualityData ? 'IQAir + OpenWeatherMap' : 'OpenWeatherMap',
      },
      weather: weatherData,
      airQuality: {
        aqi: iqAirPollution?.aqius || (owmAqi ? owmAqi * 50 : null),
        mainPollutant: iqAirPollution?.mainus || 'p2',
        pm25: owmComponents?.pm2_5 || iqAirPollution?.aqius || null,
        pm10: owmComponents?.pm10 || null,
        no2: owmComponents?.no2 || null,
        so2: owmComponents?.so2 || null,
        co: owmComponents?.co || null,
        o3: owmComponents?.o3 || null,
      },
    };

    console.log('Final combined data:', JSON.stringify(result));

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
