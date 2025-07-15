import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function App() {
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [short, setShort] = useState('');
  const [clicks, setClicks] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);

  const handleSubmit = async () => {
    setError('');
    setCopied(false);
    if (!isValidUrl(url)) {
      setError('Please enter a valid URL (including http:// or https://)');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalUrl: url, customCode: customCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to shorten URL');
      setShort(data.shortUrl);
      setUrl('');
      setCustomCode('');
      // Fetch analytics for this code
      const code = data.shortUrl.split('/').pop();
      fetchAnalytics(code);
    } catch (e) {
      setError(e.message || 'Failed to shorten URL. Please try again.');
    }
    setLoading(false);
  };

  const fetchAnalytics = async (code) => {
    try {
      const res = await fetch(`http://localhost:5000/api/analytics/${code}`);
      const data = await res.json();
      setClicks(data.clicks || []);
    } catch {
      setClicks([]);
    }
  };

  const handleCopy = async () => {
    if (short) {
      await navigator.clipboard.writeText(short);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  useEffect(() => {
    socket.on('new_click', (data) => {
      setClicks(prev => [data, ...prev]);
    });
    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect', () => setSocketConnected(true));
    return () => {
      socket.off('new_click');
      socket.off('disconnect');
      socket.off('connect');
    };
  }, []);

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>URL Shortener + Analytics</h1>
      <div style={{ marginBottom: 16 }}>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL"
          style={{ width: 300, padding: 8, fontSize: 16 }}
          disabled={loading}
        />
        <input
          value={customCode}
          onChange={(e) => setCustomCode(e.target.value)}
          placeholder="Custom code (optional)"
          style={{ width: 150, padding: 8, fontSize: 16, marginLeft: 8 }}
          disabled={loading}
        />
        <button onClick={handleSubmit} disabled={loading} style={{ marginLeft: 8, padding: '8px 16px' }}>
          {loading ? 'Shortening...' : 'Shorten'}
        </button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      {short && (
        <div style={{ marginBottom: 16 }}>
          <span>Short URL: <a href={short} target="_blank" rel="noopener noreferrer">{short}</a></span>
          <button onClick={handleCopy} style={{ marginLeft: 8 }}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
      {!socketConnected && (
        <div style={{ color: 'orange', marginBottom: 8 }}>
          Live analytics disconnected. Trying to reconnect...
        </div>
      )}
      <h2>Live Clicks</h2>
      {clicks.length === 0 ? (
        <div>No clicks yet.</div>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Country</th>
              <th>City</th>
              <th>User Agent</th>
              <th>Referrer</th>
            </tr>
          </thead>
          <tbody>
            {clicks.map((c, i) => (
              <tr key={i}>
                <td>{c.timestamp}</td>
                <td>{c.country}</td>
                <td>{c.city}</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.userAgent}</td>
                <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.referrer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
