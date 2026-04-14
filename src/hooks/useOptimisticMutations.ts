import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UndoToastOptions {
  onUndo: () => void;
  message: string;
}

// Custom toast with undo functionality using sonner
const showUndoToast = ({ onUndo, message }: UndoToastOptions) => {
  toast.success(message, {
    action: {
      label: 'Hoàn tác',
      onClick: onUndo,
    },
    duration: 5000,
  });
};

// Alert acknowledgment mutation
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, status }: { alertId: string; status: string }) => {
      const { error } = await supabase
        .from('temperature_alerts')
        .update({ 
          status,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', alertId);

      if (error) throw error;
      return { alertId, status };
    },
    onMutate: async ({ alertId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['alerts'] });
      
      // Snapshot the previous value
      const previousAlerts = queryClient.getQueryData(['alerts']);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['alerts'], (old: any) => {
        if (!old) return old;
        return old.map((alert: any) => 
          alert.id === alertId 
            ? { 
                ...alert, 
                status,
                acknowledged_at: new Date().toISOString(),
                acknowledged_by: 'current_user'
              }
            : alert
        );
      });

      // Return a context object with the snapshotted value
      return { previousAlerts, alertId, originalStatus: status === 'acknowledged' ? 'active' : 'acknowledged' };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousAlerts) {
        queryClient.setQueryData(['alerts'], context.previousAlerts);
      }
      toast.error("Không thể cập nhật trạng thái cảnh báo");
    },
    onSuccess: (data, variables, context) => {
      const undoMutation = useMutation({
        mutationFn: async () => {
          const { error } = await supabase
            .from('temperature_alerts')
            .update({ 
              status: context?.originalStatus,
              acknowledged_at: null,
              acknowledged_by: null
            })
            .eq('id', data.alertId);

          if (error) throw error;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['alerts'] });
          toast.success("Đã hoàn tác - Trạng thái cảnh báo đã được khôi phục");
        }
      });

      showUndoToast({
        onUndo: () => undoMutation.mutate(),
        message: "Cảnh báo đã được xác nhận"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
};

// Appointment status mutation
export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: string; status: string }) => {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (error) throw error;
      return { appointmentId, status };
    },
    onMutate: async ({ appointmentId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] });
      
      const previousAppointments = queryClient.getQueryData(['appointments']);
      
      queryClient.setQueryData(['appointments'], (old: any) => {
        if (!old) return old;
        return old.map((appointment: any) => 
          appointment.id === appointmentId 
            ? { ...appointment, status }
            : appointment
        );
      });

      return { previousAppointments, appointmentId, originalStatus: null };
    },
    onError: (err, variables, context) => {
      if (context?.previousAppointments) {
        queryClient.setQueryData(['appointments'], context.previousAppointments);
      }
      toast.error("Không thể cập nhật trạng thái lịch hẹn");
    },
    onSuccess: (data, variables, context) => {
      // Get original status from previous data
      const previousAppointments = context?.previousAppointments as any[];
      const originalAppointment = previousAppointments?.find(apt => apt.id === data.appointmentId);
      const originalStatus = originalAppointment?.status;

      const undoMutation = useMutation({
        mutationFn: async () => {
          const { error } = await supabase
            .from('appointments')
            .update({ status: originalStatus })
            .eq('id', data.appointmentId);

          if (error) throw error;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['appointments'] });
          toast.success("Đã hoàn tác - Trạng thái lịch hẹn đã được khôi phục");
        }
      });

      showUndoToast({
        onUndo: () => undoMutation.mutate(),
        message: `Trạng thái lịch hẹn đã chuyển thành "${data.status}"`
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

// Bed update mutation
export const useUpdateBed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bedId, updates }: { bedId: string; updates: any }) => {
      // Since beds table doesn't exist in our schema, we'll simulate with inventory_stock
      const { error } = await supabase
        .from('inventory_stock')
        .update(updates)
        .eq('id', bedId);

      if (error) throw error;
      return { bedId, updates };
    },
    onMutate: async ({ bedId, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['beds'] });
      
      const previousBeds = queryClient.getQueryData(['beds']);
      
      queryClient.setQueryData(['beds'], (old: any) => {
        if (!old) return old;
        return old.map((bed: any) => 
          bed.id === bedId 
            ? { ...bed, ...updates }
            : bed
        );
      });

      return { previousBeds, bedId, updates };
    },
    onError: (err, variables, context) => {
      if (context?.previousBeds) {
        queryClient.setQueryData(['beds'], context.previousBeds);
      }
      toast.error("Không thể cập nhật thông tin giường bệnh");
    },
    onSuccess: (data, variables, context) => {
      // Get original values from previous data
      const previousBeds = context?.previousBeds as any[];
      const originalBed = previousBeds?.find(bed => bed.id === data.bedId);
      const originalUpdates: any = {};
      
      // Create reverse updates
      Object.keys(data.updates).forEach(key => {
        originalUpdates[key] = originalBed?.[key];
      });

      const undoMutation = useMutation({
        mutationFn: async () => {
          const { error } = await supabase
            .from('inventory_stock')
            .update(originalUpdates)
            .eq('id', data.bedId);

          if (error) throw error;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['beds'] });
          toast.success("Đã hoàn tác - Thông tin giường bệnh đã được khôi phục");
        }
      });

      showUndoToast({
        onUndo: () => undoMutation.mutate(),
        message: "Thông tin giường bệnh đã được cập nhật"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['beds'] });
    },
  });
};