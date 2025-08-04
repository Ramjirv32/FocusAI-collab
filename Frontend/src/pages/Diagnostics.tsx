import React, { useState } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, Bug, Cpu, FileJson, HardDrive, 
  Layers, Database, Zap, RefreshCw, BarChart, Activity
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

// Mock diagnostic data
const systemData = {
  os: 'Windows 10 Pro 64-bit',
  browser: 'Chrome 119.0.6045.124',
  device: 'Desktop',
  memory: {
    total: 16384,
    used: 8647,
    free: 7737
  },
  storage: {
    total: 512,
    used: 342,
    free: 170
  },
  cpu: {
    model: 'Intel Core i7-10700K @ 3.80GHz',
    cores: 8,
    threads: 16,
    usage: 32
  },
  network: {
    type: 'WiFi',
    speed: '300 Mbps',
    latency: 25
  }
};

const extensionData = {
  version: '2.1.0',
  status: 'Connected',
  lastSync: '5 minutes ago',
  storage: {
    used: 3.2,
    total: 10
  },
  permissions: [
    'Storage',
    'Tabs',
    'History',
    'Notifications',
    'Background'
  ],
  logs: [
    { time: '12:15:30', level: 'info', message: 'Extension started successfully' },
    { time: '12:17:45', level: 'info', message: 'User session initiated' },
    { time: '12:20:12', level: 'warning', message: 'Network connectivity interrupted' },
    { time: '12:21:05', level: 'info', message: 'Network connectivity restored' },
    { time: '12:30:18', level: 'error', message: 'Failed to sync data with server: Timeout' }
  ]
};

const Diagnostics = () => {
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [hasError, setHasError] = useState(true);
  
  const runDiagnostics = () => {
    setIsRunningDiagnostics(true);
    // Simulate diagnostics running
    setTimeout(() => {
      setIsRunningDiagnostics(false);
    }, 2000);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">System Diagnostics</h2>
            <p className="text-muted-foreground">
              Troubleshoot and monitor your system performance
            </p>
          </div>
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunningDiagnostics}
            className="flex items-center gap-2"
          >
            {isRunningDiagnostics ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                <span>Run Diagnostics</span>
              </>
            )}
          </Button>
        </div>

        {hasError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Issues Detected</AlertTitle>
            <AlertDescription>
              There are connectivity issues between the extension and the server. Please check your network connection.
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="system" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="extension">Extension</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="system" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Memory Usage
                  </CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemData.memory.used} MB / {systemData.memory.total} MB</div>
                  <div className="mt-1 space-y-2">
                    <Progress value={(systemData.memory.used / systemData.memory.total) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {Math.round((systemData.memory.used / systemData.memory.total) * 100)}% memory in use
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    CPU Usage
                  </CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemData.cpu.usage}%</div>
                  <div className="mt-1 space-y-2">
                    <Progress value={systemData.cpu.usage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {systemData.cpu.model} ({systemData.cpu.cores} cores)
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Storage
                  </CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemData.storage.used} GB / {systemData.storage.total} GB</div>
                  <div className="mt-1 space-y-2">
                    <Progress value={(systemData.storage.used / systemData.storage.total) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {systemData.storage.free} GB available
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Details about your operating environment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Operating System</h3>
                      <p className="font-medium">{systemData.os}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Browser</h3>
                      <p className="font-medium">{systemData.browser}</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Device Type</h3>
                      <p className="font-medium">{systemData.device}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">CPU</h3>
                      <p className="font-medium">{systemData.cpu.model}</p>
                      <p className="text-sm text-muted-foreground">{systemData.cpu.cores} cores / {systemData.cpu.threads} threads</p>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Network</h3>
                      <p className="font-medium">{systemData.network.type} ({systemData.network.speed})</p>
                      <p className="text-sm text-muted-foreground">Latency: {systemData.network.latency} ms</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>Real-time system performance data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border border-dashed rounded-md">
                  <div className="text-center">
                    <BarChart className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <h3 className="font-medium">Performance Chart</h3>
                    <p className="text-sm text-muted-foreground">Real-time metrics visualization would appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="extension" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Extension Status
                  </CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className="bg-green-100 text-green-800 hover:bg-green-100"
                    >
                      {extensionData.status}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Version:</p>
                      <p className="text-sm font-medium">{extensionData.version}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm">Last sync:</p>
                      <p className="text-sm font-medium">{extensionData.lastSync}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Storage Usage
                  </CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {extensionData.storage.used} MB / {extensionData.storage.total} MB
                  </div>
                  <div className="mt-1 space-y-2">
                    <Progress value={(extensionData.storage.used / extensionData.storage.total) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {Math.round((extensionData.storage.used / extensionData.storage.total) * 100)}% of storage limit used
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Connection Health
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Badge 
                      variant={hasError ? "destructive" : "outline"} 
                      className={!hasError ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
                    >
                      {hasError ? "Issues Detected" : "Healthy"}
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setHasError(!hasError)}
                    >
                      Test Connection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Extension Permissions</CardTitle>
                <CardDescription>Required browser permissions for functionality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {extensionData.permissions.map((permission, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Badge variant="outline" className="h-6">
                        {permission}
                      </Badge>
                      <span className="text-sm text-muted-foreground">Granted</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Troubleshooting</CardTitle>
                <CardDescription>Common solutions for extension issues</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Connection Issues</h3>
                  <p className="text-sm text-muted-foreground">If the extension cannot connect to the server:</p>
                  <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                    <li>Check your internet connection</li>
                    <li>Verify the API endpoint in extension settings</li>
                    <li>Ensure your authentication token is valid</li>
                    <li>Try reinstalling the extension</li>
                  </ol>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-medium">Data Sync Problems</h3>
                  <p className="text-sm text-muted-foreground">If your activity data isn't syncing properly:</p>
                  <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                    <li>Manual sync through the extension menu</li>
                    <li>Check storage permissions are enabled</li>
                    <li>Clear extension cache and restart browser</li>
                    <li>Verify your account status is active</li>
                  </ol>
                </div>
                <div className="pt-3">
                  <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    <span>Submit Bug Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4 mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Extension Logs</CardTitle>
                  <CardDescription>Recent activity and error logs from the extension</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <FileJson className="h-4 w-4" />
                  <span>Export Logs</span>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-3">
                  {extensionData.logs.map((log, index) => (
                    <div 
                      key={index} 
                      className={`text-sm p-2 rounded ${
                        log.level === 'error' 
                          ? 'bg-red-50 text-red-800' 
                          : log.level === 'warning' 
                            ? 'bg-yellow-50 text-yellow-800' 
                            : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono">[{log.time}]</span>
                        <Badge variant="outline" className={`uppercase ${
                          log.level === 'error' 
                            ? 'bg-red-100 text-red-800 border-red-200' 
                            : log.level === 'warning' 
                              ? 'bg-yellow-100 text-yellow-800 border-yellow-200' 
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}>
                          {log.level}
                        </Badge>
                      </div>
                      <div className="mt-1 pl-14">
                        {log.message}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing 5 of 124 log entries
                  </div>
                  <Button size="sm" variant="outline">
                    Load More
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Server Communication Logs</CardTitle>
                <CardDescription>API requests and responses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border border-dashed rounded-md">
                  <div className="text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <h3 className="font-medium">No recent server logs</h3>
                    <p className="text-sm text-muted-foreground">Server communication logs will appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Diagnostics;
