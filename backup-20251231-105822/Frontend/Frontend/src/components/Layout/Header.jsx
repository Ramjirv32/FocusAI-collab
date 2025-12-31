import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  BellRing,
  Menu,
  Activity,
  Phone,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import DiagnosticInfo from '@/components/DiagnosticInfo';
import UserMenu from './UserMenu';
import AIModelManager from '@/components/AIModelManager';
import { useNavigate } from 'react-router-dom';
const Header = ({ toggleSidebar, isMobile }) => {
  const [showVoiceMeetingDialog, setShowVoiceMeetingDialog] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const startVoiceMeeting = () => {
    setShowVoiceMeetingDialog(false);
    navigate('/voice-meeting');
  };
  const [restartPending, setRestartPending] = useState(false);
  useEffect(() => {
    const checkRestartPending = () => {
      setRestartPending(localStorage.getItem('focusai_restart_pending') === 'true');
    };
    checkRestartPending();
    window.addEventListener('storage', checkRestartPending);
    const interval = setInterval(checkRestartPending, 2000);
    return () => {
      window.removeEventListener('storage', checkRestartPending);
      clearInterval(interval);
    };
  }, []);
  return (
    <>
      {restartPending && (
        <div className="bg-yellow-100 border-b border-yellow-200 py-2 px-4 flex items-center justify-center gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 text-yellow-800 font-medium text-sm">
            <RefreshCw className="h-4 w-4 animate-spin-slow" />
            <span>Please restart FocusAI services to apply API key changes.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
            onClick={() => {
              localStorage.removeItem('focusai_restart_pending');
              setRestartPending(false);
              window.location.reload();
            }}
          >
            Restart Now (Reload)
          </Button>
        </div>
      )}
      <header className="bg-background z-10 border-b px-4 py-3 sticky top-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="mr-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">FocusAI</h2>
              <p className="text-xs text-muted-foreground">Productivity Hub</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {}
          <Dialog open={showVoiceMeetingDialog} onOpenChange={setShowVoiceMeetingDialog}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              >
                <Phone className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-blue-500" />
                  <span>Start Voice Meeting</span>
                </DialogTitle>
                <DialogDescription>
                  Have a conversation with your FocusAI assistant using voice commands.
                </DialogDescription>
              </DialogHeader>
              <div className="p-4 bg-blue-50 rounded-md my-4">
                <p className="text-sm text-blue-700">
                  Your productivity data will be analyzed to provide personalized voice assistance.
                  You can ask questions about your focus score, productivity habits, and get tips to improve your workflow.
                </p>
              </div>
              <DialogFooter className="sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowVoiceMeetingDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={startVoiceMeeting}
                >
                  <Phone className="h-4 w-4" />
                  Meet with FocusAI
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/notifications')}
          >
            <BellRing className="h-5 w-5" />
          </Button>
          {}
          <AIModelManager />
          {}
          <UserMenu />
        </div>
      </header>
    </>
  );
};
export default Header;
