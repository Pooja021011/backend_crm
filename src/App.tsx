import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { TwilioProvider } from "@/contexts/TwilioContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/DashboardLayout";
import Index from "./pages/Index";
import Inbox from "./pages/Inbox";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import Metrics from "./pages/Metrics";
import Settings from "./pages/Settings";
import AdminLogin from "./pages/AdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ConceptDemo from "./pages/ConceptDemo";
import AddSellerLead from "./pages/AddSellerLead";
import AddBuyerLead from "./pages/AddBuyerLead";
import AddVendorLead from "./pages/AddVendorLead";
import Agents from "./pages/Agents";
import LeadEdit from "./pages/LeadEdit";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TwilioProvider>
            <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
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
                <DashboardLayout>
                  <Leads />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/leads/:id/edit" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LeadEdit />
                </DashboardLayout>
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
              <ProtectedRoute>
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
                <DashboardLayout>
                  <AddSellerLead />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/leads/add-buyer" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddBuyerLead />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/leads/add-vendor" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AddVendorLead />
                </DashboardLayout>
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
          </TwilioProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
