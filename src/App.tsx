 import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
 import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalAIAssistant } from "@/components/GlobalAIAssistant";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthRedirectHandler } from "@/components/auth/AuthRedirectHandler";
 import Auth from "./pages/Auth";
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
import BioVault from "./pages/BioVault";
import Settings from "./pages/Settings";
import About from "./pages/About";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

 // Main layout component with sidebar
 const MainLayout = () => (
   <SidebarProvider>
     {/* Desktop Sidebar - hidden on mobile */}
     <div className="hidden md:block">
       <AppSidebar />
     </div>
     <SidebarInset className="pb-20 md:pb-0">
       <TopNavbar />
       <main className="flex-1 p-4 md:p-6 bg-background">
         <Routes>
           <Route index element={<Dashboard />} />
           <Route path="/dashboard" element={<Dashboard />} />
           <Route path="/surveillance" element={<Surveillance />} />
           <Route path="/case-intake" element={<CaseIntake />} />
           <Route path="/lab-import" element={<LabImport />} />
           
           {/* Protected Routes - Require Authentication */}
           <Route path="/alerts" element={
             <ProtectedRoute>
               <AlertsNew />
             </ProtectedRoute>
           } />
           <Route path="/bio-vault" element={
             <ProtectedRoute>
               <BioVault />
             </ProtectedRoute>
           } />
           <Route path="/maps" element={
             <ProtectedRoute>
               <MapView />
             </ProtectedRoute>
           } />
           
           {/* Other routes */}
           <Route path="/map" element={<MapView />} />
           <Route path="/patients" element={<PatientsNew />} />
           <Route path="/appointments" element={<Appointments />} />
           <Route path="/campaigns" element={<Campaigns />} />
           <Route path="/facilities" element={<Facilities />} />
           <Route path="/stocks" element={<Inventory />} />
           <Route path="/inventory" element={<Inventory />} />
           <Route path="/settings" element={<Settings />} />
           <Route path="/about" element={<About />} />
           <Route path="/help" element={<About />} />
           <Route path="*" element={<NotFound />} />
         </Routes>
         <EnhancedCommandPalette />
         <GlobalAIAssistant />
       </main>
     </SidebarInset>
     {/* Mobile Bottom Nav - hidden on desktop */}
     <MobileBottomNav />
   </SidebarProvider>
 );

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AuthRedirectHandler />
            <Routes>
               {/* Auth page - full screen without sidebar */}
               <Route path="/auth" element={<Auth />} />
              {/* Stroke Risk - Full screen without sidebar, requires auth */}
              <Route path="/stroke-risk/*" element={
                <ProtectedRoute>
                  <StrokeRisk />
                </ProtectedRoute>
              } />
              {/* All other routes with sidebar layout and auth modal */}
               <Route path="/*" element={<MainLayout />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
