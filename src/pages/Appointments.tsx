import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Phone, User, Building, Plus, Send, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
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

interface Appointment {
  id: string;
  patient_name: string;
  facility: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  doctor?: string;
  phone?: string;
  no_show_risk: number;
  overbook_suggestion: number;
}

interface NoShowPrediction {
  probability: number;
  risk_level: 'High' | 'Medium' | 'Low';
  factors: string[];
  overbook_suggestion: number;
}

export default function Appointments() {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [facilityFilter, setFacilityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [predictions, setPredictions] = useState<Record<string, NoShowPrediction>>({});

  const facilities = [...new Set(appointments.map(apt => apt.facility))];
  const statuses = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'];

  useEffect(() => {
    fetchAppointments();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('Realtime update:', payload);
          fetchAppointments(); // Refetch data on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    // Generate predictions for scheduled appointments
    appointments
      .filter(apt => apt.status === 'scheduled')
      .forEach(apt => {
        if (!predictions[apt.id]) {
          generateNoShowPrediction(apt);
        }
      });
  }, [appointments]);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách lịch hẹn",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateNoShowPrediction = async (appointment: Appointment) => {
    try {
      const { data, error } = await supabase.functions.invoke('ai_no_show', {
        body: { appointment }
      });

      if (error) throw error;

      setPredictions(prev => ({
        ...prev,
        [appointment.id]: data
      }));

      // Update the appointment with the prediction
      await supabase
        .from('appointments')
        .update({
          no_show_risk: data.probability,
          overbook_suggestion: data.overbook_suggestion
        })
        .eq('id', appointment.id);

    } catch (error) {
      console.error('Error generating prediction:', error);
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái lịch hẹn`,
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật lịch hẹn",
        variant: "destructive",
      });
    }
  };

  const sendReminder = (appointment: Appointment) => {
    // Placeholder for send reminder functionality
    toast({
      title: "Nhắc nhở đã gửi",
      description: `Đã gửi tin nhắn nhắc nhở đến ${appointment.patient_name}`,
    });
  };

  const getRiskBadge = (appointmentId: string) => {
    const prediction = predictions[appointmentId];
    if (!prediction) return null;

    const variants = {
      'High': 'destructive',
      'Medium': 'secondary', 
      'Low': 'default'
    } as const;

    return (
      <Badge variant={variants[prediction.risk_level]} className="text-xs">
        {prediction.risk_level} ({Math.round(prediction.probability * 100)}%)
      </Badge>
    );
  };

  const filteredAppointments = appointments.filter(apt => {
    return (
      (!facilityFilter || apt.facility.includes(facilityFilter)) &&
      (!statusFilter || apt.status === statusFilter) &&
      (!dateFilter || apt.appointment_date === dateFilter)
    );
  });

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
        <h1 className="text-3xl font-bold">Quản lý Lịch hẹn</h1>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Thêm lịch hẹn
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Cơ sở</label>
              <Select value={facilityFilter} onValueChange={setFacilityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả cơ sở" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tất cả cơ sở</SelectItem>
                  {facilities.map(facility => (
                    <SelectItem key={facility} value={facility}>
                      {facility}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Trạng thái</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tất cả trạng thái</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ngày</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách lịch hẹn ({filteredAppointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bệnh nhân</TableHead>
                <TableHead>Cơ sở</TableHead>
                <TableHead>Ngày & Giờ</TableHead>
                <TableHead>Bác sĩ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Rủi ro No-show</TableHead>
                <TableHead>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{appointment.patient_name}</div>
                        {appointment.phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {appointment.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      {appointment.facility}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {appointment.appointment_date}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {appointment.appointment_time}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>{appointment.doctor || 'Chưa xác định'}</TableCell>
                  
                  <TableCell>
                    <Select 
                      value={appointment.status} 
                      onValueChange={(value) => updateAppointmentStatus(appointment.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses.map(status => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  
                  <TableCell>
                    {appointment.status === 'scheduled' && getRiskBadge(appointment.id)}
                    {predictions[appointment.id] && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Đề xuất overbook: {predictions[appointment.id].overbook_suggestion}%
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => sendReminder(appointment)}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}