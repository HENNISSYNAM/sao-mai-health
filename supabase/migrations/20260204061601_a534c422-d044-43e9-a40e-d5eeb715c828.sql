-- ===================================
-- BẢNG LƯU DỮ LIỆU TẠO SINH CÁ NHÂN HÓA (Song sinh số insights)
-- ===================================
CREATE TABLE public.user_twin_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- GPS & Location
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  location_updated_at TIMESTAMPTZ,
  region VARCHAR(100), -- Khu vực dịch tễ (e.g., "HCMC Metro", "Red River Delta")
  
  -- Dữ liệu môi trường (từ Stroke Risk)
  environment_data JSONB DEFAULT '{}'::JSONB, -- {temperature, humidity, aqi, pressure, uv}
  stroke_risk_score INTEGER, -- 0-100
  environment_risks JSONB DEFAULT '[]'::JSONB, -- Các rủi ro môi trường
  
  -- Dữ liệu dịch tễ (từ Theo dõi bệnh)
  disease_risks JSONB DEFAULT '[]'::JSONB, -- Các dịch bệnh quanh vùng GPS
  outbreak_alerts JSONB DEFAULT '[]'::JSONB, -- Cảnh báo dịch bệnh
  
  -- Dữ liệu tạo sinh AI
  ai_generated_insights JSONB DEFAULT '[]'::JSONB, -- AI recommendations
  health_predictions JSONB DEFAULT '[]'::JSONB, -- Dự báo sức khỏe
  personalized_actions JSONB DEFAULT '[]'::JSONB, -- Hành động khuyến nghị
  
  -- Metadata
  last_sync_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user lookups
CREATE INDEX idx_user_twin_data_user_id ON public.user_twin_data(user_id);

-- Enable RLS
ALTER TABLE public.user_twin_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own twin data"
ON public.user_twin_data FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own twin data"
ON public.user_twin_data FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own twin data"
ON public.user_twin_data FOR UPDATE
USING (auth.uid() = user_id);

-- ===================================
-- BẢNG LƯU PRESENCE CỦA USERS TRÊN MAP (cho Theo dõi bệnh)
-- ===================================
CREATE TABLE public.user_map_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Location
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  
  -- Thông tin chia sẻ (tuân theo privacy settings)
  age_group VARCHAR(20), -- "18-30", "31-45", etc.
  risk_level VARCHAR(20), -- "low", "medium", "high"
  health_status VARCHAR(50), -- anonymous status
  
  -- Privacy
  is_sharing BOOLEAN DEFAULT false, -- Có chia sẻ với cộng đồng không
  share_with_family BOOLEAN DEFAULT false,
  
  -- Timestamps
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GiST index for spatial queries
CREATE INDEX idx_user_map_presence_location ON public.user_map_presence USING GIST (
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)
);

-- Enable RLS
ALTER TABLE public.user_map_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view shared presence"
ON public.user_map_presence FOR SELECT
USING (is_sharing = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage their own presence"
ON public.user_map_presence FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
ON public.user_map_presence FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence"
ON public.user_map_presence FOR DELETE
USING (auth.uid() = user_id);

-- ===================================
-- CẬP NHẬT BẢNG USER_PROFILES CHO SHARING SETTINGS
-- ===================================
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS sharing_mode VARCHAR(20) DEFAULT 'anonymous', -- 'anonymous', 'community', 'family'
ADD COLUMN IF NOT EXISTS allowed_viewers UUID[] DEFAULT '{}'; -- Danh sách người có thể xem (family/friends)

-- ===================================
-- BẢNG LƯU VÙNG NÓNG DỊCH TỄ (Hotspots)
-- ===================================
CREATE TABLE public.disease_hotspots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Vị trí vùng nóng
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_km DOUBLE PRECISION DEFAULT 5,
  
  -- Thông tin dịch bệnh
  disease_code VARCHAR(20),
  disease_name VARCHAR(100),
  severity VARCHAR(20), -- "low", "medium", "high", "critical"
  case_count INTEGER DEFAULT 0,
  user_density INTEGER DEFAULT 0, -- Số user trong vùng
  
  -- AI Analysis
  ai_source JSONB DEFAULT '[]'::JSONB, -- Nguồn tin tức AI tìm được
  prediction_data JSONB DEFAULT '{}'::JSONB, -- Dự báo
  
  -- Timestamps
  detected_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for location queries
CREATE INDEX idx_disease_hotspots_location ON public.disease_hotspots USING GIST (
  ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)
);

-- Enable RLS (public read for hotspots)
ALTER TABLE public.disease_hotspots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view hotspots"
ON public.disease_hotspots FOR SELECT
USING (true);

CREATE POLICY "Service role can manage hotspots"
ON public.disease_hotspots FOR ALL
USING (auth.role() = 'service_role');

-- ===================================
-- TRIGGER CẬP NHẬT TIMESTAMP
-- ===================================
CREATE TRIGGER update_user_twin_data_updated_at
BEFORE UPDATE ON public.user_twin_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disease_hotspots_updated_at
BEFORE UPDATE ON public.disease_hotspots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ===================================
-- FUNCTION: TÌM USERS GẦN MỘT VỊ TRÍ (cho clustering)
-- ===================================
CREATE OR REPLACE FUNCTION public.get_nearby_users(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  age_group VARCHAR,
  risk_level VARCHAR,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ump.user_id,
    ump.lat,
    ump.lng,
    ump.age_group,
    ump.risk_level,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(ump.lng, ump.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
    ) / 1000 as distance_km
  FROM user_map_presence ump
  WHERE ump.is_sharing = true
    AND ump.last_active_at > now() - interval '24 hours'
    AND ST_DWithin(
      ST_SetSRID(ST_MakePoint(ump.lng, ump.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY distance_km;
END;
$$;