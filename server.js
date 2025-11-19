const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from React build
app.use(express.static('client/build'));

// Proxy endpoint
app.post('/api/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, data = null } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL to prevent SSRF attacks
    const urlObj = new URL(url);
    const blockedHosts = ['localhost', '127.0.0.1', '192.168', '10.', '172.'];
    const isBlocked = blockedHosts.some(host => urlObj.hostname.includes(host));

    if (isBlocked) {
      return res.status(403).json({ error: 'Access to this host is blocked' });
    }

    const response = await axios({
      url: url,
      method: method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...headers
      },
      data: data,
      timeout: 10000
    });

    res.json({
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      status: error.response?.status || 500
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Catch-all to serve React app
app.get('*', (req, res) => {
  res.sendFile('client/build/index.html', { root: __dirname });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});