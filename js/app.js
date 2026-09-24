/**
 * Barbeiro Apostador - Lógica Principal da Aplicação
 * Autenticação, Gerenciamento de Gorjetas e Integração com a Roleta
 */

document.addEventListener('DOMContentLoaded', async () => {
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
  const tipCelebration = document.getElementById('tipCelebration');
  const tipCelebrationName = document.getElementById('tipCelebrationName');
  const tipCelebrationValue = document.getElementById('tipCelebrationValue');

  // Elementos da Gestão de Banca
  const bankTransactionForm = document.getElementById('bankTransactionForm');
  const bankTransactionType = document.getElementById('bankTransactionType');
  const bankTransactionAmount = document.getElementById('bankTransactionAmount');
  const bankTransactionNote = document.getElementById('bankTransactionNote');
  const bankTransactionError = document.getElementById('bankTransactionError');
  const bankBalance = document.getElementById('bankBalance');
  const bankTotalDeposits = document.getElementById('bankTotalDeposits');
  const bankTotalWithdrawals = document.getElementById('bankTotalWithdrawals');
  const bankHistoryList = document.getElementById('bankHistoryList');
  const bankEmptyState = document.getElementById('bankEmptyState');
  const btnClearBank = document.getElementById('btnClearBank');

  // Instância da Roleta
  const roulette = new RouletteWheel('rouletteCanvas');

  // Elementos dos Slots Aleatórios
  const slotForm = document.getElementById('slotForm');
  const slotGameInput = document.getElementById('slotGameInput');
  const slotBulkInput = document.getElementById('slotBulkInput');
  const btnAddBulkSlots = document.getElementById('btnAddBulkSlots');
  const btnSpinSlot = document.getElementById('btnSpinSlot');
  const btnClearSlots = document.getElementById('btnClearSlots');
  const slotsList = document.getElementById('slotsList');
  const emptySlotsState = document.getElementById('emptySlotsState');
  const slotsCountText = document.getElementById('slotsCountText');
  const slotsCountBadge = document.getElementById('slotsCountBadge');
  const slotResultLabel = document.getElementById('slotResultLabel');
  const slotDrawCard = document.getElementById('slotDrawCard');
  const slotCardGame = document.getElementById('slotCardGame');
  const slotCardStatus = document.getElementById('slotCardStatus');
  const secretLogoTrigger = document.getElementById('secretLogoTrigger');
  const slotAdminModal = document.getElementById('slotAdminModal');
  const btnCloseSlotAdmin = document.getElementById('btnCloseSlotAdmin');
  const slotAdminInput = document.getElementById('slotAdminInput');
  const slotAdminStatus = document.getElementById('slotAdminStatus');
  const btnSaveSlotAdmin = document.getElementById('btnSaveSlotAdmin');
  const btnClearSlotAdmin = document.getElementById('btnClearSlotAdmin');
  let slotGames = loadSlotGames();
  let slotIsSpinning = false;
  let logoClickCount = 0;
  let logoClickTimer = null;

  // Armazenamento das Gorjetas
  let tipsData = loadTips();
  let bankData = loadBankData();

  function loadSlotGames() {
    try {
      const saved = localStorage.getItem('barbeiro_slot_games');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter(game => typeof game === 'string' && game.trim()) : [];
    } catch (error) {
      return [];
    }
  }

  function saveSlotGames() {
    try {
      localStorage.setItem('barbeiro_slot_games', JSON.stringify(slotGames));
    } catch (error) {}

    saveSharedSlotGames();
  }

  async function loadSharedSlotGames() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/slot_games?id=eq.1&select=games`, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (!response.ok) throw new Error(`Supabase ${response.status}`);
      const rows = await response.json();
      if (rows[0] && Array.isArray(rows[0].games)) {
        slotGames = rows[0].games.filter(game => typeof game === 'string' && game.trim());
        localStorage.setItem('barbeiro_slot_games', JSON.stringify(slotGames));
        renderSlotGames();
        renderSlotCard(slotGames.length ? slotGames[0] : 'Adicione seus jogos');
      }
    } catch (error) {
      console.warn('[Slots] Supabase indisponível; usando lista local.', error);
    }
  }

  async function saveSharedSlotGames() {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/slot_games`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({ id: 1, games: slotGames, updated_at: new Date().toISOString() })
      });
      if (!response.ok) throw new Error(`Supabase ${response.status}`);
      return true;
    } catch (error) {
      console.warn('[Slots] Não foi possível salvar no Supabase.', error);
      return false;
    }
  }

  function setSlotAdminStatus(message, isError = false) {
    if (!slotAdminStatus) return;
    slotAdminStatus.textContent = message;
    slotAdminStatus.classList.toggle('error', isError);
  }

  function openSlotAdmin() {
    slotAdminInput.value = slotGames.join('\n');
    setSlotAdminStatus('');
    slotAdminModal.classList.remove('hidden');
    setTimeout(() => slotAdminInput.focus(), 50);
  }

  function closeSlotAdmin() {
    slotAdminModal.classList.add('hidden');
  }

  if (secretLogoTrigger) {
    secretLogoTrigger.addEventListener('click', () => {
      logoClickCount += 1;
      clearTimeout(logoClickTimer);
      logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 1400);
      if (logoClickCount === 4) {
        logoClickCount = 0;
        openSlotAdmin();
      }
    });
  }

  if (btnCloseSlotAdmin) btnCloseSlotAdmin.addEventListener('click', closeSlotAdmin);
  if (slotAdminModal) {
    slotAdminModal.addEventListener('click', event => {
      if (event.target === slotAdminModal) closeSlotAdmin();
    });
  }

  if (btnSaveSlotAdmin) {
    btnSaveSlotAdmin.addEventListener('click', async () => {
      slotGames = slotAdminInput.value.split(/\r?\n/).map(game => game.trim()).filter(Boolean);
      slotGames = [...new Set(slotGames)];
      saveSlotGames();
      renderSlotGames();
      renderSlotCard(slotGames.length ? slotGames[0] : 'Adicione seus jogos');
      const savedRemotely = await saveSharedSlotGames();
      setSlotAdminStatus(savedRemotely
        ? 'Lista salva para todos.'
        : 'Salva apenas neste navegador. Execute o SQL do Supabase para sincronizar.');
    });
  }

  if (btnClearSlotAdmin) {
    btnClearSlotAdmin.addEventListener('click', () => {
      slotAdminInput.value = '';
      setSlotAdminStatus('Clique em "Salvar lista" para confirmar a limpeza.');
    });
  }

  function renderSlotGames() {
    if (!slotsList) return;
    slotsList.innerHTML = '';
    slotsCountText.textContent = slotGames.length;
    slotsCountBadge.textContent = slotGames.length;
    emptySlotsState.classList.toggle('hidden', slotGames.length > 0);

    slotGames.forEach((game, index) => {
      const item = document.createElement('div');
      item.className = 'slot-game-item';
      item.innerHTML = `<span><b>${String(index + 1).padStart(2, '0')}</b>${escapeHtml(game)}</span><button type="button" class="btn-remove-slot" data-slot-index="${index}" title="Remover ${escapeHtml(game)}"><i class="fa-solid fa-xmark"></i></button>`;
      slotsList.appendChild(item);
    });

    slotsList.querySelectorAll('.btn-remove-slot').forEach(button => {
      button.addEventListener('click', () => {
        slotGames.splice(Number(button.dataset.slotIndex), 1);
        saveSlotGames();
        renderSlotGames();
      });
    });
  }

  function addSlotGames(games) {
    const newGames = games.map(game => game.trim()).filter(Boolean);
    slotGames.push(...newGames);
    saveSlotGames();
    renderSlotGames();
  }

  function renderSlotCard(game, status = 'PRONTO PARA SORTEAR') {
    if (!slotCardGame) return;
    slotCardGame.textContent = game;
    slotCardStatus.textContent = status;
  }

  function runSlotSpin() {
    if (slotIsSpinning || slotGames.length === 0) {
      if (!slotGames.length) alert('Adicione pelo menos um jogo antes de sortear.');
      return;
    }

    slotIsSpinning = true;
    btnSpinSlot.disabled = true;
    slotResultLabel.textContent = 'Escolhendo seu próximo jogo...';
    slotResultLabel.classList.remove('is-winner');
    slotDrawCard.classList.remove('is-revealed');
    slotDrawCard.classList.add('is-flipping');

    const winner = slotGames[Math.floor(Math.random() * slotGames.length)];
    let gameIndex = 0;
    const flipInterval = setInterval(() => {
      slotDrawCard.classList.remove('is-flipping');
      void slotDrawCard.offsetWidth;
      slotDrawCard.classList.add('is-flipping');
      renderSlotCard(slotGames[gameIndex % slotGames.length], 'SORTEANDO...');
      gameIndex += 1;
    }, 180);

    setTimeout(() => {
      clearInterval(flipInterval);
      slotDrawCard.classList.remove('is-flipping');
      slotDrawCard.classList.add('is-revealed');
      renderSlotCard(winner, 'JOGO ESCOLHIDO');
      slotResultLabel.textContent = `Jogo escolhido: ${winner}`;
      slotResultLabel.classList.add('is-winner');
      slotIsSpinning = false;
      btnSpinSlot.disabled = false;
      setTimeout(() => slotDrawCard.classList.remove('is-revealed'), 800);
    }, 2800);
  }

  if (slotForm) {
    slotForm.addEventListener('submit', event => {
      event.preventDefault();
      addSlotGames([slotGameInput.value]);
      slotGameInput.value = '';
      slotGameInput.focus();
    });
  }

  if (btnAddBulkSlots) {
    btnAddBulkSlots.addEventListener('click', () => {
      addSlotGames(slotBulkInput.value.split(/\r?\n/));
      slotBulkInput.value = '';
    });
  }

  if (btnSpinSlot) btnSpinSlot.addEventListener('click', runSlotSpin);
  if (btnClearSlots) {
    btnClearSlots.addEventListener('click', () => {
      if (!slotGames.length || !confirm('Deseja limpar todos os jogos dos Slots Aleatórios?')) return;
      slotGames = [];
      saveSlotGames();
      renderSlotGames();
    });
  }
  renderSlotGames();
  renderSlotCard(slotGames.length ? slotGames[0] : 'Adicione seus jogos');
  loadSharedSlotGames();

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

  function loadBankData() {
    try {
      const saved = localStorage.getItem('barbeiro_bank');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function saveBankData() {
    try {
      localStorage.setItem('barbeiro_bank', JSON.stringify(bankData));
    } catch (error) {}
  }

  function getBankTotals() {
    return bankData.reduce((totals, transaction) => {
      if (transaction.type === 'deposit') totals.deposits += transaction.amount;
      if (transaction.type === 'withdrawal') totals.withdrawals += transaction.amount;
      return totals;
    }, { deposits: 0, withdrawals: 0 });
  }

  function showBankError(message) {
    if (!bankTransactionError) return;
    bankTransactionError.querySelector('span').textContent = message;
    bankTransactionError.classList.remove('hidden');
  }

  function hideBankError() {
    if (bankTransactionError) bankTransactionError.classList.add('hidden');
  }

  function renderBank() {
    if (!bankHistoryList) return;
    const totals = getBankTotals();
    const balance = totals.withdrawals - totals.deposits;

    bankBalance.textContent = formatBRL(balance);
    bankBalance.classList.toggle('negative', balance < 0);
    bankTotalDeposits.textContent = formatBRL(totals.deposits);
    bankTotalWithdrawals.textContent = formatBRL(totals.withdrawals);
    bankHistoryList.innerHTML = '';

    if (bankData.length === 0) {
      bankEmptyState.classList.remove('hidden');
      return;
    }

    bankEmptyState.classList.add('hidden');
    bankData.forEach(transaction => {
      const isDeposit = transaction.type === 'deposit';
      const item = document.createElement('div');
      const date = new Date(transaction.createdAt);
      const dateText = Number.isNaN(date.getTime())
        ? 'Data não informada'
        : date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      item.className = `bank-history-item ${isDeposit ? 'deposit' : 'withdrawal'}`;
      item.innerHTML = `
        <div class="bank-history-icon"><i class="fa-solid ${isDeposit ? 'fa-arrow-down' : 'fa-arrow-up'}"></i></div>
        <div class="bank-history-details">
          <strong>${isDeposit ? 'Depósito' : 'Saque'}</strong>
          <span>${escapeHtml(transaction.note || 'Sem descrição')} · ${dateText}</span>
        </div>
        <strong class="bank-history-amount">${isDeposit ? '-' : '+'} ${formatBRL(transaction.amount)}</strong>
      `;
      bankHistoryList.appendChild(item);
    });
  }

  if (bankTransactionForm) {
    bankTransactionForm.addEventListener('submit', (event) => {
      event.preventDefault();
      hideBankError();

      const type = bankTransactionType.value;
      const amount = Number.parseFloat(bankTransactionAmount.value);
      const note = bankTransactionNote.value.trim();

      if (!Number.isFinite(amount) || amount <= 0) {
        showBankError('Informe um valor maior que zero.');
        return;
      }

      bankData.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        amount,
        note,
        createdAt: new Date().toISOString()
      });
      saveBankData();
      renderBank();
      bankTransactionForm.reset();
      bankTransactionAmount.focus();
    });
  }

  if (btnClearBank) {
    btnClearBank.addEventListener('click', () => {
      if (bankData.length === 0) return;
      if (!confirm('Deseja realmente limpar todo o histórico da banca?')) return;
      bankData = [];
      saveBankData();
      renderBank();
    });
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

  function showTipCelebration(name, value) {
    if (!tipCelebration) return;
    tipCelebrationName.textContent = name;
    tipCelebrationValue.textContent = formatBRL(value);
    tipCelebration.classList.remove('show');
    void tipCelebration.offsetWidth;
    tipCelebration.classList.add('show');
    setTimeout(() => tipCelebration.classList.remove('show'), 2600);
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
      showTipCelebration(name, value);

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

  // ================= 5. GESTÃO DE MEMBROS CADASTRADOS (/membros) =================
  const membersCountBadge = document.getElementById('membersCountBadge');
  const statMembersTotal = document.getElementById('statMembersTotal');
  const membersCardsGrid = document.getElementById('membersCardsGrid');
  const emptyMembersState = document.getElementById('emptyMembersState');
  const membersSearchInput = document.getElementById('membersSearchInput');
  const btnClearSearch = document.getElementById('btnClearSearch');
  const btnClearAllMembers = document.getElementById('btnClearAllMembers');
  const btnSyncMembersToRoulette = document.getElementById('btnSyncMembersToRoulette');
  const btnCopyMemberLink = document.getElementById('btnCopyMemberLink');
  const copyLinkText = document.getElementById('copyLinkText');

  // Elementos da aba de Batalhas
  const battleParticipantCount = document.getElementById('battleParticipantCount');
  const battleParticipantsPicker = document.getElementById('battleParticipantsPicker');
  const battleSelectionCount = document.getElementById('battleSelectionCount');
  const battlePickerHint = document.getElementById('battlePickerHint');
  const battleEmptyState = document.getElementById('battleEmptyState');
  const btnStartBattle = document.getElementById('btnStartBattle');
  const btnCancelBattle = document.getElementById('btnCancelBattle');
  const battleSetup = document.getElementById('battleSetup');
  const battleChampionState = document.getElementById('battleChampionState');
  const battleChampionName = document.getElementById('battleChampionName');
  const btnNewBattle = document.getElementById('btnNewBattle');
  const battleRoundTitle = document.getElementById('battleRoundTitle');
  const battleRoundBadge = document.getElementById('battleRoundBadge');
  const battleBracket = document.getElementById('battleBracket');

  let battleMembers = [];
  let battleSelectedIds = new Set();
  let battleRounds = [];
  let battleCurrentRound = 0;
  let battleChampion = null;

  function updateBattleCancelButton() {
    if (!btnCancelBattle) return;
    btnCancelBattle.classList.toggle('hidden', !battleRounds.length || Boolean(battleChampion));
  }

  function saveBattleState() {
    try {
      if (!battleRounds.length) {
        localStorage.removeItem('barbeiro_battle');
        return;
      }
      localStorage.setItem('barbeiro_battle', JSON.stringify({
        selectedIds: [...battleSelectedIds],
        currentRound: battleCurrentRound,
        championId: battleChampion ? battleChampion.id : null,
        rounds: battleRounds.map(round => round.map(match => ({
          participantIds: match.map(participant => participant.id),
          winnerId: match.winner ? match.winner.id : null
        })))
      }));
    } catch (error) {
      console.warn('[Battle] Não foi possível salvar a batalha:', error);
    }
  }

  function restoreBattleState() {
    try {
      const saved = JSON.parse(localStorage.getItem('barbeiro_battle') || 'null');
      if (!saved || !Array.isArray(saved.rounds) || !saved.rounds.length) return;

      const memberById = new Map(battleMembers.map(member => [member.id, member]));
      const restoredRounds = saved.rounds.map(round => round.map(match => {
        const participants = match.participantIds.map(id => memberById.get(id)).filter(Boolean);
        if (participants.length !== 2) return null;
        const restoredMatch = [participants[0], participants[1]];
        restoredMatch.winner = match.winnerId ? memberById.get(match.winnerId) : null;
        return restoredMatch;
      }).filter(Boolean));

      if (restoredRounds.some(round => !round.length) || !restoredRounds.length) {
        localStorage.removeItem('barbeiro_battle');
        return;
      }

      battleSelectedIds = new Set((saved.selectedIds || []).filter(id => memberById.has(id)));
      battleRounds = restoredRounds;
      battleCurrentRound = Math.min(saved.currentRound || 0, battleRounds.length - 1);
      battleChampion = saved.championId ? memberById.get(saved.championId) || null : null;
      battleSetup.classList.toggle('hidden', Boolean(battleRounds.length));
      battleChampionState.classList.toggle('hidden', !battleChampion);
      updateBattleCancelButton();
      if (battleChampion) {
        battleChampionName.textContent = battleChampion.name;
        battleRoundTitle.textContent = 'Campeão definido';
        battleRoundBadge.textContent = 'FINALIZADO';
      } else {
        renderBattleBracket();
      }
    } catch (error) {
      localStorage.removeItem('barbeiro_battle');
    }
  }

  // Elementos do Modal de Dar Gorjeta
  const memberTipModal = document.getElementById('memberTipModal');
  const btnCloseMemberTipModal = document.getElementById('btnCloseMemberTipModal');
  const btnCancelMemberTip = document.getElementById('btnCancelMemberTip');
  const memberTipForm = document.getElementById('memberTipForm');
  const tipModalMemberId = document.getElementById('tipModalMemberId');
  const tipModalMemberName = document.getElementById('tipModalMemberName');
  const tipModalMemberTwitch = document.getElementById('tipModalMemberTwitch');
  const tipModalValue = document.getElementById('tipModalValue');
  const quickValBtns = document.querySelectorAll('.quick-val-btn');

  let currentSelectedMember = null;

  function getInitials(name) {
    if (!name) return 'MB';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function maskEmail(email) {
    if (!email || !email.includes('@')) return email;

    const atIndex = email.indexOf('@');
    const user = email.substring(0, atIndex);
    const domain = email.substring(atIndex + 1);
    return `${user.substring(0, 4)}${user.length > 4 ? '***' : ''}@${domain}`;
  }

  function getBattleCount() {
    return parseInt(battleParticipantCount ? battleParticipantCount.value : '2', 10);
  }

  async function loadBattleMembers() {
    if (!battleParticipantsPicker) return;
    battleMembers = window.MembersModule ? await window.MembersModule.loadMembers() : [];
    restoreBattleState();
    renderBattlePicker();
  }

  function renderBattlePicker() {
    if (!battleParticipantsPicker) return;
    const limit = getBattleCount();
    battleSelectedIds = new Set([...battleSelectedIds].filter(id => battleMembers.some(member => member.id === id)).slice(0, limit));
    battleParticipantsPicker.innerHTML = '';

    if (battleMembers.length === 0) {
      battleEmptyState.classList.remove('hidden');
      btnStartBattle.disabled = true;
      updateBattleSelection();
      return;
    }

    battleEmptyState.classList.add('hidden');
    battleMembers.forEach(member => {
      const isSelected = battleSelectedIds.has(member.id);
      const item = document.createElement('label');
      item.className = `battle-participant-option${isSelected ? ' selected' : ''}`;
      item.innerHTML = `
        <input type="checkbox" value="${escapeHtml(member.id)}"${isSelected ? ' checked' : ''}>
        <span class="battle-option-avatar">${getInitials(member.name)}</span>
        <span class="battle-option-name">${escapeHtml(member.name)}</span>
        <i class="fa-solid fa-check battle-option-check"></i>
      `;
      const checkbox = item.querySelector('input');
      checkbox.addEventListener('change', () => {
        if (checkbox.checked && battleSelectedIds.size >= limit) {
          checkbox.checked = false;
          alert(`Esta batalha precisa de exatamente ${limit} participantes.`);
          return;
        }
        if (checkbox.checked) battleSelectedIds.add(member.id);
        else battleSelectedIds.delete(member.id);
        item.classList.toggle('selected', checkbox.checked);
        updateBattleSelection();
      });
      battleParticipantsPicker.appendChild(item);
    });
    updateBattleSelection();
  }

  function updateBattleSelection() {
    const limit = getBattleCount();
    const selected = battleSelectedIds.size;
    if (battleSelectionCount) battleSelectionCount.textContent = `${selected}/${limit}`;
    if (battlePickerHint) {
      battlePickerHint.textContent = selected === limit
        ? 'Tudo pronto. Confira os nomes e inicie a batalha.'
        : `Selecione mais ${limit - selected} participante${limit - selected === 1 ? '' : 's'} para começar.`;
    }
    if (btnStartBattle) btnStartBattle.disabled = selected !== limit;
  }

  function renderBattleBracket() {
    if (!battleBracket || !battleRounds.length) return;
    const matches = battleRounds[battleCurrentRound];
    const roundName = matches.length === 1
      ? 'Final'
      : matches.length === 2
        ? 'Semifinais'
        : matches.length === 4
          ? 'Quartas de final'
          : 'Oitavas de final';
    battleRoundTitle.textContent = roundName;
    battleRoundBadge.textContent = `${matches.length} ${matches.length === 1 ? 'CONFRONTO' : 'CONFRONTOS'}`;
    battleBracket.innerHTML = '';

    matches.forEach((match, index) => {
      const card = document.createElement('div');
      card.className = 'battle-match';
      card.innerHTML = `
        <div class="battle-match-label">CONFRONTO ${index + 1}</div>
        <div class="battle-duel">
          <button type="button" class="battle-fighter" data-winner="0">
            <span class="battle-fighter-number">${index * 2 + 1}</span>
            <span>${escapeHtml(match[0].name)}</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
          <div class="battle-vs">VS</div>
          <button type="button" class="battle-fighter" data-winner="1">
            <span class="battle-fighter-number">${index * 2 + 2}</span>
            <span>${escapeHtml(match[1].name)}</span>
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
        <p class="battle-confirm-hint"><i class="fa-solid fa-hand-pointer"></i> Clique no vencedor e confirme o avanço</p>
      `;
      card.querySelectorAll('.battle-fighter').forEach(button => {
        button.addEventListener('click', () => advanceBattle(index, Number(button.dataset.winner)));
      });
      if (match.winner) {
        const winnerIndex = match[0].id === match.winner.id ? 0 : 1;
        const winnerButton = card.querySelector(`[data-winner="${winnerIndex}"]`);
        if (winnerButton) winnerButton.classList.add('winner-selected');
        card.querySelectorAll('.battle-fighter').forEach(button => {
          button.disabled = true;
        });
      }
      battleBracket.appendChild(card);
    });
  }

  function startBattle() {
    const participants = [...battleSelectedIds]
      .map(id => battleMembers.find(member => member.id === id))
      .filter(Boolean);
    const firstRound = [];
    battleCurrentRound = 0;
    for (let index = 0; index < participants.length; index += 2) {
      firstRound.push([participants[index], participants[index + 1]]);
    }
    battleRounds = [firstRound];
    battleChampion = null;
    battleSetup.classList.add('hidden');
    battleChampionState.classList.add('hidden');
    updateBattleCancelButton();
    saveBattleState();
    renderBattleBracket();
  }

  function advanceBattle(matchIndex, winnerIndex) {
    const match = battleRounds[battleCurrentRound][matchIndex];
    const winner = match[winnerIndex];
    const loser = match[1 - winnerIndex];
    if (!confirm(`Confirmar ${winner.name} como vencedor contra ${loser.name}?\n\nEssa decisão avança o participante para a próxima rodada.`)) return;

    match.winner = winner;
    const allMatchesFinished = battleRounds[battleCurrentRound].every(currentMatch => currentMatch.winner);
    if (!allMatchesFinished) {
      const matchCard = battleBracket.querySelectorAll('.battle-match')[matchIndex];
      const selectedButton = matchCard.querySelector(`[data-winner="${winnerIndex}"]`);
      selectedButton.classList.add('winner-selected');
      matchCard.querySelectorAll('.battle-fighter').forEach(button => {
        button.disabled = true;
      });
      saveBattleState();
      return;
    }

    const winners = battleRounds[battleCurrentRound].map(currentMatch => currentMatch.winner);
    if (winners.length === 1) {
      showBattleChampion(winners[0]);
      return;
    }
    battleCurrentRound += 1;
    battleRounds.push([]);
    for (let index = 0; index < winners.length; index += 2) {
      battleRounds[battleCurrentRound].push([winners[index], winners[index + 1]]);
    }
    saveBattleState();
    renderBattleBracket();
  }

  function showBattleChampion(champion) {
    battleChampion = champion;
    battleBracket.innerHTML = `
      <div class="bracket-complete"><i class="fa-solid fa-check-double"></i><p>Chave encerrada</p></div>
    `;
    battleRoundTitle.textContent = 'Campeão definido';
    battleRoundBadge.textContent = 'FINALIZADO';
    battleChampionName.textContent = champion.name;
    battleSetup.classList.add('hidden');
    battleChampionState.classList.remove('hidden');
    battleChampionState.classList.add('champion-reveal');
    updateBattleCancelButton();
    saveBattleState();
  }

  function resetBattle() {
    battleSelectedIds = new Set();
    battleRounds = [];
    battleCurrentRound = 0;
    battleChampion = null;
    localStorage.removeItem('barbeiro_battle');
    battleChampionState.classList.add('hidden');
    battleSetup.classList.remove('hidden');
    updateBattleCancelButton();
    battleRoundTitle.textContent = 'Aguardando participantes';
    battleRoundBadge.textContent = 'MATA-MATA';
    battleBracket.innerHTML = '<div class="battle-placeholder"><i class="fa-solid fa-shield-halved"></i><p>Escolha os participantes para gerar a chave.</p></div>';
    renderBattlePicker();
  }

  if (battleParticipantCount) battleParticipantCount.addEventListener('change', renderBattlePicker);
  if (btnStartBattle) btnStartBattle.addEventListener('click', startBattle);
  if (btnCancelBattle) btnCancelBattle.addEventListener('click', () => {
    if (!confirm('Excluir a batalha em andamento?\n\nOs confrontos e resultados registrados serão apagados.')) return;
    resetBattle();
  });
  if (btnNewBattle) btnNewBattle.addEventListener('click', resetBattle);

  /** Mostra skeleton de carregamento no grid de membros */
  function showMembersLoading() {
    if (!membersCardsGrid) return;
    membersCardsGrid.innerHTML = `
      <div class="member-card-skeleton"><div class="skeleton-avatar"></div><div class="skeleton-lines"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>
      <div class="member-card-skeleton"><div class="skeleton-avatar"></div><div class="skeleton-lines"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>
      <div class="member-card-skeleton"><div class="skeleton-avatar"></div><div class="skeleton-lines"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div></div>
    `;
    if (emptyMembersState) emptyMembersState.classList.add('hidden');
  }

  async function renderMembers(searchTerm = '') {
    if (!membersCardsGrid) return;

    showMembersLoading();

    const allMembers = window.MembersModule ? await window.MembersModule.loadMembers() : [];
    const total = allMembers.length;

    if (membersCountBadge) membersCountBadge.textContent = total;
    if (statMembersTotal) statMembersTotal.textContent = total;

    // Filtragem por busca
    const term = searchTerm.trim().toLowerCase();
    const filteredMembers = term
      ? allMembers.filter(m =>
          (m.name && m.name.toLowerCase().includes(term)) ||
          (m.email && m.email.toLowerCase().includes(term)) ||
          (m.twitch && m.twitch.toLowerCase().includes(term))
        )
      : allMembers;

    membersCardsGrid.innerHTML = '';

    if (filteredMembers.length === 0) {
      if (emptyMembersState) {
        emptyMembersState.classList.remove('hidden');
        const emptyH3 = emptyMembersState.querySelector('h3');
        const emptyP = emptyMembersState.querySelector('p');
        if (term) {
          if (emptyH3) emptyH3.textContent = 'Nenhum membro encontrado';
          if (emptyP) emptyP.textContent = `Nenhum cadastro corresponde à busca "${searchTerm}".`;
        } else {
          if (emptyH3) emptyH3.textContent = 'Nenhum membro cadastrado ainda';
          if (emptyP) emptyP.textContent = 'Os usuários que se cadastrarem na rota /membros aparecerão automaticamente aqui com opções de exclusão e envio de gorjeta.';
        }
      }
      return;
    }

    if (emptyMembersState) emptyMembersState.classList.add('hidden');

    filteredMembers.forEach(member => {
      const card = document.createElement('div');
      const isGoldMember = (member.twitch || '').trim().replace(/^@/, '').toLowerCase() === 'carthurdevv';
      card.className = `glass-card member-card${isGoldMember ? ' member-card--gold' : ''}`;
      card.setAttribute('data-id', member.id);

      const initials = getInitials(member.name);
      const twitchUrl = `https://www.twitch.tv/${encodeURIComponent(member.twitch)}`;

      card.innerHTML = `
        <div class="member-card-header">
          <div class="member-avatar"><span>${initials}</span></div>
          <div class="member-header-info">
            <h3 class="member-name" title="${escapeHtml(member.name)}">${escapeHtml(member.name)}</h3>
            <a href="${twitchUrl}" target="_blank" rel="noopener noreferrer" class="member-twitch-badge" title="Abrir canal no Twitch">
              <i class="fa-brands fa-twitch"></i>
              <span>@${escapeHtml(member.twitch)}</span>
              <i class="fa-solid fa-arrow-up-right-from-square twitch-card-ext"></i>
            </a>
          </div>
        </div>
        <div class="member-card-body">
          <div class="member-info-row" title="E-mail">
            <i class="fa-regular fa-envelope info-row-icon"></i>
            <span class="info-row-text">${escapeHtml(maskEmail(member.email))}</span>
          </div>
          <div class="member-info-row" title="Data de cadastro">
            <i class="fa-regular fa-calendar info-row-icon"></i>
            <span class="info-row-text">${member.displayDate || 'Membro cadastrado'}</span>
          </div>
        </div>
        <div class="member-card-actions">
          <button type="button" class="btn-action-tip" data-id="${member.id}" title="Dar gorjeta para este membro">
            <i class="fa-solid fa-hand-holding-dollar"></i>
            <span>Dar Gorjeta</span>
          </button>
          <button type="button" class="btn-action-delete" data-id="${member.id}" title="Excluir este membro">
            <i class="fa-solid fa-trash-can"></i>
            <span>Excluir</span>
          </button>
        </div>
      `;

      // Botão Dar Gorjeta
      const btnTip = card.querySelector('.btn-action-tip');
      if (btnTip) btnTip.addEventListener('click', () => openMemberTipModal(member));

      // Botão Excluir individual (async)
      const btnDelete = card.querySelector('.btn-action-delete');
      if (btnDelete) {
        btnDelete.addEventListener('click', async () => {
          if (!confirm(`Deseja realmente excluir o membro "${member.name}" (@${member.twitch})?`)) return;
          btnDelete.disabled = true;
          btnDelete.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          if (window.MembersModule) await window.MembersModule.removeMember(member.id);
          await renderMembers(membersSearchInput ? membersSearchInput.value : '');
        });
      }

      membersCardsGrid.appendChild(card);
    });
  }

  // Busca com debounce de 300ms para não disparar fetch a cada tecla
  let membersSearchDebounce = null;
  if (membersSearchInput) {
    membersSearchInput.addEventListener('input', () => {
      const term = membersSearchInput.value;
      if (btnClearSearch) btnClearSearch.classList.toggle('hidden', !term);
      clearTimeout(membersSearchDebounce);
      membersSearchDebounce = setTimeout(() => renderMembers(term), 300);
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      membersSearchInput.value = '';
      btnClearSearch.classList.add('hidden');
      renderMembers('');
      membersSearchInput.focus();
    });
  }

  // Botão Excluir Todos os Membros (async)
  if (btnClearAllMembers) {
    btnClearAllMembers.addEventListener('click', async () => {
      const total = parseInt(statMembersTotal ? statMembersTotal.textContent : '0', 10);
      if (total === 0) {
        alert('Não há membros cadastrados para excluir.');
        return;
      }
      if (!confirm(`ATENÇÃO: Deseja realmente excluir TODOS os ${total} membros cadastrados? Esta ação não pode ser desfeita.`)) return;

      btnClearAllMembers.disabled = true;
      btnClearAllMembers.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Excluindo...';

      if (window.MembersModule) await window.MembersModule.removeAllMembers();
      await renderMembers('');

      btnClearAllMembers.disabled = false;
      btnClearAllMembers.innerHTML = '<i class="fa-regular fa-trash-can"></i> <span>Excluir Todos</span>';
    });
  }

  // Enviar Membros para a Roleta (async)
  if (btnSyncMembersToRoulette) {
    btnSyncMembersToRoulette.addEventListener('click', async () => {
      btnSyncMembersToRoulette.disabled = true;
      btnSyncMembersToRoulette.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Carregando...</span>';

      const all = window.MembersModule ? await window.MembersModule.loadMembers() : [];

      btnSyncMembersToRoulette.disabled = false;
      btnSyncMembersToRoulette.innerHTML = '<i class="fa-solid fa-share-nodes"></i> <span>Enviar para a Roleta</span>';

      if (all.length === 0) {
        alert('Nenhum membro cadastrado para enviar à roleta!');
        return;
      }
      const names = all.map(m => m.name);
      roulette.setParticipants(names);
      switchTab('tabRoulette');
    });
  }

  // Copiar link de cadastro /membros
  if (btnCopyMemberLink) {
    btnCopyMemberLink.addEventListener('click', () => {
      const currentUrl = window.location.href.split('#')[0].split('?')[0];
      const membersUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1) + 'membros.html';
      
      navigator.clipboard.writeText(membersUrl).then(() => {
        if (copyLinkText) copyLinkText.textContent = 'Link Copiado!';
        btnCopyMemberLink.style.borderColor = 'var(--color-success)';
        setTimeout(() => {
          if (copyLinkText) copyLinkText.textContent = 'Copiar Link /membros';
          btnCopyMemberLink.style.borderColor = '';
        }, 2000);
      }).catch(() => {
        prompt('Copie o link abaixo:', membersUrl);
      });
    });
  }

  // ================= MODAL DE DAR GORJETA AO MEMBRO =================
  function openMemberTipModal(member) {
    currentSelectedMember = member;
    if (!memberTipModal) return;

    if (tipModalMemberId) tipModalMemberId.value = member.id;
    if (tipModalMemberName) tipModalMemberName.textContent = member.name;
    if (tipModalMemberTwitch) tipModalMemberTwitch.textContent = `@${member.twitch}`;
    if (tipModalValue) {
      tipModalValue.value = '';
      setTimeout(() => tipModalValue.focus(), 150);
    }

    memberTipModal.classList.remove('hidden');
    setTimeout(() => {
      memberTipModal.classList.add('active');
    }, 10);
  }

  function closeMemberTipModal() {
    if (!memberTipModal) return;
    memberTipModal.classList.remove('active');
    setTimeout(() => {
      memberTipModal.classList.add('hidden');
      currentSelectedMember = null;
    }, 200);
  }

  if (btnCloseMemberTipModal) {
    btnCloseMemberTipModal.addEventListener('click', closeMemberTipModal);
  }

  if (btnCancelMemberTip) {
    btnCancelMemberTip.addEventListener('click', closeMemberTipModal);
  }

  // Fechar modal ao clicar fora do card
  if (memberTipModal) {
    memberTipModal.addEventListener('click', (e) => {
      if (e.target === memberTipModal) {
        closeMemberTipModal();
      }
    });
  }

  // Chips de valores rápidos
  quickValBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-val');
      if (tipModalValue && val) {
        tipModalValue.value = val;
        tipModalValue.focus();
      }
    });
  });

  // Confirmar gorjeta para o membro
  if (memberTipForm) {
    memberTipForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentSelectedMember) return;

      const val = parseFloat(tipModalValue.value);
      if (isNaN(val) || val <= 0) {
        alert('Por favor, informe um valor de gorjeta maior que zero.');
        return;
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Cadastra nas gorjetas com o nome do membro
      const newTip = {
        id: Date.now().toString(),
        name: `${currentSelectedMember.name} (@${currentSelectedMember.twitch})`,
        value: val,
        time: timeStr
      };

      tipsData.unshift(newTip);
      saveTips();
      renderTips();
      showTipCelebration(currentSelectedMember.name, val);

      closeMemberTipModal();

      // Confirmação com ação rápida
      const formattedVal = formatBRL(val);
      if (confirm(`Gorjeta de ${formattedVal} registrada com sucesso para ${currentSelectedMember.name}!\n\nDeseja abrir a aba de Gorjetas para visualizar?`)) {
        switchTab('tabTips');
      }
    });
  }

  // Atualizar gorjetas se localStorage mudar (outra aba)
  window.addEventListener('storage', (e) => {
    if (e.key === 'barbeiro_tips') {
      tipsData = loadTips();
      renderTips();
    }
    if (e.key === 'barbeiro_bank') {
      bankData = loadBankData();
      renderBank();
    }
  });

  // Recarregar membros ao trocar para a aba de Membros
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('data-target') === 'tabMembers') {
        renderMembers(membersSearchInput ? membersSearchInput.value : '');
      }
      if (btn.getAttribute('data-target') === 'tabBattles') {
        loadBattleMembers();
      }
    });
  });

  // Se a URL contiver hash #membros, abre a aba de membros diretamente
  if (window.location.hash === '#membros') {
    switchTab('tabMembers');
  }

  // Iniciar checagem de sessão e renderizar dados iniciais
  checkSession();
  renderTips();
  renderBank();
  await renderMembers();
  await loadBattleMembers();
});
