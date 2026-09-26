/**
 * Jansen Transportes - Servidor do Agente de IA & Webhook WhatsApp (Zero Dependencies)
 * Roda diretamente com: node agent/server.js
 * Porta padrão: 3001
 */

const fs = require('fs');
const path = require('path');

// Carrega variáveis do arquivo .env automaticamente se existir (Zero Dependencies)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const k = trimmed.substring(0, idx).trim();
      const v = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

const http = require('http');
const { processLocalIntelligence, callGeminiAI } = require('./agent_engine');
const followupEngine = require('./followup_engine');

/**
 * Envia mensagem ativa/resposta através da WhatsApp Business Cloud API Oficial da Meta
 */
async function sendMetaOutboundMessage(to, text) {
  const token = process.env.META_ACCESS_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID;

  if (!token || !phoneId || token === 'seu_token_permanente_da_meta_aqui') {
    return false; // Modo simulacao local
  }

  try {
    const cleanTo = to.replace(/\D/g, '');
    const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body: text }
      })
    });
    const data = await resp.json();
    console.log(`[META CLOUD API DISPATCH -> ${cleanTo}]: Status ${resp.status}`);
    return data;
  } catch (err) {
    console.error('[META CLOUD API ERROR]: Falha ao despachar mensagem:', err.message);
    return false;
  }
}

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

// Persistência e Sincronização do CRM Jansen
const crmFilePath = path.join(__dirname, '..', 'data', 'crm_leads.json');
function readCrmData() {
  try {
    if (fs.existsSync(crmFilePath)) {
      return JSON.parse(fs.readFileSync(crmFilePath, 'utf-8'));
    }
  } catch (e) {
    console.warn('[CRM ERROR] Falha ao ler crm_leads.json:', e.message);
  }
  return { config: {}, motoristas: [], veiculos: [], leads: [] };
}

