import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GlobalAIAssistant } from "@/components/GlobalAIAssistant";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AuthRedirectHandler } from "@/components/auth/AuthRedirectHandler";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Sensing from "./pages/Sensing";
import CareMonitor from "./pages/CareMonitor";
import HouseScan from "./pages/HouseScan";
import Surveillance from "./pages/Surveillance";
import CaseIntake from "./pages/CaseIntake";
import AlertsNew from "./pages/AlertsNew";
import NotFound from "./pages/NotFound";
import { EnhancedCommandPalette } from "./components/EnhancedCommandPalette";
import StrokeRisk from "./pages/StrokeRisk";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Pricing from "./pages/Pricing";
import Careers from "./pages/Careers";
import Legal from "./pages/Legal";
import ClinicalNlpBatch from "./pages/ClinicalNlpBatch";
import ConsentBanner from "./components/ConsentBanner";

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
       <main className="flex-1 p-3 sm:p-5 bg-background">
         <Routes>
           <Route index element={<Dashboard />} />
           <Route path="/dashboard" element={<Dashboard />} />

           {/* Core: contactless WiFi-CSI sensing */}
           <Route path="/sensing" element={<Sensing />} />
           <Route path="/care" element={<CareMonitor />} />
           <Route path="/scan" element={<HouseScan />} />
           <Route path="/alerts" element={<AlertsNew />} />

           {/* Population-level signals built on the sensing mesh */}
           <Route path="/surveillance" element={<Surveillance />} />
           <Route path="/maps" element={<Surveillance />} />
           <Route path="/map" element={<Surveillance />} />
           <Route path="/case-intake" element={<CaseIntake />} />

           {/* Clinical concept extraction (ICD-10 / RxNorm) */}
           <Route path="/clinical-nlp" element={<ClinicalNlpBatch />} />

           <Route path="/settings" element={<Settings />} />
           <Route path="/about" element={<About />} />
           <Route path="/help" element={<About />} />
           <Route path="/pricing" element={<Pricing />} />
           <Route path="/careers" element={<Careers />} />
           <Route path="/legal" element={<Legal />} />

           {/* Retired feature surfaces → nearest live equivalent */}
           <Route path="/lab-import" element={<Navigate to="/clinical-nlp" replace />} />
           <Route path="/patients" element={<Navigate to="/care" replace />} />
           <Route path="/appointments" element={<Navigate to="/care" replace />} />
           <Route path="/campaigns" element={<Navigate to="/surveillance" replace />} />
           <Route path="/facilities" element={<Navigate to="/surveillance" replace />} />
           <Route path="/stocks" element={<Navigate to="/dashboard" replace />} />
           <Route path="/inventory" element={<Navigate to="/dashboard" replace />} />
           <Route path="/research" element={<Navigate to="/dashboard" replace />} />
           <Route path="/chain/*" element={<Navigate to="/dashboard" replace />} />
           <Route path="/chain" element={<Navigate to="/dashboard" replace />} />
           <Route path="/biovault" element={<Navigate to="/sensing" replace />} />

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
              <Route path="/auth" element={<Auth />} />
              <Route path="/stroke-risk/*" element={<StrokeRisk />} />
              <Route path="/*" element={<MainLayout />} />
            </Routes>
            <ConsentBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
