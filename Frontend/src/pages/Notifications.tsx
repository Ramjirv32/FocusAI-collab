import React from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, AlertCircle, Info, Clock, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const Notifications = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
            <p className="text-muted-foreground">
              Manage your alerts and notification preferences
            </p>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="focus">Focus</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4 mt-6">
            {/* Today's Notifications */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Today</h3>
              <div className="space-y-3">
                <Card className="relative border-l-4 border-l-blue-500">
                  <span className="absolute right-3 top-3">
                    <Badge variant="outline">New</Badge>
                  </span>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Bell className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Focus Score Alert</CardTitle>
                        <CardDescription className="text-sm">Your focus score has dropped below 70% today</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>2 hours ago</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Dismiss</Button>
                        <Button size="sm">View Details</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="relative border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Achievement Unlocked</CardTitle>
                        <CardDescription className="text-sm">You've earned the "Productivity Wizard" badge!</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>5 hours ago</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Dismiss</Button>
                        <Button size="sm">View Badge</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Yesterday's Notifications */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Yesterday</h3>
              <div className="space-y-3">
                <Card className="relative border-l-4 border-l-yellow-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Weekly Summary</CardTitle>
                        <CardDescription className="text-sm">Your productivity report for last week is ready</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Yesterday at 9:00 AM</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Dismiss</Button>
                        <Button size="sm">View Report</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="relative border-l-4 border-l-indigo-500">
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <Info className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Extension Update</CardTitle>
                        <CardDescription className="text-sm">FocusAI extension has been updated to version 2.1.0</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Yesterday at 5:15 PM</span>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">Dismiss</Button>
                        <Button size="sm">View Changes</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="unread">
            <div className="pt-6 pb-16">
              <Card className="relative border-l-4 border-l-blue-500">
                <span className="absolute right-3 top-3">
                  <Badge variant="outline">New</Badge>
                </span>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Focus Score Alert</CardTitle>
                      <CardDescription className="text-sm">Your focus score has dropped below 70% today</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>2 hours ago</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">Dismiss</Button>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="focus">
            <div className="pt-6 pb-16">
              <Card className="relative border-l-4 border-l-blue-500">
                <span className="absolute right-3 top-3">
                  <Badge variant="outline">New</Badge>
                </span>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Focus Score Alert</CardTitle>
                      <CardDescription className="text-sm">Your focus score has dropped below 70% today</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>2 hours ago</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">Dismiss</Button>
                      <Button size="sm">View Details</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="system">
            <div className="pt-6 pb-16">
              <Card className="relative border-l-4 border-l-indigo-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <Info className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Extension Update</CardTitle>
                      <CardDescription className="text-sm">FocusAI extension has been updated to version 2.1.0</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Yesterday at 5:15 PM</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">Dismiss</Button>
                      <Button size="sm">View Changes</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Customize how and when you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Focus Alerts</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <div className="font-medium">Low Focus Score</div>
                    <div className="text-sm text-muted-foreground">Alert when focus score drops below 70%</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <div className="font-medium">Focus Session End</div>
                    <div className="text-sm text-muted-foreground">Notify when a scheduled focus session ends</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <div className="font-medium">Distraction Detection</div>
                    <div className="text-sm text-muted-foreground">Alert when distracting websites exceed limit</div>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">System Notifications</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <div className="font-medium">Extension Updates</div>
                    <div className="text-sm text-muted-foreground">Notify about new extension versions</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <div className="font-medium">Weekly Reports</div>
                    <div className="text-sm text-muted-foreground">Send weekly productivity summary</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <div className="font-medium">Achievement Unlocks</div>
                    <div className="text-sm text-muted-foreground">Notify when you earn new badges or achievements</div>
                  </div>
                  <Switch defaultChecked />
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
