export const errorHandler = (err, req, res, next) => {
  console.error('Server error:', err);
  
  // Handle rate limit errors
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      message: err.message,
      retryAfter: err.headers['retry-after']
    });
  }

  // Handle other errors
  res.status(err.status || 500).json({
    success: false,
    error: err.status === 500 ? 'Internal server error' : err.message,
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}; 