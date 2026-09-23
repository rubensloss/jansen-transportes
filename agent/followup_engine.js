/**
 * Jansen Transportes - Motor de Follow-up Escalonado
 * Gerencia as réguas de recuperação de vendas e pós-venda/avaliações Google.
 */

const DEFAULT_GOOGLE_REVIEW_LINK = 'https://g.page/r/jansen-transportes/review';
const ALEX_JANSEN_PHONE = '(27) 99739-2787';

// Modelos de mensagens ultracurtas e cordiais (Padrão Jansen)
const FOLLOWUP_TEMPLATES = {
  // Trilha A: Recuperação de Vendas (Cliente Não Fechou / Parou de Responder)
  recovery: {
    t1_4h: {
      id: 't1_4h',
      delayLabel: '4 horas após inatividade',
      delayMs: 4 * 60 * 60 * 1000,
      objective: 'Check-in gentil e acolhedor sem pressão',
      template: 'Olá, {Nome}! Passando para saber se ficou alguma dúvida sobre o veículo ou rota da sua viagem. Posso te ajudar em algo mais?'
    },
    t2_24h: {
      id: 't2_24h',
      delayLabel: '24 horas após 1ª mensagem',
      delayMs: 24 * 60 * 60 * 1000,
      objective: 'Alerta educado de procura e disponibilidade de frota',
      template: 'Olá, {Nome}! Nossas vans para a data solicitada estão com bastante procura. Deseja que eu segure sua data com o Alex Jansen?'
    },
    t3_48h: {
      id: 't3_48h',
      delayLabel: '48 horas após contato anterior',
      delayMs: 48 * 60 * 60 * 1000,
      objective: 'Ajuste de roteiro ou horários para flexibilizar orçamento',
      template: 'Olá, {Nome}! Se precisar de algum ajuste no trajeto ou horários para adequar ao seu orçamento, nós adaptamos para você. Vamos conversar?'
    },
    t4_7d: {
      id: 't4_7d',
      delayLabel: '1 semana (7 dias) após contato anterior',
      delayMs: 7 * 24 * 60 * 60 * 1000,
      objective: 'Encerramento elegante mantendo relacionamento para o futuro',
      template: 'Olá, {Nome}! Vou deixar sua cotação arquivada por aqui, tudo bem? Sempre que precisar de transporte executivo ou van, conte com a Jansen!'
    }
  },

  // Trilha B: Negócio Fechado (Pós-Venda, Satisfação & Google Review)
  closed: {
    t1_prev_24h: {
      id: 't1_prev_24h',
      timingLabel: '24 horas antes da viagem',
      objective: 'Confirmação final de pontualidade e tranquilidade',
      template: 'Olá, {Nome}! Sua van para amanhã já está revisada e nossa equipe pronta. Tudo confirmado com o horário de saída marcado para as {Horário}?'
    },
    t2_prev_2h: {
      id: 't2_prev_2h',
      timingLabel: '2 horas antes do embarque',
      objective: 'Aviso de motorista a postos e votos de boa viagem',
      template: 'Olá, {Nome}! Nosso motorista já está a postos para o seu embarque. Desejamos uma excelente e confortável viagem com a Jansen Transportes!'
    },
    t3_pos_24h: {
      id: 't3_pos_24h',
      timingLabel: '1 dia (24h) pós-retorno da viagem',
      objective: 'Pesquisa rápida de satisfação com nota de 1 a 5',
      template: 'Olá, {Nome}! Esperamos que sua viagem tenha sido excelente. De 1 a 5, que nota você daria para o nosso atendimento e conforto?'
    },
    avaliacao_positiva: {
      id: 'avaliacao_positiva',
      objective: 'Encaminhamento para Google Meu Negócio (5 estrelas)',
      template: 'Ficamos muito felizes, {Nome}! Sua opinião faz toda diferença. Poderia nos avaliar com 5 estrelas no Google? Leva só 1 minuto: {LinkGoogle}'
    },
    avaliacao_negativa: {
      id: 'avaliacao_negativa',
      objective: 'Alerta imediato e acionamento humano de Alex Jansen',
      template: 'Agradecemos o retorno sincero, {Nome}. O Alex Jansen já foi informado pessoalmente e vai entrar em contato com você para entender e resolver isso.'
    }
  }
};

/**
 * Renderiza o modelo com os dados dinâmicos do cliente
 */
function renderMessage(template, params = {}) {
  const nome = params.nome || params.name || params.customerName || 'amigo(a)';
  const horario = params.horario || params.time || 'o horário previsto';
  const data = params.data || params.date || 'a data escolhida';
  const veiculo = params.veiculo || 'van ou carro executivo';
  const linkGoogle = params.googleReviewLink || DEFAULT_GOOGLE_REVIEW_LINK;

  return template
    .replace(/{Nome}/g, nome)
    .replace(/{Horário}/g, horario)
    .replace(/{Data}/g, data)
    .replace(/{Veículo}/g, veiculo)
    .replace(/{LinkGoogle}/g, linkGoogle);
}

/**
 * Analisa a resposta da pesquisa de satisfação
 * Retorna { isPositive, score, sentiment, replyMessage, alexAlert }
 */
