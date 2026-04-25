import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dna, Scan, Activity, FileText, Clock,
  Heart, Wind, Droplets, Brain, Shield,
  ChevronRight, User, AlertTriangle, CheckCircle2,
  Plus, History, TrendingUp, Cpu, Share2, Lock
} from 'lucide-react';
import { DigitalTwin3D } from '@/components/biovault/DigitalTwin3D';
import { BioVaultUploader } from '@/components/biovault/BioVaultUploader';
import { HealthProfile } from '@/components/biovault/HealthProfile';
import { PersonalRiskEngine } from '@/components/biovault/PersonalRiskEngine';
import { TwinEngineStatus } from '@/components/biovault/TwinEngineStatus';
import { TwinRealtimeInsights } from '@/components/biovault/TwinRealtimeInsights';
import { EnvironmentHealthPanel } from '@/components/biovault/EnvironmentHealthPanel';
import { TwinPrivacyToggle } from '@/components/biovault/TwinPrivacyToggle';
import { TwinSharingHub } from '@/components/biovault/TwinSharingHub';
import { TwinLocationMap } from '@/components/biovault/TwinLocationMap';
import { ExternalHealthConnector } from '@/components/biovault/ExternalHealthConnector';
import { useAuth } from '@/hooks/useAuth';
import { useHealthRecords, HealthEncounter } from '@/hooks/useHealthRecords';
import { useDeviceSensors } from '@/hooks/useDeviceSensors';
import { usePersonalTwinEngine } from '@/hooks/usePersonalTwinEngine';
import { useTwinSharing } from '@/hooks/useTwinSharing';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

