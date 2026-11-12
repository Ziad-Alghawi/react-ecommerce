// Comma-separated list of frontend origins allowed to call the API from another domain
export const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());
