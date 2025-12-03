/**
 * HanapBahay Backend Server
 * Express.js server for handling API requests, including Paymongo integration
 * 
 * To run:
 *   1. Install dependencies: npm install express cors dotenv
 *   2. Set environment variables in .env file
 *   3. Run: node server/server.js
 * 
 * The server will run on port 3000 by default (or PORT environment variable)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load .env file from server directory
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'HanapBahay API Server',
  });
});

// API Routes
app.use('/api/paymongo', require('./paymongo-routes'));

// Payment return endpoint (for PayMongo redirects)
// This endpoint is used as return_url for PayMongo e-wallet payments
// The WebView will intercept this URL and handle it in the app
app.get('/payment-return', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Payment Return</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            max-width: 400px;
            margin: 0 auto;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Payment Processing...</h2>
          <p>Please wait while we process your payment.</p>
          <p>You can close this window.</p>
        </div>
        <script>
          // Try to redirect to app if possible
          setTimeout(function() {
            try {
              window.location.href = 'hanapbahay://payment-return';
            } catch(e) {
              // Deep link not available, page will stay
            }
          }, 1000);
        </script>
      </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
// Bind to 0.0.0.0 to accept connections from Railway/external hosts
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 HanapBahay API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 Paymongo routes: http://localhost:${PORT}/api/paymongo`);
  
  // Check for required environment variables
  if (!process.env.PAYMONGO_SECRET_KEY) {
    console.warn('⚠️  PAYMONGO_SECRET_KEY not set. Paymongo features will not work.');
  }
  if (!process.env.PAYMONGO_PUBLIC_KEY) {
    console.warn('⚠️  PAYMONGO_PUBLIC_KEY not set. Paymongo features will not work.');
  }
});

module.exports = app;

