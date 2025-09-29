import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Inbox from "./pages/Inbox";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import Metrics from "./pages/Metrics";
import Settings from "./pages/Settings";
import AdminLogin from "./pages/AdminLogin";
import NotFound from "./pages/NotFound";
import ConceptDemo from "./pages/ConceptDemo";
import AddSellerLead from "./pages/AddSellerLead";
import AddBuyerLead from "./pages/AddBuyerLead";
import AddVendorLead from "./pages/AddVendorLead";
import Agents from "./pages/Agents";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Inbox />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/inbox" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Inbox />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            {/* Commented out dashboard route to avoid confusion with index page */}
            {/* <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Index />
                </DashboardLayout>
              </ProtectedRoute>
            } /> */}
            <Route path="/leads" element={
              <ProtectedRoute>
                <Leads />
              </ProtectedRoute>
            } />
            <Route path="/pipeline" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Pipeline />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/metrics" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Metrics />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER']}>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/concepts" element={
              <ProtectedRoute>
                <ConceptDemo />
              </ProtectedRoute>
            } />
            <Route path="/leads/add-seller" element={
              <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'ACQ']}>
                <AddSellerLead />
              </ProtectedRoute>
            } />
            <Route path="/leads/add-buyer" element={
              <ProtectedRoute>
                <AddBuyerLead />
              </ProtectedRoute>
            } />
            <Route path="/leads/add-vendor" element={
              <ProtectedRoute>
                <AddVendorLead />
              </ProtectedRoute>
            } />
            <Route path="/agents" element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <DashboardLayout>
                  <Agents />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
