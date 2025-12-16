import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalAIAssistant } from "@/components/GlobalAIAssistant";
import Dashboard from "./pages/Dashboard";
import Surveillance from "./pages/Surveillance";
import CaseIntake from "./pages/CaseIntake";
import LabImport from "./pages/LabImport";
import AlertsNew from "./pages/AlertsNew";
import NotFound from "./pages/NotFound";
import { EnhancedCommandPalette } from "./components/EnhancedCommandPalette";
import MapView from "./pages/MapView";
import PatientsNew from "./pages/PatientsNew";
import Campaigns from "./pages/Campaigns";
import Appointments from "./pages/Appointments";
import Inventory from "./pages/Inventory";
import Facilities from "./pages/Facilities";
import StrokeRisk from "./pages/StrokeRisk";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={
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
                        <Route path="/alerts" element={<AlertsNew />} />
                        <Route path="/maps" element={<MapView />} />
                        <Route path="/map" element={<MapView />} />
                        <Route path="/patients" element={<PatientsNew />} />
                        <Route path="/appointments" element={<Appointments />} />
                        <Route path="/campaigns" element={<Campaigns />} />
                        <Route path="/facilities" element={<Facilities />} />
                        <Route path="/stocks" element={<Inventory />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/stroke-risk" element={<StrokeRisk />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      <EnhancedCommandPalette />
                      <GlobalAIAssistant />
                    </main>
                  </div>
                </div>
              </SidebarProvider>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;