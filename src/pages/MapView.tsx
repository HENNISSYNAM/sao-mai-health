import React from 'react';
import { ClientMap } from '@/components/ClientMap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Layers } from 'lucide-react';

export default function MapView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Bản đồ dịch tễ</h1>
        <p className="text-muted-foreground">
          Theo dõi phân bố ca bệnh trong thời gian thực với marker clustering và heatmap
        </p>
      </div>

      {/* Map Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng ca bệnh</p>
                <p className="text-xl font-bold">127</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <div className="h-5 w-5 bg-red-500 rounded-full" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sốt xuất huyết</p>
                <p className="text-xl font-bold text-red-600">45</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <div className="h-5 w-5 bg-orange-500 rounded-full" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">COVID-19</p>
                <p className="text-xl font-bold text-orange-600">32</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Layers className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Heatmap zones</p>
                <p className="text-xl font-bold text-purple-600">8</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Bản đồ phân bố ca bệnh 7 ngày qua
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientMap />
        </CardContent>
      </Card>
    </div>
  );
}