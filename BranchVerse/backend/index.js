const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const crypto = require('crypto');

const app = express();
app.use(cors());
// Need raw body for github webhook signature verification, but we'll use json for simplicity in this demo.
app.use(express.json()); 

const docker = new Docker();
const PORT = 8080;

// State to store deployments (In memory for this task, ideally a DB)
const deployments = {};
let portCounter = 9000; // Starting port for preview environments

// Helper to simulate asynchronous build process
const simulateBuildAndDeploy = async (prData) => {
  const prId = prData.number;
  const branch = prData.head.ref;
  const commit = prData.head.sha;
  
  deployments[prId] = {
    id: prId,
    title: prData.title,
    author: prData.user.login,
    branch: branch,
    commit: commit,
    status: 'Building',
    url: null,
    logs: ['Received Webhook payload.', `Fetching branch: ${branch}...`],
    updatedAt: new Date().toISOString()
  };

  // Simulate Build
  setTimeout(() => {
    if(!deployments[prId]) return;
    deployments[prId].status = 'Deploying';
    deployments[prId].logs.push('Build successful. Starting Docker deployment...');
    deployments[prId].updatedAt = new Date().toISOString();

    // Actual Docker Deployment (Spinning up an NGINX container to serve as the "Preview")
    const assignedPort = portCounter++;
    docker.createContainer({
      Image: 'nginx:alpine',
      name: `branchverse-preview-pr-${prId}`,
      Env: [`PR_NUM=${prId}`, `BRANCH=${branch}`],
      ExposedPorts: { '80/tcp': {} },
      HostConfig: {
        PortBindings: { '80/tcp': [{ HostPort: assignedPort.toString() }] }
      }
    }).then(container => {
      return container.start();
    }).then(() => {
      if(!deployments[prId]) return;
      deployments[prId].status = 'Live';
      deployments[prId].url = `http://localhost:${assignedPort}`;
      deployments[prId].logs.push(`Container deployed on port ${assignedPort}. Preview is Live!`);
      deployments[prId].containerName = `branchverse-preview-pr-${prId}`;
      deployments[prId].updatedAt = new Date().toISOString();
    }).catch(err => {
      if(!deployments[prId]) return;
      deployments[prId].status = 'Build Failed';
      deployments[prId].logs.push(`Docker Error: ${err.message}`);
      deployments[prId].updatedAt = new Date().toISOString();
    });
  }, 3000);
};

// Teardown deployment
const teardownDeployment = async (prId, isMerged = false) => {
  if (deployments[prId]) {
    deployments[prId].status = isMerged ? 'Merged' : 'Closed';
    deployments[prId].logs.push('Tearing down preview environment...');
    deployments[prId].updatedAt = new Date().toISOString();

    if (deployments[prId].containerName) {
      try {
        const container = docker.getContainer(deployments[prId].containerName);
        await container.stop();
        await container.remove();
        deployments[prId].logs.push('Docker container removed successfully.');
      } catch (err) {
        deployments[prId].logs.push(`Cleanup error: ${err.message}`);
      }
    }
  }
};

// Webhook Endpoint
app.post('/webhook', async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  if (event === 'pull_request') {
    const action = payload.action;
    const prData = payload.pull_request;

    console.log(`Received PR Event: ${action} for PR #${prData.number}`);

    if (action === 'opened' || action === 'reopened' || action === 'synchronize') {
      simulateBuildAndDeploy(prData);
    } else if (action === 'closed') {
      teardownDeployment(prData.number, prData.merged);
    }
    res.status(200).send('Webhook received and processing');
  } else {
    res.status(200).send('Event ignored');
  }
});

// API for Dashboard
app.get('/api/deployments', (req, res) => {
  res.json(Object.values(deployments));
});

// Endpoint to manually simulate a webhook (for easy testing without ngrok)
app.post('/api/simulate-webhook', (req, res) => {
  const { action, prNumber, branch, commit, title, author } = req.body;
  const mockPayload = {
    action,
    pull_request: {
      number: prNumber,
      title: title || `Feature branch ${branch}`,
      user: { login: author || 'test-user' },
      head: { ref: branch, sha: commit || crypto.randomBytes(20).toString('hex') },
      merged: action === 'closed' && req.body.merged
    }
  };
  
  req.headers['x-github-event'] = 'pull_request';
  req.body = mockPayload;
  
  if (action === 'opened' || action === 'synchronize') {
    simulateBuildAndDeploy(mockPayload.pull_request);
  } else if (action === 'closed') {
    teardownDeployment(mockPayload.pull_request.number, mockPayload.pull_request.merged);
  }
  
  res.json({ success: true, message: `Simulated ${action}` });
});

app.listen(PORT, () => {
  console.log(`BranchVerse Webhook receiver running on port ${PORT}`);
});
