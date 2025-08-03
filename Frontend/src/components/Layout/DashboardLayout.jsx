import React from 'react';
// Add this import
import { Toaster } from '../ui/toast';

const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Your existing layout code */}
      {children}
      
      {/* Add the Toaster component */}
      <Toaster />
    </div>
  );
};

export default DashboardLayout;