/**
 * Jansen Transportes - Motor de Inteligência do Agente de IA
 * Comunicação Ultraconcisa, Triagem Conversacional e Transbordo Humano
 */

const fs = require('fs');
const path = require('path');
const { SYSTEM_PROMPT } = require('./prompt_system');

// Carregar Base de Conhecimento
let knowledgeBase = {};
try {
  const kbPath = path.join(__dirname, 'knowledge_base.json');
  knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
} catch (e) {
  console.warn('Base de conhecimento nao carregada:', e.message);
}

/**
 * Respostas Inteligentes Ultraconcisas & Triagem Qualificada de Lead
 */
function processLocalIntelligence(userMessage, session = {}) {
  const msg = userMessage.toLowerCase().trim();
  session.history = session.history || [];
  session.history.push({ role: 'user', content: userMessage });

  let reply = '';
  let handoff = false;
  let handoffReason = '';

  // 1. Extração de Entidades
  // A. Nome do cliente
  if (!session.customerName) {
    const namePatterns = [
      /(?:me chamo|meu nome [eé]|sou o|sou a|pode me chamar de|aqui [eé] o|aqui [eé] a)\s+([a-zA-ZÀ-ÿ]+)/i,
      /^([a-zA-ZÀ-ÿ]{2,15})(?:\s+[a-zA-ZÀ-ÿ]{2,15})?$/
    ];

    for (const pat of namePatterns) {
      const match = userMessage.match(pat);
      if (match && match[1]) {
        const candidate = match[1].trim();
        const nonNames = ['oi', 'olá', 'ola', 'bom', 'dia', 'boa', 'tarde', 'noite', 'van', 'guincho', 'sedan', 'onibus', 'quero', 'preciso', 'cotar'];
        if (!nonNames.includes(candidate.toLowerCase())) {
          session.customerName = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
          break;
        }
      }
    }
  }

  // B. Tipo de Serviço / Veículo
  if (!session.serviceType) {
    if (msg.includes('van') || msg.includes('sprinter') || msg.includes('master') || msg.includes('pedra azul') || msg.includes('domingos martins') || msg.includes('china park')) {
      session.serviceType = 'Van Executiva VIP';
    } else if (msg.includes('sedan') || msg.includes('sedã') || msg.includes('corolla') || msg.includes('byd') || msg.includes('casamento') || msg.includes('noiva') || msg.includes('aeroporto') || msg.includes('vix') || msg.includes('traslado')) {
      session.serviceType = 'Sedan Executivo (Corolla/BYD)';
    } else if (msg.includes('onibus') || msg.includes('ônibus') || msg.includes('micro') || msg.includes('volare') || msg.includes('excursão') || msg.includes('excursao') || msg.includes('congresso')) {
      session.serviceType = 'Micro / Ônibus Rodoviário';
    } else if (msg.includes('guincho') || msg.includes('reboque') || msg.includes('socorro') || msg.includes('quebrou') || msg.includes('pane') || msg.includes('plataforma')) {
      session.serviceType = 'Guincho 24h';
    } else if (msg.includes('carga') || msg.includes('caminhão') || msg.includes('caminhao') || msg.includes('baú') || msg.includes('bau') || msg.includes('frete')) {
      session.serviceType = 'Caminhão Baú (Cargas)';
    }
  }

  // C. Passageiros
  if (!session.passengers) {
    const pMatch = msg.match(/(\d{1,3})\s*(?:pessoas?|passageiros?|lugares?|pax)?/);
    if (pMatch && parseInt(pMatch[1], 10) > 0 && parseInt(pMatch[1], 10) <= 100 && (msg.includes('pessoa') || msg.includes('lugar') || msg.includes('passageiro') || session.serviceType)) {
      session.passengers = `${pMatch[1]} pessoas`;
    }
  }

  // D. Trajeto
  if (!session.route) {
    const isOnlyVehicleSelect = /^(?:preciso|quero|gostaria|cotar|alugar)?\s*(?:de\s+)?(?:uma?\s+)?(?:van|sedan|carro|onibus|ônibus|guincho|caminhão|caminhao)\b/i.test(msg);
    if (!isOnlyVehicleSelect && (msg.includes('para ') || msg.includes('até ') || msg.includes('ate ') || msg.includes('saindo') || msg.includes('partindo') || msg.includes('vitoria') || msg.includes('vitória') || msg.includes('domingos martins') || msg.includes('pedra azul') || msg.includes('guarapari') || msg.includes('aeroporto'))) {
      session.route = userMessage;
    }
  }

  // E. Tipo de Viagem (Ida e Volta vs Só Ida)
  if (!session.tripType) {
    if (msg.includes('ida e volta') || msg.includes('ida/volta') || msg.includes('bate e volta') || msg.includes('bate-volta')) {
      session.tripType = 'Ida e Volta';
    } else if (msg.includes('só ida') || msg.includes('so ida') || msg.includes('apenas ida') || msg.includes('somente ida')) {
      session.tripType = 'Só Ida';
    }
  }

  // F. Data
  if (!session.tripDate) {
    const dateMatch = msg.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\bdia\s+\d{1,2}\b|\bs[aá]bado\b|\bsexta\b|\bamanh[aã]\b|\bferiado\b|\bdomingo\b(?!\s*martins))/i);
    if (dateMatch) {
      session.tripDate = dateMatch[0];
    }
  }

  // G. Horários
  if (!session.times) {
    const timeMatch = msg.match(/(\d{1,2}(?:h|:\d{2}))/g);
    if (timeMatch && timeMatch.length > 0) {
      session.times = userMessage;
    }
  }

  // 2. Verificação de Solicitação de Atendente Humano
  const isHumanRequest = msg.includes('humano') || 
                         msg.includes('atendente') || 
                         msg.includes('alex') || 
                         msg.includes('falar com') || 
                         msg.includes('pessoa de verdade') || 
                         msg.includes('pessoa real');

  if (isHumanRequest) {
    reply = session.customerName 
      ? `Perfeito, ${session.customerName}! Vou transferir seu atendimento agora para um de nossos especialistas da Jansen.`
      : 'Vou transferir seu atendimento agora para um de nossos especialistas da Jansen para dar continuidade.';
    handoff = true;
    handoffReason = 'Solicitação de atendente humano';
  } 
  // 3. Fora de Escopo
  else if (msg.includes('helicóptero') || msg.includes('helicoptero') || msg.includes('barco') || msg.includes('lancha') || msg.includes('mototáxi') || msg.includes('moto taxi') || msg.includes('avião') || msg.includes('aviao')) {
    reply = session.customerName
      ? `Não operamos com esse tipo de transporte, ${session.customerName}. Vou te transferir para um especialista humano da Jansen para te orientar.`
      : 'Não operamos com esse tipo de transporte. Vou te transferir para um especialista humano da Jansen para te orientar.';
    handoff = true;
    handoffReason = 'Transporte fora do escopo';
  }
  // 4. Fluxo de Guincho 24h
  else if (session.serviceType === 'Guincho 24h') {
    if (!session.customerName) {
      reply = 'É um prazer atender você na Jansen! Nosso guincho 24h atende todo o ES. Como posso te chamar e onde você está agora?';
    } else if (!session.route) {
      reply = `Entendido, ${session.customerName}! Qual o modelo do veículo e onde você está localizado agora?`;
      session.route = 'pendente';
    } else {
      reply = `Perfeito, ${session.customerName}! Vou acionar nosso especialista Alex Jansen no WhatsApp para enviar o guincho agora mesmo.`;
      handoff = true;
      handoffReason = 'Acionamento de Guincho 24h';
    }
  }
  // 5. Fluxo Principal de Qualificação (Vans, Sedans, Ônibus, Cargas)
  else {
    // Passo 1: Nome
    if (!session.customerName) {
      if (session.serviceType) {
        reply = `É um prazer para a Jansen Transportes atender você! Nossas opções de ${session.serviceType} são de alto padrão. Como posso te chamar?`;
      } else {
        reply = 'Olá! É um prazer para a Jansen Transportes atender você. Para começarmos, como posso te chamar?';
      }
    }
    // Passo 2: Tipo de Veículo
    else if (!session.serviceType) {
      reply = `Prazer, ${session.customerName}! Você precisa de Van VIP, Carro Executivo, Ônibus, Carga ou Guincho?`;
    }
    // Passo 3: Passageiros e Trajeto
    else if (!session.passengers || !session.route) {
      reply = `Excelente, ${session.customerName}! Para quantas pessoas seria a viagem e qual o trajeto (cidade de saída e destino)?`;
    }
    // Passo 4: Data e Modalidade (Ida e Volta vs Só Ida)
    else if (!session.tripDate || !session.tripType) {
      reply = `Perfeito, ${session.customerName}! Qual a data prevista para a viagem? Será apenas ida ou ida e volta?`;
    }
    // Passo 5: Horários
    else if (!session.times) {
      if (session.tripType === 'Só Ida') {
        reply = `Combinado, ${session.customerName}! Qual o horário previsto para a saída?`;
      } else {
        reply = `Combinado, ${session.customerName}! Quais seriam os horários previstos de saída e de retorno?`;
      }
    }
    // Passo 6: Qualificação Completa! Transbordo com Resumo Executivo
    else {
      reply = `Tudo anotado, ${session.customerName}! Vou transferir seus dados agora para o Alex Jansen para te enviar a cotação exata.`;
      handoff = true;
      handoffReason = 'Cotação qualificada pronta para fechamento';
    }
  }

  // Garantia Rígida: Resposta nunca passa de 200 caracteres
  if (reply.length > 200) {
    const sentences = reply.split(/(?<=[.!?])\s+/);
    reply = sentences.slice(0, 2).join(' ');
  }

  session.history.push({ role: 'assistant', content: reply });

  // Formatação do resumo estruturado para o WhatsApp do Alex Jansen
  let waSummary = `Olá Alex! Cotação solicitada no site Jansen:`;
  if (session.customerName) waSummary += `\n👤 *Cliente:* ${session.customerName}`;
  if (session.serviceType) waSummary += `\n🚐 *Veículo:* ${session.serviceType}`;
  if (session.passengers) waSummary += `\n👥 *Passageiros:* ${session.passengers}`;
  if (session.route && session.route !== 'pendente') waSummary += `\n📍 *Trajeto:* ${session.route}`;
  if (session.tripDate) waSummary += `\n📅 *Data:* ${session.tripDate}`;
  if (session.tripType) waSummary += ` (${session.tripType})`;
  if (session.times) waSummary += `\n⏰ *Horários:* ${session.times}`;
  waSummary += `\n\nPoderia me enviar o valor da cotação?`;

  const whatsappPhone = knowledgeBase.empresa?.telefones?.whatsapp || '+5527997392787';
  const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waSummary)}`;

  return {
    reply,
    handoff,
    handoffReason,
    whatsappUrl,
    whatsappFormatted: knowledgeBase.empresa?.telefones?.whatsapp_formatado || '(27) 99739-2787',
    session
  };
}

/**
 * Chamada à API Oficial do Google Gemini (LLM)
 * Se GEMINI_API_KEY estiver configurado, usa a inteligência generativa do Gemini 2.5 Flash / 1.5 Flash.
 * Se não estiver configurado, usa o motor local calibrado sem quebrar o sistema.
 */
async function callGeminiAI(userMessage, session = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'sua_chave_gemini_aqui') {
    return processLocalIntelligence(userMessage, session);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    // Constrói histórico das últimas mensagens
    const history = (session.history || []).slice(-6).map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }]
    }));

    history.push({ role: 'user', parts: [{ text: userMessage }] });

    const payload = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: history,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 100
      }
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      console.warn('[GEMINI API]: Erro na resposta da API Gemini (' + resp.status + '). Utilizando motor de contingencia local.');
      return processLocalIntelligence(userMessage, session);
    }

    const data = await resp.json();
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.trim();

    // Roda a extração de dados locais para manter o resumo do Alex Jansen preenchido
    const localAnalysis = processLocalIntelligence(userMessage, session);

    // Se o Gemini gerou resposta válida e curta (< 200 chars), usa ela
    if (text && text.length > 5 && text.length <= 200) {
      localAnalysis.reply = text;
      // Atualiza no histórico da sessão
      if (session.history && session.history.length > 0) {
        session.history[session.history.length - 1].content = text;
      }
    }

    return localAnalysis;
  } catch (err) {
    console.warn('[GEMINI API]: Falha de rede ou timeout. Utilizando motor local:', err.message);
    return processLocalIntelligence(userMessage, session);
  }
}

module.exports = {
  processLocalIntelligence,
  callGeminiAI,
  SYSTEM_PROMPT
};
