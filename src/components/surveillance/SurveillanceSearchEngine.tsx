import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Bug, MapPin, AlertTriangle, Newspaper, 
  Users, Thermometer, Loader2, X, ArrowRight 
} from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchResult {
  id: string;
  type: 'case' | 'hotspot' | 'district' | 'disease' | 'news' | 'alert';
  label: string;
  subtitle?: string;
  lat?: number;
  lng?: number;
  data?: any;
}

interface SurveillanceSearchEngineProps {
  allCaseEvents: any[];
  hotspotData: any[];
  newsArticles: any[];
  pendingAlerts: any[];
  onFlyTo: (lng: number, lat: number, zoom?: number) => void;
  onSelectCase: (caseData: any) => void;
  onFilterDisease: (code: string) => void;
  onFilterDistrict?: (district: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

// Disease name mappings for Vietnamese search
const diseaseMap: Record<string, { code: string; name: string; nameVi: string; emoji: string }> = {
  dengue: { code: 'dengue', name: 'Dengue', nameVi: 'Sốt xuất huyết', emoji: '🦟' },
  tcm: { code: 'tcm', name: 'HFMD', nameVi: 'Tay chân miệng', emoji: '🖐️' },
  covid19: { code: 'covid19', name: 'COVID-19', nameVi: 'COVID-19', emoji: '🦠' },
  ari: { code: 'ari', name: 'ARI', nameVi: 'Viêm hô hấp', emoji: '😷' },
  measles: { code: 'measles', name: 'Measles', nameVi: 'Sởi', emoji: '🔴' },
  rabies: { code: 'rabies', name: 'Rabies', nameVi: 'Dại', emoji: '🐕' },
  influenza: { code: 'influenza', name: 'Influenza', nameVi: 'Cúm', emoji: '🤧' },
  tuberculosis: { code: 'tuberculosis', name: 'TB', nameVi: 'Lao phổi', emoji: '🫁' },
};

// Normalize Vietnamese text for search
const normalize = (s: string) => {
  if (!s) return '';
  const map: Record<string, string> = {
    'à':'a','á':'a','ả':'a','ã':'a','ạ':'a','ằ':'a','ắ':'a','ẳ':'a','ẵ':'a','ặ':'a',
    'â':'a','ầ':'a','ấ':'a','ẩ':'a','ẫ':'a','ậ':'a','è':'e','é':'e','ẻ':'e','ẽ':'e','ẹ':'e',
    'ê':'e','ề':'e','ế':'e','ể':'e','ễ':'e','ệ':'e','ì':'i','í':'i','ỉ':'i','ĩ':'i','ị':'i',
    'ò':'o','ó':'o','ỏ':'o','õ':'o','ọ':'o','ô':'o','ồ':'o','ố':'o','ổ':'o','ỗ':'o','ộ':'o',
    'ơ':'o','ờ':'o','ớ':'o','ở':'o','ỡ':'o','ợ':'o','ù':'u','ú':'u','ủ':'u','ũ':'u','ụ':'u',
    'ư':'u','ừ':'u','ứ':'u','ử':'u','ữ':'u','ự':'u','ỳ':'y','ý':'y','ỷ':'y','ỹ':'y','ỵ':'y','đ':'d',
  };
  let r = s.toLowerCase().trim();
  for (const [a, b] of Object.entries(map)) r = r.replace(new RegExp(a, 'g'), b);
  return r;
};

export const SurveillanceSearchEngine: React.FC<SurveillanceSearchEngineProps> = ({
  allCaseEvents, hotspotData, newsArticles, pendingAlerts,
  onFlyTo, onSelectCase, onFilterDisease, searchTerm, onSearchTermChange,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedTerm = useDebounce(searchTerm, 200);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Compute search results
  const results = useMemo((): SearchResult[] => {
    const q = normalize(debouncedTerm);
    if (!q || q.length < 2) return [];

    const out: SearchResult[] = [];
    const MAX_PER_TYPE = 4;

    // 1. Search diseases
    for (const d of Object.values(diseaseMap)) {
      if (normalize(d.nameVi).includes(q) || normalize(d.name).includes(q) || d.code.includes(q)) {
        const count = allCaseEvents.filter(c => c.disease_code === d.code).length;
        out.push({
          id: `disease-${d.code}`,
          type: 'disease',
          label: `${d.emoji} ${d.nameVi}`,
          subtitle: `${count} ca bệnh trên bản đồ`,
          data: d,
        });
      }
    }

    // 2. Search districts
    const districtCounts: Record<string, { count: number; lat: number; lng: number }> = {};
    allCaseEvents.forEach(c => {
      if (c.district_id) {
        if (!districtCounts[c.district_id]) {
          districtCounts[c.district_id] = { count: 0, lat: Number(c.lat), lng: Number(c.lon) };
        }
        districtCounts[c.district_id].count++;
      }
    });

    let districtCount = 0;
    for (const [name, info] of Object.entries(districtCounts)) {
      if (districtCount >= MAX_PER_TYPE) break;
      if (normalize(name).includes(q)) {
        out.push({
          id: `district-${name}`,
          type: 'district',
          label: name,
          subtitle: `${info.count} ca bệnh`,
          lat: info.lat,
          lng: info.lng,
        });
        districtCount++;
      }
    }

    // 3. Search hotspots
    let hotspotCount = 0;
    for (const h of hotspotData) {
      if (hotspotCount >= MAX_PER_TYPE) break;
      const text = normalize(`${h.disease_name || ''} ${h.disease_code || ''} ${h.severity || ''}`);
      if (text.includes(q)) {
        out.push({
          id: `hotspot-${h.id}`,
          type: 'hotspot',
          label: h.disease_name || h.disease_code || 'Điểm nóng',
          subtitle: `${h.severity || 'N/A'} • ${h.case_count || 0} ca • R=${h.radius_km?.toFixed(1) || '?'}km`,
          lat: h.center_lat,
          lng: h.center_lng,
          data: h,
        });
        hotspotCount++;
      }
    }

    // 4. Search cases
    let caseCount = 0;
    for (const c of allCaseEvents) {
      if (caseCount >= MAX_PER_TYPE) break;
      const text = normalize(`${c.id} ${c.disease_code} ${c.district_id || ''} ${c.patient_age_bucket || ''}`);
      const diseaseVi = diseaseMap[c.disease_code]?.nameVi || c.disease_code;
      if (text.includes(q) || normalize(diseaseVi).includes(q)) {
        out.push({
          id: `case-${c.id}`,
          type: 'case',
          label: `#${c.id.slice(0, 8)} - ${diseaseMap[c.disease_code]?.nameVi || c.disease_code}`,
          subtitle: `${c.district_id || 'N/A'} • ${new Date(c.occurred_at).toLocaleDateString('vi-VN')}`,
          lat: Number(c.lat),
          lng: Number(c.lon),
          data: c,
        });
        caseCount++;
      }
    }

    // 5. Search pending alerts
    let alertCount = 0;
    for (const a of pendingAlerts) {
      if (alertCount >= 3) break;
      const text = normalize(`${a.description || ''} ${a.address || ''} ${a.category || ''}`);
      if (text.includes(q)) {
        out.push({
          id: `alert-${a.id}`,
          type: 'alert',
          label: `⚠️ ${(a.description || '').substring(0, 50)}`,
          subtitle: `${a.address || 'N/A'} • ${a.confirm_count || 0}/3 xác nhận`,
          lat: a.lat,
          lng: a.lng,
          data: a,
        });
        alertCount++;
      }
    }

    // 6. Search news
    let newsCount = 0;
    for (const n of newsArticles) {
      if (newsCount >= 3) break;
      const text = normalize(`${n.title || ''} ${n.content_summary || ''} ${n.disease_type || ''} ${n.location || ''}`);
      if (text.includes(q)) {
        out.push({
          id: `news-${n.id}`,
          type: 'news',
          label: (n.title || '').substring(0, 60),
          subtitle: `${n.source || ''} • ${n.disease_type || ''} • ${n.severity || ''}`,
          data: n,
        });
        newsCount++;
      }
    }

    return out;
  }, [debouncedTerm, allCaseEvents, hotspotData, newsArticles, pendingAlerts]);

  // Handle result selection
  const handleSelect = useCallback((result: SearchResult) => {
    setShowDropdown(false);
    
    switch (result.type) {
      case 'case':
        if (result.lat && result.lng) onFlyTo(result.lng, result.lat, 15);
        if (result.data) onSelectCase(result.data);
        break;
      case 'hotspot':
        if (result.lat && result.lng) onFlyTo(result.lng, result.lat, 13);
        break;
      case 'district':
        if (result.lat && result.lng) onFlyTo(result.lng, result.lat, 12);
        break;
      case 'disease':
        onFilterDisease(result.data?.code || 'all');
        break;
      case 'alert':
        if (result.lat && result.lng) onFlyTo(result.lng, result.lat, 14);
        break;
      case 'news':
        if (result.data?.url) window.open(result.data.url, '_blank');
        break;
    }
  }, [onFlyTo, onSelectCase, onFilterDisease]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIdx >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const typeIcon: Record<string, React.ReactNode> = {
    case: <Bug className="h-3.5 w-3.5 text-destructive" />,
    hotspot: <Thermometer className="h-3.5 w-3.5 text-warning" />,
    district: <MapPin className="h-3.5 w-3.5 text-primary" />,
    disease: <AlertTriangle className="h-3.5 w-3.5 text-destructive" />,
    news: <Newspaper className="h-3.5 w-3.5 text-info" />,
    alert: <AlertTriangle className="h-3.5 w-3.5 text-warning" />,
  };

  const typeLabel: Record<string, string> = {
    case: 'Ca bệnh', hotspot: 'Điểm nóng', district: 'Quận/Huyện',
    disease: 'Bệnh', news: 'Tin tức', alert: 'Cảnh báo',
  };

  // Group results by type
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return groups;
  }, [results]);

  let flatIdx = -1;

  return (
    <div className="relative flex-1 max-w-xs md:max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Tìm bệnh, quận, điểm nóng, tin tức..."
          value={searchTerm}
          onChange={(e) => {
            onSearchTermChange(e.target.value);
            setShowDropdown(true);
            setSelectedIdx(-1);
          }}
          onFocus={() => { if (searchTerm.length >= 2) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-8 h-9 md:h-10 rounded-full bg-card/90 backdrop-blur-md border-border/50 shadow-lg text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => { onSearchTermChange(''); setShowDropdown(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && searchTerm.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-1.5 left-0 right-0 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[60vh] overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-muted-foreground text-xs">
              <Search className="h-5 w-5 mx-auto mb-2 opacity-40" />
              Không tìm thấy kết quả cho "{searchTerm}"
            </div>
          ) : (
            <div className="py-1">
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  {/* Section header */}
                  <div className="px-3 py-1.5 flex items-center gap-2 bg-muted/30 sticky top-0">
                    {typeIcon[type]}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {typeLabel[type]} ({items.length})
                    </span>
                  </div>
                  {/* Items */}
                  {items.map(result => {
                    flatIdx++;
                    const idx = flatIdx;
                    return (
                      <button
                        key={result.id}
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(result); }}
                        onMouseEnter={() => setSelectedIdx(idx)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                          selectedIdx === idx ? 'bg-primary/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{result.label}</p>
                          {result.subtitle && (
                            <p className="text-[10px] text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                        </div>
                        {(result.lat && result.lng) && (
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Footer hint */}
              <div className="px-3 py-2 border-t border-border/30 text-center">
                <p className="text-[10px] text-muted-foreground">
                  ↑↓ điều hướng • Enter chọn • Esc đóng
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
