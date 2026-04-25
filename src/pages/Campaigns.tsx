import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, CalendarIcon, Plus, QrCode, Users, Target, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CampaignWizard } from '@/components/CampaignWizard';
import { QRCheckIn } from '@/components/QRCheckIn';

interface Campaign {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  target_participants: number;
  priority_groups: any[];
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
}

interface CampaignSlot {
  id: string;
  campaign_id: string;
  ward: string;
  total_slots: number;
  allocated_slots: number;
  capacity_constraint: number;
}

interface CampaignCheckIn {
  id: string;
  campaign_id: string;
  participant_name: string;
  ward: string;
  phone: string;
  check_in_time: string;
}

export default function Campaigns() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [slots, setSlots] = useState<CampaignSlot[]>([]);
  const [checkins, setCheckins] = useState<CampaignCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showQRCheckIn, setShowQRCheckIn] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Rich demo data for campaigns
  const demoCampaigns: Campaign[] = [
    {
      id: "demo-1",
      name: "Chiến dịch Tiêm vaccine COVID-19 Q1",
      description: "Tiêm vaccine COVID-19 cho người dân Quận 1 - đợt 1",
      start_date: "2024-01-15",
      end_date: "2024-01-25", 
      target_participants: 5000,
      priority_groups: ["Người cao tuổi", "Người có bệnh nền"],
      status: 'completed' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()
    },
    {
      id: "demo-2", 
      name: "Sàng lọc Sức khỏe Cộng đồng Q5",
      description: "Khám sức khỏe miễn phí cho người dân Quận 5",
      start_date: "2024-02-01",
      end_date: "2024-02-10",
      target_participants: 2000,
      priority_groups: ["Trẻ em dưới 5 tuổi", "Phụ nữ mang thai"],
      status: 'ongoing' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString()
    },
    {
      id: "demo-3",
      name: "Phòng chống Sốt xuất huyết TPHCM",
      description: "Diệt muỗi và tuyên truyền phòng chống sốt xuất huyết",
      start_date: "2024-02-15", 
      end_date: "2024-03-15",
      target_participants: 10000,
      priority_groups: ["Khu vực có ca bệnh", "Trường học"],
      status: 'scheduled' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
    },
    {
      id: "demo-4",
      name: "Tiêm vaccine Viêm gan B trẻ em",
      description: "Chiến dịch tiêm vaccine Viêm gan B cho trẻ em dưới 1 tuổi",
      start_date: "2024-03-01",
      end_date: "2024-03-31",
      target_participants: 1500,
      priority_groups: ["Trẻ sơ sinh", "Trẻ dưới 1 tuổi"],
      status: 'scheduled' as const,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
    }
  ];

  const demoSlots: CampaignSlot[] = [
    { id: "slot-1", campaign_id: "demo-1", ward: "Phường Bến Nghé", total_slots: 500, allocated_slots: 480, capacity_constraint: 500 },
    { id: "slot-2", campaign_id: "demo-1", ward: "Phường Bến Thành", total_slots: 400, allocated_slots: 395, capacity_constraint: 400 },
    { id: "slot-3", campaign_id: "demo-2", ward: "Phường 1", total_slots: 300, allocated_slots: 250, capacity_constraint: 300 },
    { id: "slot-4", campaign_id: "demo-3", ward: "Phường Tân Định", total_slots: 800, allocated_slots: 200, capacity_constraint: 800 }
  ];

  const demoCheckins: CampaignCheckIn[] = [
    { id: "checkin-1", campaign_id: "demo-2", participant_name: "Nguyễn Văn A", ward: "Phường 1", phone: "0901234567", check_in_time: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: "checkin-2", campaign_id: "demo-2", participant_name: "Trần Thị B", ward: "Phường 1", phone: "0901234568", check_in_time: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { id: "checkin-3", campaign_id: "demo-2", participant_name: "Lê Văn C", ward: "Phường 1", phone: "0901234569", check_in_time: new Date(Date.now() - 1000 * 60 * 15).toISOString() }
  ];

  useEffect(() => {
    fetchCampaigns();
    fetchSlots();
    fetchCheckIns();
    
    // Set up real-time subscriptions
    const campaignsChannel = supabase
      .channel('campaigns-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
        fetchCampaigns();
      })
      .subscribe();

    const slotsChannel = supabase
      .channel('slots-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_slots' }, () => {
        fetchSlots();
      })
      .subscribe();

    const checkinsChannel = supabase
      .channel('checkins-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_checkins' }, () => {
        fetchCheckIns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(campaignsChannel);
      supabase.removeChannel(slotsChannel);
      supabase.removeChannel(checkinsChannel);
    };
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Combine demo data with real data
      setCampaigns([...demoCampaigns, ...(data || []).map(campaign => ({
        ...campaign,
        priority_groups: Array.isArray(campaign.priority_groups) ? campaign.priority_groups : [],
        status: campaign.status as 'scheduled' | 'ongoing' | 'completed' | 'cancelled',
        description: campaign.description || ''
      }))]);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      // Use only demo data if database fails
      setCampaigns(demoCampaigns);
      toast({
        title: "Lỗi", 
        description: "Không thể tải từ database, hiển thị dữ liệu demo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_slots')
        .select('*');

      if (error) throw error;
      setSlots(data || []);
    } catch (error) {
      console.error('Error fetching slots:', error);
    }
  };

  const fetchCheckIns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_checkins')
        .select('*');

      if (error) throw error;
      setCheckins(data || []);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const variants = {
      'scheduled': 'secondary',
      'ongoing': 'default',
      'completed': 'default',
      'cancelled': 'destructive'
    } as const;

    const labels = {
      'scheduled': 'Đã lên lịch',
      'ongoing': 'Đang diễn ra',
      'completed': 'Hoàn thành',
      'cancelled': 'Đã hủy'
    };

    return (
      <Badge variant={variants[status]} className="text-xs">
        {labels[status]}
      </Badge>
    );
  };

  const getCampaignStats = (campaignId: string) => {
    const campaignSlots = slots.filter(slot => slot.campaign_id === campaignId);
    const campaignCheckIns = checkins.filter(checkin => checkin.campaign_id === campaignId);
    
    const totalTarget = campaignSlots.reduce((sum, slot) => sum + slot.total_slots, 0);
    const totalScheduled = campaignSlots.reduce((sum, slot) => sum + slot.allocated_slots, 0);
    const totalCompleted = campaignCheckIns.length;

    return { totalTarget, totalScheduled, totalCompleted };
  };

  const getWardScoreboard = (campaignId: string) => {
    const campaignSlots = slots.filter(slot => slot.campaign_id === campaignId);
    const campaignCheckIns = checkins.filter(checkin => checkin.campaign_id === campaignId);
    
    return campaignSlots.map(slot => {
      const wardCheckIns = campaignCheckIns.filter(checkin => checkin.ward === slot.ward);
      const completionRate = slot.total_slots > 0 ? (wardCheckIns.length / slot.total_slots) * 100 : 0;
      
      return {
        ward: slot.ward,
        target: slot.total_slots,
        completed: wardCheckIns.length,
        completionRate: completionRate.toFixed(1)
      };
    }).sort((a, b) => parseFloat(b.completionRate) - parseFloat(a.completionRate));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quản lý Chiến dịch</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowQRCheckIn(true)} variant="outline">
            <QrCode className="h-4 w-4 mr-2" />
            QR Check-in
          </Button>
          <Button onClick={() => setShowWizard(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo chiến dịch mới
          </Button>
        </div>
      </div>

      {/* Campaigns List */}
      <div className="grid gap-6">
        {campaigns.map((campaign) => {
          const stats = getCampaignStats(campaign.id);
          const scoreboard = getWardScoreboard(campaign.id);
          
          return (
            <Card key={campaign.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {campaign.name}
                      {getStatusBadge(campaign.status)}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {campaign.description}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {format(new Date(campaign.start_date), 'dd/MM/yyyy')} - {format(new Date(campaign.end_date), 'dd/MM/yyyy')}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* KPIs */}
                  <div>
                    <h4 className="font-semibold mb-3">Chỉ số KPI</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
                          <Target className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-blue-600">{stats.totalTarget}</div>
                        <div className="text-xs text-muted-foreground">Mục tiêu</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2">
                          <Clock className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="text-2xl font-bold text-orange-600">{stats.totalScheduled}</div>
                        <div className="text-xs text-muted-foreground">Đã lên lịch</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="text-2xl font-bold text-green-600">{stats.totalCompleted}</div>
                        <div className="text-xs text-muted-foreground">Hoàn thành</div>
                      </div>
                    </div>
                  </div>

                  {/* Ward Scoreboard */}
                  <div>
                    <h4 className="font-semibold mb-3">Bảng điểm theo phường</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {scoreboard.slice(0, 5).map((ward, index) => (
                        <div key={ward.ward} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-400 text-yellow-900' :
                              index === 1 ? 'bg-gray-400 text-gray-900' :
                              index === 2 ? 'bg-orange-400 text-orange-900' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {index + 1}
                            </div>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{ward.ward}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{ward.completionRate}%</div>
                            <div className="text-xs text-muted-foreground">
                              {ward.completed}/{ward.target}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Priority Groups */}
                {campaign.priority_groups && campaign.priority_groups.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Nhóm ưu tiên</h4>
                    <div className="flex flex-wrap gap-2">
                      {campaign.priority_groups.map((group, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {group}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Campaign Creation Wizard */}
      <CampaignWizard 
        open={showWizard} 
        onOpenChange={setShowWizard}
        onSuccess={() => {
          setShowWizard(false);
          fetchCampaigns();
          fetchSlots();
        }}
      />

      {/* QR Check-in */}
      <QRCheckIn 
        open={showQRCheckIn} 
        onOpenChange={setShowQRCheckIn}
        campaigns={campaigns}
        onSuccess={() => {
          fetchCheckIns();
        }}
      />
    </div>
  );
}