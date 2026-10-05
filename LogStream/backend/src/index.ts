import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;

const LOG_LEVELS = ['INFO', 'WARN', 'ERROR'];
const MESSAGES = {
  INFO: [
    'Dashboard session successfully initialized.',
    'Database connection benchmark: stable (ping 4ms).',
    'Re-indexing background cache elements...',
    'User login successful.',
    'Cache cleared successfully.',
    'Data export completed.',
    'Service scaling up to 5 instances.'
  ],
  WARN: [
    'High system memory allocation detected: 84% usage.',
    'Slow response from third-party API.',
    'Disk space running low on volume /data.',
    'User session nearing timeout.',
    'Rate limit threshold approaching.'
  ],
  ERROR: [
    'API network request to `/api/v1/users` failed with status 500.',
    'Database connection lost. Reconnecting...',
    'Failed to write to log file. Permission denied.',
    'Authentication service down.',
    'Critical exception in module WorkerThread.'
  ]
};

function generateLog() {
  const level = LOG_LEVELS[Math.floor(Math.random() * LOG_LEVELS.length)];
  const messagesForLevel = MESSAGES[level as keyof typeof MESSAGES];
  const message = messagesForLevel[Math.floor(Math.random() * messagesForLevel.length)];
  
  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  
  return `[${level}] ${timestamp} - ${message}`;
}

const clients: { id: string; res: Response }[] = [];

app.get('/stream', (req: Request, res: Response) => {
  const clientId = req.query.clientId || Date.now().toString();
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const client = { id: clientId as string, res };
  clients.push(client);
  
  res.write(`data: ${JSON.stringify({ log: `[INFO] ${new Date().toISOString()} - Connected to LogStream server.` })}\n\n`);

  const intervalId = setInterval(() => {
    const logStr = generateLog();
    res.write(`data: ${JSON.stringify({ log: logStr })}\n\n`);
  }, 500);

  req.on('close', () => {
    clearInterval(intervalId);
    const index = clients.findIndex(c => c.id === clientId);
    if (index !== -1) {
      clients.splice(index, 1);
    }
  });
});

app.post('/inject', (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  
  const logStr = `[CUSTOM] ${timestamp} - ${message}`;

  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify({ log: logStr })}\n\n`);
  });

  res.json({ success: true, log: logStr });
});

app.listen(PORT, () => {
  console.log(`LogStream backend running on http://localhost:${PORT}`);
});
