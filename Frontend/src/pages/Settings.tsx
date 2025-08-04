import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings as SettingsIcon, User, Bell, Shield, Palette, Database, Chrome, Monitor, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';
import ChromeExtensionStatus from '@/components/Extension/ChromeExtensionStatus';
import { useAuth } from '@/context/AuthContext';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    notifications: {
      focusReminders: true,
      productivityAlerts: true,
      weeklyReports: false,
      achievements: true
    },
    tracking: {
      autoTrack: true,
      trackPrivateTabs: false,
      syncInterval: 30,
      minSessionTime: 5
    },
    display: {
      theme: 'system',
      compactMode: false,
      showExtensionStatus: true,
      animationsEnabled: true
    },
    privacy: {
      dataRetention: 90,
      anonymizeData: false,
      shareAnalytics: false
    }
  });

  const updateSetting = (category: string, key: string, value: boolean | number | string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const settingsCategories = [
    {
      title: 'Profile Settings',
      description: 'Manage your account and profile information',
      icon: User,
      items: [
        'Update profile information',
        'Change password',
        'Email preferences',
        'Privacy settings'
      ]
    },
    {
      title: 'Chrome Extension', 
      description: 'Configure browser extension and tracking',
      icon: Chrome,
      items: [
        'Extension connection status',
        'Tab tracking preferences',
        'Data sync settings',
        'Installation guide'
      ]
    },
    {
      title: 'Privacy & Security',
      description: 'Control your data and security settings',
      icon: Shield,
      items: [
        'Data export options',
        'Activity tracking settings',
        'Two-factor authentication',
        'Connected applications'
      ]
    },
    {
      title: 'Display & Performance',
      description: 'Customize the look and performance',
      icon: Monitor,
      items: [
        'Theme selection',
        'Animation preferences',
        'Layout options',
        'Performance settings'
      ]
    }
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-8 w-8 text-primary" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure your FocusAI experience
            </p>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="extension">Extension</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {settingsCategories.map((category, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <category.icon className="h-5 w-5 text-primary" />
                      </div>
                      {category.title}
                    </CardTitle>
                    <CardDescription>
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Focus Session Reminders</h4>
                    <p className="text-sm text-muted-foreground">Get notified to start focus sessions</p>
                  </div>
                  <Switch
                    checked={settings.notifications.focusReminders}
                    onCheckedChange={(checked) => updateSetting('notifications', 'focusReminders', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Productivity Alerts</h4>
                    <p className="text-sm text-muted-foreground">Alerts when productivity drops</p>
                  </div>
                  <Switch
                    checked={settings.notifications.productivityAlerts}
                    onCheckedChange={(checked) => updateSetting('notifications', 'productivityAlerts', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Weekly Reports</h4>
                    <p className="text-sm text-muted-foreground">Receive weekly productivity summaries</p>
                  </div>
                  <Switch
                    checked={settings.notifications.weeklyReports}
                    onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReports', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Achievement Notifications</h4>
                    <p className="text-sm text-muted-foreground">Celebrate your productivity milestones</p>
                  </div>
                  <Switch
                    checked={settings.notifications.achievements}
                    onCheckedChange={(checked) => updateSetting('notifications', 'achievements', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tracking Settings */}
          <TabsContent value="tracking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Activity Tracking
                </CardTitle>
                <CardDescription>
                  Configure how your activity is tracked and analyzed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Automatic Tracking</h4>
                    <p className="text-sm text-muted-foreground">Automatically track browser and app usage</p>
                  </div>
                  <Switch
                    checked={settings.tracking.autoTrack}
                    onCheckedChange={(checked) => updateSetting('tracking', 'autoTrack', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Track Private/Incognito Tabs</h4>
                    <p className="text-sm text-muted-foreground">Include private browsing in analytics</p>
                  </div>
                  <Switch
                    checked={settings.tracking.trackPrivateTabs}
                    onCheckedChange={(checked) => updateSetting('tracking', 'trackPrivateTabs', checked)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Sync Interval</h4>
                    <span className="text-sm text-muted-foreground">{settings.tracking.syncInterval}s</span>
                  </div>
                  <Slider
                    value={[settings.tracking.syncInterval]}
                    onValueChange={([value]) => updateSetting('tracking', 'syncInterval', value)}
                    max={300}
                    min={10}
                    step={10}
                  />
                  <p className="text-xs text-muted-foreground">How often to sync data with the server</p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Minimum Session Time</h4>
                    <span className="text-sm text-muted-foreground">{settings.tracking.minSessionTime}min</span>
                  </div>
                  <Slider
                    value={[settings.tracking.minSessionTime]}
                    onValueChange={([value]) => updateSetting('tracking', 'minSessionTime', value)}
                    max={60}
                    min={1}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">Minimum time to consider as a session</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Display Settings */}
          <TabsContent value="display" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Display Preferences
                </CardTitle>
                <CardDescription>
                  Customize the appearance and performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Compact Mode</h4>
                    <p className="text-sm text-muted-foreground">Use less space for UI elements</p>
                  </div>
                  <Switch
                    checked={settings.display.compactMode}
                    onCheckedChange={(checked) => updateSetting('display', 'compactMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Show Extension Status</h4>
                    <p className="text-sm text-muted-foreground">Display Chrome extension status widget</p>
                  </div>
                  <Switch
                    checked={settings.display.showExtensionStatus}
                    onCheckedChange={(checked) => updateSetting('display', 'showExtensionStatus', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Animations</h4>
                    <p className="text-sm text-muted-foreground">Enable smooth animations and transitions</p>
                  </div>
                  <Switch
                    checked={settings.display.animationsEnabled}
                    onCheckedChange={(checked) => updateSetting('display', 'animationsEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Extension Settings */}
          <TabsContent value="extension" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChromeExtensionStatus />
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Extension Actions
                  </CardTitle>
                  <CardDescription>
                    Quick actions for the Chrome extension
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full" variant="outline">
                    <Chrome className="h-4 w-4 mr-2" />
                    Open Extension Popup
                  </Button>
                  <Button className="w-full" variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Force Data Sync
                  </Button>
                  <Button className="w-full" variant="outline">
                    Clear Extension Cache
                  </Button>
                  <Button className="w-full" variant="destructive">
                    Reset Extension Settings
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common settings and actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">Reset to Defaults</Button>
              <Button variant="outline">Export Settings</Button>
              <Button variant="outline">Import Settings</Button>
              <Button variant="destructive">Clear All Data</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Settings;
