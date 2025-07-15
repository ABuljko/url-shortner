import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import io from 'socket.io-client';

const socket = io('http://localhost:5000');

function App() {
  const [url, setUrl] = useState('');
  const [short, setShort] = useState('');
  const [clicks, setClicks] = useState([]);

  const handleSubmit = async () => {
    const res = await fetch('http://localhost:5000/api/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ originalUrl: url }),
    });
    const data = await res.json();
    setShort(data.shortUrl);
  };

  useEffect(() => {
    socket.on('new_click', (data) => {
      setClicks(prev => [data, ...prev]);
    });
  }, []);

  return (
    <div>
      <h1>URL Shortener + Analytics</h1>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Enter URL" />
      <button onClick={handleSubmit}>Shorten</button>
      {short && <p>Short URL: <a href={short}>{short}</a></p>}

      <h2>Live Clicks</h2>
      <ul>
        {clicks.map((c, i) => (
          <li key={i}>
            {c.timestamp} — {c.country}, {c.city} — {c.userAgent}
          </li>
        ))}
      </ul>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
