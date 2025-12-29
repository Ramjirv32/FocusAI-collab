import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, AlertCircle, Info, Clock, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const Notifications = () => {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    lowFocus: true,
    sessionEnd: true,
    distraction: false,
    dailySummary: true
  });

  useEffect(() => {
    const saved = localStorage.getItem('focusai_notification_prefs');
    if (saved) {
      setPreferences(JSON.parse(saved));
    }
  }, []);

  const togglePreference = (key: string) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    localStorage.setItem('focusai_notification_prefs', JSON.stringify(newPrefs));

    toast({
      title: "Preference Updated",
      description: "Your notification settings have been saved locally.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Focus Alerts</h2>
            <p className="text-muted-foreground">
              Recent activity and productivity notifications
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Trash2 className="h-4 w-4" />
              <span>Clear All</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="all">All Alerts</TabsTrigger>
            <TabsTrigger value="focus">Focus Score</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-6">
            <div className="space-y-3">
              <Card className="relative border-l-4 border-l-blue-500 hover:bg-muted/30 transition-colors">
                <span className="absolute right-3 top-3">
                  <Badge variant="outline" className="bg-blue-50">Active</Badge>
                </span>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Low Focus Detected</CardTitle>
                      <CardDescription className="text-sm">Your productivity has dipped below your target of 70% in the last hour.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>45 minutes ago</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">Dismiss</Button>
                      <Button size="sm" variant="outline">Analyze</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative border-l-4 border-l-green-500 hover:bg-muted/30 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Focus Goal Reached!</CardTitle>
                      <CardDescription className="text-sm">Congratulations! You've completed 4 hours of focused work today.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>3 hours ago</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">Dismiss</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="focus">
            <div className="pt-4">
              <Card className="relative border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Low Focus Detected</CardTitle>
                      <CardDescription className="text-sm">Your productivity has dipped below target.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements">
            <div className="pt-4 text-center py-10 text-muted-foreground border rounded-lg border-dashed">
              No new achievements to show.
            </div>
          </TabsContent>
        </Tabs>

        {}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Alert Preferences</CardTitle>
            <CardDescription>Control which FocusAI notifications you want to see</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <div className="font-medium">Focus Score Thresholds</div>
                    <div className="text-sm text-muted-foreground">Alert when focus drops below your daily target</div>
                  </div>
                  <Switch
                    checked={preferences.lowFocus}
                    onCheckedChange={() => togglePreference('lowFocus')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <div className="font-medium">Session Completions</div>
                    <div className="text-sm text-muted-foreground">Notify when you reach your focus time goals</div>
                  </div>
                  <Switch
                    checked={preferences.sessionEnd}
                    onCheckedChange={() => togglePreference('sessionEnd')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <div className="font-medium">Distraction Alerts</div>
                    <div className="text-sm text-muted-foreground">Real-time alerts when browsing distracting sites</div>
                  </div>
                  <Switch
                    checked={preferences.distraction}
                    onCheckedChange={() => togglePreference('distraction')}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-3">
                  <div className="space-y-0.5">
                    <div className="font-medium">Daily Summary</div>
                    <div className="text-sm text-muted-foreground">Receive a summary of your productivity at the end of the day</div>
                  </div>
                  <Switch
                    checked={preferences.dailySummary}
                    onCheckedChange={() => togglePreference('dailySummary')}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Notifications;
