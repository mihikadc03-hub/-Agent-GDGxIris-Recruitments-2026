import { useState } from 'react';
import './index.css';

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [role, setRole] = useState<'client' | 'freelancer' | 'arbiter' | null>(null);

  // Mock data representing on-chain state
  const [job] = useState({
    id: 1,
    client: '0xClientAddress...',
    freelancer: '0xFreelancerAddress...',
    arbiter: '0xArbiterAddress...',
    totalDeposit: 5.0, // ETH
    milestones: [
      { id: 0, amount: 2.0, state: 'Approved' },
      { id: 1, amount: 2.0, state: 'Submitted' },
      { id: 2, amount: 1.0, state: 'Pending' }
    ]
  });

  const connectWallet = (selectedRole: 'client' | 'freelancer' | 'arbiter') => {
    setAccount(`0xMock${selectedRole}Address...`);
    setRole(selectedRole);
  };

  const executeTx = (action: string) => {
    alert(`MetaMask Prompt: Confirm Transaction for [${action}]`);
  };

  return (
    <div className="app">
      <header>
        <h1>ChainEscrow</h1>
        <div className="wallet-panel">
          {account ? (
            <div className="connected">
              Connected as {role?.toUpperCase()} ({account})
              <button onClick={() => setAccount(null)}>Disconnect</button>
            </div>
          ) : (
            <div className="connect-options">
              <span>Connect Wallet as: </span>
              <button onClick={() => connectWallet('client')}>Client</button>
              <button onClick={() => connectWallet('freelancer')}>Freelancer</button>
              <button onClick={() => connectWallet('arbiter')}>Arbiter</button>
            </div>
          )}
        </div>
      </header>

      <main>
        {account ? (
          <div className="dashboard">
            <h2>Job #{job.id} Overview</h2>
            <div className="job-meta">
              <p><strong>Total Deposit:</strong> {job.totalDeposit} ETH</p>
              <p><strong>Client:</strong> {job.client}</p>
              <p><strong>Freelancer:</strong> {job.freelancer}</p>
              <p><strong>Arbiter:</strong> {job.arbiter}</p>
            </div>

            <h3>Milestones</h3>
            <div className="milestones-list">
              {job.milestones.map((m) => (
                <div className="milestone-card" key={m.id}>
                  <div className="m-header">
                    <h4>Milestone {m.id + 1}</h4>
                    <span className={`badge ${m.state.toLowerCase()}`}>{m.state}</span>
                  </div>
                  <p>{m.amount} ETH</p>
                  
                  <div className="actions">
                    {role === 'freelancer' && m.state === 'Pending' && (
                      <button onClick={() => executeTx(`submitMilestone(${job.id}, ${m.id})`)}>Submit Work</button>
                    )}
                    
                    {role === 'client' && m.state === 'Submitted' && (
                      <>
                        <button className="approve" onClick={() => executeTx(`approveMilestone(${job.id}, ${m.id})`)}>Approve & Pay</button>
                        <button className="dispute" onClick={() => executeTx(`raiseDispute(${job.id}, ${m.id})`)}>Raise Dispute</button>
                      </>
                    )}

                    {role === 'freelancer' && m.state === 'Submitted' && (
                      <button className="dispute" onClick={() => executeTx(`raiseDispute(${job.id}, ${m.id})`)}>Raise Dispute</button>
                    )}

                    {role === 'arbiter' && m.state === 'Disputed' && (
                      <div className="arbiter-panel">
                        <input type="number" placeholder="Client Share (ETH)" />
                        <button onClick={() => executeTx(`resolveDispute(${job.id}, ${m.id}, share)`)}>Resolve</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="hero">
            <h2>Decentralized Milestone Payments</h2>
            <p>Connect your wallet to manage your freelance jobs securely on-chain.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
