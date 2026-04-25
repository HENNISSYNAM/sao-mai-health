import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "./useAuth";

// Synthetic HCMC disease surveillance data — realistic Q1/2025 numbers
// Sources: WHO VN situation reports + HCMC CDC weekly bulletins
const DEMO_DAILY_COUNTS = (() => {
  const records: { disease_code: string; cases: number; day: string; district_id: string }[] = [];
  const diseases = [
    { code: "dengue",     weeklyAvg: 210, variance: 40 },
    { code: "hfmd",       weeklyAvg: 145, variance: 30 },
    { code: "influenza",  weeklyAvg: 88,  variance: 20 },
    { code: "covid19",    weeklyAvg: 42,  variance: 15 },
    { code: "typhoid",    weeklyAvg: 22,  variance: 8  },
    { code: "hepatitis_a",weeklyAvg: 14,  variance: 5  },
    { code: "measles",    weeklyAvg: 6,   variance: 3  },
  ];
  const districts = ["Q1","Q3","Q5","Q7","Q10","Q12","BinhThanh","ThuDuc","GoVap","TanBinh"];

  const now = new Date();
  for (let daysAgo = 89; daysAgo >= 0; daysAgo--) {
    const d = new Date(now);
    d.setDate(now.getDate() - daysAgo);
    const day = d.toISOString().split("T")[0];
    for (const dis of diseases) {
      for (const dist of districts) {
        const base = Math.round(dis.weeklyAvg / 7 / districts.length);
        const jitter = Math.floor((Math.random() - 0.5) * dis.variance / districts.length);
        const cases = Math.max(0, base + jitter);
        if (cases > 0) {
          records.push({ disease_code: dis.code, cases, day, district_id: dist });
        }
      }
    }
  }
  return records;
})();

const DEMO_ALERTS = [
  {
    id: "demo-1",
    title: "Ngưỡng sốt xuất huyết vượt mức — Quận 7",
    description: "47 ca/tuần, cao hơn 2.3× trung bình cùng kỳ",
    category: "dengue",
    location: "Quận 7, TP.HCM",
    severity: "high",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-2",
    title: "Cụm tay chân miệng tại trường mầm non",
    description: "12 trẻ mắc trong 3 ngày — nguy cơ lây lan cao",
    category: "hfmd",
    location: "Bình Thạnh, TP.HCM",
    severity: "medium",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-3",
    title: "Chỉ số AQI vượt ngưỡng — tăng nguy cơ đột quỵ",
    description: "PM2.5 = 78 µg/m³, khuyến cáo người cao tuổi hạn chế ra ngoài",
    category: "environment",
    location: "TP.HCM (toàn thành phố)",
    severity: "medium",
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

const DEMO_KPIS = {
  totalCasesThisWeek: 1_247,
  totalCasesChange: +8.3,
  activeClusters: 6,
  activeClustersChange: +2,
  facilitiesReporting: 43,
  facilitiesReportingChange: +5,
  alertsOpen: 3,
  alertsOpenChange: -1,
};

export function useDemoMode() {
  const [params] = useSearchParams();
  const { isAuthenticated } = useAuth();

  // Demo mode is active when:
  // 1. URL has ?demo=true, OR
  // 2. User is not authenticated (guests see demo data instead of empty state)
  const isDemo = params.get("demo") === "true" || !isAuthenticated;

  return useMemo(() => ({
    isDemo,
    demoDailyCounts: isDemo ? DEMO_DAILY_COUNTS : [],
    demoAlerts: isDemo ? DEMO_ALERTS : [],
    demoKpis: isDemo ? DEMO_KPIS : null,
  }), [isDemo]);
}
