/**
 * Jansen Transportes - Widget de Chat Interativo do Agente de IA
 * Respostas Ultraconcisas, Triagem Ágil e Transbordo Humano p/ WhatsApp
 */

(function() {
  const WHATSAPP_PHONE = '5527997392787';
  const WHATSAPP_FORMATTED = '(27) 99739-2787';

  // Base de Conhecimento e Sessão de Qualificação de Lead
  const agentSession = {
    customerName: null,
    serviceType: null,
    passengers: null,
    route: null,
    tripDate: null,
    tripType: null,
    times: null,
    history: []
  };

  function processLocalMessage(userText) {
    const msg = userText.toLowerCase().trim();
    agentSession.history.push({ role: 'user', content: userText });

    let reply = '';
    let handoff = false;
    let handoffReason = '';

    // 1. Extração de Entidades
    // A. Nome do cliente
    if (!agentSession.customerName) {
      const namePatterns = [
        /(?:me chamo|meu nome [eé]|sou o|sou a|pode me chamar de|aqui [eé] o|aqui [eé] a)\s+([a-zA-ZÀ-ÿ]+)/i,
        /^([a-zA-ZÀ-ÿ]{2,15})(?:\s+[a-zA-ZÀ-ÿ]{2,15})?$/
      ];

      for (const pat of namePatterns) {
        const match = userText.match(pat);
        if (match && match[1]) {
          const candidate = match[1].trim();
          const nonNames = ['oi', 'olá', 'ola', 'bom', 'dia', 'boa', 'tarde', 'noite', 'van', 'sedan', 'onibus', 'quero', 'preciso', 'cotar'];
          if (!nonNames.includes(candidate.toLowerCase())) {
            agentSession.customerName = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
            break;
          }
        }
      }
    }

    // B. Tipo de Serviço / Veículo
    if (!agentSession.serviceType) {
      if (msg.includes('van') || msg.includes('sprinter') || msg.includes('master') || msg.includes('pedra azul') || msg.includes('domingos martins') || msg.includes('china park')) {
        agentSession.serviceType = 'Van Executiva VIP';
      } else if (msg.includes('sedan') || msg.includes('sedã') || msg.includes('corolla') || msg.includes('byd') || msg.includes('casamento') || msg.includes('noiva') || msg.includes('aeroporto') || msg.includes('vix') || msg.includes('traslado')) {
        agentSession.serviceType = 'Sedan Executivo (Corolla/BYD)';
      } else if (msg.includes('onibus') || msg.includes('ônibus') || msg.includes('micro') || msg.includes('volare') || msg.includes('excursão') || msg.includes('excursao') || msg.includes('congresso')) {
        agentSession.serviceType = 'Micro / Ônibus Rodoviário';
      } else if (msg.includes('carga') || msg.includes('caminhão') || msg.includes('caminhao') || msg.includes('baú') || msg.includes('bau') || msg.includes('frete')) {
        agentSession.serviceType = 'Caminhão Baú (Cargas)';
      }
    }

    // C. Passageiros
    if (!agentSession.passengers) {
      const pMatch = msg.match(/(\d{1,3})\s*(?:pessoas?|passageiros?|lugares?|pax)?/);
      if (pMatch && parseInt(pMatch[1], 10) > 0 && parseInt(pMatch[1], 10) <= 100 && (msg.includes('pessoa') || msg.includes('lugar') || msg.includes('passageiro') || agentSession.serviceType)) {
        agentSession.passengers = `${pMatch[1]} pessoas`;
      }
    }

    // D. Trajeto
    if (!agentSession.route) {
      const isOnlyVehicleSelect = /^(?:preciso|quero|gostaria|cotar|alugar)?\s*(?:de\s+)?(?:uma?\s+)?(?:van|sedan|carro|onibus|ônibus|caminhão|caminhao)\b/i.test(msg);
      if (!isOnlyVehicleSelect && (msg.includes('para ') || msg.includes('até ') || msg.includes('ate ') || msg.includes('saindo') || msg.includes('partindo') || msg.includes('vitoria') || msg.includes('vitória') || msg.includes('domingos martins') || msg.includes('pedra azul') || msg.includes('guarapari') || msg.includes('aeroporto'))) {
        agentSession.route = userText;
      }
    }

    // E. Tipo de Viagem (Ida e Volta vs Só Ida)
    if (!agentSession.tripType) {
      if (msg.includes('ida e volta') || msg.includes('ida/volta') || msg.includes('bate e volta') || msg.includes('bate-volta')) {
        agentSession.tripType = 'Ida e Volta';
      } else if (msg.includes('só ida') || msg.includes('so ida') || msg.includes('apenas ida') || msg.includes('somente ida')) {
        agentSession.tripType = 'Só Ida';
      }
    }

    // F. Data
    if (!agentSession.tripDate) {
      const dateMatch = msg.match(/(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\bdia\s+\d{1,2}\b|\bs[aá]bado\b|\bsexta\b|\bamanh[aã]\b|\bferiado\b|\bdomingo\b(?!\s*martins))/i);
      if (dateMatch) {
        agentSession.tripDate = dateMatch[0];
      }
    }

    // G. Horários
    if (!agentSession.times) {
      const timeMatch = msg.match(/(\d{1,2}(?:h|:\d{2}))/g);
      if (timeMatch && timeMatch.length > 0) {
        agentSession.times = userText;
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
      reply = agentSession.customerName 
        ? `Perfeito, ${agentSession.customerName}! Vou transferir seu atendimento agora para um de nossos especialistas da Jansen.`
        : 'Vou transferir seu atendimento agora para um de nossos especialistas da Jansen para dar continuidade.';
      handoff = true;
      handoffReason = 'Solicitação de atendente humano';
    } 
    // 3. Fora de Escopo / Guincho
    else if (msg.includes('guincho') || msg.includes('reboque') || msg.includes('socorro') || msg.includes('quebrou') || msg.includes('pane') || msg.includes('plataforma') || msg.includes('helicóptero') || msg.includes('helicoptero') || msg.includes('barco') || msg.includes('lancha') || msg.includes('mototáxi') || msg.includes('moto taxi') || msg.includes('avião') || msg.includes('aviao')) {
      if (msg.includes('guincho') || msg.includes('reboque') || msg.includes('socorro') || msg.includes('quebrou') || msg.includes('pane') || msg.includes('plataforma')) {
        reply = agentSession.customerName
          ? `Olá, ${agentSession.customerName}! A Jansen Transportes atua exclusivamente com transporte executivo (Vans VIP, Micro-ônibus, Sedans) e logística de cargas em caminhões baú. Não operamos com serviço de guincho.`
          : 'Olá! A Jansen Transportes atua exclusivamente com transporte executivo (Vans VIP, Micro-ônibus, Sedans) e logística de cargas em caminhões baú. Não operamos com serviço de guincho.';
        handoff = false;
      } else {
        reply = agentSession.customerName
          ? `Não operamos com esse tipo de transporte, ${agentSession.customerName}. Vou te transferir para um especialista humano da Jansen para te orientar.`
          : 'Não operamos com esse tipo de transporte. Vou te transferir para um especialista humano da Jansen para te orientar.';
        handoff = true;
        handoffReason = 'Transporte fora do escopo';
      }
    }
    // 4. Fluxo Principal de Qualificação (Vans, Sedans, Ônibus, Cargas)
    else {
      // Passo 1: Nome
      if (!agentSession.customerName) {
        if (agentSession.serviceType) {
          reply = `É um prazer para a Jansen Transportes atender você! Nossas opções de ${agentSession.serviceType} são de alto padrão. Como posso te chamar?`;
        } else {
          reply = 'Olá! É um prazer para a Jansen Transportes atender você. Para começarmos, como posso te chamar?';
        }
      }
      // Passo 2: Tipo de Veículo
      else if (!agentSession.serviceType) {
        reply = `Prazer, ${agentSession.customerName}! Você precisa de Van VIP, Carro Executivo, Micro-ônibus ou Caminhão Baú?`;
      }
      // Passo 3: Passageiros e Trajeto
      else if (!agentSession.passengers || !agentSession.route) {
        reply = `Excelente, ${agentSession.customerName}! Para quantas pessoas seria a viagem e qual o trajeto (cidade de saída e destino)?`;
      }
      // Passo 4: Data e Modalidade (Ida e Volta vs Só Ida)
      else if (!agentSession.tripDate || !agentSession.tripType) {
        reply = `Perfeito, ${agentSession.customerName}! Qual a data prevista para a viagem? Será apenas ida ou ida e volta?`;
      }
      // Passo 5: Horários
      else if (!agentSession.times) {
        if (agentSession.tripType === 'Só Ida') {
          reply = `Combinado, ${agentSession.customerName}! Qual o horário previsto para a saída?`;
        } else {
          reply = `Combinado, ${agentSession.customerName}! Quais seriam os horários previstos de saída e de retorno?`;
        }
      }
      // Passo 6: Qualificação Completa! Transbordo com Resumo Executivo
      else {
        reply = `Tudo anotado, ${agentSession.customerName}! Vou transferir seus dados agora para o Alex Jansen para te enviar a cotação exata.`;
        handoff = true;
        handoffReason = 'Cotação qualificada pronta para fechamento';
      }
    }

    if (reply.length > 200) {
      const sentences = reply.split(/(?<=[.!?])\s+/);
      reply = sentences.slice(0, 2).join(' ');
    }

    // Formatação do resumo estruturado para o WhatsApp do Alex Jansen
    let waSummary = `Olá Alex! Cotação solicitada no site Jansen:`;
    if (agentSession.customerName) waSummary += `\n👤 *Cliente:* ${agentSession.customerName}`;
    if (agentSession.serviceType) waSummary += `\n🚐 *Veículo:* ${agentSession.serviceType}`;
    if (agentSession.passengers) waSummary += `\n👥 *Passageiros:* ${agentSession.passengers}`;
    if (agentSession.route && agentSession.route !== 'pendente') waSummary += `\n📍 *Trajeto:* ${agentSession.route}`;
    if (agentSession.tripDate) waSummary += `\n📅 *Data:* ${agentSession.tripDate}`;
    if (agentSession.tripType) waSummary += ` (${agentSession.tripType})`;
    if (agentSession.times) waSummary += `\n⏰ *Horários:* ${agentSession.times}`;
    waSummary += `\n\nPoderia me enviar o valor da cotação?`;

    const cleanNumber = WHATSAPP_PHONE.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(waSummary)}`;

    return { reply, handoff, handoffReason, whatsappUrl };
  }

  // Inicializar Interface do Widget no DOM
  function initChatWidget() {
    // 1. Botão Flutuante (Launcher)
    const launcher = document.createElement('div');
    launcher.id = 'jansen-ai-launcher';
    launcher.className = 'fixed bottom-24 right-5 sm:right-6 z-40 flex items-center gap-2.5 cursor-pointer group select-none';
    launcher.innerHTML = `
      <div class="hidden sm:flex items-center gap-2 bg-[#0a1128]/95 border border-blue-500/40 text-white text-xs font-bold px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md group-hover:scale-105 transition-all">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Atendimento com IA</span>
      </div>
      <button class="w-13 h-13 sm:w-14 sm:h-14 p-3.5 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 text-white shadow-2xl shadow-blue-600/50 flex items-center justify-center text-lg sm:text-xl transition-all transform group-hover:scale-110 active:scale-95 border-2 border-white/20 relative" aria-label="Abrir Chat com IA">
        <i class="fa-solid fa-robot transition-transform duration-300 group-hover:rotate-12"></i>
        <span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#25D366] border-2 border-[#070d1e] animate-ping"></span>
        <span class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#25D366] border-2 border-[#070d1e]"></span>
      </button>
    `;

    // 2. Janela de Chat Flutuante (Window)
    const chatWindow = document.createElement('div');
    chatWindow.id = 'jansen-ai-window';
    chatWindow.className = 'fixed bottom-20 sm:bottom-24 right-3 sm:right-6 z-50 w-[94vw] sm:w-[380px] max-h-[580px] h-[520px] bg-[#0a1128]/98 border border-blue-500/40 rounded-3xl shadow-2xl flex-col overflow-hidden backdrop-blur-2xl transition-all duration-300 hidden';
    chatWindow.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(29, 78, 216, 0.25)';

    chatWindow.innerHTML = `
      <!-- Header do Chat -->
      <div class="p-4 bg-gradient-to-r from-blue-950 via-[#0d1733] to-[#070d1e] border-b border-white/10 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 text-lg shadow-inner">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div>
            <div class="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Assistente Jansen IA</span>
              <span class="w-2 h-2 rounded-full bg-[#25D366]"></span>
            </div>
            <div class="text-[10px] text-slate-300">Respostas rápidas e cotações</div>
          </div>
        </div>
        <button id="close-ai-chat" class="w-8 h-8 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <!-- Área de Mensagens (Scrollable) -->
      <div id="ai-chat-messages" class="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
        
        <!-- Mensagem de Boas-vindas -->
        <div class="flex gap-2.5 items-start">
          <div class="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 text-xs shrink-0 mt-0.5">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div class="bg-white/5 border border-white/10 text-slate-100 p-3 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed shadow-sm">
            Olá! É um prazer para a Jansen Transportes atender você. Para começarmos, como posso te chamar?
          </div>
        </div>

        <!-- Chips de Acesso Rápido -->
        <div id="ai-quick-chips" class="flex flex-wrap gap-1.5 pt-1 pl-9">
          <button class="ai-chip px-2.5 py-1 rounded-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-400/30 text-blue-200 text-[11px] font-semibold transition-all">
            🚐 Cotar Van VIP
          </button>
          <button class="ai-chip px-2.5 py-1 rounded-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-400/30 text-blue-200 text-[11px] font-semibold transition-all">
            💍 Sedã Casamento
          </button>
          <button class="ai-chip px-2.5 py-1 rounded-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-400/30 text-blue-200 text-[11px] font-semibold transition-all">
            🚌 Ônibus / Excursão
          </button>
          <button class="ai-chip px-2.5 py-1 rounded-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-400/30 text-blue-200 text-[11px] font-semibold transition-all">
            📦 Cargas / Accelo Baú
          </button>
          <button class="ai-chip px-2.5 py-1 rounded-full bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-400/30 text-emerald-200 text-[11px] font-semibold transition-all">
            👤 Falar com Humano
          </button>
        </div>

      </div>

      <!-- Barra de Envio de Mensagem -->
      <form id="ai-chat-form" class="p-3 bg-black/40 border-t border-white/10 flex items-center gap-2">
        <input type="text" id="ai-chat-input" placeholder="Digite sua mensagem rápida..." class="flex-1 bg-[#030712] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-400 transition-colors" autocomplete="off">
        <button type="submit" class="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-transform active:scale-95 shrink-0">
          <i class="fa-solid fa-paper-plane text-xs"></i>
        </button>
      </form>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(chatWindow);

    // Eventos
    const closeBtn = chatWindow.querySelector('#close-ai-chat');
    const form = chatWindow.querySelector('#ai-chat-form');
    const input = chatWindow.querySelector('#ai-chat-input');
    const messagesBox = chatWindow.querySelector('#ai-chat-messages');

    function toggleChat() {
      const isHidden = chatWindow.classList.contains('hidden') || chatWindow.style.display === 'none';
      if (isHidden) {
        chatWindow.classList.remove('hidden');
        chatWindow.classList.add('flex');
        chatWindow.style.display = 'flex';
        input.focus();
      } else {
        chatWindow.classList.add('hidden');
        chatWindow.classList.remove('flex');
        chatWindow.style.display = 'none';
      }
    }

    launcher.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);

    // Enviar mensagem
    function handleSend(text) {
      if (!text || !text.trim()) return;

      // 1. Mensagem do usuário
      appendMessage('user', text);
      input.value = '';

      // 2. Indicador de digitação
      const typingEl = appendTypingIndicator();
      messagesBox.scrollTop = messagesBox.scrollHeight;

      // 3. Processamento rápido (resposta em ~400ms para simular digitação natural)
      setTimeout(() => {
        typingEl.remove();
        const res = processLocalMessage(text);
        appendMessage('assistant', res.reply, res.handoff, res.whatsappUrl);
        messagesBox.scrollTop = messagesBox.scrollHeight;
      }, 450);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSend(input.value);
    });

    // Cliques nos chips rápidos
    chatWindow.querySelectorAll('.ai-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        handleSend(chip.innerText.trim());
      });
    });

    function appendMessage(sender, text, handoff = false, whatsappUrl = null) {
      const msgRow = document.createElement('div');
      msgRow.className = 'flex gap-2.5 items-start ' + (sender === 'user' ? 'justify-end' : 'justify-start');

      if (sender === 'user') {
        msgRow.innerHTML = `
          <div class="bg-blue-600 text-white p-3 rounded-2xl rounded-tr-sm max-w-[85%] leading-relaxed shadow-sm">
            ${escapeHtml(text)}
          </div>
        `;
      } else {
        let handoffBtnHtml = '';
        if (handoff && whatsappUrl) {
          handoffBtnHtml = `
            <a href="${whatsappUrl}" target="_blank" class="mt-2.5 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-slate-950 font-bold text-[11px] shadow-lg transition-transform transform hover:scale-[1.02] active:scale-95">
              <i class="fa-brands fa-whatsapp text-sm"></i>
              <span>Continuar com Alex no WhatsApp</span>
            </a>
          `;
        }

        msgRow.innerHTML = `
          <div class="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 text-xs shrink-0 mt-0.5">
            <i class="fa-solid fa-robot"></i>
          </div>
          <div class="bg-white/5 border border-white/10 text-slate-100 p-3 rounded-2xl rounded-tl-sm max-w-[85%] leading-relaxed shadow-sm">
            <p>${escapeHtml(text)}</p>
            ${handoffBtnHtml}
          </div>
        `;
      }

      messagesBox.appendChild(msgRow);
      messagesBox.scrollTop = messagesBox.scrollHeight;
    }

    function appendTypingIndicator() {
      const row = document.createElement('div');
      row.className = 'flex gap-2.5 items-start';
      row.innerHTML = `
        <div class="w-7 h-7 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 text-xs shrink-0 mt-0.5">
          <i class="fa-solid fa-robot"></i>
        </div>
        <div class="bg-white/5 border border-white/10 text-slate-400 px-3.5 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-sm">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 0.15s"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style="animation-delay: 0.3s"></span>
        </div>
      `;
      messagesBox.appendChild(row);
      return row;
    }

    function escapeHtml(string) {
      const div = document.createElement('div');
      div.innerText = string;
      return div.innerHTML;
    }
  }

  // Iniciar após carregamento do DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatWidget);
  } else {
    initChatWidget();
  }
})();
