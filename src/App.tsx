import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Student pages
import StudentLogin from "@/pages/student/Login";
import WaitingRoom from "@/pages/student/WaitingRoom";
import QuizActive from "@/pages/student/QuizActive";
import Results from "@/pages/student/Results";

// Admin pages
import AdminLogin from "@/pages/admin/AdminLogin";
import Dashboard from "@/pages/admin/Dashboard";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";

// 404
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Student Routes */}
          <Route path="/" element={<StudentLogin />} />
          <Route path="/waiting" element={<WaitingRoom />} />
          <Route path="/quiz" element={<QuizActive />} />
          <Route path="/results" element={<Results />} />

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLogin />} />
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/admin/dashboard" element={<Dashboard />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
