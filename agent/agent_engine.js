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
 * Respostas Inteligentes Ultraconcisas (Poucos Caracteres, Estilo WhatsApp)
 */
function processLocalIntelligence(userMessage, session = {}) {
  const msg = userMessage.toLowerCase().trim();
  session.history = session.history || [];
  session.history.push({ role: 'user', content: userMessage });

  let reply = '';
  let handoff = false;
  let handoffReason = '';

  // 1. Pedido explícito para falar com atendente humano
  const isHumanRequest = msg.includes('humano') || 
                         msg.includes('atendente') || 
                         msg.includes('alex') || 
                         msg.includes('falar com') || 
                         msg.includes('pessoa de verdade') || 
                         msg.includes('pessoa real') || 
                         msg.includes('falar com algu');

  if (isHumanRequest) {
    reply = 'Vou transferir seu atendimento agora para um de nossos especialistas da Jansen para dar continuidade.';
    handoff = true;
    handoffReason = 'Cliente solicitou atendente humano';
  }
  // 2. Guincho e Reboque 24h (Urgência)
  else if (msg.includes('guincho') || msg.includes('reboque') || msg.includes('socorro') || msg.includes('quebrou') || msg.includes('pane') || msg.includes('plataforma')) {
    reply = 'Nosso guincho plataforma 24h atende todo o ES! Qual o modelo do veículo e o local onde você está agora?';
    session.intent = 'guincho';
  }
  // 3. Fora de escopo (ex: helicóptero, barco, lancha, moto táxi, bicicleta)
  else if (msg.includes('helicóptero') || msg.includes('helicoptero') || msg.includes('barco') || msg.includes('lancha') || msg.includes('mototáxi') || msg.includes('moto taxi') || msg.includes('avião') || msg.includes('aviao')) {
    reply = 'Não operamos com esse tipo de transporte. Vou te transferir para um especialista humano da Jansen para te orientar.';
    handoff = true;
    handoffReason = 'Solicitação fora de escopo dos veículos terrestres';
  }
  // 4. Vans Executivas (Turismo, Pedra Azul, Família, Grupos)
  else if (session.intent === 'van' || msg.includes('van') || msg.includes('pedra azul') || msg.includes('domingos martins') || msg.includes('china park') || msg.includes('montanha') || msg.includes('passeio') || msg.includes('grupo')) {
    session.intent = 'van';
    if (!session.askedPassengers && !(/\d+/.test(msg))) {
      reply = 'Temos vans Mercedes Sprinter e Master VIP (até 15 lugares) com poltronas reclináveis e ar duplo! Quantas pessoas vão viajar?';
      session.askedPassengers = true;
    } else if (!session.askedDate) {
      reply = 'Perfeito! Qual a data prevista para a viagem e a cidade de partida?';
      session.askedDate = true;
    } else {
      reply = 'Excelente! Vou transferir seu atendimento agora para um de nossos especialistas da Jansen para finalizar o valor da sua viagem.';
      handoff = true;
      handoffReason = 'Cotação de Van Executiva pronta';
    }
  }
  // 5. Sedans Executivos & Casamentos / Aeroporto VIX
  else if (session.intent === 'sedan' || msg.includes('sedan') || msg.includes('sedã') || msg.includes('corolla') || msg.includes('byd') || msg.includes('casamento') || msg.includes('noiva') || msg.includes('aeroporto') || msg.includes('executivo') || msg.includes('vix') || msg.includes('traslado')) {
    session.intent = 'sedan';
    if (!session.askedDate) {
      reply = 'Nosso Toyota Corolla e SUV BYD atendem com motorista a rigor e pontualidade! Qual a data e o trajeto desejado?';
      session.askedDate = true;
    } else {
      reply = 'Combinado! Vou transferir seu atendimento agora para um de nossos especialistas da Jansen para dar continuidade à sua reserva.';
      handoff = true;
      handoffReason = 'Reserva de Carro Executivo';
    }
  }
  // 6. Micro-ônibus e Ônibus Rodoviários
  else if (session.intent === 'onibus' || msg.includes('ônibus') || msg.includes('onibus') || msg.includes('micro') || msg.includes('volare') || msg.includes('excursão') || msg.includes('excursao') || msg.includes('congresso')) {
    session.intent = 'onibus';
    if (!session.askedDestination) {
      reply = 'Dispomos de Micro Volare DW9 (31 lugares) e Ônibus (46 lugares) com registro ANTT. Qual o destino e a quantidade de passageiros?';
      session.askedDestination = true;
    } else {
      reply = 'Ótimo! Vou transferir seu atendimento agora para um de nossos especialistas da Jansen para calcular sua rota em grupo.';
      handoff = true;
      handoffReason = 'Cotação de Micro/Ônibus';
    }
  }
  // 7. Cargas e Caminhões
  else if (msg.includes('carga') || msg.includes('caminhão') || msg.includes('caminhao') || msg.includes('furgão') || msg.includes('furgao') || msg.includes('baú') || msg.includes('bau') || msg.includes('frete') || msg.includes('mercadoria') || msg.includes('entrega')) {
    reply = 'Atendemos cargas fechadas e distribuição no ES com caminhões Mercedes Accelo Baú. Qual o tipo de mercadoria e o trajeto?';
    session.intent = 'carga';
  }
  // 8. Dúvidas de Faturamento e Empresa PJ
  else if (msg.includes('faturamento') || msg.includes('empresa') || msg.includes('pj') || msg.includes('nota fiscal') || msg.includes('boleto')) {
    reply = 'Sim! Emitimos Nota Fiscal e faturamos para empresas (PJ) com cadastro facilitado. Qual serviço sua empresa precisa?';
  }
  // 9. Raio de Atuação
  else if (msg.includes('atende') || msg.includes('onde') || msg.includes('cidade') || msg.includes('região') || msg.includes('regiao') || msg.includes('estado')) {
    reply = 'Atendemos todo o estado do Espírito Santo e fazemos viagens e excursões para todo o Brasil com registro ANTT!';
  }
  // 10. Saudações gerais
  else if (msg.includes('olá') || msg.includes('ola') || msg.includes('bom dia') || msg.includes('boa tarde') || msg.includes('boa noite') || msg === 'oi') {
    reply = 'Olá! Sou o assistente virtual da Jansen Transportes. Você precisa de Van, Carro Executivo, Ônibus, Carga ou Guincho?';
  }
  // 11. Resposta Genérica / Fallback Inteligente e Conciso
  else {
    reply = 'Entendido! Para te passar as informações exatas, vou transferir seu atendimento agora para um de nossos especialistas da Jansen.';
    handoff = true;
    handoffReason = 'Pergunta personalizada ou necessidade de alinhamento';
  }

  // Garantia Rígida: Resposta nunca passa de 250 caracteres
  if (reply.length > 250) {
    const sentences = reply.split(/(?<=[.!?])\s+/);
    reply = sentences.slice(0, 2).join(' ');
  }

  session.history.push({ role: 'assistant', content: reply });

  const whatsappPhone = knowledgeBase.empresa?.telefones?.whatsapp || '+5527997392787';
  const whatsappUrl = `https://wa.me/${whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Olá! Estava conversando com o assistente da Jansen Transportes sobre: "${userMessage}". Poderia me atender?`
  )}`;

  return {
    reply,
    handoff,
    handoffReason,
    whatsappUrl,
    whatsappFormatted: knowledgeBase.empresa?.telefones?.whatsapp_formatado || '(27) 99739-2787',
    session
  };
}

module.exports = {
  processLocalIntelligence,
  SYSTEM_PROMPT
};