function saveCrmData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(crmFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('[CRM ERROR] Falha ao salvar crm_leads.json:', e.message);
    return false;
  }
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
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(bodyData || '{}');
        const { message, sessionId = 'web_' + Date.now() } = parsed;

        if (!message || !message.trim()) {
          return sendJson(res, 400, { error: 'Mensagem vazia' });
        }

        const session = getSession(sessionId);
        const result = await callGeminiAI(message, session);

        // Registra na régua de recuperação para monitorar paradas
        if (session.customerName) {
          followupEngine.registerLeadRecovery({
            phone: sessionId,
            nome: session.customerName
          });
        }

        // Sincroniza lead qualificado automaticamente no CRM Jansen
        if (result.handoff && session.customerName) {
          try {
            const crm = readCrmData();
            const existingIdx = crm.leads.findIndex(l => l.whatsapp === sessionId || l.id === 'lead_chat_' + sessionId);
            const leadData = {
              id: existingIdx >= 0 ? crm.leads[existingIdx].id : 'lead_chat_' + Date.now(),
              cliente: session.customerName,
              whatsapp: sessionId.replace(/\D/g, '') || '27997392787',
              tipoCliente: 'Site / Chat IA',
              origem: session.route ? (session.route.toLowerCase().includes('para') ? session.route.split(/para/i)[0].trim() : session.route) : 'Vitória / Vila Velha',
              destino: session.route ? (session.route.toLowerCase().includes('para') ? session.route.split(/para/i)[1].trim() : session.route) : 'A definir',
              dataIda: session.tripDate || 'A definir',
              horaIda: session.times || 'A definir',
              passageiros: session.passengers ? (parseInt(session.passengers, 10) || 1) : 1,
              veiculo: session.serviceType || 'Van Executiva VIP',
              status: 'novo',
              canalOrigem: 'Site Web (Agente IA)',
              valorTotal: 0,
              observacoes: `Solicitação pelo site. Cotação qualificada para Alex Jansen. Rota: ${session.route || 'Pendente'}`,
              criadoEm: new Date().toISOString()
            };
            if (existingIdx >= 0) {
              crm.leads[existingIdx] = { ...crm.leads[existingIdx], ...leadData };
            } else {
              crm.leads.unshift(leadData);
            }
            saveCrmData(crm);
          } catch (err) {
            console.warn('[CRM SYNC]: Falha ao sincronizar lead do chat:', err.message);
          }
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

  // 7. CRM API - Dados Completos (GET)
  if (req.method === 'GET' && url.pathname === '/api/crm/data') {
    const data = readCrmData();
    return sendJson(res, 200, { success: true, data });
  }

  // 8. CRM API - Criar ou Atualizar Lead (POST)
  if (req.method === 'POST' && url.pathname === '/api/crm/leads') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', () => {
      try {
        const lead = JSON.parse(bodyData || '{}');
        if (!lead.cliente) {
          return sendJson(res, 400, { error: 'Nome do cliente é obrigatório' });
        }
        const crm = readCrmData();
        const existingIdx = lead.id ? crm.leads.findIndex(l => l.id === lead.id) : -1;
        if (existingIdx >= 0) {
          crm.leads[existingIdx] = { ...crm.leads[existingIdx], ...lead, atualizadoEm: new Date().toISOString() };
        } else {
          lead.id = lead.id || 'lead_' + Date.now();
          lead.status = lead.status || 'novo';
          lead.criadoEm = lead.criadoEm || new Date().toISOString();
          crm.leads.unshift(lead);
        }
        saveCrmData(crm);
        return sendJson(res, 200, { success: true, lead });
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    });
    return;
  }

  // 9. CRM API - Atualizar Status / Fase do Kanban (POST)
  if (req.method === 'POST' && url.pathname === '/api/crm/leads/status') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', () => {
      try {
        const { id, status } = JSON.parse(bodyData || '{}');
        if (!id || !status) {
          return sendJson(res, 400, { error: 'ID e status são obrigatórios' });
        }
        const crm = readCrmData();
        const lead = crm.leads.find(l => l.id === id);
        if (!lead) {
          return sendJson(res, 404, { error: 'Lead não encontrado' });
        }
        lead.status = status;
        lead.atualizadoEm = new Date().toISOString();
        saveCrmData(crm);
        return sendJson(res, 200, { success: true, lead });
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    });
    return;
  }

  // 10. CRM API - Gerador de Ordem de Serviço WhatsApp (POST)
  if (req.method === 'POST' && url.pathname === '/api/crm/leads/os') {
    let bodyData = '';
    req.on('data', chunk => bodyData += chunk);
    req.on('end', () => {
      try {
        const { leadId, motoristaId, veiculoId } = JSON.parse(bodyData || '{}');
        const crm = readCrmData();
        const lead = crm.leads.find(l => l.id === leadId);
        if (!lead) return sendJson(res, 404, { error: 'Lead não encontrado' });

        const motorista = crm.motoristas.find(m => m.id === (motoristaId || lead.motoristaId)) || { nome: 'A Definir', telefone: '27997392787' };
        const veiculo = crm.veiculos.find(v => v.id === (veiculoId || lead.veiculoId)) || { modelo: lead.veiculo || 'Van VIP', placa: 'A definir' };

        const osText = `📋 *ORDEM DE SERVIÇO • JANSEN TRANSPORTES*\n` +
          `🔢 *OS:* #${lead.id}\n` +
          `👤 *Passageiro:* ${lead.cliente}\n` +
          `📱 *Contato:* ${lead.whatsapp}\n` +
          `🚐 *Veículo:* ${veiculo.modelo} (${veiculo.placa})\n` +
          `👨‍✈️ *Motorista:* ${motorista.nome}\n\n` +
          `📍 *Embarque:* ${lead.origem}\n` +
          `📅 *Data Ida:* ${lead.dataIda || 'A combinar'} às ${lead.horaIda || 'A combinar'}\n` +
          `🏁 *Destino:* ${lead.destino}\n` +
          (lead.dataRetorno ? `🔄 *Retorno:* ${lead.dataRetorno} às ${lead.horaRetorno || ''}\n` : '') +
          `👥 *Passageiros:* ${lead.passageiros || 1} pessoas\n` +
          `💰 *Pgto:* ${lead.formaPagamento || 'A combinar'} (Total: R$ ${Number(lead.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\n` +
          (lead.observacoes ? `📝 *Obs:* ${lead.observacoes}\n` : '') +
          `\n_Jansen Transportes • Viagem com Segurança e Pontualidade_`;

        const targetPhone = motorista.telefone ? motorista.telefone.replace(/\D/g, '') : '27997392787';
        const fullPhone = targetPhone.startsWith('55') ? targetPhone : '55' + targetPhone;
        const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(osText)}`;

        return sendJson(res, 200, { success: true, osText, whatsappUrl, motorista, veiculo });
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    });
    return;
  }

  // 11. Webhook WhatsApp - Handshake de Verificação da Meta (GET)
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
            googleReviewLink: session.googleReviewLink || process.env.GOOGLE_REVIEW_LINK
          });

          console.log(`[PESQUISA DE SATISFAÇÃO]: Cliente ${session.customerName} respondeu "${text}". Nota: ${satResult.score} (Positiva: ${satResult.isPositive})`);

          // Envia resposta automaticamente via WhatsApp Cloud API Oficial
          await sendMetaOutboundMessage(fromNumber, satResult.replyMessage);

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

          // Envia confirmação ao cliente no WhatsApp
          await sendMetaOutboundMessage(fromNumber, ackReply);

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

        // 3. Cliente novo chamando direto no WhatsApp -> Fluxo de Qualificação Ativo via Gemini / Motor Local
        const result = await callGeminiAI(text, session);

        // Se o robô finalizou a qualificação ou o cliente pediu humano, pausa o bot e notifica Alex Jansen
        if (result.handoff) {
          session.botPaused = true;

          // 1. Notifica o Alex Jansen no WhatsApp PESSOAL dele com os dados do lead prontos
          const alexPhone = process.env.ALEX_PERSONAL_PHONE || '5527997392787';
          const alertMessage = `🚨 *NOVO LEAD QUALIFICADO NO WHATSAPP!*` +
            (session.customerName ? `\n👤 *Cliente:* ${session.customerName}` : '') +
            `\n📱 *WhatsApp:* +${fromNumber}` +
            (session.serviceType ? `\n🚐 *Veículo:* ${session.serviceType}` : '') +
            (session.isCargo && session.cargoDetails ? `\n📦 *Carga:* ${session.cargoDetails}` : '') +
            (!session.isCargo && session.passengers ? `\n👥 *Passageiros:* ${session.passengers}` : '') +
            (session.route ? `\n📍 *Trajeto:* ${session.route}` : '') +
            (session.tripDate ? `\n📅 *Data:* ${session.tripDate}` : '') +
            (session.times ? `\n⏰ *Horários:* ${session.times}` : '') +
            `\n\n👉 *Chamar cliente com 1 toque:* https://wa.me/${fromNumber}`;

          try {
            await sendMetaOutboundMessage(alexPhone, alertMessage);
            console.log(`[ALERTA DESPACHADO PARA ALEX JANSEN (${alexPhone})]: Lead de ${session.customerName || fromNumber}`);
          } catch (alertErr) {
            console.warn('[ALERTA ALEX ERRO]: Falha ao despachar notificação para Alex:', alertErr.message);
          }

          // 2. Registra automaticamente o lead no CRM Jansen (Kanban)
          try {
            const crm = readCrmData();
            const existingIdx = crm.leads.findIndex(l => l.whatsapp === fromNumber);
            const leadData = {
              id: existingIdx >= 0 ? crm.leads[existingIdx].id : 'lead_wa_' + Date.now(),
              cliente: session.customerName || 'Cliente WhatsApp',
              whatsapp: fromNumber,
              tipoCliente: 'WhatsApp Oficial (Agente IA)',
              origem: session.route ? (session.route.toLowerCase().includes('para') ? session.route.split(/para/i)[0].trim() : session.route) : 'Vitória',
              destino: session.route ? (session.route.toLowerCase().includes('para') ? session.route.split(/para/i)[1].trim() : session.route) : 'A definir',
              dataIda: session.tripDate || 'A definir',
              horaIda: session.times || 'A definir',
              passageiros: session.isCargo ? 1 : (session.passengers ? (parseInt(session.passengers, 10) || 1) : 1),
              veiculo: session.serviceType || 'Van Executiva VIP',
              status: 'novo',
              canalOrigem: 'WhatsApp Oficial (Agente IA)',
              valorTotal: 0,
              observacoes: `Cotação via WhatsApp Bot. Rota: ${session.route || 'Pendente'}. Carga: ${session.cargoDetails || 'N/A'}`,
              criadoEm: new Date().toISOString()
            };
            if (existingIdx >= 0) {
              crm.leads[existingIdx] = { ...crm.leads[existingIdx], ...leadData };
            } else {
              crm.leads.unshift(leadData);
            }
            saveCrmData(crm);
            console.log(`[CRM SYNC]: Lead ${session.customerName || fromNumber} salvo com sucesso no CRM Jansen.`);
          } catch (crmErr) {
            console.warn('[CRM SYNC ERRO]: Falha ao salvar lead no CRM:', crmErr.message);
          }
        }

        console.log(`[AGENTE IA -> ${fromNumber}]: "${result.reply}" (Handoff: ${result.handoff})`);

        // Despacha mensagem de resposta via WhatsApp Cloud API Oficial
        await sendMetaOutboundMessage(fromNumber, result.reply);

        // Registra na régua de recuperação para monitorar paradas caso o cliente suma antes de fechar
        if (session.customerName) {
          followupEngine.registerLeadRecovery({
            phone: fromNumber,
            nome: session.customerName
          });
        }

        return sendJson(res, 200, {
          status: 'success',
          recipient: fromNumber,
          responseMessage: result.reply,
          handoffTriggered: result.handoff,
          handoffReason: result.handoffReason,
          botPaused: session.botPaused,
          alexJansenAlert: result.handoff ? `ALERTA JANSEN: Lead transferido para Alex Jansen (+55 27 99739-2787)` : null
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
