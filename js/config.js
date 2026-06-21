// ============================================================
// LIGHTHOUSE CHURCH - FRONTEND CONFIGURATION
// Update API_BASE_URL when you deploy your backend
// ============================================================

const CONFIG = {
  // Change this to your deployed backend URL when live
  // e.g. 'https://your-backend.onrender.com/api' or 'https://api.lighthousechurch.org/api'
  API_BASE_URL: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api'
  : 'https://your-actual-backend.onrender.com/api',

  BIBLE_API_URL: 'https://bible-api.com', // free, no key required

  DEFAULT_AVATAR: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEyMCIgaGVpZ2h0PSIxMjAiIGZpbGw9IiMxNDNkNmYiLz48Y2lyY2xlIGN4PSI2MCIgY3k9IjQ1IiByPSIyMiIgZmlsbD0iI2I4OTI0MCIvPjxlbGxpcHNlIGN4PSI2MCIgY3k9IjEwMCIgcng9IjM1IiByeT0iMjUiIGZpbGw9IiNiODkyNDAiLz48L3N2Zz4='
};