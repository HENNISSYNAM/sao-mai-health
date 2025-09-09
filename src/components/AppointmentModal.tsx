import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { CalendarIcon, Clock } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  full_name: string;
}

interface AppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: any;
  onSuccess: () => void;
}

export function AppointmentModal({ 
  open, 
  onOpenChange, 
  appointment = null,
  onSuccess 
}: AppointmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [formData, setFormData] = useState({
    patient_name: '',
    patient_phone: '',
    facility_id: '',
    doctor_id: '',
    date: '',
    start_time: '',
    duration_min: 30,
    notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchFacilities();
      fetchDoctors();
      if (appointment) {
        // Pre-fill form for editing
        setFormData({
          patient_name: appointment.patient_name || '',
          patient_phone: appointment.phone || '',
          facility_id: appointment.facility_id || '',
          doctor_id: appointment.doctor_id || '',
          date: appointment.appointment_date || '',
          start_time: appointment.appointment_time?.slice(0, 5) || '',
          duration_min: appointment.duration_minutes || 30,
          notes: appointment.notes || ''
        });
      } else {
        // Reset form for new appointment
        setFormData({
          patient_name: '',
          patient_phone: '',
          facility_id: '',
          doctor_id: '',
          date: '',
          start_time: '',
          duration_min: 30,
          notes: ''
        });
      }
    }
  }, [open, appointment]);

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from('health_facilities')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error('Error fetching facilities:', error);
      toast.error('Không thể tải danh sách cơ sở');
    }
  };

  const fetchDoctors = async () => {
    try {
      // Check if patients table can serve as doctors for now
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name')
        .limit(50)
        .order('full_name');
      
      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const combineDateTime = (date: string, time: string): string => {
    // Combine date and time and convert to Asia/Ho_Chi_Minh timezone
    const dateTime = new Date(`${date}T${time}:00`);
    return dateTime.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.patient_name || !formData.date || !formData.start_time) {
        toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
        return;
      }

      // Calculate start_at and end_at
      const start_at = combineDateTime(formData.date, formData.start_time);
      const end_at = new Date(new Date(start_at).getTime() + formData.duration_min * 60000).toISOString();

      if (appointment) {
        // Update existing appointment
        const { error } = await supabase
          .from('appointments')
          .update({
            patient_name: formData.patient_name,
            phone: formData.patient_phone,
            facility: facilities.find(f => f.id === formData.facility_id)?.name || '',
            doctor: doctors.find(d => d.id === formData.doctor_id)?.full_name || '',
            appointment_date: formData.date,
            appointment_time: formData.start_time,
            // Add other fields as needed
          })
          .eq('id', appointment.id);

        if (error) throw error;
        toast.success('Đã cập nhật lịch hẹn');
      } else {
        // Create new appointment - optimistic insert first
        const optimisticAppointment = {
          id: crypto.randomUUID(),
          patient_name: formData.patient_name,
          phone: formData.patient_phone,
          facility: facilities.find(f => f.id === formData.facility_id)?.name || '',
          doctor: doctors.find(d => d.id === formData.doctor_id)?.full_name || '',
          appointment_date: formData.date,
          appointment_time: formData.start_time,
          status: 'scheduled',
          gcal_event_id: null, // Will be updated by backend
          start_at,
          end_at,
          no_show_risk: 0,
          overbook_suggestion: 0
        };

        // Insert into database
        const { error } = await supabase
          .from('appointments')
          .insert({
            patient_name: formData.patient_name,
            phone: formData.patient_phone,
            facility: facilities.find(f => f.id === formData.facility_id)?.name || '',
            doctor: doctors.find(d => d.id === formData.doctor_id)?.full_name || '',
            appointment_date: formData.date,
            appointment_time: formData.start_time,
            status: 'scheduled'
          });

        if (error) throw error;
        toast.success('Đã tạo và gửi Google Calendar');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Có lỗi xảy ra khi lưu lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Sửa lịch hẹn' : 'Thêm lịch hẹn'}
          </DialogTitle>
          <DialogDescription>
            {appointment ? 'Cập nhật thông tin lịch hẹn' : 'Tạo lịch hẹn mới cho bệnh nhân'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="patient_name">Tên bệnh nhân *</Label>
            <Input
              id="patient_name"
              value={formData.patient_name}
              onChange={(e) => setFormData(prev => ({ ...prev, patient_name: e.target.value }))}
              placeholder="Nhập tên bệnh nhân"
              required
            />
          </div>

          <div>
            <Label htmlFor="patient_phone">Số điện thoại</Label>
            <Input
              id="patient_phone"
              value={formData.patient_phone}
              onChange={(e) => setFormData(prev => ({ ...prev, patient_phone: e.target.value }))}
              placeholder="Nhập số điện thoại"
              type="tel"
            />
          </div>

          <div>
            <Label htmlFor="facility_id">Cơ sở</Label>
            <Select 
              value={formData.facility_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, facility_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn cơ sở" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map(facility => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="doctor_id">Bác sĩ</Label>
            <Select 
              value={formData.doctor_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, doctor_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn bác sĩ" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(doctor => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Ngày *</Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
                <CalendarIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div>
              <Label htmlFor="start_time">Giờ bắt đầu *</Label>
              <div className="relative">
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  required
                />
                <Clock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="duration_min">Thời gian (phút)</Label>
            <Input
              id="duration_min"
              type="number"
              value={formData.duration_min}
              onChange={(e) => setFormData(prev => ({ ...prev, duration_min: parseInt(e.target.value) || 30 }))}
              min={15}
              max={240}
              step={15}
            />
          </div>

          <div>
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Ghi chú thêm về lịch hẹn"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : (appointment ? 'Cập nhật' : 'Tạo lịch hẹn')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}