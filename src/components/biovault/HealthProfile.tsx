import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  User, Calendar, Phone, Droplets, AlertTriangle, 
  Pill, Heart, FileText, Activity
} from 'lucide-react';
import type { UserHealthProfile, ExtractedMetric } from '@/pages/BioVault';

interface HealthProfileProps {
  profile: UserHealthProfile | null;
}

export const HealthProfile: React.FC<HealthProfileProps> = ({ profile }) => {
  const { t, i18n } = useTranslation();

  if (!profile) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {t('biovault.profile.noData', 'Chưa có dữ liệu hồ sơ')}
        </CardContent>
      </Card>
    );
  }

  const calculateAge = (dob: string) => {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getRiskBadge = (level: ExtractedMetric['riskLevel']) => {
    switch (level) {
      case 'critical':
        return <Badge className="bg-danger text-danger-foreground">{t('biovault.risk.critical', 'Nguy hiểm')}</Badge>;
      case 'warning':
        return <Badge className="bg-warning text-warning-foreground">{t('biovault.risk.warning', 'Cảnh báo')}</Badge>;
      default:
        return <Badge className="bg-success text-success-foreground">{t('biovault.risk.normal', 'Bình thường')}</Badge>;
    }
  };

  return (
    <Card className="border-2 border-primary/20 bg-card/95 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {t('biovault.profile.title', 'Hồ sơ sức khỏe')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              {t('biovault.profile.age', 'Tuổi')}
            </div>
            <p className="font-semibold text-lg">{calculateAge(profile.dateOfBirth)} {t('biovault.profile.years', 'tuổi')}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <User className="h-3 w-3" />
              {t('biovault.profile.gender', 'Giới tính')}
            </div>
            <p className="font-semibold text-lg">
              {profile.gender === 'male' ? t('biovault.gender.male', 'Nam') : 
               profile.gender === 'female' ? t('biovault.gender.female', 'Nữ') : 
               t('biovault.gender.other', 'Khác')}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Phone className="h-3 w-3" />
              {t('biovault.profile.phone', 'Điện thoại')}
            </div>
            <p className="font-semibold text-lg">{profile.phone}</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Droplets className="h-3 w-3" />
              {t('biovault.profile.bloodType', 'Nhóm máu')}
            </div>
            <p className="font-semibold text-lg">{profile.bloodType || 'N/A'}</p>
          </div>
        </div>

        {/* Allergies */}
        {profile.allergies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {t('biovault.profile.allergies', 'Dị ứng')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.allergies.map((allergy, i) => (
                <Badge key={i} variant="outline" className="border-warning text-warning">
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Chronic Conditions */}
        {profile.chronicConditions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Heart className="h-4 w-4 text-danger" />
              {t('biovault.profile.chronicConditions', 'Bệnh nền')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.chronicConditions.map((condition, i) => (
                <Badge key={i} variant="outline" className="border-danger/50 text-danger">
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Medications */}
        {profile.medications.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              {t('biovault.profile.medications', 'Thuốc đang dùng')}
            </h4>
            <div className="flex flex-wrap gap-2">
              {profile.medications.map((med, i) => (
                <Badge key={i} variant="secondary">
                  {med}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Extracted Metrics */}
        {profile.extractedMetrics.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-info" />
              {t('biovault.profile.extractedMetrics', 'Chỉ số trích xuất từ hồ sơ')}
            </h4>
            <div className="space-y-2">
              {profile.extractedMetrics.map(metric => (
                <div 
                  key={metric.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div>
                    <p className="font-medium text-sm">{metric.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {metric.extractedFrom} • {new Date(metric.date).toLocaleDateString(i18n.language)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">
                      {metric.value} {metric.unit}
                    </span>
                    {getRiskBadge(metric.riskLevel)}
                    {metric.icd11Code && (
                      <Badge variant="outline" className="text-xs">
                        ICD-11: {metric.icd11Code}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documents Count */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              {t('biovault.profile.documentsUploaded', 'Hồ sơ đã tải lên')}
            </span>
            <span className="font-semibold">{profile.documents.length}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
