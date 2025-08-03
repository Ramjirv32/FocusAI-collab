import React, { useState } from 'react';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';
import { runDiagnostics } from '../utils/diagnostics';
import { AlertCircle, CheckCircle, LifeBuoy } from 'lucide-react';

const DiagnosticButton = () => {
  const [isRunning, setIsRunning] = useState(false);
  
  const handleRunDiagnostics = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    
    try {
      toast({
        title: "Running diagnostics...",
        description: "Checking connection to all services",
      });
      
      const results = await runDiagnostics();
      
      // Format results for toast
      let messages = [];
      
      if (results.aiServer.success) {
        messages.push(`✅ AI Server: Online (${results.aiServer.status})`);
      } else {
        messages.push(`❌ AI Server: Offline (${results.aiServer.message})`);
      }
      
      if (results.backendServer.success) {
        messages.push(`✅ Backend Server: Online (${results.backendServer.status})`);
      } else {
        messages.push(`❌ Backend Server: Offline (${results.backendServer.message})`);
      }
      
      toast({
        title: "Diagnostic Results",
        description: messages.join('\n'),
        variant: results.aiServer.success && results.backendServer.success ? 
          "default" : "destructive"
      });
      
    } catch (error) {
      console.error('Error running diagnostics:', error);
      toast({
        title: "Diagnostic Error",
        description: `Error running diagnostics: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleRunDiagnostics}
      disabled={isRunning}
      className="gap-1"
    >
      {isRunning ? (
        <>
          <div className="h-3 w-3 animate-spin rounded-full border border-primary border-t-transparent"></div>
          Running...
        </>
      ) : (
        <>
          <LifeBuoy className="h-3.5 w-3.5" />
          Diagnostics
        </>
      )}
    </Button>
  );
};

export default DiagnosticButton;