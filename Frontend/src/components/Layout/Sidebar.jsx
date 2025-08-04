import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  BarChart3, 
  Settings, 
  User, 
  HelpCircle, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  Activity,
  Brain,
  Trophy,
  Bell,
  Gamepad2,
  MessageSquare,
  Wrench,
  Chrome,
  LifeBuoy
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const Sidebar = ({ collapsed, onToggle, isMobile, isElectron }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      title: 'Dashboard',
      icon: Home,
      path: '/',
      description: 'Overview & Analytics'
    },
    {
      title: 'Focus Analytics',
      icon: Brain,
      path: '/focus-analytics',
      description: 'Detailed Focus Reports'
    },
    {
      title: 'Statistics',
      icon: BarChart3,
      path: '/statistics',
      description: 'Usage Statistics'
    },
    {
      title: 'Gamification',
      icon: Trophy,
      path: '/gamification',
      description: 'Achievements & Rewards'
    },
    {
      title: 'Chat Assistant',
      icon: MessageSquare,
      path: '/chat',
      description: 'AI Productivity Assistant'
    }
  ];

  const bottomMenuItems = [
    {
      title: 'Notifications',
      icon: Bell,
      path: '/notifications',
      description: 'Alerts & Updates'
    },
    {
      title: 'Extension',
      icon: Chrome,
      path: '/extension',
      description: 'Chrome Extension Status'
    },
    {
      title: 'Diagnostics',
      icon: Wrench,
      path: '/diagnostics',
      description: 'System Diagnostics'
    },
    {
      title: 'Help & Support',
      icon: HelpCircle,
      path: '/help',
      description: 'Get Help'
    },
    {
      title: 'Settings',
      icon: Settings,
      path: '/settings',
      description: 'App Settings'
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMenuClick = (path) => {
    navigate(path);
    // Auto-close sidebar on mobile/small Electron windows after navigation
    if (isMobile || (isElectron && typeof window !== 'undefined' && window.innerWidth < 1000)) {
      onToggle();
    }
  };

  const MenuItem = ({ item, isActive }) => (
    <button
      onClick={() => handleMenuClick(item.path)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-left",
        isActive 
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
    >
      <item.icon className={cn(
        "h-5 w-5 flex-shrink-0",
        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
      )} />
      {!collapsed && (
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{item.title}</span>
          {!isActive && !isMobile && (
            <span className="text-xs opacity-60 truncate">{item.description}</span>
          )}
        </div>
      )}
    </button>
  );

  return (
    <aside className={cn(
      "bg-background border-r transition-all duration-300 ease-in-out flex flex-col",
      // Position and sizing
      isMobile || (isElectron && typeof window !== 'undefined' && window.innerWidth < 1000) 
        ? "fixed left-0 top-0 z-40 h-screen" 
        : "relative h-screen",
      collapsed ? "w-16" : "w-64",
      // Hide completely when collapsed on mobile/small screens
      (isMobile || (isElectron && typeof window !== 'undefined' && window.innerWidth < 1000)) && collapsed && "translate-x-[-100%]"
    )}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b min-h-[73px]">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Activity className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm truncate">FocusAI</h2>
                <p className="text-xs text-muted-foreground truncate">Productivity Hub</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0 flex-shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* User Profile */}
        {!collapsed && user && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  ● Online
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <MenuItem
                key={item.path}
                item={item}
                isActive={location.pathname === item.path}
              />
            ))}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="p-4 border-t space-y-1 flex-shrink-0">
          {bottomMenuItems.map((item) => (
            <MenuItem
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
            />
          ))}
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-3 mt-2 text-muted-foreground hover:text-foreground",
              collapsed ? "px-2" : "px-3"
            )}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
