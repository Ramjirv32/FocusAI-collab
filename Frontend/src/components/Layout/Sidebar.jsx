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
      path: '/chat-assistant',
      description: 'AI Productivity Assistant'
    },
     {
      title: 'Notifications',
      icon: Bell,
      path: '/notifications',
      description: 'Alerts & Updates'
    },
    // {
    //   title: 'Extension',
    //   icon: Chrome,
    //   path: '/extension',
    //   description: 'Chrome Extension Status'
    // },
    // {
    //   title: 'Diagnostics',
    //   icon: Wrench,
    //   path: '/diagnostics',
    //   description: 'System Diagnostics'
    // },
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
    },
    {
      title: 'Sign Out',
      icon: LogOut,
      path: '/logout',
      description: 'Log out from your account',
      isLogout: true
    }
  ];

  const bottomMenuItems = [
   
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
      onClick={() => item.isLogout ? handleLogout() : handleMenuClick(item.path)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group text-left",
        collapsed && "justify-center py-3", // Center icon when collapsed with slightly less padding
        isActive 
          ? "bg-primary text-primary-foreground shadow-sm" 
          : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
      )}
    >
      <item.icon className={cn(
        "flex-shrink-0",
        collapsed ? "h-7 w-7" : "h-6 w-6", // Keep icon sizes large
        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
      )} />
      {!collapsed && (
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-base font-medium truncate">{item.title}</span>
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
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-base truncate">FocusAI</h2>
                <p className="text-xs text-muted-foreground truncate">Productivity Hub</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="mx-auto">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <Activity className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className={cn(
              "h-8 w-8 p-0 flex-shrink-0",
              collapsed && "absolute right-2 top-4" // Position the toggle button when collapsed
            )}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* User Profile */}
        {!collapsed && user && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium truncate">
                  {user.name || user.email}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  {user.email}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  ● Online
                </p>
              </div>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="py-4 border-b flex justify-center">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 p-4 space-y-2.5 overflow-y-auto"> {/* Reduced from space-y-4 to space-y-2.5 */}
          <div className="space-y-1.5"> {/* Reduced from space-y-3 to space-y-1.5 */}
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
        <div className="p-4 border-t space-y-1.5 flex-shrink-0"> {/* Reduced from space-y-3 to space-y-1.5 */}
          {bottomMenuItems.map((item) => (
            <MenuItem
              key={item.path}
              item={item}
              isActive={location.pathname === item.path}
            />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
