/**
 * Jansen Transportes - Servidor do Agente de IA & Webhook WhatsApp (Zero Dependencies)
 * Roda diretamente com: node agent/server.js
 * Porta padrão: 3001
 */

const http = require('http');
const { processLocalIntelligence } = require('./agent_engine');

const PORT = process.env.PORT || 3001;

// Armazenamento em memória das sessões ativas
const activeSessions = new Map();

function getSession(id) {
  if (!activeSessions.has(id)) {
    activeSessions.set(id, { id, createdAt: new Date() });
  }
  return activeSessions.get(id);
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // 1. Health check
  if (req.method === 'GET' && url.pathname === '/api/agent/status') {
    return sendJson(res, 200, {
      status: 'online',
      agent: 'Jansen Transportes AI Assistant v1.0',
      brevityRule: 'max_250_chars',
      activeSessionsCount: activeSessions.size,
      modelsSupported: ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'local-neural-matcher']
    });
  }

  // 2. Chat API (POST)
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', () => {
      try {
        const parsed = JSON.parse(bodyData || '{}');
        const { message, sessionId = 'web_' + Date.now() } = parsed;

        if (!message || !message.trim()) {
          return sendJson(res, 400, { error: 'Mensagem vazia' });
        }

        const session = getSession(sessionId);
        const result = processLocalIntelligence(message, session);

        return sendJson(res, 200, {
          success: true,
          sessionId,
          reply: result.reply,
          handoff: result.handoff,
          handoffReason: result.handoffReason,
          whatsappUrl: result.whatsappUrl,
          whatsappFormatted: result.whatsappFormatted
        });
      } catch (e) {
        return sendJson(res, 400, { error: 'JSON inválido: ' + e.message });
      }
    });
    return;
  }

  // 3. Webhook WhatsApp (POST)
  if (req.method === 'POST' && url.pathname === '/webhook') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', () => {
      try {
        const body = JSON.parse(bodyData || '{}');
        console.log('[WHATSAPP WEBHOOK RECEIVED]:', JSON.stringify(body).substring(0, 150));

        let fromNumber = body.phone || body.from || body.sender || (body.data && body.data.key && body.data.key.remoteJid) || 'unknown';
        let text = body.message || body.text || (body.data && (body.data.message?.conversation || body.data.message?.extendedTextMessage?.text)) || '';

        if (!text) {
          return sendJson(res, 200, { status: 'ignored_empty_message' });
        }

        const session = getSession(fromNumber);
        const result = processLocalIntelligence(text, session);

        console.log(`[AGENTE IA -> ${fromNumber}]: "${result.reply}" (Handoff: ${result.handoff})`);

        return sendJson(res, 200, {
          status: 'success',
          recipient: fromNumber,
          responseMessage: result.reply,
          handoffTriggered: result.handoff,
          handoffReason: result.handoffReason,
          alexJansenAlert: result.handoff ? `ALERTA JANSEN: Cliente ${fromNumber} solicitou transbordo. Resumo: "${text}"` : null
        });
      } catch (e) {
        return sendJson(res, 500, { error: e.message });
      }
    });
    return;
  }

  // Rota não encontrada
  sendJson(res, 404, { error: 'Rota não encontrada' });
});

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 Agente Jansen Transportes rodando na porta ${PORT}`);
  console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
  console.log(`📲 WhatsApp Webhook: http://localhost:${PORT}/webhook`);
  console.log(`=================================================`);
});

module.exports = server;
