import React, { useState } from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import FocusAnalysisComponent from '../components/FocusAI/FocusAnalysisComponent';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

const FocusAnalytics = () => {
  const [date, setDate] = useState(new Date());
  
  const handleDateChange = (newDate) => {
    setDate(newDate);
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Focus Analytics</h2>
            <p className="text-muted-foreground">
              Detailed analysis of your productivity and focus
            </p>
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-fit justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, 'PPP')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(date) => date && handleDateChange(date)}
                initialFocus
                disabled={(date) => date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <FocusAnalysisComponent 
          date={format(date, 'yyyy-MM-dd')} 
          onSyncComplete={(data) => console.log('Sync completed:', data)}
        />
      </div>
    </DashboardLayout>
  );
};

export default FocusAnalytics;