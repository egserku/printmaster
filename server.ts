
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import net from 'net';
import http from 'http';
import { generateOrderPDF } from './services/pdfService';
import { sendOrderEmail } from './services/emailService';
import { createTrelloCard } from './services/trelloService';
import { Order } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const DEFAULT_PORT = 3000;

// Пароль администратора из переменных окружения
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Хранилище заказов
const ordersHistory: Order[] = [];

const ORDERS_DIR = path.join(process.cwd(), 'data', 'orders');

// API: Вход
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({ success: true, token: 'session-token' });
  }
  res.status(401).json({ success: false, message: 'Неверный пароль' });
});

// Интеграция Vite для разработки
import { createServer as createViteServer } from 'vite';

async function setupServer() {
  const requestedPort = Number(process.env.PORT || DEFAULT_PORT);

  const findFreePort = async (startPort: number, tries = 20): Promise<number> => {
    for (let p = startPort; p < startPort + tries; p++) {
      const isFree = await new Promise<boolean>((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.once('listening', () => {
          server.close(() => resolve(true));
        });
        server.listen(p, '0.0.0.0');
      });
      if (isFree) return p;
    }
    throw new Error(`No free port found in range ${startPort}-${startPort + tries - 1}`);
  };

  const PORT = await findFreePort(requestedPort);

  // Ensure local data directory exists (for JSON order files)
  await fs.mkdir(ORDERS_DIR, { recursive: true });

  // API: Создание заказа
  app.post('/api/orders', async (req, res) => {
    const orderData: Order = req.body;
    try {
      orderData.status = orderData.status || 'New';
      orderData.viewed = false;
      ordersHistory.push(orderData);

      // 1) Always persist order locally as JSON (source of truth for local runs)
      const safeOrderNumber = String(orderData.orderNumber || '').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const orderFile = path.join(ORDERS_DIR, `${ts}__${safeOrderNumber || 'order'}.json`);
      await fs.writeFile(orderFile, JSON.stringify(orderData, null, 2), 'utf-8');

      // 2) Optional side-effects (best-effort; must not fail order creation)
      try {
        const pdfBuffer = await generateOrderPDF(orderData);
        await sendOrderEmail(orderData, pdfBuffer);
      } catch (e) {
        console.warn('Optional email/PDF step failed:', e);
      }

      try {
        await createTrelloCard(orderData);
      } catch (e) {
        console.warn('Optional Trello step failed:', e);
      }

      res.status(200).json({
        success: true,
        orderNumber: orderData.orderNumber,
        savedTo: path.relative(process.cwd(), orderFile),
      });
    } catch (error) {
      console.error('Order processing failed:', error);
      res.status(500).json({ success: false });
    }
  });

  app.get('/api/orders', (req, res) => {
    res.status(200).json(ordersHistory);
  });

  app.patch('/api/orders/:orderNumber', (req, res) => {
    const { orderNumber } = req.params;
    const orderIndex = ordersHistory.findIndex(o => o.orderNumber === orderNumber);
    if (orderIndex > -1) {
      ordersHistory[orderIndex] = { ...ordersHistory[orderIndex], ...req.body };
      return res.status(200).json(ordersHistory[orderIndex]);
    }
    res.status(404).json({ message: 'Order not found' });
  });

  if (process.env.NODE_ENV !== 'production') {
    // Create a real HTTP server so Vite HMR can share the same port
    // (otherwise Vite middleware mode defaults to ws://localhost:24678).
    const httpServer = http.createServer(app);

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    httpServer.listen(PORT, '0.0.0.0', () => {
      if (PORT !== requestedPort) {
        console.warn(`Requested PORT ${requestedPort} is busy, using ${PORT} instead.`);
      }
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    app.listen(PORT, '0.0.0.0', () => {
      if (PORT !== requestedPort) {
        console.warn(`Requested PORT ${requestedPort} is busy, using ${PORT} instead.`);
      }
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

setupServer();
