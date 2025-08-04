import React from 'react';
import MainLayout from './MainLayout';

const DashboardLayout = ({ children }) => {
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
};

export default DashboardLayout;
