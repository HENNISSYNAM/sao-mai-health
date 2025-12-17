import React from 'react';
import StrokeRiskChecker from '@/components/StrokeRiskChecker';
import { Brain, Activity, Shield, Bell } from 'lucide-react';

const StrokeRisk: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-info/5 to-primary/10 border-b border-border/50">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 py-12 relative">
          <div className="max-w-3xl animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">AI Prediction</span>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  Dự Báo Nguy Cơ Đột Quỵ
                </h1>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Hệ thống AI phân tích dữ liệu ô nhiễm không khí và thời tiết real-time 
              để dự báo nguy cơ đột quỵ theo khu vực tại TP. Hồ Chí Minh
            </p>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 mt-8 animate-fade-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm">
              <Activity className="h-4 w-4 text-info" />
              <span className="text-sm font-medium">WAQI Pollution Data</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm">
              <Shield className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">Open-Meteo Weather</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm">
              <Bell className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">SMS Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <StrokeRiskChecker />
      </div>
    </div>
  );
};

export default StrokeRisk;