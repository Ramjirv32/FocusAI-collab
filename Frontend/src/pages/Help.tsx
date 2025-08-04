import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HelpCircle, Book, MessageCircle, Mail, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/Layout/MainLayout';

const Help = () => {
  const navigate = useNavigate();

  const helpCategories = [
    {
      title: 'Getting Started',
      description: 'Learn the basics of FocusAI',
      icon: Book,
      items: [
        'How to set up productivity tracking',
        'Understanding focus scores',
        'Customizing your dashboard',
        'Setting productivity goals'
      ]
    },
    {
      title: 'FAQ',
      description: 'Frequently asked questions',
      icon: HelpCircle,
      items: [
        'How does the focus scoring work?',
        'What data is being tracked?',
        'How to export my data?',
        'Privacy and security information'
      ]
    },
    {
      title: 'Contact Support',
      description: 'Get help from our team',
      icon: MessageCircle,
      items: [
        'Email support team',
        'Live chat assistance',
        'Request a feature',
        'Report a bug'
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
              <HelpCircle className="h-8 w-8 text-primary" />
              Help & Support
            </h1>
            <p className="text-muted-foreground mt-1">
              Get assistance and learn how to use FocusAI effectively
            </p>
          </div>
        </div>

        {/* Help Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {helpCategories.map((category, index) => (
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
                <ul className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                      {item}
                      <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Help */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Help</CardTitle>
            <CardDescription>
              Common questions and quick actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">View Tutorial</div>
                  <div className="text-sm text-muted-foreground">Interactive guide to get started</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Contact Support</div>
                  <div className="text-sm text-muted-foreground">Get help from our team</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Video Guides</div>
                  <div className="text-sm text-muted-foreground">Watch how-to videos</div>
                </div>
              </Button>
              <Button variant="outline" className="justify-start h-auto p-4">
                <div className="text-left">
                  <div className="font-medium">Community Forum</div>
                  <div className="text-sm text-muted-foreground">Connect with other users</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Get in touch with our support team
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="font-medium">Email:</span>
              <span className="text-muted-foreground">support@focusai.com</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">Response Time:</span>
              <span className="text-muted-foreground">Within 24 hours</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">Available:</span>
              <span className="text-muted-foreground">Monday - Friday, 9 AM - 5 PM EST</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Help;