// ─── Encounter Card ────────────────────────────────────────
const EncounterCard: React.FC<{
  encounter: HealthEncounter;
  isLatest: boolean;
  onSelect: () => void;
}> = ({ encounter, isLatest, onSelect }) => {
  const vitals = encounter.vital_signs || {};
  const status = encounter.status;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md group ${
        isLatest
          ? 'border-primary/40 bg-primary/5 shadow-sm'
          : 'border-border/50 bg-card hover:border-primary/20'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            status === 'completed' ? 'bg-success' : 'bg-warning animate-pulse'
          }`} />
          <code className="text-xs font-mono text-primary">{encounter.encounter_code}</code>
          {isLatest && (
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
              Mới nhất
            </Badge>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      {/* Quick vitals */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {vitals.heartRate && (
          <div className="text-center">
            <Heart className="h-3.5 w-3.5 text-destructive mx-auto mb-0.5" />
            <div className="text-sm font-semibold">{vitals.heartRate}</div>
            <div className="text-[10px] text-muted-foreground">BPM</div>
          </div>
        )}
        {vitals.oxygenLevel && (
          <div className="text-center">
            <Wind className="h-3.5 w-3.5 text-info mx-auto mb-0.5" />
            <div className="text-sm font-semibold">{vitals.oxygenLevel}%</div>
            <div className="text-[10px] text-muted-foreground">SpO2</div>
          </div>
        )}
        {vitals.stressLevel !== undefined && (
          <div className="text-center">
            <Brain className="h-3.5 w-3.5 text-warning mx-auto mb-0.5" />
            <div className="text-sm font-semibold">{Math.round(vitals.stressLevel)}%</div>
            <div className="text-[10px] text-muted-foreground">Stress</div>
          </div>
        )}
        {vitals.hydration !== undefined && (
          <div className="text-center">
            <Droplets className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
            <div className="text-sm font-semibold">{Math.round(vitals.hydration)}%</div>
            <div className="text-[10px] text-muted-foreground">Nước</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {format(new Date(encounter.created_at), "dd/MM/yyyy 'lúc' HH:mm", { locale: vi })}
        </span>
        {encounter.confidence && (
          <span>Độ tin cậy: {Math.round(encounter.confidence * 100)}%</span>
        )}
      </div>
    </button>
  );
};

// ─── Encounter Detail Panel ─────────────────────────────────
const EncounterDetail: React.FC<{ encounter: HealthEncounter }> = ({ encounter }) => {
  const vitals = encounter.vital_signs || {};
  const facial = encounter.facial_metrics || {};
  const inferred = encounter.inferred_health || {};
  const recs = encounter.recommendations || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <code className="text-primary">{encounter.encounter_code}</code>
            <Badge variant="outline" className={
              encounter.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
            }>
              {encounter.status === 'completed' ? 'Hoàn tất' : 'Đang xử lý'}
            </Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(new Date(encounter.created_at), "EEEE, dd MMMM yyyy 'lúc' HH:mm:ss", { locale: vi })}
          </p>
        </div>
      </div>

      {/* Vital Signs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <VitalCard icon={Heart} label="Nhịp tim" value={vitals.heartRate} unit="BPM" color="destructive"
          status={vitals.heartRate > 90 ? 'warning' : 'normal'} />
        <VitalCard icon={Wind} label="SpO2" value={vitals.oxygenLevel ? `${vitals.oxygenLevel}` : '--'} unit="%" color="info"
          status={vitals.oxygenLevel && vitals.oxygenLevel < 95 ? 'warning' : 'normal'} />
        <VitalCard icon={Brain} label="Stress" value={vitals.stressLevel ? Math.round(vitals.stressLevel) : '--'} unit="%" color="warning"
          status={vitals.stressLevel > 60 ? 'warning' : 'normal'} />
        <VitalCard icon={Droplets} label="Độ ẩm" value={vitals.hydration ? Math.round(vitals.hydration) : '--'} unit="%" color="primary"
          status={vitals.hydration && vitals.hydration < 50 ? 'warning' : 'normal'} />
      </div>

      {/* Facial Metrics */}
      {Object.keys(facial).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Chỉ số khuôn mặt
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {facial.skinHealth !== undefined && (
              <MetricBar label="Sức khỏe da" value={facial.skinHealth} />
            )}
            {facial.stressIndicators !== undefined && (
              <MetricBar label="Dấu hiệu stress" value={facial.stressIndicators} variant="warning" />
            )}
            {facial.fatigueSigns !== undefined && (
              <MetricBar label="Mệt mỏi" value={facial.fatigueSigns} variant="warning" />
            )}
            {facial.symmetryScore !== undefined && (
              <MetricBar label="Đối xứng khuôn mặt" value={facial.symmetryScore} />
            )}
          </CardContent>
        </Card>
      )}

      {/* Inferred Health */}
      {Object.keys(inferred).length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-info" />
              Sức khỏe suy luận AI
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {inferred.bloodPressureRisk && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Rủi ro huyết áp</span>
                  <RiskBadge risk={inferred.bloodPressureRisk} />
                </div>
              )}
              {inferred.dehydrationLevel && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mất nước</span>
                  <Badge variant="outline" className={
                    inferred.dehydrationLevel === 'normal' ? 'bg-success/20 text-success' :
                    inferred.dehydrationLevel === 'mild' ? 'bg-warning/20 text-warning' :
                    'bg-destructive/20 text-destructive'
                  }>
                    {inferred.dehydrationLevel === 'normal' ? 'Bình thường' :
                     inferred.dehydrationLevel === 'mild' ? 'Nhẹ' :
                     inferred.dehydrationLevel === 'moderate' ? 'Vừa' : 'Nặng'}
                  </Badge>
                </div>
              )}
              {inferred.anemiaSigns !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Thiếu máu</span>
                  <Badge variant="outline" className={inferred.anemiaSigns ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}>
                    {inferred.anemiaSigns ? 'Có thể' : 'Không'}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              Khuyến nghị ({recs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ul className="space-y-2">
              {recs.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                  {rec}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────
const VitalCard: React.FC<{
  icon: any; label: string; value: any; unit: string; color: string; status: 'normal' | 'warning';
}> = ({ icon: Icon, label, value, unit, color, status }) => (
  <div className={`text-center p-3 rounded-xl border ${
    status === 'warning' ? 'border-warning/30 bg-warning/5' : `border-${color}/20 bg-${color}/5`
  }`}>
    <Icon className={`h-5 w-5 text-${color} mx-auto mb-1`} />
    <div className="text-xl font-bold">{value ?? '--'}</div>
    <div className="text-[11px] text-muted-foreground">{unit}</div>
    <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
  </div>
);

const MetricBar: React.FC<{ label: string; value: number; variant?: 'default' | 'warning' }> = ({ label, value, variant }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{Math.round(value)}%</span>
    </div>
    <Progress value={value} className={`h-1.5 ${variant === 'warning' ? '[&>div]:bg-warning' : ''}`} />
  </div>
);

const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => {
  const config: Record<string, { className: string; label: string }> = {
    low: { className: 'bg-success/20 text-success', label: 'Thấp' },
    medium: { className: 'bg-warning/20 text-warning', label: 'TB' },
    high: { className: 'bg-destructive/20 text-destructive', label: 'Cao' },
  };
  const c = config[risk] || config.low;
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
};

// ─── Main Page ──────────────────────────────────────────────
const BioVault: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { record, encounters, loading, createEncounter, refreshEncounters } = useHealthRecords();
  const deviceSensors = useDeviceSensors();
  const twinEngine = usePersonalTwinEngine(null);
  const twinSharing = useTwinSharing(null);

  const [showFaceScanner, setShowFaceScanner] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<HealthEncounter | null>(null);
  const [activeTab, setActiveTab] = useState('records');
  const [environmentData, setEnvironmentData] = useState<any>(null);

  // Start sensors
  useEffect(() => {
    if (user?.id) deviceSensors.startAll();
    return () => { deviceSensors.stopAll(); };
  }, [user?.id]);

  // Auto-select latest encounter
  useEffect(() => {
    if (encounters.length > 0 && !selectedEncounter) {
      setSelectedEncounter(encounters[0]);
    }
  }, [encounters, selectedEncounter]);

  // Handle face scan → create encounter
  const handleFacialScanComplete = async (data: FacialHealthData) => {
    setShowFaceScanner(false);

    const encounter = await createEncounter({
      scan_type: 'face_scan',
      vital_signs: {
        heartRate: data.inferredHealth.estimatedHeartRate,
        oxygenLevel: data.inferredHealth.estimatedOxygenLevel,
        stressLevel: data.facialMetrics.stressIndicators,
        hydration: data.facialMetrics.hydrationLevel,
      },
      facial_metrics: {
        skinTone: data.facialMetrics.skinTone,
        skinHealth: data.facialMetrics.skinHealth,
        stressIndicators: data.facialMetrics.stressIndicators,
        fatigueSigns: data.facialMetrics.fatigueSigns,
        symmetryScore: data.facialSymmetry.score,
      },
      inferred_health: {
        bloodPressureRisk: data.inferredHealth.bloodPressureRisk,
        anemiaSigns: data.inferredHealth.anemiaSigns,
        jaundiceIndicators: data.inferredHealth.jaundiceIndicators,
        dehydrationLevel: data.inferredHealth.dehydrationLevel,
      },
      recommendations: data.recommendations,
      confidence: data.confidence,
    });

    if (encounter) {
      setSelectedEncounter(encounter);
      setActiveTab('records');
      toast.success(`Phiên khám ${encounter.encounter_code} đã được tạo!`);
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <Dna className="h-7 w-7 text-primary" />
            {t('nav.digitalTwin', 'Song sinh số')}
          </h1>
          {record && (
            <div className="flex items-center gap-3 mt-1.5">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-mono">
                <Shield className="h-3 w-3 mr-1" />
                {record.patient_code}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {encounters.length} phiên khám • Tạo {format(new Date(record.created_at), 'dd/MM/yyyy')}
              </span>
            </div>
          )}
        </div>
        <Button
          onClick={() => setShowFaceScanner(true)}
          className="bg-gradient-to-r from-primary to-info hover:opacity-90 shadow-lg"
        >
          <Scan className="h-4 w-4 mr-2" />
          Quét mặt — Tạo phiên khám
        </Button>
      </div>

      {/* ── Digital Twin Hero ──────────────────────────── */}
      <DigitalTwin3D profile={null} sensorData={deviceSensors} />

      {/* ── Face Scanner Modal ─────────────────────────── */}
      {showFaceScanner && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Face3DHealthScanner
            onScanComplete={handleFacialScanComplete}
            onCancel={() => setShowFaceScanner(false)}
          />
        </div>
      )}

      {/* ── Main Content Tabs ──────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="records" className="gap-1.5">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Hồ sơ</span>
          </TabsTrigger>
          <TabsTrigger value="engine" className="gap-1.5">
            <Cpu className="h-4 w-4" />
            <span className="hidden sm:inline">Engine</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Tài liệu</span>
          </TabsTrigger>
          <TabsTrigger value="sharing" className="gap-1.5">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">Chia sẻ</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Records Tab (EMR Core) ────────────────── */}
        <TabsContent value="records" className="space-y-4">
          {encounters.length === 0 && !loading ? (
            <Card className="border-dashed border-2 border-primary/20">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Scan className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Chưa có phiên khám nào</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-6">
                  Quét khuôn mặt để tạo phiên khám đầu tiên. Mỗi lần quét sẽ tạo một mã định danh riêng, 
                  lưu trữ chỉ số sinh tồn và khuyến nghị AI.
                </p>
                <Button onClick={() => setShowFaceScanner(true)} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Tạo phiên khám đầu tiên
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Encounter Timeline */}
              <div className="lg:col-span-4">
                <Card className="border-border/50">
                  <CardHeader className="pb-3 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        Lịch sử phiên khám
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">{encounters.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3">
                    <ScrollArea className="h-[500px] pr-2">
                      <div className="space-y-2">
                        {encounters.map((enc, i) => (
                          <EncounterCard
                            key={enc.id}
                            encounter={enc}
                            isLatest={i === 0}
                            onSelect={() => setSelectedEncounter(enc)}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              {/* Encounter Detail */}
              <div className="lg:col-span-8">
                {selectedEncounter ? (
                  <EncounterDetail encounter={selectedEncounter} />
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex items-center justify-center py-20 text-muted-foreground">
                      Chọn một phiên khám để xem chi tiết
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Risk Engine + Health Profile below encounters */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <HealthProfile profile={null} />
            <PersonalRiskEngine profile={null} showFullDashboard environmentData={environmentData} />
          </div>
        </TabsContent>

        {/* ── Engine Tab ────────────────────────────── */}
        <TabsContent value="engine" className="space-y-4">
          <EnvironmentHealthPanel
            profile={null}
            onEnvironmentUpdate={(data, impact) => setEnvironmentData(data)}
          />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <TwinEngineStatus
                state={twinEngine.twinState}
                isProcessing={twinEngine.isProcessing}
                inputQueueLength={twinEngine.inputQueue.length}
                onRefresh={twinEngine.processInputs}
                sensorData={deviceSensors}
              />
            </div>
            <div>
              <TwinRealtimeInsights
                twinId={record?.patient_code || 'anonymous'}
                twinState={twinEngine.twinState}
                proximityContext={null}
                profile={null}
                sensorData={deviceSensors}
              />
            </div>
          </div>
        </TabsContent>

        {/* ── Documents Tab ─────────────────────────── */}
        <TabsContent value="documents" className="space-y-4">
          <BioVaultUploader onDocumentUploaded={() => {}} onMetricExtracted={() => {}} />
          <ExternalHealthConnector onDataImport={() => {}} />
        </TabsContent>

        {/* ── Sharing Tab ───────────────────────────── */}
        <TabsContent value="sharing" className="space-y-4">
          <TwinPrivacyToggle />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TwinSharingHub profile={null} />
            <TwinLocationMap
              myLocation={twinSharing.myLocation}
              connectedTwins={twinSharing.connectedTwins}
              isSharing={twinSharing.isSharing}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BioVault;
