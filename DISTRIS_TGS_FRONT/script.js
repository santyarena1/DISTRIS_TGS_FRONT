// script.js

// Cambiá este valor si tu backend corre en otro host/puerto
const BASE_URL = 'http://localhost:3000';

// Elementos principales
const loginSection = document.getElementById('login-section');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const userInfo = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');

// Tabs
const tabButtons = document.querySelectorAll('.tab-button');
const tabs = document.querySelectorAll('.tab');

// Inputs de búsqueda y listas
const searchNbInput = document.getElementById('search-nb');
const searchGnInput = document.getElementById('search-gn');
const searchTgsInput = document.getElementById('search-tgs');
const searchElitInput = document.getElementById('search-elit');
const searchGlobalInput = document.getElementById('search-global');

const newbytesList = document.getElementById('newbytes-list');
const gruponucleoList = document.getElementById('gruponucleo-list');
const tgsList = document.getElementById('tgs-list');
const elitList = document.getElementById('elit-list');
const globalList = document.getElementById('global-list');
const syncResult = document.getElementById('sync-result');

// Usuarios (ABM)
const usersTabBtn = document.getElementById('tab-users-btn');
const usersTableBody = document.getElementById('users-table-body');
const userForm = document.getElementById('user-form');
const userFormTitle = document.getElementById('user-form-title');
const userIdInput = document.getElementById('user-id');
const userEmailInput = document.getElementById('user-email');
const userNameInput = document.getElementById('user-name');
const userRoleSelect = document.getElementById('user-role');
const userPasswordInput = document.getElementById('user-password');
const userPassword2Input = document.getElementById('user-password2');
const userCancelBtn = document.getElementById('user-cancel-btn');
const usersMessage = document.getElementById('users-message');

let editingUserId = null;

// ================== Helpers ==================

function getToken() {
  return localStorage.getItem('jwt_token') || '';
}

function setToken(token) {
  localStorage.setItem('jwt_token', token);
}

function clearToken() {
  localStorage.removeItem('jwt_token');
}

function showElement(el) {
  if (el) el.style.display = '';
}

function hideElement(el) {
  if (el) el.style.display = 'none';
}

function setLoggedInUI(user) {
  hideElement(loginSection);
  showElement(dashboard);
  userInfo.textContent = `${user.email} (${user.role})`;

  if (user.role === 'admin') {
    showElement(usersTabBtn);
  } else {
    hideElement(usersTabBtn);
    const usersTab = document.getElementById('tab-users');
    hideElement(usersTab);
  }
}

function setLoggedOutUI() {
  showElement(loginSection);
  hideElement(dashboard);
  userInfo.textContent = '';
  clearToken();
}

// Inicializar vista según exista token
async function init() {
  const token = getToken();
  if (!token) {
    setLoggedOutUI();
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      setLoggedOutUI();
      return;
    }
    const data = await res.json();
    setLoggedInUI(data.user);
  } catch (err) {
    setLoggedOutUI();
  }
}

init();

// ================== LOGIN ==================

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginMessage.textContent = '';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!email || !password) {
    loginMessage.textContent = 'Completa email y contraseña.';
    return;
  }

  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      loginMessage.textContent = data.error || 'Credenciales inválidas';
      return;
    }

    setToken(data.token);
    setLoggedInUI(data.user);
  } catch (err) {
    loginMessage.textContent = 'Error de conexión con el servidor.';
  }
});

// ================== LOGOUT ==================

logoutBtn.addEventListener('click', () => {
  clearToken();
  setLoggedOutUI();
});

// ================== Tabs ==================

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tabId = btn.dataset.tab;

    tabButtons.forEach((b) => b.classList.remove('active'));
    tabs.forEach((t) => t.classList.remove('active'));

    btn.classList.add('active');
    const tabEl = document.getElementById(tabId);
    tabEl.classList.add('active');

    // Carga perezosa según pestaña
    if (tabId === 'tab-users') {
      loadUsers();
    }
    if (tabId === 'tab-tgs') {
      loadTgsProducts();
    }
    if (tabId === 'tab-elit') {
      loadElitProducts();
    }
  });
});

// ================== Fetch helper con JWT ==================

async function authFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };
  return fetch(url, { ...options, headers });
}

// ================== SYNC ==================

// NewBytes
document.getElementById('btn-sync-nb').addEventListener('click', async () => {
  syncResult.textContent = 'Sincronizando NewBytes...';
  try {
    const res = await authFetch(`${BASE_URL}/sync/newbytes`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      syncResult.textContent = 'Error: ' + (data.error || 'desconocido');
      return;
    }
    syncResult.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    syncResult.textContent = 'Error de conexión.';
  }
});

