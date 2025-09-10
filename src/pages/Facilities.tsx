import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Phone, Users, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FacilityModal from "@/components/FacilityModal";

const Facilities = () => {
  const [dbFacilities, setDbFacilities] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Dữ liệu demo phong phú
  const demoFacilities = [
    {
      id: "demo-1",
      name: "Bệnh viện Đa khoa Trung ương",
      type: "hospital",
      address: "123 Đường Giải Phóng, Hai Bà Trưng, Hà Nội",
      code: "BV001",
      ward_id: "Ward_01",
      district_id: "District_01",
      status: "active",
      beds: 500,
      level: "Tuyến Trung ương"
    },
    {
      id: "demo-2", 
      name: "Trung tâm Y tế Quận Đống Đa",
      type: "health_center",
      address: "456 Đường Láng, Đống Đa, Hà Nội",
      code: "TT002",
      ward_id: "Ward_02",
      district_id: "District_02", 
      status: "active",
      beds: 50,
      level: "Tuyến Quận"
    },
    {
      id: "demo-3",
      name: "Trạm Y tế Phường Kim Liên", 
      type: "health_station",
      address: "789 Đường Nguyễn Lương Bằng, Đống Đa, Hà Nội",
      code: "TY003",
      ward_id: "Ward_03",
      district_id: "District_02",
      status: "maintenance", 
      beds: 10,
      level: "Tuyến Phường"
    },
    // Thêm dữ liệu từ nguồn thực tế TPHCM
    {
      id: "demo-4",
      name: "Bệnh viện Chợ Rẫy",
      type: "hospital", 
      address: "201B Nguyễn Chí Thanh, Phường 12, Quận 5, TPHCM",
      code: "CR001",
      ward_id: "Ward_12_Q5",
      district_id: "District_05",
      status: "active",
      beds: 1500,
      level: "Tuyến Trung ương"
    },
    {
      id: "demo-5",
      name: "Bệnh viện Đại học Y Dược",
      type: "hospital",
      address: "215 Hồng Bàng, Phường 11, Quận 5, TPHCM", 
      code: "UMC001",
      ward_id: "Ward_11_Q5",
      district_id: "District_05",
      status: "active",
      beds: 1200,
      level: "Tuyến Trung ương"
    },
    {
      id: "demo-6",
      name: "Trung tâm Y tế Quận 1",
      type: "health_center",
      address: "125 Lê Thị Riêng, Phường Bến Thành, Quận 1, TPHCM",
      code: "Q1001", 
      ward_id: "Ward_BenThanh",
      district_id: "District_01",
      status: "active",
      beds: 80,
      level: "Tuyến Quận"
    }
  ];

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
      setDbFacilities(data || []);
    } catch (error) {
      console.error("Error fetching facilities:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải danh sách cơ sở y tế từ database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Kết hợp dữ liệu demo và database
  const allFacilities = [...demoFacilities, ...dbFacilities];

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
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {labels[status as keyof typeof labels] || "Hoạt động"}
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
      ) : allFacilities.length === 0 ? (
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
          {allFacilities.map((facility) => (
            <Card key={facility.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{facility.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {getTypeLabel(facility.type)}
                      {facility.code && ` - ${facility.code}`}
                      {facility.level && ` (${facility.level})`}
                    </CardDescription>
                  </div>
                  {getStatusBadge(facility.status || "active")}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {facility.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {facility.address}
                  </div>
                )}
                {facility.beds && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {facility.beds} giường bệnh
                  </div>
                )}
                {(facility.ward_id || facility.district_id) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    {facility.ward_id && `Phường: ${facility.ward_id}`}
                    {facility.ward_id && facility.district_id && " - "}
                    {facility.district_id && `Quận: ${facility.district_id}`}
                  </div>
                )}
                <div className="pt-2 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Xem chi tiết
                  </Button>
                  {facility.id.toString().startsWith('demo') && (
                    <Badge variant="secondary" className="text-xs">Demo</Badge>
                  )}
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