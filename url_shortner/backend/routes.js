const express = require('express');
const router = express.Router();
const fs = require('fs');
const axios = require('axios');

const links = {}; // in-memory storage; use DB for production

router.post('/shorten', (req, res) => {
  const { originalUrl } = req.body;
  const shortCode = Math.random().toString(36).substring(2, 8);
  links[shortCode] = originalUrl;
  res.json({ shortUrl: `http://localhost:5000/api/${shortCode}` });
});

router.get('/:code', async (req, res) => {
  const code = req.params.code;
  const originalUrl = links[code];

  if (originalUrl) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const timestamp = new Date().toISOString();

    // Lookup location (free tier, no auth needed)
    const geoURL = `http://ip-api.com/json/${ip}`;
    let locationData = {};

    try {
      const geoRes = await axios.get(geoURL);
      locationData = {
        country: geoRes.data.country,
        city: geoRes.data.city,
        isp: geoRes.data.isp,
      };
    } catch {
      locationData = { country: 'Unknown', city: 'Unknown', isp: 'Unknown' };
    }

    // Save click log
    const log = {
      shortCode: code,
      ip,
      userAgent,
      timestamp,
      ...locationData,
    };

    fs.appendFileSync('analytics/click_logs.json', JSON.stringify(log) + '\n');

    // Emit via WebSocket
    if (req.app.get('io')) {
      req.app.get('io').emit('new_click', log);
    }

    res.redirect(originalUrl);
  } else {
    res.status(404).send('URL not found');
  }
});

module.exports = router;
