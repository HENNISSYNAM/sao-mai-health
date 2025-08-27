import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import Dashboard from "./pages/Dashboard";
import Surveillance from "./pages/Surveillance";
import CaseIntake from "./pages/CaseIntake";
import LabImport from "./pages/LabImport";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/NotFound";
import { EnhancedCommandPalette } from "./components/EnhancedCommandPalette";
import MapView from "./pages/MapView";
import Patients from "./pages/Patients";
import Encounters from "./pages/Encounters";
import Campaigns from "./pages/Campaigns";
import Appointments from "./pages/Appointments";



const App = () => (
  <>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <TopNavbar />
              <main className="flex-1 p-6 bg-background">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/surveillance" element={<Surveillance />} />
                  <Route path="/case-intake" element={<CaseIntake />} />
                  <Route path="/lab-import" element={<LabImport />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/map" element={<MapView />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/encounters" element={<Encounters />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/facilities" element={<div>Cơ sở y tế</div>} />
                  <Route path="/stocks" element={<div>Kho tồn</div>} />
                  <Route path="/beds" element={<div>Giường bệnh</div>} />
                  <Route path="/data-quality" element={<div>Chất lượng dữ liệu</div>} />
                  <Route path="/security" element={<div>Bảo mật</div>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <EnhancedCommandPalette />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </>
);

export default App;
