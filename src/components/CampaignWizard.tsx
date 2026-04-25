import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Plus, X, ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Ward {
  name: string;
  capacity: number;
}

export function CampaignWizard({ open, onOpenChange, onSuccess }: CampaignWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [targetParticipants, setTargetParticipants] = useState('');
  const [priorityGroups, setPriorityGroups] = useState<string[]>([]);
  const [newPriorityGroup, setNewPriorityGroup] = useState('');
  const [wards, setWards] = useState<Ward[]>([
    { name: 'Phường 1', capacity: 100 },
    { name: 'Phường 2', capacity: 150 },
    { name: 'Phường 3', capacity: 120 },
    { name: 'Phường 4', capacity: 180 },
    { name: 'Phường 5', capacity: 90 }
  ]);

  const steps = [
    { number: 1, title: 'Thông tin cơ bản', description: 'Tên và mô tả chiến dịch' },
    { number: 2, title: 'Thời gian & Mục tiêu', description: 'Thời gian diễn ra và số lượng tham gia' },
    { number: 3, title: 'Nhóm ưu tiên', description: 'Xác định các nhóm đối tượng ưu tiên' },
    { number: 4, title: 'Phân bổ slot', description: 'Phân bổ công bằng theo phường' },
    { number: 5, title: 'Xác nhận', description: 'Xem lại và tạo chiến dịch' }
  ];

  const resetForm = () => {
    setCurrentStep(1);
    setName('');
    setDescription('');
    setStartDate(undefined);
    setEndDate(undefined);
    setTargetParticipants('');
    setPriorityGroups([]);
    setNewPriorityGroup('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const addPriorityGroup = () => {
    if (newPriorityGroup.trim() && !priorityGroups.includes(newPriorityGroup.trim())) {
      setPriorityGroups([...priorityGroups, newPriorityGroup.trim()]);
      setNewPriorityGroup('');
    }
  };

  const removePriorityGroup = (group: string) => {
    setPriorityGroups(priorityGroups.filter(g => g !== group));
  };

  const updateWardCapacity = (index: number, capacity: number) => {
    const updatedWards = [...wards];
    updatedWards[index].capacity = capacity;
    setWards(updatedWards);
  };

  const calculateAllocation = () => {
    const target = parseInt(targetParticipants);
    if (!target || wards.length === 0) return [];

    // Minimax fairness algorithm
    const totalCapacity = wards.reduce((sum, ward) => sum + ward.capacity, 0);
    const baseAllocation = Math.floor(target / wards.length);
    const remainder = target % wards.length;

    return wards.map((ward, index) => {
      let allocation = baseAllocation;
      if (index < remainder) allocation += 1;
      
      // Respect capacity constraints
      allocation = Math.min(allocation, ward.capacity);
      
      return {
        ...ward,
        allocation
      };
    });
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 1:
        return name.trim() && description.trim();
      case 2:
        return startDate && endDate && targetParticipants && parseInt(targetParticipants) > 0;
      case 3:
        return true; // Priority groups are optional
      case 4:
        return true; // Ward allocation is calculated automatically
      case 5:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const campaignData = {
        name,
        description,
        start_date: format(startDate!, 'yyyy-MM-dd'),
        end_date: format(endDate!, 'yyyy-MM-dd'),
        target_participants: parseInt(targetParticipants),
        priority_groups: priorityGroups,
        wards: wards.map(ward => ({
          name: ward.name,
          capacity: ward.capacity
        }))
      };

      const { data, error } = await supabase.rpc('fn_schedule_campaign', {
        campaign_data: campaignData
      });

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Chiến dịch đã được tạo và phân bổ slot thành công",
      });

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tạo chiến dịch",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Tên chiến dịch *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên chiến dịch"
              />
            </div>
            <div>
              <Label htmlFor="description">Mô tả *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết về chiến dịch"
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Ngày bắt đầu *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy") : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Ngày kết thúc *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy") : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="target">Mục tiêu số lượng tham gia *</Label>
              <Input
                id="target"
                type="number"
                value={targetParticipants}
                onChange={(e) => setTargetParticipants(e.target.value)}
                placeholder="Số lượng người tham gia mục tiêu"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label>Nhóm ưu tiên</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={newPriorityGroup}
                  onChange={(e) => setNewPriorityGroup(e.target.value)}
                  placeholder="Thêm nhóm ưu tiên (vd: Người cao tuổi)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addPriorityGroup();
                    }
                  }}
                />
                <Button onClick={addPriorityGroup} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {priorityGroups.length > 0 && (
              <div>
                <Label>Các nhóm đã thêm:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {priorityGroups.map((group) => (
                    <Badge key={group} variant="secondary" className="flex items-center gap-1">
                      {group}
                      <button
                        onClick={() => removePriorityGroup(group)}
                        className="ml-1 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        const allocation = calculateAllocation();
        return (
          <div className="space-y-4">
            <div>
              <Label>Phân bổ slot theo phường (Minimax Fairness)</Label>
              <p className="text-sm text-muted-foreground">
                Hệ thống sẽ phân bổ công bằng {targetParticipants} slot cho {wards.length} phường
              </p>
            </div>
            <div className="space-y-2">
              {allocation.map((ward, index) => (
                <div key={ward.name} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{ward.name}</span>
                    <div className="text-sm text-muted-foreground">
                      Năng lực: 
                      <Input
                        type="number"
                        value={ward.capacity}
                        onChange={(e) => updateWardCapacity(index, parseInt(e.target.value) || 0)}
                        className="w-20 h-8 ml-2 inline-block"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">{ward.allocation} slot</div>
                    <div className="text-xs text-muted-foreground">
                      {ward.capacity > 0 ? Math.round((ward.allocation / ward.capacity) * 100) : 0}% năng lực
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h3 className="font-semibold">Xác nhận thông tin chiến dịch</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Tên:</strong> {name}</div>
              <div><strong>Mô tả:</strong> {description}</div>
              <div><strong>Thời gian:</strong> {startDate && endDate && 
                `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`}</div>
              <div><strong>Mục tiêu:</strong> {targetParticipants} người tham gia</div>
              {priorityGroups.length > 0 && (
                <div><strong>Nhóm ưu tiên:</strong> {priorityGroups.join(', ')}</div>
              )}
              <div><strong>Phân bổ:</strong> {wards.length} phường</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo chiến dịch mới</DialogTitle>
          <DialogDescription>
            Bước {currentStep} / {steps.length}: {steps[currentStep - 1]?.title}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep > step.number 
                  ? "bg-green-600 text-white" 
                  : currentStep === step.number 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-gray-200 text-gray-600"
              )}>
                {currentStep > step.number ? <Check className="h-4 w-4" /> : step.number}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2",
                  currentStep > step.number ? "bg-green-600" : "bg-gray-200"
                )} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{steps[currentStep - 1]?.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{steps[currentStep - 1]?.description}</p>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
            
            {currentStep < steps.length ? (
              <Button 
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canGoNext()}
              >
                Tiếp tục
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading || !canGoNext()}>
                {loading ? 'Đang tạo...' : 'Tạo chiến dịch'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}