// Grupo Núcleo
document.getElementById('btn-sync-gn').addEventListener('click', async () => {
  syncResult.textContent = 'Sincronizando Grupo Núcleo...';
  try {
    const res = await authFetch(`${BASE_URL}/sync/gruponucleo`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      syncResult.textContent = 'Error: ' + (data.error || 'desconocido');
      return;
    }
    syncResult.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    syncResult.textContent = 'Error de conexión.';
  }
});

// TGS
document.getElementById('btn-sync-tgs').addEventListener('click', async () => {
  syncResult.textContent = 'Sincronizando TGS...';
  try {
    const res = await authFetch(`${BASE_URL}/sync/tgs`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      syncResult.textContent = 'Error: ' + (data.error || 'desconocido');
      return;
    }
    syncResult.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    syncResult.textContent = 'Error de conexión.';
  }
});

// ELIT
document.getElementById('btn-sync-elit').addEventListener('click', async () => {
  syncResult.textContent = 'Sincronizando ELIT...';
  try {
    const res = await authFetch(`${BASE_URL}/sync/elit`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) {
      syncResult.textContent = 'Error: ' + (data.error || 'desconocido');
      return;
    }
    syncResult.textContent = JSON.stringify(data, null, 2);
  } catch (err) {
    syncResult.textContent = 'Error de conexión.';
  }
});

// ================== BUSCAR PRODUCTOS (por distribuidor) ==================

document
  .getElementById('btn-search-nb')
  .addEventListener('click', loadNewbytesProducts);
document
  .getElementById('btn-search-gn')
  .addEventListener('click', loadGrupoNucleoProducts);
document
  .getElementById('btn-search-tgs')
  .addEventListener('click', loadTgsProducts);
document
  .getElementById('btn-search-elit')
  .addEventListener('click', loadElitProducts);

// Buscador global
document
  .getElementById('btn-search-global')
  .addEventListener('click', loadGlobalSearch);

async function loadNewbytesProducts() {
  newbytesList.innerHTML = '';
  let url = `${BASE_URL}/newbytes-products?limit=50`;
  const q = searchNbInput.value.trim();
  if (q) url += `&q=${encodeURIComponent(q)}`;

  try {
    const res = await authFetch(url);
    const data = await res.json();
    if (!res.ok) {
      newbytesList.innerHTML = `<li>Error: ${data.error || 'desconocido'}</li>`;
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      newbytesList.innerHTML = '<li>No se encontraron productos.</li>';
      return;
    }
    data.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = `${item.detalle || ''} – ${item.marca || ''} – ${
        item.categoria || ''
      }`;
      newbytesList.appendChild(li);
    });
  } catch {
    newbytesList.innerHTML = '<li>Error de conexión.</li>';
  }
}

async function loadGrupoNucleoProducts() {
  gruponucleoList.innerHTML = '';
  let url = `${BASE_URL}/gruponucleo-products?limit=50`;
  const q = searchGnInput.value.trim();
  if (q) url += `&q=${encodeURIComponent(q)}`;

  try {
    const res = await authFetch(url);
    const data = await res.json();
    if (!res.ok) {
      gruponucleoList.innerHTML = `<li>Error: ${
        data.error || 'desconocido'
      }</li>`;
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      gruponucleoList.innerHTML = '<li>No se encontraron productos.</li>';
      return;
    }
    data.forEach((item) => {
      const li = document.createElement('li');
      const desc =
        item.item_desc_0 || item.item_desc_1 || item.item_desc_2 || item.codigo;
      li.textContent = `${desc || ''} – ${item.marca || ''} – ${
        item.categoria || ''
      }`;
      gruponucleoList.appendChild(li);
    });
  } catch {
    gruponucleoList.innerHTML = '<li>Error de conexión.</li>';
  }
}

async function loadTgsProducts() {
  if (!tgsList) return;
  tgsList.innerHTML = '';
  let url = `${BASE_URL}/tgs-products?limit=50`;
  const q = searchTgsInput ? searchTgsInput.value.trim() : '';
  if (q) url += `&q=${encodeURIComponent(q)}`;

  try {
    const res = await authFetch(url);
    const data = await res.json();
    if (!res.ok) {
      tgsList.innerHTML = `<li>Error: ${data.error || 'desconocido'}</li>`;
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      tgsList.innerHTML = '<li>No se encontraron productos TGS.</li>';
      return;
    }
    data.forEach((item) => {
      const li = document.createElement('li');
      const nombre = item.name || '(sin nombre)';
      const cat = item.category || '';
      const sku = item.internalSku || item.manufacturerSku || '';
      const price =
        typeof item.price === 'number'
          ? new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS',
            }).format(item.price)
          : '';

      li.textContent = `${nombre} – ${cat} – ${sku} ${
        price ? '– ' + price : ''
      }`;
      tgsList.appendChild(li);
    });
  } catch (err) {
    tgsList.innerHTML = '<li>Error de conexión.</li>';
  }
}

