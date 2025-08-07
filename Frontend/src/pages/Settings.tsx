import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  Chrome, 
  Monitor, 
  Zap,
  Save,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import ChromeExtensionStatus from '@/components/Extension/ChromeExtensionStatus';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';

const Settings = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [settings, setSettings] = useState({
    notifications: {
      focusReminders: true,
      productivityAlerts: true,
      weeklyReports: false,
      achievements: true,
      dailyReminders: true,
      email: true
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
      shareAnalytics: false,
      profileVisibility: 'public',
      showInLeaderboard: true,
      showProfilePhoto: true,
      showLocation: true,
      showJobTitle: true
    },
    gamification: {
      dailyGoals: {
        focusTimeTarget: 240,
        focusScoreTarget: 75,
        sessionsTarget: 4
      }
    }
  });

  // Get auth headers
  const getAuthHeader = useCallback(() => {
    const authToken = token || localStorage.getItem('token');
    console.log('Settings - Auth token available:', !!authToken);
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }, [token]);

  // Fetch user settings
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const headers = getAuthHeader();
      
      const response = await axios.get('http://localhost:5001/api/settings', {
        headers
      });
      
      // Merge backend settings with default settings to ensure all properties exist
      setSettings(prevSettings => ({
        ...prevSettings,
        ...response.data,
        notifications: {
          ...prevSettings.notifications,
          ...response.data.notifications
        },
        privacy: {
          ...prevSettings.privacy,
          ...response.data.privacy
        },
        gamification: {
          ...prevSettings.gamification,
          ...response.data.gamification
        }
      }));
      console.log('Settings loaded and merged:', response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeader, toast]);

  // Save settings
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const headers = getAuthHeader();
      
      await axios.put('http://localhost:5001/api/settings', settings, {
        headers
      });
      
      setHasChanges(false);
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Export settings data
  const exportData = async () => {
    try {
      const headers = getAuthHeader();
      
      const response = await axios.get('http://localhost:5001/api/settings/export-data', {
        headers,
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'focusai-data-export.json';
      link.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Data Exported",
        description: "Your data has been exported successfully.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Error",
        description: "Failed to export data. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Reset data
  const resetData = async (type: string) => {
    try {
      const headers = getAuthHeader();
      
      await axios.post('http://localhost:5001/api/settings/reset-data', { type }, {
        headers
      });
      
      toast({
        title: "Data Reset",
        description: `Your ${type} data has been reset successfully.`,
        variant: "default"
      });
      
      // Reload settings
      fetchSettings();
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Error",
        description: "Failed to reset data. Please try again.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user, fetchSettings]);

  const updateSetting = (category: string, key: string, value: boolean | number | string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const updateNestedSetting = (category: string, subcategory: string, key: string, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [subcategory]: {
          ...prev[category][subcategory],
          [key]: value
        }
      }
    }));
    setHasChanges(true);
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading your settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-8 w-8 text-primary" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure your FocusAI experience and preferences
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Unsaved Changes
              </Badge>
            )}
            <Button 
              onClick={saveSettings} 
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="tracking">Tracking</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="gamification">Goals</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          {/* Notifications Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive and how often
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Focus Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Get reminded to start focus sessions
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.focusReminders}
                        onCheckedChange={(checked) => updateSetting('notifications', 'focusReminders', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Productivity Alerts</Label>
                        <p className="text-sm text-muted-foreground">
                          Notifications about your productivity patterns
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.productivityAlerts}
                        onCheckedChange={(checked) => updateSetting('notifications', 'productivityAlerts', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Achievement Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when you earn badges or complete challenges
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.achievements}
                        onCheckedChange={(checked) => updateSetting('notifications', 'achievements', checked)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Daily Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Daily goal and streak reminders
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.dailyReminders}
                        onCheckedChange={(checked) => updateSetting('notifications', 'dailyReminders', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Weekly Reports</Label>
                        <p className="text-sm text-muted-foreground">
                          Weekly productivity summaries and insights
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.weeklyReports}
                        onCheckedChange={(checked) => updateSetting('notifications', 'weeklyReports', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={settings.notifications.email}
                        onCheckedChange={(checked) => updateSetting('notifications', 'email', checked)}
                      />
                    </div>
                  </div>
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
                  Configure how FocusAI tracks your activity and usage patterns
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Auto-track Applications</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically track application usage time
                      </p>
                    </div>
                    <Switch
                      checked={settings?.tracking?.autoTrack || false}
                      onCheckedChange={(checked) => updateSetting('tracking', 'autoTrack', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Track Private/Incognito Tabs</Label>
                      <p className="text-sm text-muted-foreground">
                        Include private browsing sessions in tracking
                      </p>
                    </div>
                    <Switch
                      checked={settings?.tracking?.trackPrivateTabs || false}
                      onCheckedChange={(checked) => updateSetting('tracking', 'trackPrivateTabs', checked)}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-base">Sync Interval (seconds)</Label>
                    <p className="text-sm text-muted-foreground">
                      How often to sync tracking data: {settings?.tracking?.syncInterval || 30}s
                    </p>
                    <Slider
                      value={[settings?.tracking?.syncInterval || 30]}
                      onValueChange={([value]) => updateSetting('tracking', 'syncInterval', value)}
                      max={300}
                      min={10}
                      step={10}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-base">Minimum Session Time (minutes)</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimum time to count as a valid session: {settings?.tracking?.minSessionTime || 5} min
                    </p>
                    <Slider
                      value={[settings?.tracking?.minSessionTime || 5]}
                      onValueChange={([value]) => updateSetting('tracking', 'minSessionTime', value)}
                      max={30}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <ChromeExtensionStatus />
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
                    checked={settings?.display?.compactMode || false}
                    onCheckedChange={(checked) => updateSetting('display', 'compactMode', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Show Extension Status</h4>
                    <p className="text-sm text-muted-foreground">Display Chrome extension status widget</p>
                  </div>
                  <Switch
                    checked={settings?.display?.showExtensionStatus || true}
                    onCheckedChange={(checked) => updateSetting('display', 'showExtensionStatus', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Animations</h4>
                    <p className="text-sm text-muted-foreground">Enable smooth animations and transitions</p>
                  </div>
                  <Switch
                    checked={settings?.display?.animationsEnabled || true}
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
    </DashboardLayout>
  );
};

export default Settings;
