import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { Layout } from "./components/Layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
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
                      <div className="header-ly bg-ly-animate">
                        <TopNavbar />
                      </div>
                      <div className="flex-1">
                        <Routes>
                          <Route path="/" element={<Layout area="dashboard"><Dashboard /></Layout>} />
                          <Route path="/surveillance" element={<Layout area="surveillance"><Surveillance /></Layout>} />
                          <Route path="/case-intake" element={<Layout area="surveillance"><CaseIntake /></Layout>} />
                          <Route path="/lab-import" element={<Layout area="data-quality"><LabImport /></Layout>} />
                          <Route path="/alerts" element={<Layout area="alerts"><Alerts /></Layout>} />
                          <Route path="/map" element={<Layout area="map"><MapView /></Layout>} />
                          <Route path="/patients" element={<Layout area="patients"><Patients /></Layout>} />
                          <Route path="/encounters" element={<Layout area="encounters"><Encounters /></Layout>} />
                          <Route path="/appointments" element={<Layout area="appointments"><Appointments /></Layout>} />
                          <Route path="/campaigns" element={<Layout area="campaigns"><Campaigns /></Layout>} />
                          <Route path="/beds" element={<Layout area="facilities"><Beds /></Layout>} />
                          <Route path="/facilities" element={<Layout area="facilities"><Facilities /></Layout>} />
                          <Route path="/stocks" element={<Layout area="inventory"><Inventory /></Layout>} />
                          <Route path="/inventory" element={<Layout area="inventory"><Inventory /></Layout>} />
                          <Route path="/data" element={<Layout area="data-quality"><DataIngestion /></Layout>} />
                          <Route path="/data-quality" element={<Layout area="data-quality"><DataQuality /></Layout>} />
                          <Route path="/security" element={<Layout area="security"><Security /></Layout>} />
                          <Route path="*" element={<Layout area="app"><NotFound /></Layout>} />
                        </Routes>
                        <EnhancedCommandPalette />
                      </div>
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
);

export default App;