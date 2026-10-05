import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';
import './index.css';

interface ClipEntry {
  id: string;
  content: string;
  type: 'text' | 'link';
  device: string;
  timestamp: number;
}

function App() {
  const [sessionId, setSessionId] = useState('');
  const [inSession, setInSession] = useState(false);
  const [clips, setClips] = useState<ClipEntry[]>([]);
  const [usersCount, setUsersCount] = useState(0);
  const [burnAfterSync, setBurnAfterSync] = useState(false);
  const [device] = useState(() => {
    const ua = navigator.userAgent;
    if (ua.includes('Mobile')) return 'Mobile Device';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Mac OS')) return 'Mac';
    return 'Unknown Device';
  });

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('http://localhost:5000', { autoConnect: false });
    socketRef.current = socket;

    socket.on('sync_history', (history: ClipEntry[]) => {
      setClips(history);
    });

    socket.on('new_clip', (clip: ClipEntry) => {
      setClips(prev => [clip, ...prev.filter(c => c.id !== clip.id)]);
    });

    socket.on('clip_deleted', (clipId: string) => {
      setClips(prev => prev.filter(c => c.id !== clipId));
    });

    socket.on('history_cleared', () => {
      setClips([]);
    });

    socket.on('user_joined', ({ usersCount: count }) => setUsersCount(count));
    socket.on('user_left', ({ usersCount: count }) => setUsersCount(count));

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinSession = (id: string = sessionId) => {
    if (!id.trim()) return;
    setSessionId(id);
    setInSession(true);
    socketRef.current?.connect();
    socketRef.current?.emit('join_session', { sessionId: id, device, burnAfterSync });
  };

  const createSession = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    joinSession(code);
  };

  const leaveSession = () => {
    socketRef.current?.disconnect();
    setInSession(false);
    setSessionId('');
    setClips([]);
    setUsersCount(0);
  };

  const isLink = (text: string) => {
    try {
      new URL(text);
      return true;
    } catch {
      return false;
    }
  };

  const syncClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return alert("Clipboard is empty.");
      
      const clip = {
        content: text,
        type: isLink(text) ? 'link' : 'text',
        device
      };
      
      socketRef.current?.emit('add_clip', { sessionId, clip });
    } catch (err) {
      console.error(err);
      alert("Failed to read clipboard. Please ensure you have granted permissions.");
    }
  };

  const copyBack = async (clip: ClipEntry) => {
    try {
      await navigator.clipboard.writeText(clip.content);
      socketRef.current?.emit('clip_synced', { sessionId, clipId: clip.id, device });
      alert("Copied to clipboard!");
    } catch (err) {
      alert("Failed to write to clipboard.");
    }
  };

  const deleteClip = (id: string) => {
    socketRef.current?.emit('delete_clip', { sessionId, clipId: id });
  };

  const clearHistory = () => {
    socketRef.current?.emit('clear_history', { sessionId });
  };

  return (
    <div>
      <h1>UniClip</h1>
      <p className="subtitle">Sync your clipboard across devices in real-time.</p>

      {!inSession ? (
        <div className="panel">
          <h2>Join or Create a Session</h2>
          <div className="flex-row mt-4">
            <input 
              type="text" 
              placeholder="Enter 6-digit code..." 
              value={sessionId}
              onChange={e => setSessionId(e.target.value.toUpperCase())}
            />
            <button onClick={() => joinSession()}>Join</button>
          </div>
          <div className="mt-4 mb-4" style={{textAlign: 'center', color: 'var(--text-muted)'}}>OR</div>
          <button onClick={createSession} style={{width: '100%'}}>Create New Session</button>
          
          <div className="mt-4">
            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
              <input type="checkbox" checked={burnAfterSync} onChange={e => setBurnAfterSync(e.target.checked)} />
              Enable "Burn After Sync" (Entries delete automatically after another device copies them)
            </label>
          </div>
        </div>
      ) : (
        <>
          <div className="panel flex-row justify-between">
            <div>
              <h2 style={{margin:0}}>Session: {sessionId}</h2>
              <div style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>
                Connected Devices: {usersCount} | You: {device}
              </div>
            </div>
            <button className="danger" onClick={leaveSession}>Leave</button>
          </div>

          <div className="panel flex-row justify-between" style={{alignItems: 'flex-start'}}>
             <div>
                <button onClick={syncClipboard} style={{fontSize: '1.2rem', padding: '1rem 2rem'}}>
                  🔄 Sync Current Clipboard
                </button>
                <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem'}}>
                   Reads your clipboard and shares it with the room.
                </p>
             </div>
             
             <div style={{textAlign: 'center'}}>
               <p style={{margin: '0 0 0.5rem 0', fontSize: '0.9rem'}}>Scan to Join:</p>
               <QRCodeSVG value={sessionId} size={100} />
             </div>
          </div>

          <div className="panel">
            <div className="flex-row justify-between mb-4">
              <h2 style={{margin:0}}>Clipboard History</h2>
              <button className="danger" onClick={clearHistory}>Clear All</button>
            </div>

            {clips.length === 0 ? (
              <p style={{color: 'var(--text-muted)'}}>History is empty. Copy something and sync it!</p>
            ) : (
              <div className="clip-list">
                {clips.map(clip => (
                  <div className="clip-item" key={clip.id}>
                    <div className="clip-meta">
                      <span><strong>{clip.device}</strong> • {new Date(clip.timestamp).toLocaleTimeString()}</span>
                      <span style={{background: 'var(--bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem'}}>
                        {clip.type.toUpperCase()}
                      </span>
                    </div>
                    <div className="clip-content">
                      {clip.type === 'link' ? (
                         <a href={clip.content} target="_blank" rel="noreferrer">{clip.content}</a>
                      ) : (
                         clip.content
                      )}
                    </div>
                    <div className="clip-actions">
                      <button onClick={() => copyBack(clip)}>Copy to Device</button>
                      <button className="danger" onClick={() => deleteClip(clip.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
