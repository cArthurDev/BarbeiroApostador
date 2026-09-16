/**
 * Barbeiro Apostador - Lógica Principal da Aplicação
 * Autenticação, Gerenciamento de Gorjetas e Integração com a Roleta
 */

document.addEventListener('DOMContentLoaded', () => {
  // Constantes de Autenticação solicitadas pelo usuário
  const VALID_USER = 'barbeiroapostador';
  const VALID_PASS = 'barbeiro123@';

  // Elementos de Login
  const loginOverlay = document.getElementById('loginOverlay');
  const loginForm = document.getElementById('loginForm');
  const userInput = document.getElementById('username');
  const passInput = document.getElementById('password');
  const loginError = document.getElementById('loginError');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const mainApp = document.getElementById('mainApp');
  const btnLogout = document.getElementById('btnLogout');

  // Elementos de Abas
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Elementos de Gorjetas
  const tipForm = document.getElementById('tipForm');
  const tipNameInput = document.getElementById('tipName');
  const tipValueInput = document.getElementById('tipValue');
  const tipsTableBody = document.getElementById('tipsTableBody');
  const emptyTipsState = document.getElementById('emptyTipsState');
  const btnClearAllTips = document.getElementById('btnClearAllTips');
  const btnSyncToRoulette = document.getElementById('btnSyncToRoulette');
  const btnSyncFromTipsAgain = document.getElementById('btnSyncFromTipsAgain');
  const addParticipantForm = document.getElementById('addParticipantForm');
  const directParticipantName = document.getElementById('directParticipantName');

  // Estatísticas das Gorjetas
  const statTotalTips = document.getElementById('statTotalTips');
  const statTotalCount = document.getElementById('statTotalCount');
  const statMaxTip = document.getElementById('statMaxTip');
  const tipsCountBadge = document.getElementById('tipsCountBadge');

  // Instância da Roleta
  const roulette = new RouletteWheel('rouletteCanvas');

  // Armazenamento das Gorjetas
  let tipsData = loadTips();

  // ================= 1. AUTENTICAÇÃO =================
  function checkSession() {
    const isAuthenticated = sessionStorage.getItem('barbeiro_auth') === 'true';
    if (isAuthenticated) {
      showApp();
    } else {
      showLogin();
    }
  }

  function showApp() {
    loginOverlay.classList.remove('active');
    setTimeout(() => {
      loginOverlay.classList.add('hidden');
      mainApp.classList.remove('hidden');
    }, 250);
  }

  function showLogin() {
    mainApp.classList.add('hidden');
    loginOverlay.classList.remove('hidden');
    setTimeout(() => {
      loginOverlay.classList.add('active');
      if (userInput) userInput.focus();
    }, 50);
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = (userInput.value || '').trim();
      const pass = passInput.value || '';

      if (user === VALID_USER && pass === VALID_PASS) {
        if (loginError) loginError.classList.add('hidden');
        sessionStorage.setItem('barbeiro_auth', 'true');
        showApp();
      } else {
        if (loginError) {
          loginError.classList.remove('hidden');
          // Reinicia animação de shake
          loginError.style.animation = 'none';
          loginError.offsetHeight; // reflow
          loginError.style.animation = null;
        }
      }
    });
  }

  // Ver / Esconder senha com o botãozinho
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = passInput.getAttribute('type') === 'password';
      const newType = isPassword ? 'text' : 'password';
      passInput.setAttribute('type', newType);
      
      const icon = togglePasswordBtn.querySelector('i');
      if (icon) {
        icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      }
      
      togglePasswordBtn.setAttribute('title', isPassword ? 'Ocultar senha' : 'Ver senha');
      togglePasswordBtn.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Ver senha');
      passInput.focus();
    });
  }

  // Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('Deseja realmente sair da sua sessão?')) {
        sessionStorage.removeItem('barbeiro_auth');
        showLogin();
      }
    });
  }

  // ================= 2. NAVEGAÇÃO POR ABAS =================
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      switchTab(targetId);
    });
  });

  function switchTab(targetId) {
    tabBtns.forEach(b => {
      const isActive = b.getAttribute('data-target') === targetId;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetId);
    });

    // Se abrir a roleta, garantir redesenho do canvas
    if (targetId === 'tabRoulette' && roulette) {
      setTimeout(() => roulette.drawWheel(), 50);
    }
  }

  // ================= 3. GESTÃO DE GORJETAS =================
  function loadTips() {
    try {
      const saved = localStorage.getItem('barbeiro_tips');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  function saveTips() {
    try {
      localStorage.setItem('barbeiro_tips', JSON.stringify(tipsData));
    } catch (e) {}
  }

  function formatBRL(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  function renderTips() {
    if (!tipsTableBody) return;
    tipsTableBody.innerHTML = '';

    const count = tipsData.length;
    if (tipsCountBadge) tipsCountBadge.textContent = count;
    if (statTotalCount) statTotalCount.textContent = count;

    if (count === 0) {
      if (emptyTipsState) emptyTipsState.classList.remove('hidden');
      if (statTotalTips) statTotalTips.textContent = formatBRL(0);
      if (statMaxTip) statMaxTip.textContent = formatBRL(0);
      return;
    }

    if (emptyTipsState) emptyTipsState.classList.add('hidden');

    let total = 0;
    let max = 0;

    // Renderizar linhas
    tipsData.forEach((item, index) => {
      total += item.value;
      if (item.value > max) max = item.value;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="tip-row-index">#${index + 1}</td>
        <td class="tip-person-name">
          <i class="fa-solid fa-user-tag" style="color: var(--blue-vibrant); margin-right: 6px;"></i>
          ${escapeHtml(item.name)}
        </td>
        <td class="tip-value-col">${formatBRL(item.value)}</td>
        <td class="tip-time-col">${item.time || 'Hoje'}</td>
        <td class="text-right">
          <button type="button" class="btn-delete-tip" data-id="${item.id}" title="Remover da lista">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      `;

      const btnDelete = tr.querySelector('.btn-delete-tip');
      btnDelete.addEventListener('click', () => {
        deleteTip(item.id);
      });

      tipsTableBody.appendChild(tr);
    });

    if (statTotalTips) statTotalTips.textContent = formatBRL(total);
    if (statMaxTip) statMaxTip.textContent = formatBRL(max);
  }

  // Cadastrar gorjeta
  if (tipForm) {
    tipForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = tipNameInput.value.trim();
      const value = parseFloat(tipValueInput.value);

      if (!name || isNaN(value) || value <= 0) {
        alert('Por favor preencha um nome válido e um valor maior que zero.');
        return;
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newTip = {
        id: Date.now().toString(),
        name: name,
        value: value,
        time: timeStr
      };

      tipsData.unshift(newTip); // Adiciona no início da lista
      saveTips();
      renderTips();

      // Limpar formulário e focar
      tipNameInput.value = '';
      tipValueInput.value = '';
      tipNameInput.focus();
    });
  }

  // Excluir gorjeta individual
  function deleteTip(id) {
    tipsData = tipsData.filter(t => t.id !== id);
    saveTips();
    renderTips();
  }

  // Limpar toda a lista de gorjetas
  if (btnClearAllTips) {
    btnClearAllTips.addEventListener('click', () => {
      if (tipsData.length === 0) return;
      if (confirm('Tem certeza que deseja zerar e limpar todas as gorjetas cadastradas?')) {
        tipsData = [];
        saveTips();
        renderTips();
      }
    });
  }

  // ================= 4. INTEGRAÇÃO GORJETAS -> ROLETA =================
  function syncTipsToRoulette() {
    if (tipsData.length === 0) {
      alert('Nenhuma pessoa cadastrada nas gorjetas para enviar à roleta!');
      return;
    }

    // Pega os nomes sem repetição ou com repetição (conforme o cadastro)
    const names = tipsData.map(t => t.name);
    roulette.setParticipants(names);

    // Troca para a aba da Roleta
    switchTab('tabRoulette');
  }

  if (btnSyncToRoulette) {
    btnSyncToRoulette.addEventListener('click', syncTipsToRoulette);
  }

  if (btnSyncFromTipsAgain) {
    btnSyncFromTipsAgain.addEventListener('click', () => {
      if (tipsData.length === 0) {
        alert('Não há gorjetas cadastradas para sincronizar.');
        return;
      }
      syncTipsToRoulette();
    });
  }

  // Adicionar participante diretamente na roleta
  if (addParticipantForm) {
    addParticipantForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = directParticipantName.value.trim();
      if (!name) return;

      roulette.addParticipant(name);
      directParticipantName.value = '';
      directParticipantName.focus();
    });
  }

  // Limpar todos os participantes da roleta
  const btnClearRoulette = document.getElementById('btnClearRoulette');
  if (btnClearRoulette) {
    btnClearRoulette.addEventListener('click', () => {
      if (roulette.participants.length === 0) return;
      if (confirm('Deseja retirar TODOS os participantes da roleta?')) {
        roulette.clearAll();
      }
    });
  }

  // Iniciar checagem de sessão e renderizar dados iniciais
  checkSession();
  renderTips();
});
