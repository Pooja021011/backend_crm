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

const ProtectedAppRoute = ({ children, requiredRoles }: { children: React.ReactNode; requiredRoles?: string[] }) => (
  <ProtectedRoute requiredRoles={requiredRoles}>
    {/* Mount Twilio only in authenticated areas so incoming calls never ring on /login */}
    <TwilioProvider>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </TwilioProvider>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={
              <ProtectedAppRoute>
                <Inbox />
              </ProtectedAppRoute>
            } />
            <Route path="/inbox" element={
              <ProtectedAppRoute>
                <Inbox />
              </ProtectedAppRoute>
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
              <ProtectedAppRoute>
                <Leads />
              </ProtectedAppRoute>
            } />
            <Route path="/leads/:id/edit" element={
              <ProtectedAppRoute>
                <LeadEdit />
              </ProtectedAppRoute>
            } />
            <Route path="/pipeline" element={
              <ProtectedAppRoute>
                <Pipeline />
              </ProtectedAppRoute>
            } />
            <Route path="/metrics" element={
              <ProtectedAppRoute>
                <Metrics />
              </ProtectedAppRoute>
            } />
            <Route path="/settings" element={
              <ProtectedAppRoute>
                <Settings />
              </ProtectedAppRoute>
            } />
            <Route path="/concepts" element={
              <ProtectedRoute>
                <ConceptDemo />
              </ProtectedRoute>
            } />
            <Route path="/leads/add-seller" element={
              <ProtectedAppRoute requiredRoles={['ADMIN', 'MANAGER', 'ACQ']}>
                <AddSellerLead />
              </ProtectedAppRoute>
            } />
            <Route path="/leads/add-buyer" element={
              <ProtectedAppRoute>
                <AddBuyerLead />
              </ProtectedAppRoute>
            } />
            <Route path="/leads/add-vendor" element={
              <ProtectedAppRoute>
                <AddVendorLead />
              </ProtectedAppRoute>
            } />
            <Route path="/agents" element={
              <ProtectedAppRoute requiredRoles={['ADMIN']}>
                <Agents />
              </ProtectedAppRoute>
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
