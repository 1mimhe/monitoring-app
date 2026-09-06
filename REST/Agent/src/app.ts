import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { getSystemInfo, rebootSystem } from '../../../shared/system';
import logger from '../../../shared/logger';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /system-info
 * Returns a full system snapshot (OS, CPU, memory, processes, network).
 */
app.get('/system-info', async (req: Request, res: Response) => {
  const ip = req.socket.localAddress ?? 'unknown';

  try {
    const result = await getSystemInfo();
    logger.info(`System info requested from ${req.ip}`);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ip,
      result,
    });
  } catch (error) {
    logger.error('Failed to get system info', error);
    res.status(500).json({
      success: false,
      ip,
      error: (error as Error).message,
    });
  }
});

/**
 * POST /reboot-system
 * Sends a success response immediately, then executes the OS reboot command.
 */
app.post('/reboot-system', (req: Request, res: Response) => {
  const ip = req.socket.localAddress ?? 'unknown';
  logger.warn(`Reboot requested from ${req.ip}`);

  try {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ip,
      message: 'System reboot command executed successfully.',
    });

    // Delay slightly so the HTTP response is sent before the process dies
    setTimeout(() => rebootSystem(), 500);
  } catch (error) {
    logger.error('Reboot failed', error);
    res.status(500).json({
      success: false,
      ip,
      error: (error as Error).message,
    });
  }
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found.' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ success: false, error: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3333;
app.listen(PORT, '0.0.0.0', () =>
  logger.success(`REST Agent listening on port ${PORT}.`)
);
