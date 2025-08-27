import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UserCheck, Search, Plus, Stethoscope, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface Encounter {
  id: string;
  patient_id: string;
  patient_name?: string;
  facility_id: string;
  facility_name?: string;
  encounter_type: 'inpatient' | 'outpatient' | 'emergency';
  status: 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled';
  triage_level?: 1 | 2 | 3 | 4 | 5; // ESI levels
  chief_complaint?: string;
  diagnosis?: string;
  started_at: string;
  ended_at?: string;
}

// Mock data for encounters
const mockEncounters: Encounter[] = [
  {
    id: '1',
    patient_id: 'p1',
    patient_name: 'Nguyễn Văn A',
    facility_id: 'f1',
    facility_name: 'Bệnh viện Bạch Mai',
    encounter_type: 'emergency',
    status: 'arrived',
    triage_level: 2,
    chief_complaint: 'Đau ngực, khó thở',
    started_at: new Date().toISOString()
  },
  {
    id: '2',
    patient_id: 'p2',
    patient_name: 'Trần Thị B',
    facility_id: 'f2',
    facility_name: 'Phòng khám Đa khoa',
    encounter_type: 'outpatient',
    status: 'in-progress',
    triage_level: 4,
    chief_complaint: 'Khám định kỳ',
    started_at: new Date(Date.now() - 60000).toISOString()
  }
];

