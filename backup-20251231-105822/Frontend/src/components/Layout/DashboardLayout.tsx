import React, { ReactNode } from 'react';
import MainLayout from './MainLayout';

interface DashboardLayoutProps {
  children: ReactNode;
  className?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, className }) => {
  return (
    <MainLayout className={className}>
      {children}
    </MainLayout>
  );
};

export default DashboardLayout;
