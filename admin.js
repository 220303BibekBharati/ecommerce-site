// Admin dashboard logic for NovaCommerce

const PRODUCT_STORAGE_KEY = 'ecom_products';
const ORDERS_STORAGE_KEY = 'ecom_orders';
const ADMIN_SESSION_KEY = 'ecom_admin_session';
const USERS_STORAGE_KEY = 'users';

// Supabase configuration (shared backend for users & orders)
const SUPABASE_URL = 'https://hmbyzvsvwqivlbuqgzrd.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYnl6dnN2d3FpdmxidXFnenJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTI2MzYsImV4cCI6MjA3OTcyODYzNn0.xz46HZHqP8PeDqLFsBEV7w7D0KbqGLIJyHGA_XdRcFM';

// Root elements
const loginSection = document.getElementById('admin-login-section');
const mainSection = document.getElementById('admin-main-section');
const adminIdentityEl = document.getElementById('admin-identity');
const adminLogoutBtn = document.getElementById('admin-logout');
const adminNavButtons = document.querySelectorAll('[data-admin-view]');

// Login
const adminLoginForm = document.getElementById('admin-login-form');
const adminLoginError = document.getElementById('admin-login-error');
const adminLoginDemo = document.getElementById('admin-login-demo');

// Overview metrics
const metricGrid = document.getElementById('metric-grid');

// Orders
const ordersTbody = document.getElementById('orders-tbody');
const orderSearchInput = document.getElementById('order-search');
const orderStatusFilter = document.getElementById('order-status-filter');
const ordersRefreshBtn = document.getElementById('orders-refresh');
const ordersExportBtn = document.getElementById('orders-export');
const selectAllOrdersCb = document.getElementById('select-all-orders');
const bulkStatusSelect = document.getElementById('bulk-status-select');
const bulkApplyBtn = document.getElementById('bulk-apply');

// Products
const productsTbody = document.getElementById('products-tbody');
const productSearchInput = document.getElementById('product-search');
const productNewBtn = document.getElementById('product-new');

// Users
const usersTbody = document.getElementById('users-tbody');

// Shared UI
const adminToastContainer = document.getElementById('admin-toast-container');
const adminModalRoot = document.getElementById('admin-modal-root');

// ---------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------

function getOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setOrders(orders) {
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function getProducts() {
  try {
    const raw = localStorage.getItem(PRODUCT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setProducts(products) {
  localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products));
}

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getAdminSession() {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setAdminSession(session) {
  if (!session) localStorage.removeItem(ADMIN_SESSION_KEY);
  else localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

// ---------------------------------------------------------
// Supabase helpers (load users & orders into local storage)
// ---------------------------------------------------------

async function supabaseSelect(table) {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return [];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      console.error('Supabase select failed', table, await res.text());
      return [];
    }
    return await res.json();
  } catch (e) {
    console.error('Supabase select error', table, e);
    return [];
  }
}

async function reloadOrdersFromSupabase() {
  const data = await supabaseSelect('orders');
  if (!Array.isArray(data)) return;
  setOrders(data);
  renderOrdersTable();
  renderOverview();
  toast('Orders synced from server');
}

async function reloadUsersFromSupabase() {
  const data = await supabaseSelect('users');
  if (!Array.isArray(data)) return;
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to cache users locally', e);
  }
  if (document.getElementById('admin-users')?.style.display !== 'none') {
    renderUsersTable();
  }
}

// ---------------------------------------------------------
// Utilities
// ---------------------------------------------------------

function formatPrice(value) {
  return `$${value.toFixed(2)}`;
}

function statusClass(status) {
  const map = {
    Pending: 'status-pending',
    Processing: 'status-processing',
    Shipped: 'status-shipped',
    Delivered: 'status-delivered',
    Canceled: 'status-canceled',
  };
  return map[status] || 'status-pending';
}

function toast(message, type = 'success') {
  const div = document.createElement('div');
  div.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  div.textContent = message;
  adminToastContainer.appendChild(div);
  setTimeout(() => div.remove(), 2600);
}

function openModal(contentHtml) {
  adminModalRoot.style.display = 'block';
  adminModalRoot.innerHTML = `
    <div class="modal-backdrop" id="admin-modal-backdrop">
      <div class="modal">
        ${contentHtml}
      </div>
    </div>
  `;
  const close = () => {
    adminModalRoot.innerHTML = '';
    adminModalRoot.style.display = 'none';
  };
  const backdrop = document.getElementById('admin-modal-backdrop');
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  const closeBtn = adminModalRoot.querySelector('[data-modal-close]');
  if (closeBtn) closeBtn.addEventListener('click', close);
  return close;
}

// ---------------------------------------------------------
// Login & gate
// ---------------------------------------------------------

function showLogin() {
  loginSection.style.display = 'block';
  mainSection.style.display = 'none';
  adminIdentityEl.textContent = '—';
}

function showAdminMain(session) {
  loginSection.style.display = 'none';
  mainSection.style.display = 'block';
  adminIdentityEl.textContent = session?.email || 'admin@example.com';
  renderOverview();
  renderOrdersTable();
  // Load latest data from shared backend
  reloadOrdersFromSupabase();
  reloadUsersFromSupabase();
  renderProductsTable();
}

function handleLogin(email, password) {
  if (email === 'admin@example.com' && password === 'admin123') {
    const session = { email, loggedInAt: new Date().toISOString() };
    setAdminSession(session);
    showAdminMain(session);
    toast('Signed in as admin');
    return true;
  }
  return false;
}

function wireLogin() {
  adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(adminLoginForm);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '').trim();
    if (!email || !password) {
      adminLoginError.textContent = 'Please provide both email and password.';
      return;
    }
    if (!handleLogin(email, password)) {
      adminLoginError.textContent = 'Invalid credentials.';
      return;
    }
    adminLoginError.textContent = '';
  });

  adminLoginDemo.addEventListener('click', () => {
    handleLogin('admin@example.com', 'admin123');
    adminLoginError.textContent = '';
  });

  adminLogoutBtn.addEventListener('click', () => {
    setAdminSession(null);
    showLogin();
    toast('Logged out');
  });
}

