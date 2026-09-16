/**
 * Roleta da Sorte - Barbeiro Apostador
 * Renderização dinâmica no Canvas, física de desaceleração, sons nativos e confetes
 */

class RouletteWheel {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!canvasId || !this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Participantes na roleta
    this.participants = this.loadParticipants();

    // Paleta de cores para as fatias (Gradientes e contrastes em tons de azul)
    this.sliceColors = [
      { bg: '#0052cc', text: '#ffffff' },
      { bg: '#003380', text: '#d6ecff' },
      { bg: '#0080ff', text: '#ffffff' },
      { bg: '#002255', text: '#7ec6ff' },
      { bg: '#00a3ff', text: '#ffffff' },
      { bg: '#001a40', text: '#8cd4ff' },
      { bg: '#0d6efd', text: '#ffffff' },
      { bg: '#05316e', text: '#ffffff' },
      { bg: '#00bfff', text: '#021029' },
      { bg: '#003d99', text: '#ffffff' }
    ];

    // Estados da rotação
    this.currentAngle = 0; // Radianos
    this.isSpinning = false;
    this.lastTickSlice = -1;
    this.targetWinnerIndex = null;

    // Elementos do DOM
    this.pointerEl = document.getElementById('wheelPointer');
    this.btnSpin = document.getElementById('btnSpin');
    this.btnSpinCenter = document.getElementById('btnSpinCenter');
    this.btnShuffle = document.getElementById('btnShuffle');
    this.winnerModal = document.getElementById('winnerModal');
    this.winnerNameEl = document.getElementById('winnerName');
    this.btnRemoveWinner = document.getElementById('btnRemoveWinnerFromRoulette');
    this.btnKeepWinner = document.getElementById('btnKeepWinnerInRoulette');
    this.participantsListEl = document.getElementById('participantsList');
    this.emptyRouletteState = document.getElementById('emptyRouletteState');
    this.rouletteCountText = document.getElementById('rouletteCountText');
    this.rouletteCountBadge = document.getElementById('rouletteCountBadge');

    this.currentWinner = null;
    this.audioCtx = null;

