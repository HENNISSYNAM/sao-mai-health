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
      setCampaigns((data || []).map(campaign => ({
        ...campaign,
        priority_groups: Array.isArray(campaign.priority_groups) ? campaign.priority_groups : [],
        status: campaign.status as 'scheduled' | 'ongoing' | 'completed' | 'cancelled',
        description: campaign.description || ''
      })));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách chiến dịch",
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