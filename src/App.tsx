import React, { lazy, Suspense } from "react";
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
import { EnhancedCommandPalette } from "@/components/EnhancedCommandPalette";
import ConsentBanner from "@/components/ConsentBanner";

// Eager — always needed on first load
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";

// Lazy — code-split heavy pages
const Surveillance  = lazy(() => import("@/pages/Surveillance"));
const CaseIntake    = lazy(() => import("@/pages/CaseIntake"));
const AlertsNew     = lazy(() => import("@/pages/AlertsNew"));
const PatientsNew   = lazy(() => import("@/pages/PatientsNew"));
const Campaigns     = lazy(() => import("@/pages/Campaigns"));
const Appointments  = lazy(() => import("@/pages/Appointments"));
const Inventory     = lazy(() => import("@/pages/Inventory"));
const Facilities    = lazy(() => import("@/pages/Facilities"));
const LabImport     = lazy(() => import("@/pages/LabImport"));
const Research      = lazy(() => import("@/pages/Research"));
const StrokeRisk    = lazy(() => import("@/pages/StrokeRisk"));
const Settings      = lazy(() => import("@/pages/Settings"));
const Pricing       = lazy(() => import("@/pages/Pricing"));
const Legal         = lazy(() => import("@/pages/Legal"));
const Landing       = lazy(() => import("@/pages/Landing"));
const NotFound      = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  }>
    {children}
  </Suspense>
);

const MainLayout = () => (
  <SidebarProvider>
    <div className="hidden md:block">
      <AppSidebar />
    </div>
    <SidebarInset className="pb-20 md:pb-0">
      <TopNavbar />
      <main className="flex-1 p-3 sm:p-5 bg-background min-h-screen">
        <PageShell>
          <Routes>
            {/* Core B2G workflow */}
            <Route index element={<Dashboard />} />
            <Route path="/dashboard"   element={<Dashboard />} />
            <Route path="/surveillance" element={<Surveillance />} />
            <Route path="/case-intake" element={<CaseIntake />} />
            <Route path="/alerts"      element={<AlertsNew />} />

            {/* Operations */}
            <Route path="/campaigns"   element={<Campaigns />} />
            <Route path="/facilities"  element={<Facilities />} />
            <Route path="/stocks"      element={<Inventory />} />
            <Route path="/patients"    element={<PatientsNew />} />

            {/* Tools */}
            <Route path="/research"    element={<Research />} />
            <Route path="/lab-import"  element={<LabImport />} />
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/settings"    element={<Settings />} />
            <Route path="/pricing"     element={<Pricing />} />
            <Route path="/legal"       element={<Legal />} />

            {/* Redirects — clean up old/duplicate routes */}
            <Route path="/maps"      element={<Navigate to="/surveillance" replace />} />
            <Route path="/map"       element={<Navigate to="/surveillance" replace />} />
            <Route path="/inventory" element={<Navigate to="/stocks" replace />} />
            <Route path="/about"     element={<Navigate to="/" replace />} />
            <Route path="/help"      element={<Navigate to="/" replace />} />
            <Route path="/careers"   element={<Navigate to="/" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageShell>
        <EnhancedCommandPalette />
        <GlobalAIAssistant />
      </main>
    </SidebarInset>
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
              <Route path="/auth"          element={<Auth />} />
              <Route path="/landing"       element={<PageShell><Landing /></PageShell>} />
              <Route path="/stroke-risk/*" element={<PageShell><StrokeRisk /></PageShell>} />
              <Route path="/*"            element={<MainLayout />} />
            </Routes>
            <ConsentBanner />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
