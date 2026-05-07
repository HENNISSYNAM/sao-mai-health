import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useUpdateAppointmentStatus } from '@/hooks/useOptimisticMutations';
import { Calendar, Clock, Phone, User, Building, Plus, Send, Edit, RotateCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { AppointmentModal } from '@/components/AppointmentModal';
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
  gcal_event_id?: string | null;
  start_at?: string;
  end_at?: string;
  duration_minutes?: number;
  notes?: string;
  facility_id?: string;
  doctor_id?: string;
}

interface NoShowPrediction {
  probability: number;
  risk_level: 'High' | 'Medium' | 'Low';
  factors: string[];
  overbook_suggestion: number;
}

export default function Appointments() {
  const updateStatusMutation = useUpdateAppointmentStatus();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [facilityFilter, setFacilityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [predictions, setPredictions] = useState<Record<string, NoShowPrediction>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const facilities = [...new Set(appointments.map(apt => apt.facility))];
  const statuses = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'];

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      await fetchAppointments();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel('appointments-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `created_by=eq.${user.id}`,
          },
          (payload) => handleRealtimeUpdate(payload),
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const handleRealtimeUpdate = (payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setAppointments(currentAppointments => {
      switch (eventType) {
        case 'INSERT':
          return [...currentAppointments, newRecord];
        case 'UPDATE':
          return currentAppointments.map(apt => 
            apt.id === newRecord.id ? { ...apt, ...newRecord } : apt
          );
        case 'DELETE':
          return currentAppointments.filter(apt => apt.id !== oldRecord.id);
        default:
          return currentAppointments;
      }
    });
  };

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
      toast.error("Không thể tải danh sách lịch hẹn");
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

  const updateAppointmentStatus = (id: string, status: string) => {
    updateStatusMutation.mutate({ 
      appointmentId: id, 
      status 
    });
  };

  const sendReminder = (appointment: Appointment) => {
    toast.success(`Đã gửi tin nhắn nhắc nhở đến ${appointment.patient_name}`);
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
    if (facilityFilter !== 'all' && !apt.facility.includes(facilityFilter)) return false;
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    
    // Date filtering with timezone support
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const startOfDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      let appointmentDate: Date;
      if (apt.start_at) {
        appointmentDate = new Date(apt.start_at);
      } else {
        appointmentDate = new Date(`${apt.appointment_date}T${apt.appointment_time || '00:00'}`);
      }
      
      return appointmentDate >= startOfDay && appointmentDate < endOfDay;
    }
    
    return true;
  });

  const formatDateTime = (appointment: Appointment) => {
    try {
      if (appointment.start_at && appointment.end_at) {
        const start = new Date(appointment.start_at);
        const end = new Date(appointment.end_at);
        const dateStr = start.toLocaleDateString('vi-VN');
        const startTime = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const endTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} ${startTime}–${endTime}`;
      }
      return `${appointment.appointment_date} ${appointment.appointment_time}`;
    } catch {
      return `${appointment.appointment_date} ${appointment.appointment_time}`;
    }
  };

  const getGCalBadge = (appointment: Appointment) => {
    if (appointment.gcal_event_id === null) {
      return (
        <Badge variant="secondary" className="text-xs flex items-center gap-1">
          <RotateCw className="h-3 w-3 animate-spin" />
          Đang đồng bộ...
        </Badge>
      );
    } else if (appointment.gcal_event_id) {
      return (
        <Badge variant="default" className="text-xs flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Đã lên GCal
        </Badge>
      );
    }
    return null;
  };

  const handleAddAppointment = () => {
    setEditingAppointment(null);
    setShowModal(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowModal(true);
  };

  const handleModalSuccess = () => {
    fetchAppointments();
  };

  const confirmAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Đã xác nhận lịch hẹn');
    } catch (error) {
      console.error('Error confirming appointment:', error);
      toast.error('Có lỗi xảy ra khi xác nhận');
    }
  };

  const cancelAppointment = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) {
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', id);
        
        if (error) throw error;
        toast.success('Đã hủy lịch hẹn');
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        toast.error('Có lỗi xảy ra khi hủy');
      }
    }
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
        <h1 className="text-3xl font-bold">Quản lý Lịch hẹn</h1>
        <Button className="flex items-center gap-2" onClick={handleAddAppointment}>
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
                  <SelectItem value="all">Tất cả cơ sở</SelectItem>
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
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDateTime(appointment)}</span>
                      </div>
                      {getGCalBadge(appointment)}
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
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditAppointment(appointment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {appointment.status === 'scheduled' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => confirmAppointment(appointment.id)}
                        >
                          Xác nhận
                        </Button>
                      )}
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

      <AppointmentModal
        open={showModal}
        onOpenChange={setShowModal}
        appointment={editingAppointment}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}