// ---------------------------------------------------------
// Users view
// ---------------------------------------------------------

function renderUsersTable() {
  if (!usersTbody) return;
  const users = getUsers();
  usersTbody.innerHTML = '';
  if (!users.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="3" class="text-muted">No users registered yet.</td>';
    usersTbody.appendChild(tr);
    return;
  }
  users.forEach((u) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.name || '—'}</td>
      <td>${u.email}</td>
      <td>${u.registeredAt || ''}</td>
    `;
    usersTbody.appendChild(tr);
  });
}

// ---------------------------------------------------------
// Overview metrics
// ---------------------------------------------------------

function renderOverview() {
  const orders = getOrders();
  const products = getProducts();
  const totalOrders = orders.length;
  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const todayStr = new Date().toDateString();
  const todaysOrders = orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr).length;
  const pendingOrders = orders.filter((o) => o.status === 'Pending').length;

  metricGrid.innerHTML = '';
  const metrics = [
    {
      label: 'Total orders',
      value: totalOrders,
      sub: `${pendingOrders} pending` ,
    },
    {
      label: 'Revenue (local)',
      value: formatPrice(revenue),
      sub: `${todaysOrders} orders today`,
    },
    {
      label: 'Catalog size',
      value: products.length,
      sub: 'Managed products',
    },
  ];

  metrics.forEach((m) => {
    const card = document.createElement('article');
    card.className = 'metric-card';
    card.innerHTML = `
      <div class="metric-label">${m.label}</div>
      <div class="metric-value">${m.value}</div>
      <div class="metric-sub">${m.sub}</div>
    `;
    metricGrid.appendChild(card);
  });
}

// ---------------------------------------------------------
// Orders: render, search, filter, status updates
// ---------------------------------------------------------

let orderFilterState = {
  term: '',
  status: 'all',
};

function getFilteredOrders() {
  const orders = getOrders();
  const term = orderFilterState.term.toLowerCase();
  const status = orderFilterState.status;
  return orders.filter((o) => {
    if (status !== 'all' && o.status !== status) return false;
    if (term) {
      const hay = `${o.id} ${o.customer?.fullName || ''} ${o.customer?.email || ''}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
}

function renderOrdersTable() {
  const orders = getFilteredOrders();
  ordersTbody.innerHTML = '';
  if (!orders.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="7" class="text-muted">No matching orders.</td>';
    ordersTbody.appendChild(tr);
    return;
  }

  orders.forEach((o) => {
    const tr = document.createElement('tr');
    tr.dataset.id = o.id;
    const date = new Date(o.createdAt).toLocaleString();
    tr.innerHTML = `
      <td><input type="checkbox" class="order-select" data-id="${o.id}" /></td>
      <td>${o.id}</td>
      <td>${o.customer?.fullName || '—'}</td>
      <td>${formatPrice(o.total || 0)}</td>
      <td>
        <select class="form-select order-status-select" data-id="${o.id}">
          <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
          <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          <option value="Canceled" ${o.status === 'Canceled' ? 'selected' : ''}>Canceled</option>
        </select>
      </td>
      <td style="font-size:0.75rem;" class="text-muted">${date}</td>
      <td>
        <button type="button" class="btn-ghost" data-view-order="${o.id}">View</button>
      </td>
    `;
    ordersTbody.appendChild(tr);
  });
}

