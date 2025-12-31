import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import Sidebar from './Sidebar';
import Header from './Header';
import { Toaster } from '../ui/toaster';
const MainLayout = ({ children, className }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  useEffect(() => {
    const checkElectron = () => {
      return typeof window !== 'undefined' &&
             window.process &&
             window.process.type === 'renderer' ||
             window.electronAPI ||
             navigator.userAgent.toLowerCase().indexOf('electron') > -1;
    };
    setIsElectron(checkElectron());
  }, []);
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobileThreshold = isElectron ? 900 : 768;
      const newIsMobile = width < mobileThreshold;
      setIsMobile(newIsMobile);
      if (newIsMobile) {
        setSidebarCollapsed(true);
      } else if (width > 1200) {
        setSidebarCollapsed(false);
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isElectron]);
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        isMobile={isMobile}
        isElectron={isElectron}
      />
      {}
      {(isMobile || (isElectron && typeof window !== 'undefined' && window.innerWidth < 1000)) && !sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      <main className={cn(
        "flex-1 overflow-auto transition-all duration-300 ease-in-out min-w-0",
        !isMobile && !isElectron && (sidebarCollapsed ? "ml-16" : "ml-64"),
        !isMobile && isElectron && (sidebarCollapsed ? "ml-16" : "ml-64"),
        (isMobile || (isElectron && typeof window !== 'undefined' && window.innerWidth < 1000)) && "ml-0"
      )}>
        <div className={cn(
          "w-full h-full",
          "p-0",
          "min-h-0 overflow-hidden flex flex-col",
          className
        )}>
          <Header
            toggleSidebar={toggleSidebar}
            isMobile={isMobile}
          />
          <div className="flex-1 overflow-auto p-2 sm:p-4 lg:p-6">
            {children}
          </div>
        </div>
      </main>
      <Toaster />
    </div>
  );
};
export default MainLayout;
