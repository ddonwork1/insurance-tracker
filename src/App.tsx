import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Policies from "./pages/Policies";
import PolicyDetail from "./pages/PolicyDetail";
import Claims from "./pages/Claims";
import GlobalLogs from "./pages/GlobalLogs";
import UserManagement from "./pages/UserManagement";
import Backup from "./pages/Backup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/policies" element={<Policies />} />
              <Route path="/policies/:id" element={<PolicyDetail />} />
              <Route path="/claims" element={<Claims />} />
              <Route path="/logs" element={<GlobalLogs />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/backup" element={<Backup />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
