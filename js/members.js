/**
 * Barbeiro Apostador - Módulo de Gestão de Membros
 * Integração com Supabase (PostgreSQL via REST API)
 *
 * Requer: js/supabase-config.js carregado antes deste script.
 * Tabela: members (id UUID, name, email, twitch, twitch_norm, created_at)
 */

const MEMBERS_TABLE = 'members';

/** Headers padrão para todas as requisições ao Supabase */
function _sbHeaders(extra = {}) {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
    ...extra
  };
}

/** URL base da tabela */
function _sbUrl(params = '') {
  return `${SUPABASE_URL}/rest/v1/${MEMBERS_TABLE}${params}`;
}

/**
 * Normaliza o nick da Twitch (remove @, espaços e converte para minúsculas)
 * @param {string} twitchNick
 * @returns {string}
 */
function normalizeTwitchNick(twitchNick) {
  if (!twitchNick) return '';
  return twitchNick.trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Formata a data de criação para exibição amigável em pt-BR
 * @param {string} isoDate
 * @returns {string}
 */
function _formatDisplayDate(isoDate) {
  if (!isoDate) return 'Membro cadastrado';
  const d = new Date(isoDate);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${date} às ${time}`;
}

/**
 * Normaliza o objeto retornado pelo Supabase para o formato esperado pela UI
 * @param {Object} row
 * @returns {Object}
 */
function _normalizeRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    twitch: row.twitch,
    normalizedTwitch: row.twitch_norm,
    createdAt: row.created_at,
    displayDate: _formatDisplayDate(row.created_at)
  };
}

/**
 * Carrega todos os membros do Supabase, ordenados do mais recente para o mais antigo
 * @returns {Promise<Array>}
 */
async function loadMembers() {
  try {
    const res = await fetch(_sbUrl('?select=*&order=created_at.desc'), {
      method: 'GET',
      headers: _sbHeaders()
    });

    if (!res.ok) {
      console.error('[MembersModule] Erro ao carregar membros:', res.status, await res.text());
      return [];
    }

    const rows = await res.json();
    return rows.map(_normalizeRow);
  } catch (err) {
    console.error('[MembersModule] Falha na conexão com Supabase:', err);
    return [];
  }
}

/**
 * Verifica se um nick da Twitch já está cadastrado no banco
 * @param {string} twitchNick
 * @returns {Promise<boolean>}
 */
async function isTwitchNickRegistered(twitchNick) {
  const normalized = normalizeTwitchNick(twitchNick);
  if (!normalized) return false;

  try {
    const encoded = encodeURIComponent(normalized);
    const res = await fetch(_sbUrl(`?twitch_norm=eq.${encoded}&select=id&limit=1`), {
      method: 'GET',
      headers: _sbHeaders()
    });

    if (!res.ok) return false;
    const rows = await res.json();
    return rows.length > 0;
  } catch (err) {
    console.error('[MembersModule] Erro ao verificar nick:', err);
    return false;
  }
}

/**
 * Cadastra um novo membro (1 cadastro por nick da Twitch via UNIQUE constraint)
 * @param {{ name: string, email: string, twitch: string }} data
 * @returns {Promise<{ success: boolean, message: string, member?: Object }>}
 */
async function registerMember(data) {
  const name = (data.name || '').trim();
  const email = (data.email || '').trim().toLowerCase();
  const rawTwitch = (data.twitch || '').trim().replace(/^@+/, '');
  const normalizedTwitch = normalizeTwitchNick(rawTwitch);

  // Validações locais
  if (!name) {
    return { success: false, message: 'Por favor, informe seu nome completo.' };
  }
  if (!email || !email.includes('@') || !email.includes('.')) {
    return { success: false, message: 'Por favor, informe um endereço de e-mail válido.' };
  }
  if (!normalizedTwitch) {
    return { success: false, message: 'Por favor, informe seu nick da Twitch.' };
  }

  // Verificação de duplicidade antes de tentar inserir (para mensagem amigável)
  const alreadyExists = await isTwitchNickRegistered(normalizedTwitch);
  if (alreadyExists) {
    return {
      success: false,
      message: `O nick da Twitch "@${rawTwitch}" já está cadastrado! É permitido apenas 1 cadastro por conta da Twitch.`
    };
  }

  try {
    const res = await fetch(_sbUrl(), {
      method: 'POST',
      headers: _sbHeaders({ 'Prefer': 'return=representation' }),
      body: JSON.stringify({
        name,
        email,
        twitch: rawTwitch,
        twitch_norm: normalizedTwitch
      })
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      // Código 23505 = unique_violation no PostgreSQL
      if (errBody.code === '23505' || (errBody.message || '').includes('unique')) {
        return {
          success: false,
          message: `O nick da Twitch "@${rawTwitch}" já está cadastrado! É permitido apenas 1 cadastro por conta da Twitch.`
        };
      }
      console.error('[MembersModule] Erro ao inserir membro:', errBody);
      return { success: false, message: 'Erro ao salvar o cadastro. Tente novamente em instantes.' };
    }

    const rows = await res.json();
    const newMember = _normalizeRow(rows[0]);

    return {
      success: true,
      message: 'Cadastro realizado com sucesso! Você agora é um membro da comunidade.',
      member: newMember
    };
  } catch (err) {
    console.error('[MembersModule] Falha na conexão ao cadastrar:', err);
    return { success: false, message: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.' };
  }
}

/**
 * Remove um membro pelo UUID
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function removeMember(id) {
  try {
    const encoded = encodeURIComponent(id);
    const res = await fetch(_sbUrl(`?id=eq.${encoded}`), {
      method: 'DELETE',
      headers: _sbHeaders()
    });

    if (!res.ok) {
      console.error('[MembersModule] Erro ao remover membro:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[MembersModule] Falha na conexão ao remover:', err);
    return false;
  }
}

/**
 * Remove TODOS os membros da tabela
 * @returns {Promise<boolean>}
 */
async function removeAllMembers() {
  try {
    // Deleta todos os registros onde o id não é nulo (= toda a tabela)
    const res = await fetch(_sbUrl('?id=not.is.null'), {
      method: 'DELETE',
      headers: _sbHeaders()
    });

    if (!res.ok) {
      console.error('[MembersModule] Erro ao limpar membros:', res.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[MembersModule] Falha ao limpar membros:', err);
    return false;
  }
}

// Exportar para escopo global
window.MembersModule = {
  loadMembers,
  registerMember,
  removeMember,
  removeAllMembers,
  isTwitchNickRegistered,
  normalizeTwitchNick
};
