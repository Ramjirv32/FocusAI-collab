import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Index from './pages/Index';
import FocusAnalytics from './pages/FocusAnalytics';
import Statistics from './pages/Statistics';
import ChatAssistant from './pages/ChatAssistant';
import Gamification from './pages/Gamification';
import Notifications from './pages/Notifications';
import Extension from './pages/Extension';
import Diagnostics from './pages/Diagnostics';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/focus-analytics',
    element: <FocusAnalytics />,
  },
  {
    path: '/statistics',
    element: <Statistics />,
  },
  {
    path: '/chat-assistant',
    element: <ChatAssistant />,
  },
  {
    path: '/gamification',
    element: <Gamification />,
  },
  {
    path: '/notifications',
    element: <Notifications />,
  },
  {
    path: '/extension',
    element: <Extension />,
  },
  {
    path: '/diagnostics',
    element: <Diagnostics />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
  {
    path: '*',
    element: <NotFound />,
  }
]);

export default router;