function updateOrderStatus(orderId, newStatus) {
  const orders = getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;
  order.status = newStatus;
  setOrders(orders);
  renderOrdersTable();
  renderOverview();
  toast(`Order ${orderId} marked as ${newStatus}`);
}

function viewOrderDetail(orderId) {
  const order = getOrders().find((o) => o.id === orderId);
  if (!order) return;
  const itemsHtml = order.items
    .map(
      (i) => `
      <div class="cart-row"><span>${i.qty} × ${i.name}</span><span>${formatPrice(
        i.price * i.qty
      )}</span></div>
    `
    )
    .join('');
  const close = openModal(`
    <div class="modal-header">
      <h3>Order ${order.id}</h3>
      <button type="button" class="modal-close" data-modal-close>×</button>
    </div>
    <div class="order-body">
      <div class="cart-summary">
        ${itemsHtml}
        <div class="cart-row"><span>Subtotal</span><span>${formatPrice(order.subtotal || 0)}</span></div>
        <div class="cart-row"><span>Shipping</span><span>${
          order.shipping ? formatPrice(order.shipping) : 'Free'
        }</span></div>
        <div class="cart-row cart-total"><span>Total</span><span>${formatPrice(order.total || 0)}</span></div>
      </div>
      <div style="margin-top:0.7rem; font-size:0.78rem;" class="text-muted">
        <div><strong>Customer:</strong> ${order.customer?.fullName || '—'}</div>
        <div><strong>Address:</strong> ${order.customer?.address || '—'}, ${order.customer?.city || ''} ${
    order.customer?.zip || ''
  }</div>
        <div><strong>Contact:</strong> ${order.customer?.email || '—'} · ${order.customer?.phone || '—'}</div>
        <div><strong>Status:</strong> ${order.status}</div>
      </div>
    </div>
  `);
  return close;
}

function bulkUpdateOrders(newStatus) {
  const checkedIds = Array.from(document.querySelectorAll('.order-select:checked')).map((cb) =>
    cb.getAttribute('data-id')
  );
  if (!checkedIds.length) {
    toast('No orders selected.', 'error');
    return;
  }
  const orders = getOrders();
  orders.forEach((o) => {
    if (checkedIds.includes(o.id)) o.status = newStatus;
  });
  setOrders(orders);
  renderOrdersTable();
  renderOverview();
  toast(`Updated ${checkedIds.length} order(s) to ${newStatus}`);
}

function exportOrdersCsv() {
  const orders = getOrders();
  if (!orders.length) {
    toast('No orders to export.', 'error');
    return;
  }
  const header = ['Order ID', 'Customer', 'Email', 'Total', 'Status', 'Created at'];
  const rows = orders.map((o) => [
    o.id,
    o.customer?.fullName || '',
    o.customer?.email || '',
    String(o.total || 0),
    o.status,
    o.createdAt,
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((field) => '"' + String(field).replace(/"/g, '""') + '"').join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orders.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Orders exported as CSV');
}

function wireOrders() {
  ordersTbody.addEventListener('change', (e) => {
    const select = e.target.closest('.order-status-select');
    if (select) {
      updateOrderStatus(select.dataset.id, select.value);
      return;
    }
  });

  ordersTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-view-order]');
    if (!btn) return;
    viewOrderDetail(btn.getAttribute('data-view-order'));
  });

  orderSearchInput.addEventListener('input', () => {
    orderFilterState.term = orderSearchInput.value;
    renderOrdersTable();
  });

  orderStatusFilter.addEventListener('change', () => {
    orderFilterState.status = orderStatusFilter.value;
    renderOrdersTable();
  });

  ordersRefreshBtn.addEventListener('click', () => {
    reloadOrdersFromSupabase();
  });

  ordersExportBtn.addEventListener('click', exportOrdersCsv);

  selectAllOrdersCb.addEventListener('change', () => {
    const checked = selectAllOrdersCb.checked;
    document
      .querySelectorAll('.order-select')
      .forEach((cb) => (cb.checked = checked));
  });

  bulkApplyBtn.addEventListener('click', () => {
    const status = bulkStatusSelect.value;
    bulkUpdateOrders(status);
  });
}

