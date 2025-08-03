import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Index from './pages/Index';
import FocusAnalytics from './pages/FocusAnalytics';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/focus-analytics',
    element: <FocusAnalytics />,
  },
  // Add other routes
]);

export default router;