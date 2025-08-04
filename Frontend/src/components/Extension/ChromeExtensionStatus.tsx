import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Chrome, 
  CheckCircle, 
  XCircle, 
  Download, 
  RefreshCw, 
  Settings,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ChromeExtensionStatus = () => {
  const [extensionStatus, setExtensionStatus] = useState({
    installed: false,
    connected: false,
    tracking: false,
    lastSync: null
  });
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Check extension status
  const checkExtensionStatus = async () => {
    setIsLoading(true);
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
          
          setExtensionStatus(prev => ({
            ...prev,
            installed: true,
            connected: true,
            tracking: true
          }));
        } catch (error) {
          setExtensionStatus(prev => ({
            ...prev,
            installed: false,
            connected: false,
            tracking: false
          }));
        }
      } else {
        setExtensionStatus(prev => ({
          ...prev,
          installed: false,
          connected: false,
          tracking: false
        }));
      }
    } catch (error) {
      console.error('Error checking extension status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send user info to extension
  const syncUserWithExtension = async () => {
    if (!user || !extensionStatus.connected) return;
    
    try {
      const extensionId = 'jjjokkpobnafkfomfojdnhgndanjihpl';
      
      if (window.chrome && window.chrome.runtime) {
        window.chrome.runtime.sendMessage(extensionId, {
          action: 'userInfo',
          userId: user.id,
          email: user.email,
          token: localStorage.getItem('token'),
        }, (response) => {
          if (response?.status === 'received ✅') {
            setExtensionStatus(prev => ({
              ...prev,
              lastSync: new Date().toISOString()
            }));
          }
        });
      }
    } catch (error) {
      console.error('Error syncing with extension:', error);
    }
  };

  useEffect(() => {
    checkExtensionStatus();
    // Check status every 30 seconds
    const interval = setInterval(checkExtensionStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (extensionStatus.connected && user) {
      syncUserWithExtension();
    }
  }, [extensionStatus.connected, user]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Eye className="h-4 w-4 mr-2" />
        Extension Status
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Chrome className="h-5 w-5 text-blue-600" />
            Chrome Extension
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={checkExtensionStatus}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
            >
              <EyeOff className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Indicators */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Installation</span>
            <Badge variant={extensionStatus.installed ? "default" : "destructive"}>
              {extensionStatus.installed ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {extensionStatus.installed ? 'Installed' : 'Not Installed'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection</span>
            <Badge variant={extensionStatus.connected ? "default" : "secondary"}>
              {extensionStatus.connected ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {extensionStatus.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tab Tracking</span>
            <Badge variant={extensionStatus.tracking ? "default" : "secondary"}>
              {extensionStatus.tracking ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {extensionStatus.tracking ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Last Sync */}
        {extensionStatus.lastSync && (
          <div className="text-xs text-muted-foreground">
            Last sync: {new Date(extensionStatus.lastSync).toLocaleString()}
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {!extensionStatus.installed && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Install the Chrome extension to enable automatic tab tracking.
              </AlertDescription>
            </Alert>
          )}
          
          {!extensionStatus.installed && (
            <Button className="w-full" variant="default">
              <Download className="h-4 w-4 mr-2" />
              Install Extension
            </Button>
          )}
          
          {extensionStatus.installed && !extensionStatus.connected && (
            <Button 
              className="w-full" 
              variant="outline"
              onClick={checkExtensionStatus}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>
          )}
          
          {extensionStatus.connected && (
            <Button 
              className="w-full" 
              variant="outline"
              onClick={syncUserWithExtension}
            >
              <Settings className="h-4 w-4 mr-2" />
              Sync Now
            </Button>
          )}
        </div>

        {/* Quick Stats */}
        {extensionStatus.tracking && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <div className="grid grid-cols-2 gap-2">
              <div>Browser: Chrome</div>
              <div>Status: Tracking</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChromeExtensionStatus;