    this.init();
  }

  // Inicializar eventos e renderização inicial
  init() {
    this.renderParticipantsList();
    this.drawWheel();

    if (this.btnSpin) {
      this.btnSpin.addEventListener('click', () => this.spin());
    }
    if (this.btnSpinCenter) {
      this.btnSpinCenter.addEventListener('click', () => this.spin());
    }
    if (this.btnShuffle) {
      this.btnShuffle.addEventListener('click', () => this.shuffle());
    }

    if (this.btnRemoveWinner) {
      this.btnRemoveWinner.addEventListener('click', () => {
        if (this.currentWinner) {
          this.removeParticipant(this.currentWinner);
        }
        this.closeWinnerModal();
      });
    }

    if (this.btnKeepWinner) {
      this.btnKeepWinner.addEventListener('click', () => {
        this.closeWinnerModal();
      });
    }

    // Fechar modal ao clicar fora
    if (this.winnerModal) {
      this.winnerModal.addEventListener('click', (e) => {
        if (e.target === this.winnerModal) {
          this.closeWinnerModal();
        }
      });
    }
  }

  // Obter contexto de áudio web (inicia após o primeiro clique do usuário)
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Tocar som de clique da catraca
  playTickSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.04);

      // Animação no ponteiro indicador
      if (this.pointerEl) {
        this.pointerEl.classList.add('hit');
        setTimeout(() => this.pointerEl.classList.remove('hit'), 50);
      }
    } catch (e) {
      // Navegadores que bloqueiam áudio automático
    }
  }

  // Tocar fanfarra ao premiar o vencedor
  playWinSound() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5 arpeggio

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.55);
      });
    } catch (e) { }
  }

  // Carregar participantes do localStorage
  loadParticipants() {
    try {
      const saved = localStorage.getItem('barbeiro_roulette_participants');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Remove o participante de exemplo usado nas versões anteriores.
          if (parsed.length === 1 && parsed[0] === 'Barbeiro') {
            localStorage.removeItem('barbeiro_roulette_participants');
            return [];
          }
          return parsed;
        }
      }
    } catch (e) { }
    // A roleta começa vazia até o administrador adicionar participantes.
    return [];
  }

  saveParticipants() {
    try {
      localStorage.setItem('barbeiro_roulette_participants', JSON.stringify(this.participants));
    } catch (e) { }
  }

  // Adicionar um novo participante
  addParticipant(name) {
    const trimmed = name ? name.trim() : '';
    if (!trimmed) return;
    this.participants.push(trimmed);
    this.saveParticipants();
    this.renderParticipantsList();
    this.drawWheel();
  }

  // Definir lista em lote (ex: puxar das gorjetas)
  setParticipants(newList) {
    if (!Array.isArray(newList)) return;
    this.participants = newList.filter(n => n && n.trim().length > 0);
    this.saveParticipants();
    this.renderParticipantsList();
    this.drawWheel();
  }

  // Remover participante pelo índice ou nome
  removeParticipant(identifier) {
    if (typeof identifier === 'number') {
      this.participants.splice(identifier, 1);
    } else {
      const idx = this.participants.indexOf(identifier);
      if (idx !== -1) {
        this.participants.splice(idx, 1);
      }
    }
    this.saveParticipants();
    this.renderParticipantsList();
    this.drawWheel();
  }

  // Limpar todos os participantes
  clearAll() {
    this.participants = [];
    this.saveParticipants();
    this.renderParticipantsList();
    this.drawWheel();
  }

  // Embaralhar fatias
  shuffle() {
    if (this.isSpinning || this.participants.length < 2) return;
    for (let i = this.participants.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.participants[i], this.participants[j]] = [this.participants[j], this.participants[i]];
    }
    this.saveParticipants();
    this.renderParticipantsList();
    this.drawWheel();
  }

  // Atualizar lista visual de participantes no DOM
  renderParticipantsList() {
    const count = this.participants.length;
    if (this.rouletteCountText) this.rouletteCountText.textContent = count;
    if (this.rouletteCountBadge) this.rouletteCountBadge.textContent = count;

    if (!this.participantsListEl) return;
    this.participantsListEl.innerHTML = '';

    if (count === 0) {
      if (this.emptyRouletteState) this.emptyRouletteState.classList.remove('hidden');
      return;
    }

    if (this.emptyRouletteState) this.emptyRouletteState.classList.add('hidden');

    this.participants.forEach((name, index) => {
      const colorScheme = this.sliceColors[index % this.sliceColors.length];
      const chip = document.createElement('div');
      chip.className = 'participant-chip';

      chip.innerHTML = `
        <div class="chip-name">
          <span class="chip-color-dot" style="background-color: ${colorScheme.bg}; color: ${colorScheme.bg};"></span>
          <span>${escapeHtml(name)}</span>
        </div>
        <button type="button" class="btn-remove-participant" data-index="${index}" title="Retirar da roleta">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;

      const btnRemove = chip.querySelector('.btn-remove-participant');
      btnRemove.addEventListener('click', () => {
        if (this.isSpinning) return;
        this.removeParticipant(index);
      });

      this.participantsListEl.appendChild(chip);
    });
  }

  // Desenho da Roleta no Canvas
  drawWheel() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 16;

    ctx.clearRect(0, 0, width, height);

    const total = this.participants.length;

    // Caso a roleta esteja vazia
    if (total === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0b1938';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0088ff';
      ctx.stroke();

      ctx.fillStyle = '#6e8bb5';
      ctx.font = '600 16px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Nenhum participante adicionado', centerX, centerY);
      return;
    }

    const sliceAngle = (Math.PI * 2) / total;

    // Desenho de cada fatia
    for (let i = 0; i < total; i++) {
      const startAngle = this.currentAngle + i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const colorScheme = this.sliceColors[i % this.sliceColors.length];

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      // Gradiente radial para cada fatia dando aspecto 3D e neon
      const grad = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
      grad.addColorStop(0, colorScheme.bg);
      grad.addColorStop(1, adjustColor(colorScheme.bg, -30));
      ctx.fillStyle = grad;
      ctx.fill();

      // Borda divisória entre fatias
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 220, 255, 0.4)';
      ctx.stroke();

      // Texto do participante dentro da fatia
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colorScheme.text;

      // Tamanho de fonte adaptativo ao número de fatias
      const fontSize = total > 16 ? 12 : total > 10 ? 14 : 16;
      ctx.font = `700 ${fontSize}px 'Outfit', Inter, sans-serif`;

      // Truncar textos muito longos
      const maxTextWidth = radius - 60;
      let displayName = this.participants[i];
      if (ctx.measureText(displayName).width > maxTextWidth) {
        while (ctx.measureText(displayName + '...').width > maxTextWidth && displayName.length > 2) {
          displayName = displayName.slice(0, -1);
        }
        displayName += '...';
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(displayName, radius - 24, 0);
      ctx.restore();
    }

    // Borda externa luminosa
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#00a6ff';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00d0ff';
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Pequenas lâmpadas/pontos decorativos na borda
    const dotCount = Math.max(total * 2, 16);
    for (let d = 0; d < dotCount; d++) {
      const dotAngle = this.currentAngle + (d * (Math.PI * 2)) / dotCount;
      const dotX = centerX + (radius - 2) * Math.cos(dotAngle);
      const dotY = centerY + (radius - 2) * Math.sin(dotAngle);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = d % 2 === 0 ? '#00f2fe' : '#ffffff';
      ctx.fill();
    }
  }

  // Executar o giro da roleta
  spin() {
    if (this.isSpinning) return;

    if (this.participants.length < 2) {
      alert('Adicione pelo menos 2 participantes para poder girar a roleta!');
      return;
    }

    this.isSpinning = true;
    if (this.btnSpin) this.btnSpin.disabled = true;
    if (this.btnSpinCenter) this.btnSpinCenter.disabled = true;

    // Inicializar áudio no primeiro clique do usuário
    this.getAudioContext();

    // Duração do giro entre 4.5s e 5.5s
    const spinDuration = 4800 + Math.random() * 800;
    const startAngle = this.currentAngle;
    const totalAngle = Math.PI * 2;
    const winnerIndex = Math.floor(Math.random() * this.participants.length);
    const sliceAngle = totalAngle / this.participants.length;
    const pointerAngle = (3 * Math.PI) / 2;
    const normalizedStart = (startAngle % totalAngle + totalAngle) % totalAngle;
    const winnerCenterAngle = (winnerIndex + 0.5) * sliceAngle;
    const targetOffset = (pointerAngle - winnerCenterAngle - normalizedStart + totalAngle) % totalAngle;
    const totalRotation = totalAngle * (5 + Math.floor(Math.random() * 4)) + targetOffset;

    this.targetWinnerIndex = winnerIndex;
    const targetAngle = startAngle + totalRotation;
    const startTime = performance.now();

    const animateSpin = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);

      // Função de desaceleração suave (ease-out cubic / quartic)
      const easeOut = 1 - Math.pow(1 - progress, 4);

      this.currentAngle = startAngle + totalRotation * easeOut;
      this.drawWheel();

      // Detecção de clique a cada fatia que cruza o topo (270 graus ou 3*PI/2)
      // Normalizar ângulo para detectar transições
      const normalizedAngle = (this.currentAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const pointerAngle = (3 * Math.PI / 2); // Topo da roleta
      const relativeAngle = (pointerAngle - normalizedAngle + Math.PI * 2) % (Math.PI * 2);
      const currentSlice = Math.floor(relativeAngle / sliceAngle);

      if (currentSlice !== this.lastTickSlice) {
        this.playTickSound();
        this.lastTickSlice = currentSlice;
      }

      if (progress < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        this.finishSpin();
      }
    };

    requestAnimationFrame(animateSpin);
  }

  // Fim do giro: calcular e anunciar o vencedor
  finishSpin() {
    this.isSpinning = false;
    if (this.btnSpin) this.btnSpin.disabled = false;
    if (this.btnSpinCenter) this.btnSpinCenter.disabled = false;

    // O índice foi sorteado antes da animação e a roleta foi posicionada nessa fatia.
    const winnerIndex = this.targetWinnerIndex ?? Math.floor(Math.random() * this.participants.length);

    this.currentWinner = this.participants[winnerIndex];
    this.targetWinnerIndex = null;

    this.playWinSound();
    this.showConfetti();
    this.openWinnerModal(this.currentWinner);
  }

  // Modal de Vencedor
  openWinnerModal(winnerName) {
    if (!this.winnerModal) return;
    if (this.winnerNameEl) this.winnerNameEl.textContent = winnerName;
    this.winnerModal.classList.remove('hidden');
  }

  closeWinnerModal() {
    if (this.winnerModal) {
      this.winnerModal.classList.add('hidden');
    }
    this.currentWinner = null;
  }

  // Explosão de confetes no canvas de confetes
  showConfetti() {
    const confettiCanvas = document.getElementById('confettiCanvas');
    if (!confettiCanvas) return;
    const ctx = confettiCanvas.getContext('2d');

    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#00d2ff', '#0077ff', '#ffcc00', '#ffffff', '#00ffaa', '#ff3366'];

    for (let i = 0; i < 140; i++) {
      particles.push({
        x: confettiCanvas.width / 2 + (Math.random() - 0.5) * 100,
        y: confettiCanvas.height / 2 - 50,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.8) * 18,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        gravity: 0.35,
        alpha: 1,
        decay: Math.random() * 0.012 + 0.008
      });
    }

    function renderConfetti() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.rotation += p.rotSpeed;
        p.alpha -= p.decay;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(p.alpha, 0);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      });

      if (alive) {
        requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    renderConfetti();
  }
}

// Funções utilitárias auxiliares
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function adjustColor(hex, amount) {
  let col = hex.replace('#', '');
  if (col.length === 3) {
    col = col.split('').map(c => c + c).join('');
  }
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

window.RouletteWheel = RouletteWheel;
