// Helper functions for Gamification.tsx

// Function to get badge colors based on type
export const getBadgeColor = (type) => {
  const colors = {
    bronze: 'bg-amber-200 text-amber-800',
    silver: 'bg-gray-300 text-gray-700',
    gold: 'bg-yellow-300 text-yellow-800',
    platinum: 'bg-cyan-200 text-cyan-800',
    diamond: 'bg-indigo-200 text-indigo-800',
    master: 'bg-purple-200 text-purple-800',
    legendary: 'bg-rose-200 text-rose-800',
  };
  return colors[type] || colors.bronze;
};

// Function to get badge variants based on type
export const getBadgeVariant = (type) => {
  const variants = {
    bronze: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    silver: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
    gold: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
    platinum: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200',
    diamond: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
    master: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    legendary: 'bg-rose-100 text-rose-800 hover:bg-rose-200',
  };
  return variants[type] || variants.bronze;
};

// Function to format date strings
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  }).format(date);
};
