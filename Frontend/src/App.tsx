import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import FocusAnalytics from "./pages/FocusAnalytics";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import Statistics from "./pages/Statistics";
import ChatAssistant from "./pages/ChatAssistant";
import Gamification from "./pages/Gamification";
import Notifications from "./pages/Notifications";
import Extension from "./pages/Extension";
import Diagnostics from "./pages/Diagnostics";
import React from 'react';
import ProductivityChatBot from '@/components/ChatBot/ProductivityChatBot'


const queryClient = new QueryClient();


const AppRoutes = () => (
  <Routes>
    <Route 
      path="/" 
      element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } 
    />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route 
      path="/focus-analytics" 
      element={
        <ProtectedRoute>
          <FocusAnalytics />
        </ProtectedRoute>
      }
    />
    <Route 
      path="/statistics" 
      element={
        <ProtectedRoute>
          <Statistics />
        </ProtectedRoute>
      }
    />
    <Route 
      path="/chat-assistant" 
      element={
        <ProtectedRoute>
          <ChatAssistant />
        </ProtectedRoute>
      }
    />
    <Route 
      path="/gamification" 
      element={
        <ProtectedRoute>
          <Gamification />
        </ProtectedRoute>
      }
    />
    <Route 
      path="/notifications" 
      element={
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      }
    />
    <Route 
      path="/extension" 
      element={
        <ProtectedRoute>
          <Extension />
        </ProtectedRoute>
      }
    />
    <Route 
      path="/diagnostics" 
      element={
        <ProtectedRoute>
          <Diagnostics />
        </ProtectedRoute>
      }
    />
    <Route 
      path="/settings" 
      element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      }
    />
    <Route 
      path="/help" 
      element={
        <ProtectedRoute>
          <Help />
        </ProtectedRoute>
      }
    />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => {
  React.useEffect(() => {
    // Debug auth state on app load
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('App loaded - Auth state:', { 
      hasToken: !!token, 
      hasUser: !!user 
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
            <ProductivityChatBot />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
