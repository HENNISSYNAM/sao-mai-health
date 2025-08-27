import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, Key, Users, Activity, AlertTriangle, CheckCircle } from "lucide-react";

const Security = () => {
  const securityMetrics = [
    {
      title: "Trạng thái bảo mật",
      value: "Tốt",
      icon: Shield,
      status: "good"
    },
    {
      title: "Phiên đăng nhập",
      value: "24 hoạt động",
      icon: Users,
      status: "active"
    },
    {
      title: "Cảnh báo bảo mật",
      value: "2 cảnh báo",
      icon: AlertTriangle,
      status: "warning"
    },
    {
      title: "Kiểm tra gần nhất",
      value: "2 giờ trước",
      icon: CheckCircle,
      status: "good"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      action: "Đăng nhập thành công",
      user: "admin@byt.gov.vn",
      timestamp: "2 phút trước",
      type: "success"
    },
    {
      id: 2,
      action: "Thay đổi quyền truy cập",
      user: "manager@cdc.gov.vn",
      timestamp: "15 phút trước",
      type: "info"
    },
    {
      id: 3,
      action: "Đăng nhập thất bại",
      user: "unknown@email.com",
      timestamp: "1 giờ trước",
      type: "warning"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'success': return <Badge variant="default">Thành công</Badge>;
      case 'warning': return <Badge variant="secondary">Cảnh báo</Badge>;
      case 'error': return <Badge variant="destructive">Lỗi</Badge>;
      default: return <Badge variant="outline">Thông tin</Badge>;
    }
  };

  return (
    <div className="p-6 min-h-screen">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bảo mật hệ thống</h1>
          <p className="text-muted-foreground">
            Giám sát và quản lý bảo mật cho hệ thống y tế
          </p>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {securityMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {metric.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${getStatusColor(metric.status)}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${getStatusColor(metric.status)}`}>
                  {metric.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Hoạt động gần đây
            </CardTitle>
            <CardDescription>
              Nhật ký hoạt động bảo mật trong 24 giờ qua
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user} • {activity.timestamp}
                    </p>
                  </div>
                  {getActivityBadge(activity.type)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Cài đặt bảo mật
            </CardTitle>
            <CardDescription>
              Quản lý các chính sách bảo mật hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              Quản lý người dùng
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Cấu hình xác thực
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Chính sách mật khẩu
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Nhật ký kiểm tra
            </Button>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default Security;