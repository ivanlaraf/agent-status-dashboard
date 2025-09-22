/**
 * Application configuration
 */
export const config = {
  // API configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://example.execute-api.us-east-1.amazonaws.com/dev',
  
  // App metadata
  APP_NAME: 'Agent Status Dashboard',
  APP_DESCRIPTION: 'Monitor agent status changes and activity timeline',
  
  // Business hours (24-hour format)
  BUSINESS_HOURS: {
    start: 9, // 09:00
    end: 18,  // 18:00
  },
  
  // Status colors and configuration
  STATUS_CONFIG: {
    Available: { color: 'success', icon: '🟢' },
    Busy: { color: 'destructive', icon: '🔴' },
    Offline: { color: 'secondary', icon: '⚪' },
    Disconnect: { color: 'warning', icon: '🟠' },
  },
} as const;