import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Monitor, 
  Chrome, 
  Server, 
  Database, 
  Wifi, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { runDiagnostics } from '@/utils/diagnostics';

const DiagnosticInfo = () => {
  const [screenInfo, setScreenInfo] = useState({
    width: 0,
    height: 0,
    isElectron: false,
    userAgent: ''
  });
  const [diagnostics, setDiagnostics] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const updateScreenInfo = () => {
      const checkElectron = () => {
        return typeof window !== 'undefined' && 
               (window.process && window.process.type === 'renderer') ||
               window.electronAPI ||
               navigator.userAgent.toLowerCase().indexOf('electron') > -1;
      };

      setScreenInfo({
        width: window.innerWidth,
        height: window.innerHeight,
        isElectron: checkElectron(),
        userAgent: navigator.userAgent
      });
    };

    updateScreenInfo();
    window.addEventListener('resize', updateScreenInfo);
    
    return () => window.removeEventListener('resize', updateScreenInfo);
  }, []);

  const runFullDiagnostics = async () => {
    setIsRunning(true);
    try {
      const results = await runDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      console.error('Diagnostics failed:', error);
      setDiagnostics({
        error: 'Failed to run diagnostics',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (success) => {
    return success ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (success) => {
    return success ? CheckCircle : XCircle;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            System Diagnostics
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={runFullDiagnostics}
            disabled={isRunning}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Running...' : 'Run Tests'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="display" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="servers">Servers</TabsTrigger>
            <TabsTrigger value="extension">Extension</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>

          <TabsContent value="display" className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-medium">Screen Resolution:</div>
                <div className="text-muted-foreground">{screenInfo.width} × {screenInfo.height}px</div>
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">Environment:</div>
                <Badge variant={screenInfo.isElectron ? "default" : "secondary"}>
                  {screenInfo.isElectron ? "Electron App" : "Web Browser"}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">Mobile Threshold:</div>
                <div className="text-muted-foreground">{screenInfo.isElectron ? "900px" : "768px"}</div>
              </div>
              
              <div className="space-y-2">
                <div className="font-medium">Layout Mode:</div>
                <Badge variant={screenInfo.width < (screenInfo.isElectron ? 900 : 768) ? "destructive" : "default"}>
                  {screenInfo.width < (screenInfo.isElectron ? 900 : 768) ? "Mobile" : "Desktop"}
                </Badge>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <div className="font-medium text-sm mb-2">User Agent:</div>
              <div className="text-xs text-muted-foreground break-all p-2 bg-muted rounded">
                {screenInfo.userAgent}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="servers" className="space-y-4">
            {diagnostics ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span className="font-medium">Backend Server</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {React.createElement(getStatusIcon(diagnostics.backendServer?.success), {
                      className: `h-4 w-4 ${getStatusColor(diagnostics.backendServer?.success)}`
                    })}
                    <Badge variant={diagnostics.backendServer?.success ? "default" : "destructive"}>
                      {diagnostics.backendServer?.success ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">AI Server</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {React.createElement(getStatusIcon(diagnostics.aiServer?.success), {
                      className: `h-4 w-4 ${getStatusColor(diagnostics.aiServer?.success)}`
                    })}
                    <Badge variant={diagnostics.aiServer?.success ? "default" : "destructive"}>
                      {diagnostics.aiServer?.success ? "Online" : "Offline"}
                    </Badge>
                  </div>
                </div>
                
                {diagnostics.timestamp && (
                  <div className="text-xs text-muted-foreground">
                    Last checked: {new Date(diagnostics.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p>Click "Run Tests" to check server connectivity</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="extension" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Chrome className="h-4 w-4" />
                  <span className="font-medium">Chrome Extension API</span>
                </div>
                <Badge variant={typeof window !== 'undefined' && window.chrome ? "default" : "destructive"}>
                  {typeof window !== 'undefined' && window.chrome ? "Available" : "Not Available"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  <span className="font-medium">Extension Connection</span>
                </div>
                <Badge variant="secondary">
                  Check Settings Page
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="storage" className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Local Storage</span>
                </div>
                <Badge variant={localStorage.getItem('token') ? "default" : "destructive"}>
                  {localStorage.getItem('token') ? "Token Found" : "No Token"}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">User Data</span>
                </div>
                <Badge variant={localStorage.getItem('user') ? "default" : "destructive"}>
                  {localStorage.getItem('user') ? "Available" : "Not Available"}
                </Badge>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DiagnosticInfo;
