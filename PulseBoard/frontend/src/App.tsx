import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import './index.css';

interface Source { id: string; label: string; url: string; type: string; }
interface Notification { id: number; title: string; body: string; url: string; timestamp: number; read: boolean; }

const dbPromise = openDB('pulseboard-db', 1, {
  upgrade(db) {
    db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
  }
});

function App() {
  const [sources, setSources] = useState<Source[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Form state
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('rss');

  useEffect(() => {
    fetchSources();
    loadNotifications();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setIsSubscribed(true);
        });
      });
    }

    const int = setInterval(loadNotifications, 3000);
    return () => clearInterval(int);
  }, []);

  const loadNotifications = async () => {
    try {
      const db = await dbPromise;
      const all = await db.getAll('notifications');
      setNotifications(all.sort((a,b) => b.timestamp - a.timestamp));
    } catch(e) {}
  };

  const fetchSources = async () => {
    try {
      const res = await fetch('http://localhost:8082/sources');
      setSources(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  };

  const subscribePush = async () => {
    try {
      if (!('serviceWorker' in navigator)) return alert('Service Worker not supported');
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission was denied. Please allow notifications in your browser settings (usually the lock icon next to the URL).');
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      const res = await fetch('http://localhost:8082/vapidPublicKey');
      if (!res.ok) throw new Error('Failed to fetch VAPID key');
      const vapidPublicKey = await res.text();
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      
      const subRes = await fetch('http://localhost:8082/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      });
      
      if (!subRes.ok) throw new Error('Failed to post subscription to backend');
      
      setIsSubscribed(true);
      alert('Subscribed successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Subscription failed: ${err.message}`);
    }
  };

  const addSource = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:8082/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, url, type })
    });
    if (res.ok) {
      setLabel(''); setUrl('');
      fetchSources();
    } else {
      alert("Failed to add source (invalid URL or unreachable)");
    }
  };

  const deleteSource = async (id: string) => {
    await fetch(`http://localhost:8082/sources/${id}`, { method: 'DELETE' });
    fetchSources();
  };

  const markAsRead = async (id: number, url: string) => {
    const db = await dbPromise;
    const notif = await db.get('notifications', id);
    notif.read = true;
    await db.put('notifications', notif);
    loadNotifications();
    window.open(url, '_blank');
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="container">
      <nav>
        <h1>PulseBoard</h1>
        <div className="nav-actions">
          <span className="badge">Unread: {unreadCount}</span>
          {!isSubscribed ? (
            <button onClick={subscribePush}>Enable Push Notifications</button>
          ) : (
            <span className="subscribed">✅ Push Enabled</span>
          )}
        </div>
      </nav>

      <div className="grid">
        <div className="panel">
          <h2>Sources</h2>
          <form onSubmit={addSource} className="source-form">
            <input type="text" placeholder="Label (e.g. Hacker News)" value={label} onChange={e=>setLabel(e.target.value)} required />
            <input type="url" placeholder="URL" value={url} onChange={e=>setUrl(e.target.value)} required />
            <select value={type} onChange={e=>setType(e.target.value)}>
              <option value="rss">RSS Feed</option>
              <option value="json">JSON Webhook</option>
            </select>
            <button type="submit">Add Source</button>
          </form>

          <ul className="source-list">
            {sources.map(s => (
              <li key={s.id}>
                <div>
                  <strong>{s.label}</strong> <span className="type-badge">{s.type.toUpperCase()}</span>
                  <div className="url-text">{s.url}</div>
                </div>
                <button className="danger" onClick={() => deleteSource(s.id)}>Remove</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h2>Notification History</h2>
          {notifications.length === 0 ? (
            <p className="empty">No notifications yet. They will appear here when your sources update.</p>
          ) : (
            <div className="notif-list">
              {notifications.map(n => (
                <div className={`notif-card ${!n.read ? 'unread' : ''}`} key={n.id} onClick={() => markAsRead(n.id, n.url)}>
                  <div className="notif-header">
                    <strong>{n.title}</strong>
                    <span>{new Date(n.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p>{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