export default function Encounters() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);
  const [triageNote, setTriageNote] = useState("");
  const [encounters, setEncounters] = useState<Encounter[]>(mockEncounters);
  const [isConnected] = useState(true); // Mock connection status
  const { toast } = useToast();

  const filteredEncounters = encounters.filter(encounter => {
    const searchLower = searchTerm.toLowerCase();
    return (
      encounter.patient_name?.toLowerCase().includes(searchLower) ||
      encounter.facility_name?.toLowerCase().includes(searchLower) ||
      encounter.chief_complaint?.toLowerCase().includes(searchLower)
    );
  });

  const getTriageColor = (level?: number) => {
    const colors = {
      1: "bg-danger text-danger-foreground", // Resuscitation
      2: "bg-warning text-warning-foreground", // Emergent
      3: "bg-info text-info-foreground", // Urgent
      4: "bg-secondary text-secondary-foreground", // Less urgent
      5: "bg-success text-success-foreground" // Non-urgent
    };
    return colors[level as keyof typeof colors] || "bg-muted text-muted-foreground";
  };

  const getTriageLabel = (level?: number) => {
    const labels = {
      1: "Cấp cứu",
      2: "Khẩn cấp", 
      3: "Gấp",
      4: "Ít gấp",
      5: "Không gấp"
    };
    return labels[level as keyof typeof labels] || "Chưa phân loại";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      planned: "bg-muted/10 text-muted border-muted/20",
      arrived: "bg-info/10 text-info border-info/20",
      'in-progress': "bg-warning/10 text-warning border-warning/20",
      finished: "bg-success/10 text-success border-success/20",
      cancelled: "bg-danger/10 text-danger border-danger/20"
    };
    return colors[status as keyof typeof colors] || colors.planned;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      planned: "Đã hẹn",
      arrived: "Đã đến",
      'in-progress': "Đang khám",
      finished: "Hoàn thành",
      cancelled: "Đã hủy"
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleUpdateTriage = async (encounterId: string, level: number) => {
    // In real implementation, call API
    toast({
      title: "Đã cập nhật triage",
      description: `Phân loại mức độ ${level} cho ca khám`,
    });
  };

  const handleStartEncounter = async (encounterId: string) => {
    // In real implementation, call API
    toast({
      title: "Đã bắt đầu khám",
      description: "Trạng thái đã được cập nhật",
    });
  };

  const getEncounterTypeLabel = (type: string) => {
    const types = {
      inpatient: "Nội trú",
      outpatient: "Ngoại trú", 
      emergency: "Cấp cứu"
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-900">Khám bệnh</h1>
          <p className="text-text-500 mt-1">
            Quản lý cuộc hẹn khám và triage ESI
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`} />
          <span className="text-sm text-text-500">
            {isConnected ? 'Realtime' : 'Offline'}
          </span>
          <Button className="gap-2 focus-ring">
            <Plus className="h-4 w-4" />
            Tạo cuộc hẹn
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-500" />
              <Input
                placeholder="Tìm bệnh nhân, cơ sở..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 focus-ring"
              />
            </div>
            <select className="p-2 border border-border rounded-md focus-ring bg-card">
              <option>Tất cả trạng thái</option>
              <option value="arrived">Đã đến</option>
              <option value="in-progress">Đang khám</option>
              <option value="finished">Hoàn thành</option>
            </select>
            <select className="p-2 border border-border rounded-md focus-ring bg-card">
              <option>Tất cả loại</option>
              <option value="emergency">Cấp cứu</option>
              <option value="outpatient">Ngoại trú</option>
              <option value="inpatient">Nội trú</option>
            </select>
            <select className="p-2 border border-border rounded-md focus-ring bg-card">
              <option>Tất cả triage</option>
              <option value="1">Mức 1 - Cấp cứu</option>
              <option value="2">Mức 2 - Khẩn cấp</option>
              <option value="3">Mức 3 - Gấp</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Triage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((level) => (
          <Card key={level}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTriageColor(level)}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-text-500">ESI {level}</p>
                  <p className="text-2xl font-bold text-text-900">
                    {encounters.filter(e => e.triage_level === level).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Encounters Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Danh sách khám bệnh ({filteredEncounters.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium text-text-700">Bệnh nhân</th>
                  <th className="text-left p-3 font-medium text-text-700">Loại</th>
                  <th className="text-left p-3 font-medium text-text-700">Triage</th>
                  <th className="text-left p-3 font-medium text-text-700">Trạng thái</th>
                  <th className="text-left p-3 font-medium text-text-700">Triệu chứng</th>
                  <th className="text-left p-3 font-medium text-text-700">Thời gian</th>
                  <th className="text-left p-3 font-medium text-text-700">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filteredEncounters.map((encounter) => (
                  <tr key={encounter.id} className="border-b border-border hover:bg-muted/30">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-text-900">{encounter.patient_name}</p>
                        <p className="text-sm text-text-500">{encounter.facility_name}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {getEncounterTypeLabel(encounter.encounter_type)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {encounter.triage_level ? (
                        <Badge className={getTriageColor(encounter.triage_level)}>
                          ESI {encounter.triage_level}
                        </Badge>
                      ) : (
                        <span className="text-text-500">Chưa phân loại</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge className={getStatusColor(encounter.status)}>
                        {getStatusLabel(encounter.status)}
                      </Badge>
                    </td>
                    <td className="p-3 text-text-700">
                      {encounter.chief_complaint || <span className="text-text-500">-</span>}
                    </td>
                    <td className="p-3 text-text-700">
                      {new Date(encounter.started_at).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {encounter.status === 'arrived' && (
                          <Button
                            size="sm"
                            onClick={() => handleStartEncounter(encounter.id)}
                            className="focus-ring"
                          >
                            Bắt đầu khám
                          </Button>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedEncounter(encounter)}
                              className="focus-ring"
                            >
                              <Stethoscope className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Chi tiết khám bệnh</DialogTitle>
                            </DialogHeader>
                            {selectedEncounter && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Bệnh nhân</label>
                                    <p className="text-text-900">{selectedEncounter.patient_name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Cơ sở</label>
                                    <p className="text-text-900">{selectedEncounter.facility_name}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Loại khám</label>
                                    <p className="text-text-900">
                                      {getEncounterTypeLabel(selectedEncounter.encounter_type)}
                                    </p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Triage hiện tại</label>
                                    <p className="text-text-900">
                                      {selectedEncounter.triage_level ? 
                                        `ESI ${selectedEncounter.triage_level} - ${getTriageLabel(selectedEncounter.triage_level)}` : 
                                        'Chưa phân loại'}
                                    </p>
                                  </div>
                                </div>

                                {selectedEncounter.chief_complaint && (
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Triệu chứng chính</label>
                                    <p className="text-text-900">{selectedEncounter.chief_complaint}</p>
                                  </div>
                                )}

                                {selectedEncounter.diagnosis && (
                                  <div>
                                    <label className="text-sm font-medium text-text-700">Chẩn đoán</label>
                                    <p className="text-text-900">{selectedEncounter.diagnosis}</p>
                                  </div>
                                )}

                                <div>
                                  <label className="text-sm font-medium text-text-700 mb-2 block">
                                    Cập nhật Triage
                                  </label>
                                  <div className="grid grid-cols-5 gap-2">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                      <Button
                                        key={level}
                                        size="sm"
                                        variant={selectedEncounter.triage_level === level ? "default" : "outline"}
                                        className={`focus-ring ${getTriageColor(level)}`}
                                        onClick={() => handleUpdateTriage(selectedEncounter.id, level)}
                                      >
                                        ESI {level}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                <div>
                                  <label className="text-sm font-medium text-text-700 mb-2 block">
                                    Ghi chú triage
                                  </label>
                                  <Textarea
                                    placeholder="Nhập ghi chú về tình trạng bệnh nhân..."
                                    value={triageNote}
                                    onChange={(e) => setTriageNote(e.target.value)}
                                    className="focus-ring"
                                  />
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredEncounters.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-500">
                      Không có cuộc hẹn khám nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}