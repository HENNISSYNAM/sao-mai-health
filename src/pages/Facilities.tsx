import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Phone, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FacilityModal from "@/components/FacilityModal";

const Facilities = () => {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("health_facilities")
        .select("*")
        .order("name");

      if (error) throw error;
      setFacilities(data || []);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách cơ sở y tế",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: { [key: string]: string } = {
      hospital: "Bệnh viện",
      clinic: "Phòng khám",
      health_center: "Trung tâm Y tế",
      health_station: "Trạm Y tế",
      pharmacy: "Nhà thuốc",
      laboratory: "Phòng xét nghiệm"
    };
    return typeLabels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default",
      maintenance: "secondary",
      inactive: "destructive"
    } as const;
    
    const labels = {
      active: "Hoạt động",
      maintenance: "Bảo trì",
      inactive: "Ngừng hoạt động"
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cơ sở y tế</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin các cơ sở y tế trong hệ thống
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Thêm cơ sở
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Chưa có cơ sở y tế</h3>
          <p className="mt-1 text-sm text-gray-500">Bắt đầu bằng cách thêm cơ sở y tế đầu tiên.</p>
          <div className="mt-6">
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm cơ sở y tế
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <Card key={facility.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {getTypeLabel(facility.type)}
                      {facility.code && ` - ${facility.code}`}
                    </CardDescription>
                  </div>
                  <Badge variant="default">Hoạt động</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {facility.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {facility.address}
                  </div>
                )}
                {facility.ward_id && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Phường/Xã: {facility.ward_id}
                  </div>
                )}
                {facility.district_id && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Quận/Huyện: {facility.district_id}
                  </div>
                )}
                <div className="pt-2">
                  <Button variant="outline" size="sm" className="w-full">
                    Xem chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FacilityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchFacilities}
      />
    </div>
  );
};

export default Facilities;