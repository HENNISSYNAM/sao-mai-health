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
import Dashboard from "./pages/Dashboard";
import Surveillance from "./pages/Surveillance";
import CaseIntake from "./pages/CaseIntake";
import LabImport from "./pages/LabImport";
import Alerts from "./pages/Alerts";
import AlertsNew from "./pages/AlertsNew";
import NotFound from "./pages/NotFound";
import { EnhancedCommandPalette } from "./components/EnhancedCommandPalette";
import HealthStandards from "./pages/HealthStandards";
import MapView from "./pages/MapView";
import Patients from "./pages/Patients";
import PatientsNew from "./pages/PatientsNew";
import Encounters from "./pages/Encounters";
import Campaigns from "./pages/Campaigns";
import Appointments from "./pages/Appointments";
import Beds from "./pages/Beds";
import Inventory from "./pages/Inventory";
import DataIngestion from "./pages/DataIngestion";
import DataQuality from "./pages/DataQuality";
import Facilities from "./pages/Facilities";
import Security from "./pages/Security";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import { AuthProvider } from "./components/AuthProvider";
import { ProtectedRoute } from "./components/ProtectedRoute";
import FormDemo from "./pages/FormDemo";

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
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            
            {/* Protected routes */}
            <Route path="/*" element={
              <ProtectedRoute>
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
                          <Route path="/alerts-old" element={<Alerts />} />
                          <Route path="/health-standards" element={<HealthStandards />} />
                          <Route path="/maps" element={<MapView />} />
                          <Route path="/map" element={<MapView />} />
                          <Route path="/patients" element={<PatientsNew />} />
                          <Route path="/patients-old" element={<Patients />} />
                          <Route path="/encounters" element={<Encounters />} />
                          <Route path="/appointments" element={<Appointments />} />
                          <Route path="/campaigns" element={<Campaigns />} />
                          <Route path="/beds" element={<Beds />} />
                          <Route path="/facilities" element={<Facilities />} />
                          <Route path="/stocks" element={<Inventory />} />
                          <Route path="/inventory" element={<Inventory />} />
                          <Route path="/data" element={<DataIngestion />} />
                          <Route path="/data-quality" element={<DataQuality />} />
                          <Route path="/security" element={<Security />} />
                          <Route path="/form-demo" element={<FormDemo />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                        <EnhancedCommandPalette />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;