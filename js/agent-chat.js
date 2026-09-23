/**
 * Jansen Transportes - Widget de Chat Interativo do Agente de IA
 * Respostas Ultraconcisas, Triagem Ágil e Transbordo Humano p/ WhatsApp
 */

(function() {
  const WHATSAPP_PHONE = '5527997392787';
  const WHATSAPP_FORMATTED = '(27) 99739-2787';

  // Base de Conhecimento e Regras Locais (Garante funcionamento no GitHub Pages)
  const agentSession = {
    history: [],
    intent: null,
    askedPassengers: false,
    askedDate: false,
    askedDestination: false
  };

  function processLocalMessage(userText) {
    const msg = userText.toLowerCase().trim();
    let reply = '';
    let handoff = false;
    let handoffReason = '';

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
      handoffReason = 'Solicitação de atendente humano';
    } else if (msg.includes('guincho') || msg.includes('reboque') || msg.includes('socorro') || msg.includes('quebrou') || msg.includes('pane') || msg.includes('plataforma')) {
      reply = 'Nosso guincho plataforma 24h atende todo o ES! Qual o modelo do veículo e onde você está localizado agora?';
      agentSession.intent = 'guincho';
    } else if (msg.includes('helicóptero') || msg.includes('helicoptero') || msg.includes('barco') || msg.includes('lancha') || msg.includes('mototáxi') || msg.includes('moto taxi') || msg.includes('avião') || msg.includes('aviao')) {
      reply = 'Não operamos com esse tipo de transporte. Vou te transferir para um especialista humano da Jansen para te orientar.';
      handoff = true;
      handoffReason = 'Transporte fora do escopo';
    } else if (agentSession.intent === 'van' || msg.includes('van') || msg.includes('pedra azul') || msg.includes('domingos martins') || msg.includes('china park') || msg.includes('montanha') || msg.includes('passeio') || msg.includes('grupo')) {
      agentSession.intent = 'van';
      if (!agentSession.askedPassengers && !(/\d+/.test(msg))) {
        reply = 'Temos vans Mercedes Sprinter e Master VIP (até 15 lugares) com poltronas reclináveis e ar duplo! Quantas pessoas vão viajar?';
        agentSession.askedPassengers = true;
      } else if (!agentSession.askedDate) {
        reply = 'Perfeito! Qual a data prevista para a viagem e a cidade de partida?';
        agentSession.askedDate = true;
      } else {
        reply = 'Excelente! Vou transferir seu atendimento agora para um de nossos especialistas da Jansen para finalizar o valor da sua viagem.';
        handoff = true;
        handoffReason = 'Cotação de Van Executiva pronta';
      }
    } else if (agentSession.intent === 'sedan' || msg.includes('sedan') || msg.includes('sedã') || msg.includes('corolla') || msg.includes('byd') || msg.includes('casamento') || msg.includes('noiva') || msg.includes('aeroporto') || msg.includes('executivo') || msg.includes('vix') || msg.includes('traslado')) {
      agentSession.intent = 'sedan';
      if (!agentSession.askedDate) {
        reply = 'Nosso Toyota Corolla e SUV BYD atendem com motorista a rigor e pontualidade! Qual a data e o trajeto desejado?';
        agentSession.askedDate = true;
      } else {
        reply = 'Combinado! Vou transferir seu atendimento agora para um de nossos especialistas da Jansen para dar continuidade à sua reserva.';
        handoff = true;
        handoffReason = 'Reserva de Carro Executivo pronta';
      }
    } else if (agentSession.intent === 'onibus' || msg.includes('ônibus') || msg.includes('onibus') || msg.includes('micro') || msg.includes('volare') || msg.includes('excursão') || msg.includes('excursao') || msg.includes('congresso')) {
      agentSession.intent = 'onibus';
      if (!agentSession.askedDestination) {
        reply = 'Dispomos de Micro Volare DW9 (31 lugares) e Ônibus (46 lugares) com registro ANTT. Qual o destino e a quantidade de passageiros?';
        agentSession.askedDestination = true;
      } else {
        reply = 'Ótimo! Vou transferir seu atendimento agora para um de nossos especialistas da Jansen para calcular sua rota em grupo.';
        handoff = true;
        handoffReason = 'Cotação de Micro/Ônibus pronta';
      }
    } else if (msg.includes('carga') || msg.includes('caminhão') || msg.includes('caminhao') || msg.includes('furgão') || msg.includes('furgao') || msg.includes('baú') || msg.includes('bau') || msg.includes('frete') || msg.includes('mercadoria') || msg.includes('entrega')) {
      reply = 'Atendemos cargas fechadas e distribuição no ES com caminhões Mercedes Accelo Baú. Qual o tipo de mercadoria e o trajeto?';
      agentSession.intent = 'carga';
    } else if (msg.includes('faturamento') || msg.includes('empresa') || msg.includes('pj') || msg.includes('nota fiscal') || msg.includes('boleto')) {
      reply = 'Sim! Emitimos Nota Fiscal e faturamos para empresas (PJ) com cadastro facilitado. Qual serviço sua empresa precisa?';
    } else if (msg.includes('atende') || msg.includes('onde') || msg.includes('cidade') || msg.includes('região') || msg.includes('regiao') || msg.includes('estado')) {
      reply = 'Atendemos todo o estado do Espírito Santo e fazemos viagens e excursões para todo o Brasil com registro ANTT!';
    } else if (msg.includes('olá') || msg.includes('ola') || msg.includes('bom dia') || msg.includes('boa tarde') || msg.includes('boa noite') || msg === 'oi') {
      reply = 'Olá! Sou o assistente virtual da Jansen Transportes. Você precisa de Van, Carro Executivo, Ônibus, Carga ou Guincho?';
    } else {
      reply = 'Entendido! Para te passar as informações exatas, vou transferir seu atendimento agora para um de nossos especialistas da Jansen.';
      handoff = true;
      handoffReason = 'Atendimento personalizado';
    }

    if (reply.length > 250) {
      const sentences = reply.split(/(?<=[.!?])\s+/);
      reply = sentences.slice(0, 2).join(' ');
    }

    const cleanNumber = WHATSAPP_PHONE.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
      `Olá! Estava no chat do site da Jansen conversando sobre: "${userText}". Poderia me atender?`
    )}`;

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
            Olá! Sou o assistente virtual da Jansen Transportes. Você precisa de Van, Carro Executivo, Ônibus, Carga ou Guincho?
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
          <button class="ai-chip px-2.5 py-1 rounded-full bg-red-600/20 hover:bg-red-600/40 border border-red-400/30 text-red-200 text-[11px] font-semibold transition-all">
            🚨 Guincho 24h
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
