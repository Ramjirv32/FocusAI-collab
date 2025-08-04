import React, { useState } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Chrome, Download, RefreshCw, Settings, Shield, Clock, ToggleLeft } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Extension = () => {
  const [isConnected, setIsConnected] = useState(true);
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Chrome Extension</h2>
            <p className="text-muted-foreground">
              Manage your FocusAI Chrome extension settings
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant={isConnected ? "outline" : "destructive"} 
              className={isConnected ? "bg-green-100 text-green-800 hover:bg-green-100" : ""}
            >
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Button onClick={() => setIsConnected(!isConnected)}>
              {isConnected ? "Disconnect" : "Connect"}
            </Button>
          </div>
        </div>

        {!isConnected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Extension Disconnected</AlertTitle>
            <AlertDescription>
              Your Chrome extension is not connected. Some features may be unavailable.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Extension Version
              </CardTitle>
              <Chrome className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">v2.1.0</div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Latest version
                </p>
                <Button variant="ghost" size="sm" className="h-7 gap-1">
                  <RefreshCw className="h-3 w-3" />
                  <span>Check for updates</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Last Synced
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5 minutes ago</div>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Auto-sync is enabled
                </p>
                <Button variant="ghost" size="sm" className="h-7 gap-1">
                  <RefreshCw className="h-3 w-3" />
                  <span>Sync now</span>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Storage Usage
              </CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3.2 MB / 10 MB</div>
              <div className="mt-1 space-y-2">
                <Progress value={32} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  32% of storage limit used
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="websites">Websites</TabsTrigger>
            <TabsTrigger value="focus">Focus</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure basic extension behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Start on browser launch</Label>
                    <p className="text-sm text-muted-foreground">Automatically start tracking when Chrome launches</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show notifications</Label>
                    <p className="text-sm text-muted-foreground">Display browser notifications for important events</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-sync data</Label>
                    <p className="text-sm text-muted-foreground">Periodically sync data with the server</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="space-y-2">
                  <Label>Sync interval (minutes)</Label>
                  <Input type="number" defaultValue="15" min="5" max="60" className="w-full max-w-[200px]" />
                  <p className="text-sm text-muted-foreground">How often data is sent to the server (5-60 minutes)</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="websites" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Website Classification</CardTitle>
                <CardDescription>Customize how websites are categorized</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Productivity websites</Label>
                  <Input 
                    placeholder="Add comma-separated domains (e.g., docs.google.com, github.com)" 
                    defaultValue="github.com, stackoverflow.com, docs.google.com, notion.so"
                  />
                  <p className="text-sm text-muted-foreground">Websites that boost your productivity</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Distracting websites</Label>
                  <Input 
                    placeholder="Add comma-separated domains (e.g., facebook.com, twitter.com)" 
                    defaultValue="facebook.com, twitter.com, instagram.com, reddit.com, youtube.com"
                  />
                  <p className="text-sm text-muted-foreground">Websites that may reduce your focus</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-categorize new websites</Label>
                    <p className="text-sm text-muted-foreground">Use AI to automatically categorize new websites</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Track time by domain</Label>
                    <p className="text-sm text-muted-foreground">Track time at the domain level instead of per page</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="focus" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Focus Mode Settings</CardTitle>
                <CardDescription>Configure focus session behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Focus session duration (minutes)</Label>
                  <Input type="number" defaultValue="25" min="5" max="120" className="w-full max-w-[200px]" />
                  <p className="text-sm text-muted-foreground">Default length of focus sessions</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Break duration (minutes)</Label>
                  <Input type="number" defaultValue="5" min="1" max="30" className="w-full max-w-[200px]" />
                  <p className="text-sm text-muted-foreground">Default length of breaks between sessions</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Block distracting sites during focus</Label>
                    <p className="text-sm text-muted-foreground">Prevent access to distracting sites during focus sessions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show timer in browser</Label>
                    <p className="text-sm text-muted-foreground">Display a countdown timer during focus sessions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Play sound notifications</Label>
                    <p className="text-sm text-muted-foreground">Play sounds when sessions start and end</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="advanced" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>Configure technical extension behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Collect detailed page metrics</Label>
                    <p className="text-sm text-muted-foreground">Track detailed metrics for better insights (uses more storage)</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Debug mode</Label>
                    <p className="text-sm text-muted-foreground">Enable more detailed logging (developers only)</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Track incognito browsing</Label>
                    <p className="text-sm text-muted-foreground">Include incognito windows in tracking (requires permission)</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="space-y-4">
                  <Button variant="destructive" className="w-full sm:w-auto">Reset All Settings</Button>
                  <Button variant="outline" className="w-full sm:w-auto">Export Data</Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Developer Options</CardTitle>
                <CardDescription>Advanced settings for developers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>API Endpoint</Label>
                  <Input defaultValue="https://api.focusai.app/v1" />
                  <p className="text-sm text-muted-foreground">The server endpoint for API communication</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Connection Key</Label>
                  <div className="flex gap-2">
                    <Input defaultValue="••••••••••••••••••••••••••••••" type="password" />
                    <Button variant="outline" size="icon">
                      <ToggleLeft className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Your unique API connection key</p>
                </div>
                
                <div className="space-y-4">
                  <Button variant="outline" className="w-full sm:w-auto flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>Download Extension Source</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Extension;
