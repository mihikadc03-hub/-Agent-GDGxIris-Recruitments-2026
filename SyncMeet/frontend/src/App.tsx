import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import './index.css';

interface User { id: string; name: string; }
interface Message { sender: string; text: string; time: string; }
interface RoomState { host: string; users: User[]; chat: Message[]; }

function App() {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [roomState, setRoomState] = useState<RoomState>({ host: '', users: [], chat: [] });
  const [chatMsg, setChatMsg] = useState('');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:8081', { autoConnect: false });

    socketRef.current.on('room_state', (state: RoomState) => {
      setRoomState(state);
    });

    socketRef.current.on('user_joined', (user: User) => {
      setRoomState(prev => ({ ...prev, users: [...prev.users, user] }));
    });

    socketRef.current.on('user_left', (userId: string) => {
      setRoomState(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
    });

    socketRef.current.on('new_host', (hostId: string) => {
      setRoomState(prev => ({ ...prev, host: hostId }));
    });

    socketRef.current.on('receive_message', (msg: Message) => {
      setRoomState(prev => ({ ...prev, chat: [...prev.chat, msg] }));
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const joinRoom = async () => {
    if (!roomId || !userName) return alert("Enter Room ID and Name");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      socketRef.current?.connect();
      socketRef.current?.emit('join_room', { roomId, userName });
      setInRoom(true);
    } catch (err) {
      alert("Failed to access camera/mic: " + err);
    }
  };

  const leaveRoom = () => {
    socketRef.current?.disconnect();
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setInRoom(false);
    setRoomState({ host: '', users: [], chat: [] });
  };

  const sendMessage = () => {
    if (!chatMsg.trim()) return;
    socketRef.current?.emit('send_message', { roomId, message: chatMsg, userName });
    setChatMsg('');
  };

  return (
    <div className="app">
      {!inRoom ? (
        <div className="join-panel">
          <h1>SyncMeet</h1>
          <p>Real-Time Collaboration Workspace</p>
          <input 
            type="text" 
            placeholder="Your Name" 
            value={userName} 
            onChange={e => setUserName(e.target.value)} 
          />
          <input 
            type="text" 
            placeholder="Room ID (e.g. daily-standup)" 
            value={roomId} 
            onChange={e => setRoomId(e.target.value)} 
          />
          <button onClick={joinRoom}>Join Meeting</button>
        </div>
      ) : (
        <div className="meeting-workspace">
          <div className="main-video-area">
            <div className="header">
              <h2>Room: {roomId}</h2>
              <button className="danger" onClick={leaveRoom}>Leave</button>
            </div>
            
            <div className="video-grid">
              <div className="video-card">
                <video ref={videoRef} autoPlay muted playsInline />
                <div className="video-label">{userName} (You)</div>
              </div>
              
              {/* Other participants would have their RTCPeerConnection streams rendered here */}
              {roomState.users.filter(u => u.id !== socketRef.current?.id).map(u => (
                <div className="video-card dummy-card" key={u.id}>
                  <div className="dummy-avatar">{u.name.charAt(0).toUpperCase()}</div>
                  <div className="video-label">{u.name} {roomState.host === u.id && '(Host)'}</div>
                </div>
              ))}
            </div>
            
            <div className="controls">
              <button onClick={() => alert('Mute toggled')}>🎤 Mute</button>
              <button onClick={() => alert('Video toggled')}>📷 Stop Video</button>
              <button onClick={() => alert('Screen share started')}>💻 Share Screen</button>
            </div>
          </div>
          
          <div className="sidebar">
            <div className="participants-list">
              <h3>Participants ({roomState.users.length})</h3>
              <ul>
                {roomState.users.map(u => (
                  <li key={u.id}>
                    {u.name} {roomState.host === u.id ? <span className="host-badge">Host</span> : ''}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="chat-box">
              <h3>Meeting Chat</h3>
              <div className="chat-messages">
                {roomState.chat.map((m, i) => (
                  <div key={i} className="msg">
                    <strong>{m.sender}:</strong> {m.text}
                    <div className="time">{new Date(m.time).toLocaleTimeString()}</div>
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input 
                  type="text" 
                  value={chatMsg} 
                  onChange={e => setChatMsg(e.target.value)} 
                  onKeyPress={e => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                />
                <button onClick={sendMessage}>Send</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
