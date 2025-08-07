import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Chrome, 
  CheckCircle, 
  XCircle, 
  BellRing, 
  Menu,
  LifeBuoy,
  Activity
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import DiagnosticInfo from '@/components/DiagnosticInfo';
import UserMenu from './UserMenu';

const Header = ({ toggleSidebar, isMobile }) => {
  const [extensionStatus, setExtensionStatus] = useState({
    installed: false,
    connected: false
  });
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { user } = useAuth();

  // Check extension status
  const checkExtensionStatus = async () => {
    try {
      // Check if Chrome extension API is available
      if (typeof window !== 'undefined' && window.chrome && window.chrome.runtime) {
        const extensionId = 'jjjokkpobnafkfomfojdnhgndanjihpl'; // Your extension ID
        
        // Try to send a message to the extension
        try {
          await new Promise((resolve, reject) => {
            window.chrome.runtime.sendMessage(extensionId, 
              { action: 'ping' }, 
              (response) => {
                if (window.chrome.runtime.lastError) {
                  reject(window.chrome.runtime.lastError);
                } else {
                  resolve(response);
                }
              }
            );
          });
          
          setExtensionStatus({
            installed: true,
            connected: true
          });
        } catch (error) {
          setExtensionStatus({
            installed: false,
            connected: false
          });
        }
      } else {
        setExtensionStatus({
          installed: false,
          connected: false
        });
      }
    } catch (error) {
      console.error('Error checking extension status:', error);
    }
  };

  useEffect(() => {
    checkExtensionStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkExtensionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Quick diagnostic check
  const runQuickDiagnostic = () => {
    setIsRunningDiagnostic(true);
    // Simulate diagnostic check
    setTimeout(() => {
      setIsRunningDiagnostic(false);
    }, 2000);
  };

  return (
    <header className="bg-background z-10 border-b px-4 py-3 sticky top-0 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleSidebar} 
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">FocusAI</h2>
            <p className="text-xs text-muted-foreground">Productivity Hub</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Extension Status */}
        <Badge
          variant={extensionStatus.connected ? "outline" : "secondary"}
          className="flex items-center gap-1 cursor-pointer hover:bg-muted transition-all"
          onClick={() => window.location.href = '/extension'}
        >
          <Chrome className="h-3 w-3" />
          {extensionStatus.connected ? (
            <CheckCircle className="h-3 w-3 text-green-500" />
          ) : (
            <XCircle className="h-3 w-3 text-red-500" />
          )}
        </Badge>

        {/* Quick Diagnostic Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative" 
          onClick={runQuickDiagnostic}
          disabled={isRunningDiagnostic}
        >
          <LifeBuoy className="h-5 w-5" />
          {isRunningDiagnostic && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent"></div>
            </div>
          )}
        </Button>

        {/* Full Diagnostics Dialog */}
        <Dialog open={showDiagnostics} onOpenChange={setShowDiagnostics}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
              <LifeBuoy className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>System Diagnostics</DialogTitle>
              <DialogDescription>
                Check the status of your FocusAI system components and troubleshoot issues.
              </DialogDescription>
            </DialogHeader>
            <DiagnosticInfo />
          </DialogContent>
        </Dialog>

        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <BellRing className="h-5 w-5" />
        </Button>

        {/* User Profile Menu */}
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
