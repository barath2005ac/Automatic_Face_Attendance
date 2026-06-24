import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Layout } from "./components/Layout";
import { CheckIn } from "./pages/CheckIn";
import { Employees } from "./pages/Employees";
import { Attendance } from "./pages/Attendance";
import { Students } from "./pages/Students";
import { StudentCheckIn } from "./pages/StudentCheckIn";
import { StudentAttendance } from "./pages/StudentAttendance";
import { Auth } from "./pages/Auth";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth route - public */}
            <Route path="/auth" element={<Auth />} />
            
            {/* Check-in routes - public (kiosk mode) */}
            <Route path="/checkin" element={<Layout><CheckIn /></Layout>} />
            <Route path="/student-checkin" element={<Layout><StudentCheckIn /></Layout>} />
            
            {/* Protected routes - require authentication */}
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            
            {/* Admin-only routes */}
            <Route path="/employees" element={
              <ProtectedRoute requireAdmin>
                <Layout><Employees /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/students" element={
              <ProtectedRoute requireAdmin>
                <Layout><Students /></Layout>
              </ProtectedRoute>
            } />
            
            {/* Authenticated routes */}
            <Route path="/attendance" element={
              <ProtectedRoute>
                <Layout><Attendance /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/student-attendance" element={
              <ProtectedRoute>
                <Layout><StudentAttendance /></Layout>
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
