import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface FocusScoreProps {
  productivityScore: number;
  focusedMinutes: number;
  distractedMinutes: number;
  totalMinutes: number;
}

const FocusScore: React.FC<FocusScoreProps> = ({ 
  productivityScore, 
  focusedMinutes, 
  distractedMinutes,
  totalMinutes
}) => {
  // Helper function to format time
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    
    if (hours === 0) {
      return `${mins}m`;
    }
    
    return `${hours}h ${mins}m`;
  };
  
  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const scoreColor = getScoreColor(productivityScore);
  
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Focus Score</span>
          <span className={`text-2xl font-bold ${scoreColor}`}>
            {productivityScore}%
          </span>
        </CardTitle>
        <CardDescription>
          Your AI-analyzed productivity metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Progress value={productivityScore} className="h-2.5 mb-1" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-sm font-medium mb-1">Focused Time</p>
              <p className="text-2xl font-bold text-green-500">{formatTime(focusedMinutes)}</p>
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Distracted Time</p>
              <p className="text-2xl font-bold text-red-500">{formatTime(distractedMinutes)}</p>
            </div>
          </div>
          
          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              Total tracked time: <span className="font-medium">{formatTime(totalMinutes)}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FocusScore;