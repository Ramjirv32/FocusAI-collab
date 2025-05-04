import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, token, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check authentication status whenever component renders
    if (!isLoading && !token) {
      navigate('/login');
    }
  }, [isLoading, token, navigate]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  // Add console logging to debug authentication state
  console.log('ProtectedRoute - Auth State:', { 
    isAuthenticated: !!token, 
    hasUser: !!user,
    isLoading 
  });
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default ProtectedRoute;