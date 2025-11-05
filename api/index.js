// Vercel serverless function entry point
try {
  const app = require('../dist/app.js');

  // Export the Express app for Vercel
  module.exports = app.default || app;
} catch (error) {
  console.error('Error loading app:', error);

  // Fallback function that returns error info
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to load application',
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  };
}