async function loadElitProducts() {
  if (!elitList) return;
  elitList.innerHTML = '';
  let url = `${BASE_URL}/elit-products?limit=50`;
  const q = searchElitInput ? searchElitInput.value.trim() : '';
  if (q) url += `&q=${encodeURIComponent(q)}`;

  try {
    const res = await authFetch(url);
    const data = await res.json();
    if (!res.ok) {
      elitList.innerHTML = `<li>Error: ${data.error || 'desconocido'}</li>`;
      return;
    }
    if (!Array.isArray(data) || data.length === 0) {
      elitList.innerHTML = '<li>No se encontraron productos ELIT.</li>';
      return;
    }
    data.forEach((item) => {
      const li = document.createElement('li');
      const nombre = item.nombre || '(sin nombre)';
      const marca = item.marca || '';
      const codigo =
        item.codigoProducto || item.codigoAlfa || item.elitId || '';
      const price =
        typeof item.pvpArs === 'number'
          ? new Intl.NumberFormat('es-AR', {
              style: 'currency',
              currency: 'ARS',
            }).format(item.pvpArs)
          : '';

      li.textContent = `${nombre} – ${marca} – ${codigo} ${
        price ? '– ' + price : ''
      }`;
      elitList.appendChild(li);
    });
  } catch (err) {
    elitList.innerHTML = '<li>Error de conexión.</li>';
  }
}

// ================== BUSCADOR GLOBAL ==================

async function loadGlobalSearch() {
  if (!globalList) return;

  const q = searchGlobalInput ? searchGlobalInput.value.trim() : '';
  globalList.innerHTML = '';

  if (!q) {
    globalList.innerHTML = '<li>Escribí algo para buscar.</li>';
    return;
  }

  globalList.innerHTML = '<li>Buscando en todos los distribuidores...</li>';

  const limit = 25;

  try {
    const [nbRes, gnRes, tgsRes, elitRes] = await Promise.all([
      authFetch(
        `${BASE_URL}/newbytes-products?limit=${limit}&q=${encodeURIComponent(
          q
        )}`
      ),
      authFetch(
        `${BASE_URL}/gruponucleo-products?limit=${limit}&q=${encodeURIComponent(
          q
        )}`
      ),
      authFetch(
        `${BASE_URL}/tgs-products?limit=${limit}&q=${encodeURIComponent(q)}`
      ),
      authFetch(
        `${BASE_URL}/elit-products?limit=${limit}&q=${encodeURIComponent(q)}`
      ),
    ]);

    const [nbData, gnData, tgsData, elitData] = await Promise.all([
      nbRes.json().catch(() => []),
      gnRes.json().catch(() => []),
      tgsRes.json().catch(() => []),
      elitRes.json().catch(() => []),
    ]);

    globalList.innerHTML = '';

    const blocks = [];

    if (nbRes.ok && Array.isArray(nbData) && nbData.length) {
      blocks.push({
        name: 'NewBytes',
        items: nbData.map((p) => {
          const desc = p.detalle || '';
          const marca = p.marca || '';
          const cat = p.categoria || '';
          return `${desc} – ${marca} – ${cat}`;
        }),
      });
    }

    if (gnRes.ok && Array.isArray(gnData) && gnData.length) {
      blocks.push({
        name: 'Grupo Núcleo',
        items: gnData.map((p) => {
          const desc =
            p.item_desc_0 || p.item_desc_1 || p.item_desc_2 || p.codigo || '';
          const marca = p.marca || '';
          const cat = p.categoria || '';
          return `${desc} – ${marca} – ${cat}`;
        }),
      });
    }

    if (tgsRes.ok && Array.isArray(tgsData) && tgsData.length) {
      blocks.push({
        name: 'TGS',
        items: tgsData.map((p) => {
          const nombre = p.name || '(sin nombre)';
          const cat = p.category || '';
          const sku = p.internalSku || p.manufacturerSku || '';
          const price =
            typeof p.price === 'number'
              ? new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                }).format(p.price)
              : '';
          return `${nombre} – ${cat} – ${sku}${
            price ? ' – ' + price : ''
          }`;
        }),
      });
    }

    if (elitRes.ok && Array.isArray(elitData) && elitData.length) {
      blocks.push({
        name: 'ELIT',
        items: elitData.map((p) => {
          const nombre = p.nombre || '(sin nombre)';
          const marca = p.marca || '';
          const codigo =
            p.codigoProducto || p.codigoAlfa || p.elitId || '';
          const price =
            typeof p.pvpArs === 'number'
              ? new Intl.NumberFormat('es-AR', {
                  style: 'currency',
                  currency: 'ARS',
                }).format(p.pvpArs)
              : '';
          return `${nombre} – ${marca} – ${codigo}${
            price ? ' – ' + price : ''
          }`;
        }),
      });
    }

    if (!blocks.length) {
      globalList.innerHTML =
        '<li>No se encontraron resultados en ningún distribuidor.</li>';
      return;
    }

    blocks.forEach((block) => {
      const headerLi = document.createElement('li');
      headerLi.textContent = `— ${block.name} (${block.items.length}) —`;
      headerLi.style.fontWeight = 'bold';
      headerLi.style.marginTop = '0.5rem';
      globalList.appendChild(headerLi);

      block.items.forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        globalList.appendChild(li);
      });
    });
  } catch (err) {
    globalList.innerHTML =
      '<li>Error de conexión consultando los distribuidores.</li>';
  }
}

