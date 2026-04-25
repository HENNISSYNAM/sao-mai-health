import React, { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Heart, AlertTriangle, Pill, Dumbbell, Cigarette,
  ChevronRight, ChevronLeft, CheckCircle2, X, Plus,
  Sparkles, Shield, Brain, Apple, Wine
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

interface HealthCardData {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
  options: string[];
  field: 'medical_conditions' | 'allergies' | 'medications';
  customInput?: boolean;
}

const HEALTH_CARDS: HealthCardData[] = [
  {
    id: 'chronic',
    title: 'Bệnh nền',
    subtitle: 'Chọn các bệnh lý bạn đang có',
    icon: <Heart className="h-6 w-6" />,
    color: 'text-red-400',
    bgGradient: 'from-red-500/20 to-red-600/5',
    field: 'medical_conditions',
    options: [
      'Tiểu đường', 'Tăng huyết áp', 'Tim mạch', 'Hen suyễn',
      'COPD', 'Ung thư', 'Thận mạn', 'Viêm gan B',
      'HIV/AIDS', 'Đột quỵ', 'Parkinson', 'Alzheimer',
      'Tuyến giáp', 'Gout', 'Lupus', 'Viêm khớp',
    ],
    customInput: true,
  },
  {
    id: 'allergy',
    title: 'Dị ứng',
    subtitle: 'Chọn các chất gây dị ứng',
    icon: <AlertTriangle className="h-6 w-6" />,
    color: 'text-amber-400',
    bgGradient: 'from-amber-500/20 to-amber-600/5',
    field: 'allergies',
    options: [
      'Penicillin', 'Aspirin', 'Ibuprofen', 'Sulfa',
      'Hải sản', 'Đậu phộng', 'Trứng', 'Sữa',
      'Gluten', 'Phấn hoa', 'Bụi nhà', 'Lông mèo',
      'Latex', 'Nickel', 'Nọc ong', 'Mold',
    ],
    customInput: true,
  },
  {
    id: 'medication',
    title: 'Thuốc đang dùng',
    subtitle: 'Chọn hoặc nhập thuốc bạn đang sử dụng',
    icon: <Pill className="h-6 w-6" />,
    color: 'text-blue-400',
    bgGradient: 'from-blue-500/20 to-blue-600/5',
    field: 'medications',
    options: [
      'Metformin', 'Lisinopril', 'Amlodipine', 'Atorvastatin',
      'Omeprazole', 'Metoprolol', 'Losartan', 'Aspirin',
      'Vitamin D', 'Omega-3', 'Probiotics', 'Iron',
    ],
    customInput: true,
  },
];

interface HealthDataCardsProps {
  onComplete?: () => void;
  onProfileUpdated?: (field: string, values: string[]) => void;
}

export const HealthDataCards: React.FC<HealthDataCardsProps> = ({ onComplete, onProfileUpdated }) => {
  const { profile, updateProfile } = useUserProfile();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>(() => ({
    medical_conditions: profile?.medical_conditions || [],
    allergies: profile?.allergies || [],
    medications: profile?.medications || [],
  }));
  const [customInputs, setCustomInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const currentCard = HEALTH_CARDS[currentCardIndex];
  const totalCards = HEALTH_CARDS.length;
  const progress = ((currentCardIndex + 1) / totalCards) * 100;

  const currentSelections = selections[currentCard.field] || [];

  const toggleOption = useCallback((option: string) => {
    setSelections(prev => {
      const field = currentCard.field;
      const current = prev[field] || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [field]: updated };
    });
  }, [currentCard.field]);

  const addCustomOption = useCallback(() => {
    const custom = customInputs[currentCard.id]?.trim();
    if (!custom) return;
    setSelections(prev => {
      const field = currentCard.field;
      const current = prev[field] || [];
      if (current.includes(custom)) return prev;
      return { ...prev, [field]: [...current, custom] };
    });
    setCustomInputs(prev => ({ ...prev, [currentCard.id]: '' }));
  }, [currentCard, customInputs]);

  const saveCurrentCard = useCallback(async () => {
    setSaving(true);
    try {
      const field = currentCard.field;
      const values = selections[field] || [];
      await updateProfile({ [field]: values } as any);
      onProfileUpdated?.(field, values);
    } catch (e) {
      console.error('Save error:', e);
    } finally {
      setSaving(false);
    }
  }, [currentCard, selections, updateProfile, onProfileUpdated]);

  const handleNext = async () => {
    await saveCurrentCard();
    if (currentCardIndex < totalCards - 1) {
      setCurrentCardIndex(i => i + 1);
    } else {
      toast.success('🎉 Hồ sơ sức khỏe đã hoàn thiện!', {
        description: 'Dữ liệu giúp hệ thống cảnh báo chính xác hơn cho bạn.',
      });
      onComplete?.();
    }
  };

  const handleBack = () => {
    if (currentCardIndex > 0) setCurrentCardIndex(i => i - 1);
  };

  const handleSkipAll = () => {
    setDismissed(true);
    onComplete?.();
  };

  if (dismissed) return null;

  // Calculate profile completeness
  const totalFields = 3;
  const filledFields = [
    (selections.medical_conditions?.length || 0) > 0 ? 1 : 0,
    (selections.allergies?.length || 0) > 0 ? 1 : 0,
    (selections.medications?.length || 0) > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);
  const completeness = Math.round((filledFields / totalFields) * 100);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative">
      {/* Top bar - LinkedIn-style completeness */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-semibold text-primary">
            Hoàn thiện hồ sơ: {completeness}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {currentCardIndex + 1}/{totalCards}
          </Badge>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleSkipAll}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4">
        <Progress value={progress} className="h-1.5" />
      </div>

      <CardContent className="p-4 pt-3">
        {/* Card header with icon */}
        <div className={`flex items-center gap-3 mb-4 p-3 rounded-xl bg-gradient-to-r ${currentCard.bgGradient}`}>
          <div className={`${currentCard.color}`}>{currentCard.icon}</div>
          <div>
            <h3 className="font-bold text-base">{currentCard.title}</h3>
            <p className="text-xs text-muted-foreground">{currentCard.subtitle}</p>
          </div>
          {currentSelections.length > 0 && (
            <Badge className="ml-auto bg-primary/20 text-primary border-0">
              {currentSelections.length} đã chọn
            </Badge>
          )}
        </div>

        {/* One-tap options grid - Instagram-style chips */}
        <div className="flex flex-wrap gap-2 mb-4 max-h-[180px] overflow-y-auto pr-1">
          {currentCard.options.map(option => {
            const isSelected = currentSelections.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border
                  ${isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                    : 'bg-muted/50 text-foreground border-border hover:bg-muted hover:scale-102'
                  }
                `}
              >
                {isSelected && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                {option}
              </button>
            );
          })}
        </div>

        {/* Custom input - quick add */}
        {currentCard.customInput && (
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Thêm khác..."
              value={customInputs[currentCard.id] || ''}
              onChange={e => setCustomInputs(prev => ({ ...prev, [currentCard.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && addCustomOption()}
              className="h-8 text-xs"
            />
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={addCustomOption}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Selected items */}
        {currentSelections.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4 p-2 rounded-lg bg-muted/30 border border-dashed border-border">
            {currentSelections.map(s => (
              <Badge key={s} variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/20" onClick={() => toggleOption(s)}>
                {s}
                <X className="h-2.5 w-2.5" />
              </Badge>
            ))}
          </div>
        )}

        {/* Navigation - swipe style */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={currentCardIndex === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipAll}
            className="text-muted-foreground text-xs"
          >
            Bỏ qua tất cả
          </Button>

          <Button
            size="sm"
            onClick={handleNext}
            disabled={saving}
            className="gap-1 bg-gradient-to-r from-primary to-primary/80"
          >
            {currentCardIndex === totalCards - 1 ? 'Hoàn tất' : 'Tiếp'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
