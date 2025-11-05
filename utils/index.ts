// Re-export all utilities
export * from './auth-user';
export * from './mock-auth';
export * from './mockData';
export * from './supabase-client';
export * from './notifications';
export * from './view-tracking';

// Utility functions
export const formatPrice = (price: number): string => {
  // Format as peso currency with explicit peso sign
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
  return `₱${formatted}`;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
