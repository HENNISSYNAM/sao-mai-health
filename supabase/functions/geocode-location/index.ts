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
    
    if (!lat || !lon) {
      return new Response(
        JSON.stringify({ error: 'Missing coordinates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Geocoding coordinates: ${lat}, ${lon}`);

    // Step 1: Try Nominatim (OpenStreetMap) reverse geocoding - free & accurate
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=vi&zoom=16`;
      const nominatimRes = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'SaoMaiHealthHub/1.0' }
      });

      if (nominatimRes.ok) {
        const geo = await nominatimRes.json();
        const addr = geo.address || {};
        
        const address = [
          addr.road || addr.pedestrian || addr.hamlet || '',
          addr.suburb || addr.village || addr.town || '',
        ].filter(Boolean).join(', ') || geo.display_name?.split(',').slice(0, 2).join(',') || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

        const district = addr.city_district || addr.county || addr.district || addr.suburb || '';
        const city = addr.city || addr.town || addr.state || addr.province || '';
        
        // Determine area type from OSM data
        let area_type = 'Khu dân cư';
        const osmType = geo.type || '';
        const osmClass = geo.class || '';
        if (osmClass === 'amenity' && osmType === 'hospital') area_type = 'Bệnh viện';
        else if (osmClass === 'amenity' && osmType === 'school') area_type = 'Trường học';
        else if (osmClass === 'leisure' && osmType === 'park') area_type = 'Công viên';
        else if (osmClass === 'shop' || osmType === 'mall') area_type = 'Trung tâm thương mại';
        else if (osmClass === 'landuse' && osmType === 'industrial') area_type = 'Khu công nghiệp';
        else if (osmClass === 'landuse' && (osmType === 'farmland' || osmType === 'farm')) area_type = 'Khu vực nông thôn';

        console.log('Nominatim result:', JSON.stringify({ address, district, city, area_type }));

        return new Response(
          JSON.stringify({
            success: true,
            coordinates: { lat, lon },
            address,
            district,
            city,
            full_address: geo.display_name || `${city}, Việt Nam`,
            area_type,
            nearby_landmarks: []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (nominatimError) {
      console.error('Nominatim geocoding error:', nominatimError);
    }

    // Step 2: Fallback - detect Vietnamese region from coordinates
    const city = detectCity(lat, lon);

    return new Response(
      JSON.stringify({
        success: true,
        coordinates: { lat, lon },
        address: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
        district: '',
        city,
        full_address: `${city}, Việt Nam`,
        area_type: 'Không xác định',
        nearby_landmarks: []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in geocode-location:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function detectCity(lat: number, lon: number): string {
  // Major Vietnamese cities by coordinate ranges
  const cities = [
    { name: 'Hà Nội', latMin: 20.5, latMax: 21.4, lonMin: 105.3, lonMax: 106.1 },
    { name: 'TP. Hồ Chí Minh', latMin: 10.4, latMax: 11.2, lonMin: 106.3, lonMax: 107.0 },
    { name: 'Đà Nẵng', latMin: 15.8, latMax: 16.3, lonMin: 107.9, lonMax: 108.5 },
    { name: 'Hải Phòng', latMin: 20.7, latMax: 21.0, lonMin: 106.5, lonMax: 106.9 },
    { name: 'Cần Thơ', latMin: 9.9, latMax: 10.2, lonMin: 105.6, lonMax: 105.9 },
    { name: 'Huế', latMin: 16.3, latMax: 16.7, lonMin: 107.4, lonMax: 107.8 },
    { name: 'Nha Trang', latMin: 12.1, latMax: 12.4, lonMin: 109.0, lonMax: 109.3 },
    { name: 'Đà Lạt', latMin: 11.8, latMax: 12.1, lonMin: 108.3, lonMax: 108.6 },
    { name: 'Vũng Tàu', latMin: 10.2, latMax: 10.5, lonMin: 107.0, lonMax: 107.3 },
    { name: 'Biên Hòa', latMin: 10.8, latMax: 11.1, lonMin: 106.7, lonMax: 107.0 },
  ];

  for (const c of cities) {
    if (lat >= c.latMin && lat <= c.latMax && lon >= c.lonMin && lon <= c.lonMax) {
      return c.name;
    }
  }

  // Region-based fallback
  if (lat > 20) return 'Miền Bắc Việt Nam';
  if (lat > 15) return 'Miền Trung Việt Nam';
  if (lat > 10) return 'Miền Nam Việt Nam';
  return 'Việt Nam';
}