function evaluateSatisfactionResponse(text, leadParams = {}) {
  const cleaned = (text || '').toLowerCase().trim();
  let score = null;
  let isPositive = false;

  // Busca por números de 1 a 5
  const numberMatch = cleaned.match(/\b([1-5]|10)\b/);
  if (numberMatch) {
    const parsed = parseInt(numberMatch[1], 10);
    score = parsed === 10 ? 5 : parsed;
    isPositive = score >= 4;
  } else {
    // Busca por palavras-chave positivas
    const positiveWords = ['excelente', 'ótima', 'otima', 'maravilhosa', 'perfeita', 'muito boa', 'adorei', 'top', 'parabéns', 'show', 'impecável', '10', 'bom', 'boa'];
    const negativeWords = ['ruim', 'péssima', 'pessima', 'horrível', 'horrivel', 'atrasou', 'problema', 'demora', 'falha', 'não gostei', 'fraca'];

    const hasPositive = positiveWords.some(w => cleaned.includes(w));
    const hasNegative = negativeWords.some(w => cleaned.includes(w));

    if (hasPositive && !hasNegative) {
      isPositive = true;
      score = 5;
    } else if (hasNegative) {
      isPositive = false;
      score = 2;
    } else {
      isPositive = true;
      score = 4;
    }
  }

  const nome = leadParams.nome || leadParams.customerName || 'Cliente';
  const phone = leadParams.phone || leadParams.from || '';

  if (isPositive) {
    const replyMessage = renderMessage(FOLLOWUP_TEMPLATES.closed.avaliacao_positiva.template, leadParams);
    return {
      isPositive: true,
      score,
      replyMessage,
      alexAlert: null,
      action: 'redirect_google_review'
    };
  } else {
    const replyMessage = renderMessage(FOLLOWUP_TEMPLATES.closed.avaliacao_negativa.template, leadParams);
    return {
      isPositive: false,
      score,
      replyMessage,
      alexAlert: `🚨 ALERTA SATISFAÇÃO JANSEN: Cliente ${nome} (${phone}) avaliou com nota ${score || 'baixa'}: "${text}". Assuma contato urgente no WhatsApp!`,
      action: 'escalate_to_alex'
    };
  }
}

// Armazenamento em memória das réguas de follow-up ativas
const followupRegistry = new Map();

/**
 * Registra um lead na Trilha de Recuperação de Vendas
 */
function registerLeadRecovery(leadData) {
  const phone = leadData.phone || leadData.from || 'lead_' + Date.now();
  const now = Date.now();

  const record = {
    phone,
    customerName: leadData.nome || leadData.customerName || 'Cliente',
    track: 'recovery',
    status: 'active',
    currentStageIndex: 0,
    stages: ['t1_4h', 't2_24h', 't3_48h', 't4_7d'],
    createdAt: now,
    lastInteractionAt: now,
    nextDueAt: now + (4 * 60 * 60 * 1000), // 4 horas
    history: [],
    leadMetadata: leadData
  };

  followupRegistry.set(phone, record);
  return record;
}

/**
 * Registra um contrato na Trilha de Pós-Venda / Clientes Fechados
 */
function registerClosedDeal(dealData) {
  const phone = dealData.phone || dealData.from || 'deal_' + Date.now();
  const departureTimestamp = dealData.departureTimestamp || (Date.now() + 24 * 60 * 60 * 1000);
  const returnTimestamp = dealData.returnTimestamp || (departureTimestamp + 12 * 60 * 60 * 1000);

  const record = {
    phone,
    customerName: dealData.nome || dealData.customerName || 'Cliente',
    track: 'closed',
    status: 'scheduled',
    departureTimestamp,
    returnTimestamp,
    horario: dealData.horario || 'o horário previsto',
    nextDueAt: departureTimestamp - (24 * 60 * 60 * 1000), // 24h antes
    currentStage: 't1_prev_24h',
    awaitingSatisfactionSurvey: false,
    history: [],
    dealMetadata: dealData
  };

  followupRegistry.set(phone, record);
  return record;
}

/**
 * Obtém todos os registros da fila de follow-up
 */
function getAllFollowups() {
  return Array.from(followupRegistry.values());
}

/**
 * Dispara uma etapa de simulação para testes imediatos
 */
function testSimulateTrigger(phone, track, stageKey, customParams = {}) {
  const record = followupRegistry.get(phone) || {
    phone,
    customerName: customParams.nome || 'Carlos',
    track,
    ...customParams
  };

  let templateObj;
  if (track === 'recovery') {
    templateObj = FOLLOWUP_TEMPLATES.recovery[stageKey];
  } else if (track === 'closed') {
    templateObj = FOLLOWUP_TEMPLATES.closed[stageKey];
  }

  if (!templateObj) {
    throw new Error(`Etapa de follow-up desconhecida: ${track}/${stageKey}`);
  }

  const message = renderMessage(templateObj.template, {
    nome: record.customerName,
    horario: record.horario || customParams.horario || '08:00',
    data: customParams.data || '15/10',
    googleReviewLink: customParams.googleReviewLink || DEFAULT_GOOGLE_REVIEW_LINK
  });

  return {
    success: true,
    phone,
    track,
    stageKey,
    objective: templateObj.objective,
    renderedMessage: message,
    charCount: message.length,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  DEFAULT_GOOGLE_REVIEW_LINK,
  ALEX_JANSEN_PHONE,
  FOLLOWUP_TEMPLATES,
  renderMessage,
  evaluateSatisfactionResponse,
  registerLeadRecovery,
  registerClosedDeal,
  getAllFollowups,
  testSimulateTrigger
};