// ================== ABM USUARIOS ==================

function resetUserForm() {
  editingUserId = null;
  userIdInput.value = '';
  userEmailInput.value = '';
  userNameInput.value = '';
  userRoleSelect.value = 'admin';
  userPasswordInput.value = '';
  userPassword2Input.value = '';
  userFormTitle.textContent = 'Crear usuario';
  usersMessage.textContent = '';
}

userCancelBtn.addEventListener('click', () => {
  resetUserForm();
});

userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  usersMessage.textContent = '';

  const email = userEmailInput.value.trim();
  const name = userNameInput.value.trim();
  const role = userRoleSelect.value;
  const password = userPasswordInput.value;
  const password2 = userPassword2Input.value;

  if (!email) {
    usersMessage.textContent = 'El email es obligatorio.';
    return;
  }

  if (!editingUserId && !password) {
    usersMessage.textContent =
      'Para crear un usuario nuevo, la contraseña es obligatoria.';
    return;
  }

  if (password || password2) {
    if (password !== password2) {
      usersMessage.textContent = 'Las contraseñas no coinciden.';
      return;
    }
  }

  const body = {
    email,
    name: name || null,
    role,
  };

  if (password) {
    body.password = password;
  }

  try {
    let res;
    if (editingUserId) {
      res = await authFetch(`${BASE_URL}/users/${editingUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } else {
      res = await authFetch(`${BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      usersMessage.textContent = data.error || 'Error guardando usuario.';
      return;
    }

    resetUserForm();
    await loadUsers();
  } catch (err) {
    usersMessage.textContent = 'Error de conexión con el servidor.';
  }
});

async function loadUsers() {
  usersTableBody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
  usersMessage.textContent = '';

  try {
    const res = await authFetch(`${BASE_URL}/users`);
    const data = await res.json();

    if (!res.ok) {
      usersTableBody.innerHTML = `<tr><td colspan="6">Error: ${
        data.error || 'desconocido'
      }</td></tr>`;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      usersTableBody.innerHTML =
        '<tr><td colspan="6">No hay usuarios.</td></tr>';
      return;
    }

    usersTableBody.innerHTML = '';

    data.forEach((u) => {
      const tr = document.createElement('tr');

      const createdAt = u.createdAt
        ? new Date(u.createdAt).toLocaleString()
        : '';

      tr.innerHTML = `
        <td>${u.id}</td>
        <td>${u.email}</td>
        <td>${u.name || ''}</td>
        <td>${u.role}</td>
        <td>${createdAt}</td>
        <td>
          <button class="edit-btn" data-id="${u.id}">Editar</button>
          <button class="delete-btn" data-id="${u.id}">Eliminar</button>
        </td>
      `;

      usersTableBody.appendChild(tr);
    });

    // Eventos de editar / eliminar
    usersTableBody.querySelectorAll('.edit-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const row = btn.closest('tr');
        const email = row.children[1].textContent;
        const name = row.children[2].textContent;
        const role = row.children[3].textContent;

        editingUserId = id;
        userIdInput.value = String(id);
        userEmailInput.value = email;
        userNameInput.value = name;
        userRoleSelect.value = role;
        userPasswordInput.value = '';
        userPassword2Input.value = '';
        userFormTitle.textContent = `Editar usuario #${id}`;
        usersMessage.textContent = '';
      });
    });

    usersTableBody.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-id'));
        if (!confirm(`¿Eliminar usuario #${id}?`)) return;

        try {
          const resDel = await authFetch(`${BASE_URL}/users/${id}`, {
            method: 'DELETE',
          });

          if (!resDel.ok && resDel.status !== 204) {
            const dataDel = await resDel.json().catch(() => ({}));
            usersMessage.textContent =
              dataDel.error || 'Error eliminando usuario.';
            return;
          }

          if (editingUserId === id) {
            resetUserForm();
          }
          await loadUsers();
        } catch (err) {
          usersMessage.textContent = 'Error de conexión al eliminar usuario.';
        }
      });
    });
  } catch (err) {
    usersTableBody.innerHTML =
      '<tr><td colspan="6">Error de conexión.</td></tr>';
  }
}
