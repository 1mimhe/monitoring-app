import 'dotenv/config';
import express from 'express';
import path from 'path';
import logger from '../../../shared/logger';

const app = express();

app.use(express.static(path.join(__dirname, '../../public')));

// Catch-all — serve the dashboard SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../public', 'index.html'));
});

const PORT = Number(process.env.PORT) || 8000;
app.listen(PORT, () =>
  logger.success(`REST Central-Manager dashboard listening on port ${PORT}.`)
);
