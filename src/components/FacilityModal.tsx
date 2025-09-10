import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const FacilityModal = ({ isOpen, onClose, onSuccess }: FacilityModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "",
    address: "",
    ward_id: "",
    district_id: ""
  });

  const facilityTypes = [
    { value: "hospital", label: "Bệnh viện" },
    { value: "clinic", label: "Phòng khám" },
    { value: "health_center", label: "Trung tâm Y tế" },
    { value: "health_station", label: "Trạm Y tế" },
    { value: "pharmacy", label: "Nhà thuốc" },
    { value: "laboratory", label: "Phòng xét nghiệm" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("health_facilities")
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Thành công",
        description: "Đã thêm cơ sở y tế mới",
      });

      setFormData({
        name: "",
        code: "",
        type: "",
        address: "",
        ward_id: "",
        district_id: ""
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error creating facility:", error);
      toast({
        title: "Lỗi",
        description: "Không thể thêm cơ sở y tế",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Thêm cơ sở y tế mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên cơ sở *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Nhập tên cơ sở y tế"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Mã cơ sở</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value)}
                placeholder="Nhập mã cơ sở"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Loại cơ sở *</Label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại cơ sở y tế" />
              </SelectTrigger>
              <SelectContent>
                {facilityTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Nhập địa chỉ đầy đủ"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ward_id">Mã phường/xã</Label>
              <Input
                id="ward_id"
                value={formData.ward_id}
                onChange={(e) => handleInputChange("ward_id", e.target.value)}
                placeholder="Mã phường/xã"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="district_id">Mã quận/huyện</Label>
              <Input
                id="district_id"
                value={formData.district_id}
                onChange={(e) => handleInputChange("district_id", e.target.value)}
                placeholder="Mã quận/huyện"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Đang thêm..." : "Thêm cơ sở"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FacilityModal;