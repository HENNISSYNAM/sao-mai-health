import React, { useState } from 'react';
import { z } from 'zod';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

// Zod schema with concise Vietnamese error messages
const patientSchema = z.object({
  name: z.string().min(1, "Tên bắt buộc").max(100, "Tên quá dài"),
  email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),
  phone: z.string().min(10, "SĐT cần ít nhất 10 số").max(15, "SĐT quá dài"),
  age: z.string().refine((val) => {
    const num = parseInt(val);
    return num > 0 && num < 120;
  }, "Tuổi từ 1-120"),
  address: z.string().min(5, "Địa chỉ quá ngắn").max(200, "Địa chỉ quá dài"),
  notes: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional()
});

type PatientForm = z.infer<typeof patientSchema>;

interface FormErrors {
  [key: string]: string;
}

export const ExampleForm: React.FC = () => {
  const [formData, setFormData] = useState<PatientForm>({
    name: '',
    email: '',
    phone: '',
    age: '',
    address: '',
    notes: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field: keyof PatientForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    try {
      patientSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            newErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Vui lòng kiểm tra lại thông tin");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Đã lưu thông tin bệnh nhân thành công");
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        age: '',
        address: '',
        notes: ''
      });
    } catch (error) {
      toast.error("Lỗi khi lưu thông tin");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Thêm bệnh nhân mới</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Họ và tên"
              name="name"
              value={formData.name}
              onChange={(value) => updateField('name', value)}
              error={errors.name}
              required
              placeholder="Nhập họ và tên"
            />
            
            <FormField
              label="Tuổi"
              name="age"
              type="number"
              value={formData.age}
              onChange={(value) => updateField('age', value)}
              error={errors.age}
              required
              placeholder="Nhập tuổi"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={(value) => updateField('email', value)}
              error={errors.email}
              placeholder="email@example.com"
            />
            
            <FormField
              label="Số điện thoại"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={(value) => updateField('phone', value)}
              error={errors.phone}
              required
              placeholder="0123456789"
            />
          </div>

          <FormField
            label="Địa chỉ"
            name="address"
            value={formData.address}
            onChange={(value) => updateField('address', value)}
            error={errors.address}
            required
            placeholder="Nhập địa chỉ đầy đủ"
          />

          <FormField
            label="Ghi chú"
            name="notes"
            type="textarea"
            value={formData.notes || ''}
            onChange={(value) => updateField('notes', value)}
            error={errors.notes}
            placeholder="Ghi chú thêm (không bắt buộc)"
            rows={3}
          />

          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Đang lưu..." : "Lưu thông tin"}
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                setFormData({
                  name: '', email: '', phone: '', age: '', address: '', notes: ''
                });
                setErrors({});
              }}
              disabled={isSubmitting}
            >
              Xóa
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};