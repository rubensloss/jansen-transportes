/**
 * Jansen Transportes - Servidor do Agente de IA & Webhook WhatsApp (Zero Dependencies)
 * Roda diretamente com: node agent/server.js
 * Porta padrão: 3001
 */

const http = require('http');
const { processLocalIntelligence } = require('./agent_engine');
const followupEngine = require('./followup_engine');

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

        // Registra na régua de recuperação para monitorar paradas
        if (session.customerName) {
          followupEngine.registerLeadRecovery({
            phone: sessionId,
            nome: session.customerName
          });
        }

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

  // 3. Follow-up API - Fila de Follow-up (GET)
  if (req.method === 'GET' && url.pathname === '/api/followup/queue') {
    return sendJson(res, 200, {
      success: true,
      followups: followupEngine.getAllFollowups(),
      templates: followupEngine.FOLLOWUP_TEMPLATES
    });
  }

  // 4. Follow-up API - Agendamento (POST)
  if (req.method === 'POST' && url.pathname === '/api/followup/schedule') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', () => {
      try {
        const body = JSON.parse(bodyData || '{}');
        let record;
        if (body.type === 'closed') {
          record = followupEngine.registerClosedDeal(body.data || body);
        } else {
          record = followupEngine.registerLeadRecovery(body.data || body);
        }
        return sendJson(res, 200, { success: true, record });
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    });
    return;
  }

  // 5. Follow-up API - Simulação de Disparo (POST)
  if (req.method === 'POST' && url.pathname === '/api/followup/simulate') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', () => {
      try {
        const { phone = '5527999112233', track = 'recovery', stageKey = 't1_4h', params = {} } = JSON.parse(bodyData || '{}');
        const simResult = followupEngine.testSimulateTrigger(phone, track, stageKey, params);
        return sendJson(res, 200, simResult);
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    });
    return;
  }

  // 6. Follow-up API - Teste de Pesquisa de Satisfação (POST)
  if (req.method === 'POST' && url.pathname === '/api/followup/survey-test') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', () => {
      try {
        const { text, leadParams = {} } = JSON.parse(bodyData || '{}');
        const evalResult = followupEngine.evaluateSatisfactionResponse(text, leadParams);
        return sendJson(res, 200, { success: true, ...evalResult });
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    });
    return;
  }

  // 7. Webhook WhatsApp - Handshake de Verificação da Meta (GET)
  if (req.method === 'GET' && url.pathname === '/webhook') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    const expectedToken = process.env.META_VERIFY_TOKEN || 'jansen_meta_token_secret';

    if (mode === 'subscribe' && token === expectedToken) {
      console.log('[META CLOUD API]: Webhook verificado com sucesso pelo Meta Developers!');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(challenge || 'OK');
    } else {
      console.warn('[META CLOUD API]: Falha de autenticacao no handshake do Webhook. Token incorreto.');
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Verification token mismatch');
    }
  }

  // 4. Webhook WhatsApp - Mensagens Inbound Oficiais Meta Cloud API (POST)
  if (req.method === 'POST' && url.pathname === '/webhook') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyData || '{}');
        console.log('[WHATSAPP WEBHOOK RECEIVED]:', JSON.stringify(body).substring(0, 150));

        let fromNumber = '';
        let customerProfileName = '';
        let text = '';

        // Detecção do formato oficial da WhatsApp Business Cloud API da Meta
        if (body.object === 'whatsapp_business_account' && body.entry && body.entry.length > 0) {
          const entry = body.entry[0];
          const changes = entry.changes && entry.changes[0];
          const value = changes && changes.value;
          const contact = value && value.contacts && value.contacts[0];
          const messageObj = value && value.messages && value.messages[0];

          if (contact) {
            customerProfileName = contact.profile && contact.profile.name ? contact.profile.name : '';
          }

          if (messageObj) {
            fromNumber = messageObj.from || '';
            if (messageObj.type === 'text') {
              text = messageObj.text && messageObj.text.body ? messageObj.text.body : '';
            } else if (messageObj.type === 'button') {
              text = messageObj.button && messageObj.button.text ? messageObj.button.text : '';
            } else if (messageObj.type === 'interactive') {
              text = (messageObj.interactive && messageObj.interactive.button_reply && messageObj.interactive.button_reply.title) ||
                     (messageObj.interactive && messageObj.interactive.list_reply && messageObj.interactive.list_reply.title) || '';
            }
          }
        } else {
          // Formato alternativo direto (simulador, testes unitarios ou curl)
          fromNumber = body.phone || body.from || body.sender || 'unknown';
          text = body.message || body.text || '';
        }

        if (!text || !text.trim()) {
          return sendJson(res, 200, { status: 'ignored_empty_message' });
        }

        const session = getSession(fromNumber);
        if (customerProfileName && !session.customerName) {
          session.customerName = customerProfileName;
        }

        // 0. Verificação: O cliente está respondendo à pesquisa de satisfação pós-viagem?
        if (session.awaitingSatisfactionSurvey) {
          session.awaitingSatisfactionSurvey = false;
          const satResult = followupEngine.evaluateSatisfactionResponse(text, {
            nome: session.customerName,
            phone: fromNumber,
            googleReviewLink: session.googleReviewLink
          });

          console.log(`[PESQUISA DE SATISFAÇÃO]: Cliente ${session.customerName} respondeu "${text}". Nota: ${satResult.score} (Positiva: ${satResult.isPositive})`);

          return sendJson(res, 200, {
            status: 'satisfaction_survey_processed',
            recipient: fromNumber,
            responseMessage: satResult.replyMessage,
            isPositive: satResult.isPositive,
            score: satResult.score,
            action: satResult.action,
            alexJansenAlert: satResult.alexAlert
          });
        }

        // 1. Verificação: O lead veio transferido do site já qualificado?
        const isFromSite = text.includes('Cotação solicitada no site Jansen') || text.includes('Cotação iniciada no site');
        if (isFromSite) {
          // Extrai o nome do cliente se estiver na mensagem formatada
          const nameMatch = text.match(/\*Cliente:\*\s*([A-Za-zÀ-ÿ]+)/i);
          const customerName = nameMatch ? nameMatch[1] : (session.customerName || '');

          session.customerName = customerName;
          session.isQualifiedFromSite = true;
          session.botPaused = true; // Pausa o robô para o atendente humano Alex Jansen assumir

          const ackReply = customerName 
            ? `Olá ${customerName}! Recebemos seus dados do site com sucesso. O Alex Jansen já está analisando sua rota e vai te passar o valor exato aqui em instantes!`
            : `Olá! Recebemos sua solicitação do site da Jansen com sucesso. O Alex Jansen já está verificando e vai te passar a cotação em instantes!`;

          console.log(`[LEAD DO SITE RECEBIDO NO WHATSAPP]: Cliente ${customerName || fromNumber}. Robô pausado para atendimento humano.`);

          return sendJson(res, 200, {
            status: 'site_lead_received',
            recipient: fromNumber,
            responseMessage: ackReply,
            handoffTriggered: true,
            botPaused: true,
            customerName: customerName,
            alexJansenAlert: `🚨 NOVO LEAD QUALIFICADO DO SITE: ${customerName} (${fromNumber}). Assuma o atendimento no WhatsApp!`
          });
        }

        // 2. Se o atendimento já foi transferido para o Alex anteriormente, o bot permanece em silêncio
        if (session.botPaused) {
          console.log(`[BOT PAUSADO]: Mensagem de ${fromNumber} ignorada pelo bot para permitir conversa direta com Alex Jansen.`);
          return sendJson(res, 200, { status: 'bot_paused_for_human_agent' });
        }

        // 3. Cliente novo chamando direto no WhatsApp -> Fluxo de Qualificação Ativo
        const result = processLocalIntelligence(text, session);

        // Se o robô finalizou a qualificação ou o cliente pediu humano, pausa o bot
        if (result.handoff) {
          session.botPaused = true;
        }

        console.log(`[AGENTE IA -> ${fromNumber}]: "${result.reply}" (Handoff: ${result.handoff})`);

        return sendJson(res, 200, {
          status: 'success',
          recipient: fromNumber,
          responseMessage: result.reply,
          handoffTriggered: result.handoff,
          handoffReason: result.handoffReason,
          botPaused: session.botPaused,
          alexJansenAlert: result.handoff ? `ALERTA JANSEN: Cliente ${fromNumber} qualificado no WhatsApp. Assuma para fechamento!` : null
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

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Agente Jansen Transportes rodando na porta ${PORT}`);
    console.log(`💬 Chat API: http://localhost:${PORT}/api/chat`);
    console.log(`📲 WhatsApp Webhook: http://localhost:${PORT}/webhook`);
    console.log(`=================================================`);
  });
}

module.exports = server;