// ---------------------------------------------------------
// Products: list, search, CRUD
// ---------------------------------------------------------

let productSearchTerm = '';

function getFilteredProducts() {
  const products = getProducts();
  const term = productSearchTerm.toLowerCase();
  return products.filter((p) => {
    if (!term) return true;
    return `${p.name} ${p.category}`.toLowerCase().includes(term);
  });
}

function renderProductsTable() {
  const products = getFilteredProducts();
  productsTbody.innerHTML = '';
  if (!products.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="6" class="text-muted">No products configured.</td>';
    productsTbody.appendChild(tr);
    return;
  }
  products.forEach((p) => {
    const tr = document.createElement('tr');
    tr.dataset.id = p.id;
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td>${formatPrice(p.price)}</td>
      <td>${p.inventory}</td>
      <td>${p.featured ? 'Yes' : 'No'}</td>
      <td>
        <button type="button" class="btn-ghost" data-edit-product="${p.id}">Edit</button>
        <button type="button" class="btn-ghost" data-delete-product="${p.id}">Delete</button>
      </td>
    `;
    productsTbody.appendChild(tr);
  });
}

function openProductForm(existing) {
  const isEdit = !!existing;
  const product =
    existing || {
      id: 'P-' + Date.now().toString(36),
      name: '',
      category: '',
      price: 0,
      inventory: 0,
      featured: false,
      badge: '',
      description: '',
      imageUrl: '',
    };
  const close = openModal(`
    <div class="modal-header">
      <h3>${isEdit ? 'Edit product' : 'Add product'}</h3>
      <button type="button" class="modal-close" data-modal-close>×</button>
    </div>
    <form id="product-form" class="checkout-body">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">Name</label>
          <input class="form-input" name="name" value="${product.name}" required />
        </div>
        <div class="form-field">
          <label class="form-label">Category</label>
          <input class="form-input" name="category" value="${product.category}" required />
        </div>
        <div class="form-field">
          <label class="form-label">Price</label>
          <input class="form-input" type="number" min="0" step="0.01" name="price" value="${
            product.price
          }" required />
        </div>
        <div class="form-field">
          <label class="form-label">Inventory</label>
          <input class="form-input" type="number" min="0" step="1" name="inventory" value="${
            product.inventory
          }" required />
        </div>
        <div class="form-field">
          <label class="form-label">Badge (optional)</label>
          <input class="form-input" name="badge" value="${product.badge || ''}" />
        </div>
        <div class="form-field">
          <label class="form-label">Featured</label>
          <select class="form-select" name="featured">
            <option value="false" ${!product.featured ? 'selected' : ''}>No</option>
            <option value="true" ${product.featured ? 'selected' : ''}>Yes</option>
          </select>
        </div>
      </div>
      <div class="form-grid" style="margin-top:0.6rem;">
        <div class="form-field">
          <label class="form-label">Image URL</label>
          <input class="form-input" name="imageUrl" value="${product.imageUrl || ''}" placeholder="https://..." />
        </div>
        <div class="form-field">
          <label class="form-label">Upload image</label>
          <input class="form-input" type="file" accept="image/*" id="product-image-file" />
        </div>
      </div>
      <div class="form-field" style="margin-top:0.6rem;">
        <label class="form-label">Description</label>
        <textarea class="form-textarea" name="description" rows="3">${
          product.description || ''
        }</textarea>
      </div>
      <div class="form-field" style="margin-top:0.4rem;">
        <label class="form-label">Preview</label>
        <div class="product-media">
          <div class="product-img-placeholder" id="product-image-preview">${
            product.imageUrl ? 'Image set' : 'No image yet'
          }</div>
        </div>
      </div>
      <div style="margin-top:0.6rem; display:flex; gap:0.5rem;">
        <button type="button" class="btn-ghost" id="product-cancel-top">Cancel</button>
        <button type="submit" class="btn-solid">${isEdit ? 'Save changes' : 'Create product'}</button>
      </div>
      <div class="form-error" id="product-error"></div>
      <div style="margin-top:0.8rem; display:flex; gap:0.5rem;">
        <button type="button" class="btn-ghost" id="product-cancel">Cancel</button>
        <button type="submit" class="btn-solid">${isEdit ? 'Save changes' : 'Create product'}</button>
      </div>
    </form>
  `);

  const form = document.getElementById('product-form');
  const errorEl = document.getElementById('product-error');
  const fileInput = document.getElementById('product-image-file');
  const previewEl = document.getElementById('product-image-preview');
  const imageUrlInput = form.elements.namedItem('imageUrl');
  let uploadedDataUrl = '';

  function updatePreview(src) {
    if (!src) {
      previewEl.textContent = 'No image yet';
      return;
    }
    previewEl.innerHTML = `<img src="${src}" alt="preview" />`;
  }

  if (product.imageUrl) {
    updatePreview(product.imageUrl);
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        uploadedDataUrl = reader.result;
        updatePreview(uploadedDataUrl);
      };
      reader.readAsDataURL(file);
    });
  }

  if (imageUrlInput) {
    imageUrlInput.addEventListener('input', () => {
      const url = imageUrlInput.value.trim();
      if (url) updatePreview(url);
      else if (!uploadedDataUrl) updatePreview('');
    });
  }
  document.getElementById('product-cancel').onclick = close;
  const cancelTop = document.getElementById('product-cancel-top');
  if (cancelTop) cancelTop.onclick = close;
  form.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const vals = Object.fromEntries(data.entries());
    if (!vals.name.trim() || !vals.category.trim()) {
      errorEl.textContent = 'Name and category are required.';
      return;
    }
    const price = Number(vals.price);
    const inventory = Number(vals.inventory);
    if (Number.isNaN(price) || Number.isNaN(inventory)) {
      errorEl.textContent = 'Please provide valid numbers for price and inventory.';
      return;
    }
    const products = getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    const updated = {
      ...product,
      name: vals.name.trim(),
      category: vals.category.trim(),
      price,
      inventory,
      featured: vals.featured === 'true',
      badge: vals.badge.trim(),
      description: vals.description.trim(),
      imageUrl: uploadedDataUrl || vals.imageUrl.trim() || product.imageUrl || '',
    };
    if (index >= 0) products[index] = updated;
    else products.push(updated);
    setProducts(products);
    renderProductsTable();
    renderOverview();
    toast(isEdit ? 'Product updated' : 'Product created');
    close();
  };
}

function deleteProduct(productId) {
  const products = getProducts();
  const idx = products.findIndex((p) => p.id === productId);
  if (idx < 0) return;
  products.splice(idx, 1);
  setProducts(products);
  renderProductsTable();
  renderOverview();
  toast('Product deleted');
}

function wireProducts() {
  productSearchInput.addEventListener('input', () => {
    productSearchTerm = productSearchInput.value;
    renderProductsTable();
  });

  productNewBtn.addEventListener('click', () => openProductForm(null));

  productsTbody.addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-product]');
    if (editBtn) {
      const id = editBtn.getAttribute('data-edit-product');
      const product = getProducts().find((p) => p.id === id);
      if (product) openProductForm(product);
      return;
    }
    const delBtn = e.target.closest('[data-delete-product]');
    if (delBtn) {
      const id = delBtn.getAttribute('data-delete-product');
      if (confirm('Delete this product?')) deleteProduct(id);
    }
  });
}

// ---------------------------------------------------------
// Navigation between admin views
// ---------------------------------------------------------

function showAdminView(view) {
  document.getElementById('admin-overview').style.display = view === 'overview' ? 'block' : 'none';
  document.getElementById('admin-orders').style.display = view === 'orders' ? 'block' : 'none';
  document.getElementById('admin-products').style.display = view === 'products' ? 'block' : 'none';
  const usersSection = document.getElementById('admin-users');
  if (usersSection) usersSection.style.display = view === 'users' ? 'block' : 'none';
  adminNavButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.adminView === view);
  });
  if (view === 'users') renderUsersTable();
}

function wireNavigation() {
  adminNavButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.adminView;
      showAdminView(view);
    });
  });
}

// ---------------------------------------------------------
// Simulated real-time updates
// ---------------------------------------------------------

function simulateRealtime() {
  // Every ~25 seconds, randomly advance some Pending/Processing orders
  setInterval(() => {
    const orders = getOrders();
    let changed = false;
    orders.forEach((o) => {
      if (o.status === 'Pending' && Math.random() < 0.3) {
        o.status = 'Processing';
        changed = true;
      } else if (o.status === 'Processing' && Math.random() < 0.25) {
        o.status = 'Shipped';
        changed = true;
      }
    });
    if (changed) {
      setOrders(orders);
      renderOrdersTable();
      renderOverview();
      toast('Some orders were auto‑advanced', 'success');
    }
  }, 25000);
}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------

function initAdmin() {
  wireLogin();
  wireOrders();
  wireProducts();
  wireNavigation();
  simulateRealtime();

  const session = getAdminSession();
  if (session) showAdminMain(session);
  else showLogin();
}

document.addEventListener('DOMContentLoaded', initAdmin);

