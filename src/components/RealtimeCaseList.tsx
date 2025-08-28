import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Activity, Clock, User, MapPin } from "lucide-react"

interface CaseIntakeData {
  id: string;
  case_number: string;
  disease_code: string;
  status: string;
  onset_date: string;
  created_at: string;
  patient?: {
    id: string;
    full_name: string;
    gender?: string;
    birth_year?: number;
  };
  district_id?: string;
  ward_id?: string;
}

const diseaseLabels: Record<string, string> = {
  dengue: 'Sốt xuất huyết',
  tcm: 'Tay chân miệng', 
  ari: 'Nhiễm khuẩn hô hấp',
  covid19: 'COVID-19',
  influenza: 'Cúm',
  measles: 'Sởi'
};

const statusLabels: Record<string, string> = {
  suspected: 'Nghi ngờ',
  probable: 'Có thể',
  confirmed: 'Xác nhận',
  ruled_out: 'Loại trừ',
  pending: 'Chờ xử lý'
};

const statusColors: Record<string, string> = {
  suspected: 'bg-yellow-500',
  probable: 'bg-orange-500', 
  confirmed: 'bg-red-500',
  ruled_out: 'bg-gray-500',
  pending: 'bg-blue-500'
};

export default function RealtimeCaseList() {
  const [recentCases, setRecentCases] = useState<CaseIntakeData[]>([]);
  const [isConnected, setIsConnected] = useState(true); // Mock connected state

  // Mock data generator for demo
  useEffect(() => {
    const generateMockCase = (): CaseIntakeData => {
      const diseases = ['dengue', 'tcm', 'covid19', 'influenza'];
      const statuses = ['suspected', 'probable', 'confirmed'];
      const genders = ['male', 'female'];
      const names = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Minh C', 'Phạm Thu D', 'Hoàng Văn E'];
      
      return {
        id: `mock-${Date.now()}-${Math.random()}`,
        case_number: `CASE-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
        disease_code: diseases[Math.floor(Math.random() * diseases.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        onset_date: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        patient: {
          id: `patient-${Date.now()}`,
          full_name: names[Math.floor(Math.random() * names.length)],
          gender: genders[Math.floor(Math.random() * genders.length)],
          birth_year: 1980 + Math.floor(Math.random() * 30)
        },
        district_id: `Quận ${Math.floor(Math.random() * 12) + 1}`,
        ward_id: `Phường ${Math.floor(Math.random() * 20) + 1}`
      };
    };

    // Initial mock data
    const initialCases = Array.from({ length: 5 }, () => generateMockCase());
    setRecentCases(initialCases);

    // Simulate realtime updates every 10-30 seconds
    const interval = setInterval(() => {
      if (Math.random() > 0.3) { // 70% chance to add new case
        const newCase = generateMockCase();
        setRecentCases(currentCases => {
          const newCases = [newCase, ...currentCases];
          return newCases.slice(0, 10); // Keep only 10 most recent
        });
      }
    }, 10000 + Math.random() * 20000); // Random interval between 10-30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Ca bệnh mới (Realtime)
          {isConnected && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
              Kết nối
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentCases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Chưa có ca bệnh mới</p>
            <p className="text-sm">Các ca bệnh mới sẽ hiển thị tự động ở đây</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {recentCases.map((caseData) => (
                <div
                  key={caseData.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`${statusColors[caseData.status]} text-white border-transparent`}
                      >
                        {statusLabels[caseData.status] || caseData.status}
                      </Badge>
                      <span className="text-sm font-mono text-muted-foreground">
                        {caseData.case_number}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(caseData.created_at).toLocaleTimeString('vi-VN')}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {caseData.patient?.full_name || 'Không có tên'}
                      </span>
                      {caseData.patient?.gender && (
                        <span className="text-sm text-muted-foreground">
                          ({caseData.patient.gender === 'male' ? 'Nam' : 
                            caseData.patient.gender === 'female' ? 'Nữ' : 'Khác'})
                        </span>
                      )}
                      {caseData.patient?.birth_year && (
                        <span className="text-sm text-muted-foreground">
                          - {new Date().getFullYear() - caseData.patient.birth_year} tuổi
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {diseaseLabels[caseData.disease_code] || caseData.disease_code}
                      </span>
                    </div>

                    {(caseData.district_id || caseData.ward_id) && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {caseData.ward_id} {caseData.district_id && `- ${caseData.district_id}`}
                        </span>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      Ngày khởi phát: {new Date(caseData.onset_date).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}