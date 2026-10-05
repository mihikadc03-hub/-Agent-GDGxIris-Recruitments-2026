import { useState, useEffect, useRef } from 'react';
import './index.css';

interface LogEntry {
  id: string;
  raw: string;
  level: string;
}

const MAX_LOGS = 100;
const API_URL = 'http://localhost:3000';

function App() {
  const [clientId, setClientId] = useState(() => `client_${Math.floor(Math.random() * 10000)}`);
  const [isStreaming, setIsStreaming] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filterLevel, setFilterLevel] = useState('ALL');
  const [customMsg, setCustomMsg] = useState('');
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const startStream = () => {
    if (isStreaming) return;
    
    // Clear logs on start if desired, or keep appending
    // setLogs([]);
    
    const es = new EventSource(`${API_URL}/stream?clientId=${clientId}`);
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const logStr = data.log;
        
        // Parse the log string e.g. "[INFO] 12:00:00.000 - Message..."
        const levelMatch = logStr.match(/^\[(.*?)\]/);
        const level = levelMatch ? levelMatch[1] : 'INFO';
        
        const newLog: LogEntry = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          raw: logStr,
          level: level
        };

        setLogs((prev) => {
          const updatedLogs = [...prev, newLog];
          if (updatedLogs.length > MAX_LOGS) {
            return updatedLogs.slice(updatedLogs.length - MAX_LOGS);
          }
          return updatedLogs;
        });
      } catch (error) {
        console.error("Error parsing log:", error);
      }
    };
    
    es.onerror = () => {
      es.close();
      setIsStreaming(false);
    };

    eventSourceRef.current = es;
    setIsStreaming(true);
  };

  const stopStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  };

  const downloadLogs = () => {
    const textContent = logs.map(l => l.raw).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs_${clientId}_${new Date().getTime()}.txt`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  const injectCustomLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;

    try {
      await fetch(`${API_URL}/inject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: customMsg })
      });
      setCustomMsg('');
    } catch (error) {
      console.error("Failed to inject log:", error);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterLevel === 'ALL') return true;
    return log.level === filterLevel;
  });

  return (
    <>
      <div className="header">
        <h1>LogStream</h1>
        <p>Real-Time Developer Observability Dashboard</p>
      </div>

      <div className="controls-panel">
        <div className="input-group">
          <label>Session / Client ID</label>
          <input 
            type="text" 
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={isStreaming}
          />
        </div>

        <div className="input-group">
          <label>Filter Logs</label>
          <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="ALL">All Logs</option>
            <option value="INFO">Info Only</option>
            <option value="WARN">Warnings Only</option>
            <option value="ERROR">Errors Only</option>
          </select>
        </div>

        <button 
          className="btn btn-start" 
          onClick={startStream} 
          disabled={isStreaming}
        >
          {isStreaming ? 'Streaming Live...' : 'Start Stream'}
        </button>

        <button 
          className="btn btn-stop" 
          onClick={stopStream} 
          disabled={!isStreaming}
        >
          Stop Stream
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={downloadLogs} 
          disabled={logs.length === 0}
        >
          Save Output
        </button>
      </div>
      
      {/* Custom Log Injection */}
      <form className="controls-panel" style={{ marginTop: '-0.5rem', paddingTop: '1rem', paddingBottom: '1rem' }} onSubmit={injectCustomLog}>
        <div className="input-group" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            <label>Custom Log Injection Portal</label>
            <input 
              type="text" 
              placeholder="Type custom message..." 
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-secondary" disabled={!customMsg.trim()}>Send Log</button>
        </div>
      </form>

      <div className="terminal-container">
        <div className="terminal-header">
          <div className="mac-btn mac-close"></div>
          <div className="mac-btn mac-min"></div>
          <div className="mac-btn mac-max"></div>
          <div className="terminal-title">bash - {clientId}</div>
        </div>
        
        <div className="terminal-body">
          {filteredLogs.length === 0 ? (
            <div style={{ opacity: 0.5, fontStyle: 'italic' }}>Waiting for stream...</div>
          ) : (
            filteredLogs.map(log => (
              <div key={log.id} className="log-line">
                <span className={`log-level-${log.level}`}>
                  {log.raw}
                </span>
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </>
  );
}

export default App;
