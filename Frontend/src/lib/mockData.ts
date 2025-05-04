
import { TabLog } from '@/types';

const domains = [
  'github.com',
  'stackoverflow.com',
  'google.com',
  'youtube.com',
  'twitter.com',
  'linkedin.com',
  'facebook.com',
  'reddit.com',
  'netflix.com',
  'amazon.com'
];

const titles = [
  'GitHub - Your coding projects',
  'Stack Overflow - Where Developers Learn & Share',
  'Google - Search Engine',
  'YouTube - Video Sharing Platform',
  'Twitter - What\'s happening',
  'LinkedIn - Professional Network',
  'Facebook - Connect with friends',
  'Reddit - The front page of the internet',
  'Netflix - Streaming platform',
  'Amazon - Online shopping'
];

// Generate random mock data
export const generateMockTabLogs = (count: number): TabLog[] => {
  const now = new Date();
  const logs: TabLog[] = [];

  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * domains.length);
    const domain = domains[randomIndex];
    const title = titles[randomIndex];
    const randomDuration = Math.floor(Math.random() * 600) + 10; // 10-610 seconds
    
    // Random time within the last 30 days
    const randomTime = new Date(
      now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)
    );
    
    logs.push({
      id: `tab-${i}`,
      title,
      url: `https://${domain}/some-path-${i}`,
      duration: randomDuration,
      timestamp: randomTime.toISOString(),
      favicon: `https://${domain}/favicon.ico`
    });
  }

  // Sort by timestamp, newest first
  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

// Export a set of mock data
export const mockTabLogs = generateMockTabLogs(100);
