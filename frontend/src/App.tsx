import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import QuizPage from "./pages/Quiz.tsx";
import RevisionPage from "./pages/Revision.tsx";
import MedicalReportPage from "./pages/MedicalReport.tsx";
import AuthPage from "./pages/Auth.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AuthContext } from "./lib/auth-context.ts";

const queryClient = new QueryClient();

type User = { name: string; email: string } | null;

const App = () => {
  const [user, setUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem("studymate.user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const handleAuth = (u: { name: string; email: string }) => {
    setUser(u);
    localStorage.setItem("studymate.user", JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("studymate.user");
  };

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AuthPage onAuth={handleAuth} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthContext.Provider value={{ user, logout: handleLogout }}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/quiz" element={<QuizPage />} />
              <Route path="/revision" element={<RevisionPage />} />
              <Route path="/medical-report" element={<MedicalReportPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthContext.Provider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
