import { useState, useEffect } from 'react';
import './index.css';

interface Deployment {
  id: number;
  title: string;
  author: string;
  branch: string;
  commit: string;
  status: 'Building' | 'Deploying' | 'Live' | 'Build Failed' | 'Closed' | 'Merged';
  url: string | null;
  logs: string[];
  updatedAt: string;
}

function App() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  useEffect(() => {
    const fetchDeployments = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/deployments');
        const data = await res.json();
        setDeployments(data.reverse());
      } catch (err) {
        console.error('Error fetching deployments', err);
      }
    };

    fetchDeployments();
    const interval = setInterval(fetchDeployments, 2000);
    return () => clearInterval(interval);
  }, []);

  const simulateWebhook = async (action: string) => {
    const prNumber = prompt("Enter PR Number (e.g. 101):") || '101';
    await fetch('http://localhost:8080/api/simulate-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        prNumber: parseInt(prNumber, 10),
        branch: `feature-${prNumber}`,
        title: `Add new feature ${prNumber}`,
        author: 'developer1',
        merged: action === 'closed' ? confirm("Was it merged? (Cancel for just closed)") : false
      })
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Live': return 'bg-green';
      case 'Building':
      case 'Deploying': return 'bg-yellow';
      case 'Build Failed': return 'bg-red';
      case 'Merged': return 'bg-purple';
      default: return 'bg-gray';
    }
  };

  return (
    <div className="app">
      <header>
        <h1>BranchVerse Dashboard</h1>
        <p>Isolated Preview Deployments for Pull Requests</p>
        <div className="test-actions">
          <span>Simulation Actions: </span>
          <button onClick={() => simulateWebhook('opened')}>Simulate PR Open/Sync</button>
          <button onClick={() => simulateWebhook('closed')}>Simulate PR Close/Merge</button>
        </div>
      </header>

      <main>
        {deployments.length === 0 ? (
          <div className="empty-state">No active preview deployments found.</div>
        ) : (
          deployments.map(dep => (
            <div className="deployment-card" key={dep.id}>
              <div className="card-header">
                <h2>PR #{dep.id}: {dep.title}</h2>
                <span className={`status-badge ${getStatusColor(dep.status)}`}>{dep.status}</span>
              </div>
              <div className="meta-info">
                <span><strong>Branch:</strong> {dep.branch}</span>
                <span><strong>Commit:</strong> {dep.commit.substring(0, 7)}</span>
                <span><strong>Author:</strong> {dep.author}</span>
                <span><strong>Updated:</strong> {new Date(dep.updatedAt).toLocaleTimeString()}</span>
              </div>
              
              <div className="actions-panel">
                {dep.url && dep.status === 'Live' && (
                  <a href={dep.url} target="_blank" rel="noreferrer" className="btn btn-primary">
                    Open Preview ↗
                  </a>
                )}
                {dep.status === 'Live' && (
                  <button className="btn btn-secondary" onClick={() => alert('Comparison view would open here')}>Compare with Main</button>
                )}
              </div>

              <div className="logs-container">
                <h4>Deployment Logs</h4>
                <div className="terminal">
                  {dep.logs.map((log, i) => (
                    <div key={i}>&gt; {log}</div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}

export default App;
