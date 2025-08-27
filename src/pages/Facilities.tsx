import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Phone, Users, Plus } from "lucide-react";

const Facilities = () => {
  const facilities = [
    {
      id: 1,
      name: "Bệnh viện Đa khoa Trung ương",
      type: "Bệnh viện",
      address: "123 Đường Giải Phóng, Hai Bà Trưng, Hà Nội",
      phone: "024-3869-3731",
      beds: 500,
      status: "active",
      level: "Tuyến Trung ương"
    },
    {
      id: 2,
      name: "Trung tâm Y tế Quận Đống Đa",
      type: "Trung tâm Y tế",
      address: "456 Đường Láng, Đống Đa, Hà Nội",
      phone: "024-3514-4321",
      beds: 50,
      status: "active",
      level: "Tuyến Quận"
    },
    {
      id: 3,
      name: "Trạm Y tế Phường Kim Liên",
      type: "Trạm Y tế",
      address: "789 Đường Nguyễn Lương Bằng, Đống Đa, Hà Nội",
      phone: "024-3514-5678",
      beds: 10,
      status: "maintenance",
      level: "Tuyến Phường"
    }
  ];

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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Thêm cơ sở
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {facilities.map((facility) => (
          <Card key={facility.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{facility.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {facility.type} - {facility.level}
                  </CardDescription>
                </div>
                {getStatusBadge(facility.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {facility.address}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                {facility.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {facility.beds} giường bệnh
              </div>
              <div className="pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  Xem chi tiết
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Facilities;