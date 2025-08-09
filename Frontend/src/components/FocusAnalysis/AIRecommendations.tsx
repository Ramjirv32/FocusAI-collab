import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, TrendingUp, AlertTriangle } from 'lucide-react';
import FocusDataInfoAlert from './FocusDataInfoAlert';

interface RecommendationProps {
  focusPercentage: number;
  productiveApps: string[];
  distractingApps: string[];
  hasData?: boolean;
}

const AIRecommendations: React.FC<RecommendationProps> = ({ 
  focusPercentage, 
  productiveApps, 
  distractingApps,
  hasData = true
}) => {
  // Generate recommendations based on the focus data
  const getRecommendations = () => {
    const recommendations = [];
    
    // Focus score recommendations
    if (focusPercentage < 30) {
      recommendations.push({
        title: "Critical Focus Improvement Needed",
        description: "Your focus level is critically low. Try the Pomodoro technique with 25 minutes of focus followed by 5-minute breaks.",
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />
      });
    } else if (focusPercentage < 60) {
      recommendations.push({
        title: "Moderate Focus Improvement Needed",
        description: "Your focus could use improvement. Try setting specific work hours and minimizing distractions during those times.",
        icon: <TrendingUp className="h-5 w-5 text-yellow-500" />
      });
    } else {
      recommendations.push({
        title: "Good Focus Maintenance",
        description: "You're maintaining good focus levels. Keep up the good work and consider setting higher productivity goals.",
        icon: <Lightbulb className="h-5 w-5 text-green-500" />
      });
    }
    
    // Distraction recommendations
    if (distractingApps.length > 0) {
      const topDistractions = distractingApps.slice(0, 2).map(app => app).join(" and ");
      recommendations.push({
        title: "Limit Distracting Applications",
        description: `Consider using app blockers or time limits for ${topDistractions} to improve your focus.`,
        icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />
      });
    }
    
    // Productive app recommendations
    if (productiveApps.length > 0) {
      const topProductive = productiveApps[0];
      recommendations.push({
        title: "Leverage Your Most Productive Applications",
        description: `You're most focused when using ${topProductive}. Consider structuring more of your work around this tool.`,
        icon: <Lightbulb className="h-5 w-5 text-green-500" />
      });
    }
    
    return recommendations;
  };
  
  const recommendations = getRecommendations();
  
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          AI Recommendations
        </CardTitle>
        <CardDescription>
          Personalized suggestions to improve your focus
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <FocusDataInfoAlert />
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec, index) => (
              <div key={index} className="border-l-4 border-primary pl-3 py-1">
                <div className="flex items-center gap-2 mb-1">
                  {rec.icon}
                  <h4 className="font-medium">{rec.title}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{rec.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIRecommendations;