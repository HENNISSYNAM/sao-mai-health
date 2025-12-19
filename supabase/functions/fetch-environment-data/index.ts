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

    let weatherData: any = null;
    let weatherSource = 'Unknown';

    // Primary: Tomorrow.io API
    if (TOMORROW_API_KEY) {
      try {
        console.log('Fetching weather data from Tomorrow.io...');
        const tomorrowResponse = await fetch(
          `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${TOMORROW_API_KEY}`
        );

        if (tomorrowResponse.ok) {
          const tomorrowData = await tomorrowResponse.json();
          const values = tomorrowData?.data?.values;
          if (values) {
            weatherData = {
              temperature: values.temperature,
              humidity: values.humidity,
              pressure: values.pressureSurfaceLevel,
              windSpeed: values.windSpeed ? values.windSpeed * 3.6 : null,
              uvIndex: values.uvIndex,
            };
            weatherSource = 'Tomorrow.io';
            console.log('Tomorrow.io data received');
          }
        } else {
          const errorText = await tomorrowResponse.text();
          console.error('Tomorrow.io API error:', tomorrowResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching from Tomorrow.io:', error);
      }
    }

    // Fallback 1: OpenWeatherMap API
    if (!weatherData && OPENWEATHER_API_KEY) {
      try {
        console.log('Fetching weather data from OpenWeatherMap (fallback)...');
        const owmResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );

        if (owmResponse.ok) {
          const owmData = await owmResponse.json();
          weatherData = {
            temperature: owmData.main?.temp ?? null,
            humidity: owmData.main?.humidity ?? null,
            pressure: owmData.main?.pressure ?? null,
            windSpeed: owmData.wind?.speed ? owmData.wind.speed * 3.6 : null,
          };
          weatherSource = 'OpenWeatherMap';
          console.log('OpenWeatherMap data received');
        } else {
          const errorText = await owmResponse.text();
          console.error('OpenWeatherMap API error:', owmResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching from OpenWeatherMap:', error);
      }
    }

    // Fallback 2: Open-Meteo API (FREE, no API key required)
    if (!weatherData) {
      try {
        console.log('Fetching weather data from Open-Meteo (free fallback)...');
        const openMeteoResponse = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,uv_index&timezone=auto`
        );

        if (openMeteoResponse.ok) {
          const openMeteoData = await openMeteoResponse.json();
          const current = openMeteoData?.current;
          if (current) {
            weatherData = {
              temperature: current.temperature_2m ?? null,
              humidity: current.relative_humidity_2m ?? null,
              pressure: current.surface_pressure ?? null,
              windSpeed: current.wind_speed_10m ?? null,
              uvIndex: current.uv_index ?? null,
            };
            weatherSource = 'Open-Meteo';
            console.log('Open-Meteo data received:', JSON.stringify(weatherData));
          }
        } else {
          const errorText = await openMeteoResponse.text();
          console.error('Open-Meteo API error:', openMeteoResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching from Open-Meteo:', error);
      }
    }

    // Air quality data
    let airQualityData: any = null;
    let airQualitySource = 'Unknown';

    // Primary: IQAir
    if (AIR_QUALITY_API_KEY) {
      try {
        console.log('Fetching air quality data from IQAir...');
        const aqResponse = await fetch(
          `https://api.airvisual.com/v2/nearest_city?lat=${lat}&lon=${lon}&key=${AIR_QUALITY_API_KEY}`
        );

        if (aqResponse.ok) {
          const aqData = await aqResponse.json();
          const pollution = aqData?.data?.current?.pollution;
          if (pollution) {
            airQualityData = {
              aqi: pollution.aqius,
              pm25: pollution.aqius, // IQAir uses AQI US which is based on PM2.5
              mainPollutant: pollution.mainus,
            };
            airQualitySource = 'IQAir';
            console.log('IQAir data received');
            
            // Also get weather from IQAir if not available
            if (!weatherData) {
              const iqWeather = aqData?.data?.current?.weather;
              if (iqWeather) {
                weatherData = {
                  temperature: iqWeather.tp ?? null,
                  humidity: iqWeather.hu ?? null,
                  pressure: iqWeather.pr ?? null,
                  windSpeed: iqWeather.ws ? iqWeather.ws * 3.6 : null,
                };
                weatherSource = 'IQAir';
              }
            }
          }
        } else {
          const errorText = await aqResponse.text();
          console.error('IQAir API error:', aqResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching from IQAir:', error);
      }
    }

    // Fallback: OpenWeatherMap Air Pollution API
    if (!airQualityData && OPENWEATHER_API_KEY) {
      try {
        console.log('Fetching air pollution from OpenWeatherMap...');
        const pollutionResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}`
        );

        if (pollutionResponse.ok) {
          const owmPollution = await pollutionResponse.json();
          const components = owmPollution?.list?.[0]?.components;
          const owmAqi = owmPollution?.list?.[0]?.main?.aqi;
          if (components) {
            airQualityData = {
              aqi: owmAqi ? owmAqi * 50 : null, // Convert 1-5 scale to 0-250
              pm25: components.pm2_5,
              pm10: components.pm10,
              no2: components.no2,
              so2: components.so2,
              co: components.co,
              o3: components.o3,
              mainPollutant: 'p2',
            };
            airQualitySource = 'OpenWeatherMap';
            console.log('OpenWeatherMap pollution data received');
          }
        } else {
          const errorText = await pollutionResponse.text();
          console.error('OpenWeatherMap Air Pollution API error:', pollutionResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching OWM pollution:', error);
      }
    }

    // Fallback 2: Open-Meteo Air Quality API (FREE, no key required)
    if (!airQualityData) {
      try {
        console.log('Fetching air quality from Open-Meteo (free fallback)...');
        const openMeteoAQResponse = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5,pm10,us_aqi,nitrogen_dioxide,sulphur_dioxide,ozone,carbon_monoxide`
        );

        if (openMeteoAQResponse.ok) {
          const openMeteoAQ = await openMeteoAQResponse.json();
          const current = openMeteoAQ?.current;
          if (current) {
            airQualityData = {
              aqi: current.us_aqi ?? null,
              pm25: current.pm2_5 ?? null,
              pm10: current.pm10 ?? null,
              no2: current.nitrogen_dioxide ?? null,
              so2: current.sulphur_dioxide ?? null,
              o3: current.ozone ?? null,
              co: current.carbon_monoxide ?? null,
              mainPollutant: 'p2',
            };
            airQualitySource = 'Open-Meteo';
            console.log('Open-Meteo AQ data received:', JSON.stringify(airQualityData));
          }
        } else {
          const errorText = await openMeteoAQResponse.text();
          console.error('Open-Meteo AQ API error:', openMeteoAQResponse.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching from Open-Meteo AQ:', error);
      }
    }

    const result = {
      timestamp: new Date().toISOString(),
      location: { lat, lon },
      sources: {
        weather: weatherSource,
        airQuality: airQualitySource,
      },
      weather: weatherData,
      airQuality: airQualityData || {
        aqi: null,
        pm25: null,
        pm10: null,
        no2: null,
        so2: null,
        co: null,
        o3: null,
        mainPollutant: 'p2',
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
