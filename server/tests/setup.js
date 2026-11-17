process.env.JWT_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_EXPIRE = '15m';
process.env.JWT_REFRESH_EXPIRE = '7d';
process.env.NODE_ENV = 'test';
// short-lived event streams so real-time tests finish quickly
process.env.SSE_POLL_MS = '100';
process.env.SSE_MAX_SECONDS = '2';
