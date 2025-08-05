import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Clock, Target, Activity } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Link } from 'react-router-dom';

interface FocusScoreCardProps {
  stats?: any;
  isLoading?: boolean;
  error?: string | null;
  onSync?: () => void;
}

interface FocusScoreData {
  focus_score: number;
  total_productive_time: number;
  total_non_productive_time: number;
  overall_total_usage: number;
  max_productive_app: string;
  most_used_app: string;
  most_visited_tab: string;
}

interface FocusAnalysisData {
  summary: {
    productivity_score: number;
    focused_duration_minutes: number;
    distracted_duration_minutes: number;
    total_duration_minutes: number;
    most_focused_app: string;
    most_distracting_app: string;
    focus_percentage: number;
  };
}

const FocusScoreCard: React.FC<FocusScoreCardProps> = ({ 
  stats: propStats, 
  isLoading: propIsLoading = false, 
  error: propError = null, 
  onSync 
}) => {
  const { user } = useAuth();
  const [productivityData, setProductivityData] = useState<FocusScoreData | null>(null);
  const [focusData, setFocusData] = useState<FocusAnalysisData | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Use props if available, otherwise use internal state
  const isLoading = propIsLoading || internalLoading;
  const error = propError || internalError;

  const fetchFocusScore = useCallback(async () => {
    if (!user) return;

    setInternalLoading(true);
    setInternalError(null);

    try {
      const today = new Date().toISOString().slice(0, 10);
      console.log(`🔄 Fetching focus score for ${user.email} on ${today}`);

      // Fetch productivity summary (same as Focus Analytics)
      const productivityResponse = await fetch(
        `http://localhost:8000/user/${user.id}/productivity-summary?date=${today}&email=${user.email}`
      );

      if (productivityResponse.ok) {
        const productivityResult = await productivityResponse.json();
        setProductivityData(productivityResult);
        console.log('✅ Productivity data loaded:', productivityResult);
      }

      // Fetch focus analysis (same as Focus Analytics)
      const focusResponse = await fetch(
        `http://localhost:8000/user/${user.id}/productivity-analysis?date=${today}&email=${user.email}`
      );

      if (focusResponse.ok) {
        const focusResult = await focusResponse.json();
        setFocusData(focusResult);
        console.log('✅ Focus data loaded:', focusResult);
      }

    } catch (err) {
      console.error('❌ Error fetching focus score:', err);
      setInternalError('Failed to load focus score');
    } finally {
      setInternalLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Only fetch data internally if no props are provided
    if (!propStats) {
      fetchFocusScore();
      
      // Refresh every 30 seconds only if not using props
      const interval = setInterval(fetchFocusScore, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchFocusScore, propStats]);

  // Format time duration (minutes to readable format)
  const formatTime = (minutes: number) => {
    if (!minutes) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${remainingMinutes}m`;
  };

  const getFocusScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getFocusScoreLabel = (score: number) => {
    if (score >= 70) return 'Excellent';
    if (score >= 50) return 'Good';
    return 'Needs Improvement';
  };

  // Extract data from props or internal state
  let focusScore = 0;
  let totalTime = 0;
  let productiveTime = 0;
  let distractedTime = 0;
  let totalActivities = 0;
  let mostUsedApp = 'None';

  if (propStats) {
    // Use props data (from Dashboard) - convert productivity score to focus score
    focusScore = propStats.focus_score || propStats.productivity_score || 0;
    productiveTime = propStats.focus_time_minutes || 0;
    distractedTime = propStats.distraction_time_minutes || 0;
    totalTime = productiveTime + distractedTime;
    totalActivities = propStats.total_activities || 0;
    mostUsedApp = propStats.most_productive_app || 'None';
  } else if (focusData || productivityData) {
    // Use internal data - prioritize focus_score over productivity_score
    focusScore = productivityData?.focus_score || focusData?.summary?.focus_percentage || 
                focusData?.summary?.productivity_score || 0;
    totalTime = focusData?.summary?.total_duration_minutes || 
      Math.round((productivityData?.overall_total_usage || 0) / 60);
    productiveTime = focusData?.summary?.focused_duration_minutes || 
      Math.round((productivityData?.total_productive_time || 0) / 60);
    distractedTime = focusData?.summary?.distracted_duration_minutes || 
      Math.round((productivityData?.total_non_productive_time || 0) / 60);
    totalActivities = 0; // Will be set from propStats if available
    mostUsedApp = focusData?.summary?.most_focused_app || 
      productivityData?.most_used_app || 'None';
  }

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">AI Focus Analysis</CardTitle>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
            <p className="text-sm text-muted-foreground mt-2">
              Analyzing your focus insights...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || (focusScore === 0 && totalTime === 0)) {
    return (
      <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">AI Focus Analysis</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSync || fetchFocusScore}
              className="h-8 w-8 p-0"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-muted-foreground">--</div>
            <p className="text-sm text-muted-foreground mt-2">
              {error || 'No focus data available. Click refresh to sync.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">🤖 AI Focus Analysis</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onSync || fetchFocusScore}
            className="h-8 w-8 p-0"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Your focus insights for {new Date().toLocaleDateString()}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Focus Score */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <Target className="h-5 w-5 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">FOCUS SCORE</span>
            </div>
            <p className={`text-2xl font-bold ${getFocusScoreColor(focusScore)}`}>
              {focusScore}%
            </p>
            <p className="text-xs text-muted-foreground">
              {getFocusScoreLabel(focusScore)}
            </p>
          </div>

          {/* Total Usage Time */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="text-xs font-medium text-muted-foreground">TOTAL TIME</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{formatTime(totalTime)}</p>
            <p className="text-xs text-muted-foreground">Total usage today</p>
          </div>

          {/* Total Activities */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <Activity className="h-5 w-5 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">ACTIVITIES</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{totalActivities}</p>
            <p className="text-xs text-muted-foreground">Total activities</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Productive Time:</span>
              <span className="font-semibold ml-2 text-green-600">{formatTime(productiveTime)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Top App:</span>
              <span className="font-semibold ml-2">{mostUsedApp}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          {onSync && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onSync} 
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Syncing...' : 'Refresh Stats'}
            </Button>
          )}
          
          <Link to="/focus-analytics">
            <Button variant="outline" size="sm" className="gap-2 ml-auto">
              <TrendingUp className="h-4 w-4" />
              View Analytics
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default FocusScoreCard;
