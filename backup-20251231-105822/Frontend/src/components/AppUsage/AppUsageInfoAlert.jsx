import React, { useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const AppUsageInfoAlert = () => {
  const [dismissed, setDismissed] = useState(false);
  
  if (dismissed) return null;
  
  return (
    <Alert className="mb-4">
      <div className="flex items-start">
        <div className="mr-2 mt-1">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <AlertTitle className="mb-1">App Usage Data Collection</AlertTitle>
          <AlertDescription className="text-sm">
            <p className="mb-2">
              To collect application usage data, make sure the FocusAI extension is installed and active. 
              Your data will appear automatically after using your computer for a while.
            </p>
            <div className="flex items-center gap-2 text-xs mt-1">
              <div className="flex items-center">
                <Check className="h-3 w-3 mr-1 text-green-500" />
                <span>Automatic tracking</span>
              </div>
              <div className="flex items-center">
                <Check className="h-3 w-3 mr-1 text-green-500" />
                <span>Privacy focused</span>
              </div>
              <div className="flex items-center">
                <Check className="h-3 w-3 mr-1 text-green-500" />
                <span>Local data storage</span>
              </div>
            </div>
          </AlertDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} className="ml-2 h-7 px-2">
          Dismiss
        </Button>
      </div>
    </Alert>
  );
};

export default AppUsageInfoAlert;
