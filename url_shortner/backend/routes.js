const express = require('express');
const router = express.Router();
const fs = require('fs');
const axios = require('axios');
const path = require('path');

const LINKS_FILE = path.join(__dirname, '../assets/links.json');
const CLICKS_FILE = path.join(__dirname, '../analytics/click_logs.json');

// Load links from file or initialize
let links = {};
if (fs.existsSync(LINKS_FILE)) {
  links = JSON.parse(fs.readFileSync(LINKS_FILE, 'utf8'));
}

// Save links to file
function saveLinks() {
  fs.writeFileSync(LINKS_FILE, JSON.stringify(links, null, 2));
}

// Generate random code
function generateCode() {
  return Math.random().toString(36).substring(2, 8);
}

// POST /shorten
router.post('/shorten', (req, res) => {
  const { originalUrl, customCode } = req.body;
  if (!originalUrl) return res.status(400).json({ error: 'Missing originalUrl' });

  let shortCode = customCode || generateCode();
  if (links[shortCode]) {
    return res.status(409).json({ error: 'Short code already exists' });
  }
  links[shortCode] = originalUrl;
  saveLinks();
  res.json({ shortUrl: `http://localhost:5000/api/${shortCode}` });
});

// GET /:code
router.get('/:code', async (req, res) => {
  const code = req.params.code;
  const originalUrl = links[code];

  if (originalUrl) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || '';
    const timestamp = new Date().toISOString();

    // Lookup location
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
      referrer,
      timestamp,
      ...locationData,
    };
    fs.appendFileSync(CLICKS_FILE, JSON.stringify(log) + '\n');

    // Emit via WebSocket
    if (req.app.get('io')) {
      req.app.get('io').emit('new_click', log);
    }

    res.redirect(originalUrl);
  } else {
    res.status(404).send('URL not found');
  }
});

// GET /analytics/:code
router.get('/analytics/:code', (req, res) => {
  const code = req.params.code;
  if (!links[code]) return res.status(404).json({ error: 'Short code not found' });

  if (!fs.existsSync(CLICKS_FILE)) return res.json({ clicks: [] });

  const lines = fs.readFileSync(CLICKS_FILE, 'utf8').split('\n').filter(Boolean);
  const clicks = lines
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(log => log && log.shortCode === code);

  res.json({ clicks });
});

module.exports = router;
