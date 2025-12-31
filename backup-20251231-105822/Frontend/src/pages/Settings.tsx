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
  Target,
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
      productivityAlerts: true,
      todoReminders: true,
      achievements: true,
      dailyReminders: true,
      email: false
    },
    tracking: {
      autoTrack: true,
      trackPrivateTabs: false,
      syncInterval: 30,
      minSessionTime: 5
    },
    gamification: {
      dailyGoals: {
        focusTimeTarget: 240,
        focusScoreTarget: 75,
        sessionsTarget: 4
      }
    }
  });

  
  const getAuthHeader = useCallback(() => {
    const authToken = token || localStorage.getItem('token');
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }, [token]);

  
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const headers = getAuthHeader();

      const response = await axios.get('http://localhost:5001/api/settings', {
        headers
      });

      
      setSettings(prevSettings => ({
        ...prevSettings,
        notifications: {
          ...prevSettings.notifications,
          ...(response.data.notifications || {})
        },
        tracking: {
          ...prevSettings.tracking,
          ...(response.data.tracking || {})
        },
        gamification: {
          ...prevSettings.gamification,
          ...(response.data.gamification || {})
        }
      }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Error",
        description: "Failed to load settings. Using local defaults.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeader, toast]);

  
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
        description: "Your preferences have been updated.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Save Failed",
        description: "Could not connect to the backend server.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  
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
      link.download = `focusai-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Tracking data exported to your downloads folder.",
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate your data backup.",
        variant: "destructive"
      });
    }
  };

  
  const resetData = async (type: string) => {
    if (!confirm(`Are you sure you want to reset all your ${type} data? This cannot be undone.`)) return;

    try {
      const headers = getAuthHeader();
      await axios.post('http://localhost:5001/api/settings/reset-data', { type }, {
        headers
      });

      toast({
        title: "Data Reset",
        description: "Your history has been cleared.",
      });

      fetchSettings();
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Reset Failed",
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-1 text-lg">
              Manage your local FocusAI instance and tracking preferences.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                Unsaved
              </Badge>
            )}
            <Button
              onClick={saveSettings}
              disabled={!hasChanges || isSaving}
              size="lg"
              className="px-8"
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="tracking" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-8 overflow-x-auto">
            <TabsTrigger value="tracking" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Usage Tracking</TabsTrigger>
            <TabsTrigger value="notifications" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Notifications</TabsTrigger>
            <TabsTrigger value="gamification" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Goals</TabsTrigger>
            <TabsTrigger value="data" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent">Data & Storage</TabsTrigger>
          </TabsList>

          {}
          <TabsContent value="tracking" className="space-y-6 outline-none">
            <Card className="border-none shadow-sm bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  Activity Detection
                </CardTitle>
                <CardDescription>
                  Decide how your work activity is captured localy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-background rounded-xl border">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold">Automatic Background Tracking</Label>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Continuously monitor active applications while you work.
                      </p>
                    </div>
                    <Switch
                      checked={settings.tracking.autoTrack}
                      onCheckedChange={(checked) => updateSetting('tracking', 'autoTrack', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-background rounded-xl border">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold">Capture Private Tabs</Label>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Include incognito/private browsing domain data in reports.
                      </p>
                    </div>
                    <Switch
                      checked={settings.tracking.trackPrivateTabs}
                      onCheckedChange={(checked) => updateSetting('tracking', 'trackPrivateTabs', checked)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold">Sync Frequency</Label>
                      <span className="text-primary font-mono bg-primary/10 px-2 py-1 rounded text-sm">{settings.tracking.syncInterval}s</span>
                    </div>
                    <Slider
                      value={[settings.tracking.syncInterval]}
                      onValueChange={([v]) => updateSetting('tracking', 'syncInterval', v)}
                      max={300} min={10} step={10}
                    />
                    <p className="text-xs text-muted-foreground">How often data is saved to your local database.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="font-semibold">Min Session Filter</Label>
                      <span className="text-primary font-mono bg-primary/10 px-2 py-1 rounded text-sm">{settings.tracking.minSessionTime}m</span>
                    </div>
                    <Slider
                      value={[settings.tracking.minSessionTime]}
                      onValueChange={([v]) => updateSetting('tracking', 'minSessionTime', v)}
                      max={30} min={1} step={1}
                    />
                    <p className="text-xs text-muted-foreground">Ignore distracting apps used for less than this time.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {}
          <TabsContent value="notifications" className="space-y-6 outline-none">
            <Card className="border-none shadow-sm bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Local Alerts
                </CardTitle>
                <CardDescription>
                  Manage desktop notifications for focus and achievements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'productivityAlerts', label: 'Productivity Drops', desc: 'Alert when target score falls below 70%' },
                    { id: 'todoReminders', label: 'Todo Reminders', desc: 'Alert when tasks are due within 15 minutes' },
                    { id: 'achievements', label: 'Achievement Badges', desc: 'Notify on reaching focus milestones' },
                    { id: 'dailyReminders', label: 'Daily Review', desc: 'Summary of the day\'s performance' },
                    { id: 'email', label: 'Email Reports', desc: 'Weekly PDF summary to your inbox' }
                  ].map((notif) => (
                    <div key={notif.id} className="flex items-center justify-between p-4 bg-background rounded-xl border">
                      <div className="space-y-0.5">
                        <Label className="font-semibold">{notif.label}</Label>
                        <p className="text-xs text-muted-foreground">{notif.desc}</p>
                      </div>
                      <Switch
                        checked={settings.notifications[notif.id as keyof typeof settings.notifications]}
                        onCheckedChange={(checked) => updateSetting('notifications', notif.id, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {}
          <TabsContent value="gamification" className="space-y-6 outline-none">
            <Card className="border-none shadow-sm bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Daily Targets
                </CardTitle>
                <CardDescription>
                  Set the benchmarks for your productivity score.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-6 p-6 bg-background rounded-xl border">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-semibold">Focused Hours Target</Label>
                      <span className="text-xl font-bold text-primary font-mono">{Math.round(settings.gamification.dailyGoals.focusTimeTarget / 60)}h</span>
                    </div>
                    <Slider
                      value={[settings.gamification.dailyGoals.focusTimeTarget]}
                      onValueChange={([v]) => updateNestedSetting('gamification', 'dailyGoals', 'focusTimeTarget', v)}
                      max={600} min={60} step={30}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-semibold">Target Focus Score</Label>
                      <span className="text-xl font-bold text-primary font-mono">{settings.gamification.dailyGoals.focusScoreTarget}%</span>
                    </div>
                    <Slider
                      value={[settings.gamification.dailyGoals.focusScoreTarget]}
                      onValueChange={([v]) => updateNestedSetting('gamification', 'dailyGoals', 'focusScoreTarget', v)}
                      max={100} min={50} step={5}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {}
          <TabsContent value="data" className="space-y-6 outline-none">
            <Card className="border-none shadow-sm bg-muted/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Local Data Vault
                </CardTitle>
                <CardDescription>
                  FocusAI stores all your data locally on this machine.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-5 bg-background rounded-xl border group hover:border-primary transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Full Data Archive</h4>
                      <p className="text-sm text-muted-foreground">Download all tracking history as JSON.</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={exportData}>Download</Button>
                </div>

                <div className="flex items-center justify-between p-5 bg-background rounded-xl border group hover:border-red-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-red-900">Purge Activity History</h4>
                      <p className="text-sm text-red-600/80">Irreversibly delete all focus tracking data.</p>
                    </div>
                  </div>
                  <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => resetData('usage')}>Purge Data</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
