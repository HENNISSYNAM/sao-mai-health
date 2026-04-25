 import React, { Suspense } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
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
import CaseIntake from "./pages/CaseIntake";
import LabImport from "./pages/LabImport";
import AlertsNew from "./pages/AlertsNew";
import NotFound from "./pages/NotFound";
import { EnhancedCommandPalette } from "./components/EnhancedCommandPalette";
import Settings from "./pages/Settings";
import About from "./pages/About";
import ConsentBanner from "./components/ConsentBanner";

// Heavy pages — loaded on demand to keep initial bundle small
const Surveillance = React.lazy(() => import("./pages/Surveillance"));
const MapView = React.lazy(() => import("./pages/MapView"));
const StrokeRisk = React.lazy(() => import("./pages/StrokeRisk"));
const BioVault = React.lazy(() => import("./pages/BioVault"));
const PatientsNew = React.lazy(() => import("./pages/PatientsNew"));
const Campaigns = React.lazy(() => import("./pages/Campaigns"));
const Appointments = React.lazy(() => import("./pages/Appointments"));
const Inventory = React.lazy(() => import("./pages/Inventory"));
const Facilities = React.lazy(() => import("./pages/Facilities"));
const Pricing = React.lazy(() => import("./pages/Pricing"));
const Careers = React.lazy(() => import("./pages/Careers"));
const Legal = React.lazy(() => import("./pages/Legal"));
const Landing = React.lazy(() => import("./pages/Landing"));
const Research = React.lazy(() => import("./pages/Research"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

const LazyFallback = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-pulse text-muted-foreground">Đang tải...</div>
  </div>
);

// Hiện banner khi có phiên bản mới — người dùng chọn reload hoặc bỏ qua
const PWAUpdateBanner = () => {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-3 bg-primary text-primary-foreground px-4 py-3 rounded-xl shadow-2xl text-sm font-medium">
      <span>🔄 Có phiên bản mới</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
      >
        Cập nhật ngay
      </button>
    </div>
  );
};

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
           <Route path="/surveillance" element={<Suspense fallback={<LazyFallback />}><Surveillance /></Suspense>} />
           <Route path="/case-intake" element={<CaseIntake />} />
           <Route path="/lab-import" element={<LabImport />} />

           {/* Protected Routes - Require Authentication */}
           <Route path="/alerts" element={<AlertsNew />} />
           <Route path="/bio-vault" element={<Suspense fallback={<LazyFallback />}><BioVault /></Suspense>} />
            <Route path="/maps" element={<Suspense fallback={<LazyFallback />}><Surveillance /></Suspense>} />

            {/* Other routes */}
            <Route path="/map" element={<Suspense fallback={<LazyFallback />}><MapView /></Suspense>} />
           <Route path="/patients" element={<Suspense fallback={<LazyFallback />}><PatientsNew /></Suspense>} />
           <Route path="/appointments" element={<Suspense fallback={<LazyFallback />}><Appointments /></Suspense>} />
           <Route path="/campaigns" element={<Suspense fallback={<LazyFallback />}><Campaigns /></Suspense>} />
           <Route path="/facilities" element={<Suspense fallback={<LazyFallback />}><Facilities /></Suspense>} />
           <Route path="/stocks" element={<Suspense fallback={<LazyFallback />}><Inventory /></Suspense>} />
           <Route path="/inventory" element={<Suspense fallback={<LazyFallback />}><Inventory /></Suspense>} />
           <Route path="/settings" element={<Settings />} />
           <Route path="/about" element={<About />} />
            <Route path="/help" element={<About />} />
            <Route path="/pricing" element={<Suspense fallback={<LazyFallback />}><Pricing /></Suspense>} />
            <Route path="/careers" element={<Suspense fallback={<LazyFallback />}><Careers /></Suspense>} />
            <Route path="/legal" element={<Suspense fallback={<LazyFallback />}><Legal /></Suspense>} />
            <Route path="/research" element={<Suspense fallback={<LazyFallback />}><Research /></Suspense>} />
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
              {/* Stroke Risk - Full screen without sidebar */}
              <Route path="/stroke-risk/*" element={<Suspense fallback={<LazyFallback />}><StrokeRisk /></Suspense>} />
              {/* All other routes with sidebar layout */}
              <Route path="/*" element={<MainLayout />} />
            </Routes>
            <ConsentBanner />
            <PWAUpdateBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
