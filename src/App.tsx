/**
 * AirQuiz — Root application component.
 * Wraps providers (theme, language, query, tooltips) and defines all routes.
 *
 * Author: Salah Eddine Medkour <medkoursalaheddine@gmail.com>
 */

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Pages
import Landing from "@/pages/Landing";
import About from "@/pages/About";
import StudentLogin from "@/pages/student/Login";
import WaitingRoom from "@/pages/student/WaitingRoom";
import QuizActive from "@/pages/student/QuizActive";
import Results from "@/pages/student/Results";
import AdminLogin from "@/pages/admin/AdminLogin";
import Dashboard from "@/pages/admin/Dashboard";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Landing — role selector */}
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />

              {/* Student flow */}
              <Route path="/student" element={<StudentLogin />} />
              <Route path="/waiting" element={<WaitingRoom />} />
              <Route path="/quiz" element={<QuizActive />} />
              <Route path="/results" element={<Results />} />

              {/* Admin flow */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route element={<ProtectedAdminRoute />}>
                <Route path="/admin/dashboard" element={<Dashboard />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </LanguageProvider>
  </ThemeProvider>
);

export default App;
