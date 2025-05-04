
import React from 'react';
import { Button } from '@/components/ui/button';
import { TimeFrame } from '@/types';

interface TimeFrameSelectorProps {
  selectedTimeFrame: TimeFrame;
  onTimeFrameChange: (timeFrame: TimeFrame) => void;
}

const TimeFrameSelector: React.FC<TimeFrameSelectorProps> = ({ 
  selectedTimeFrame, 
  onTimeFrameChange 
}) => {
  return (
    <div className="flex space-x-2 mb-4">
      <Button
        variant={selectedTimeFrame === 'daily' ? 'default' : 'outline'}
        onClick={() => onTimeFrameChange('daily')}
        className="rounded-full"
      >
        Daily
      </Button>
      <Button
        variant={selectedTimeFrame === 'weekly' ? 'default' : 'outline'}
        onClick={() => onTimeFrameChange('weekly')}
        className="rounded-full"
      >
        Weekly
      </Button>
      <Button
        variant={selectedTimeFrame === 'monthly' ? 'default' : 'outline'}
        onClick={() => onTimeFrameChange('monthly')}
        className="rounded-full"
      >
        Monthly
      </Button>
    </div>
  );
};

export default TimeFrameSelector;
