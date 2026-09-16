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
      card.className = 'glass-card member-card';
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
            <span class="info-row-text">${escapeHtml(member.email)}</span>
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
  });

  // Recarregar membros ao trocar para a aba de Membros
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('data-target') === 'tabMembers') {
        renderMembers(membersSearchInput ? membersSearchInput.value : '');
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
  await renderMembers();
});
