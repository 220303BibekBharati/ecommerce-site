// Customer-side E-commerce Logic (catalog, cart, checkout, orders)

// Seed product data (also used by admin.js via localStorage)
const PRODUCT_STORAGE_KEY = 'ecom_products';
const CART_STORAGE_KEY = 'ecom_cart';
const ORDERS_STORAGE_KEY = 'ecom_orders';
const USERS_STORAGE_KEY = 'users';
const CURRENT_USER_KEY = 'currentUser';

const defaultProducts = [
  {
    id: 'p1',
    name: 'Aurora Wireless Headphones',
    price: 129,
    category: 'Audio',
    inventory: 18,
    featured: true,
    badge: 'Top pick',
    imageUrl: 'https://images.pexels.com/photos/3394664/pexels-photo-3394664.jpeg?auto=compress&w=600',
    description:
      'Immersive sound, ANC, and 30‑hour battery life in a lightweight, vibrant design.',
  },
  {
    id: 'p2',
    name: 'Luma Mechanical Keyboard',
    price: 159,
    category: 'Workspace',
    inventory: 12,
    featured: true,
    badge: 'Creator favorite',
    description:
      'Hot‑swappable switches, per‑key RGB, and an aluminum frame built for daily creators.',
    imageUrl: 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&w=600',
  },
  {
    id: 'p3',
    name: 'Flux Ergonomic Chair',
    price: 289,
    category: 'Workspace',
    inventory: 7,
    featured: false,
    badge: 'Ergo',
    description:
      'Dynamic lumbar support, breathable mesh, and tilt controls for long work sessions.',
    imageUrl: 'https://images.pexels.com/photos/958168/pexels-photo-958168.jpeg?auto=compress&w=600',
  },
  {
    id: 'p4',
    name: 'Neon Desk Lamp',
    price: 69,
    category: 'Lifestyle',
    inventory: 24,
    featured: true,
    badge: 'New',
    description:
      'Smart dimming, ambient glow, and USB‑C passthrough to brighten your workspace.',
    imageUrl: 'https://images.pexels.com/photos/112811/pexels-photo-112811.jpeg?auto=compress&w=600',
  },
  {
    id: 'p5',
    name: 'Orbit Smart Mug',
    price: 89,
    category: 'Lifestyle',
    inventory: 30,
    featured: false,
    badge: 'Giftable',
    description:
      'Keeps your coffee at the perfect temperature with a minimalist, matte finish.',
    imageUrl: 'https://images.pexels.com/photos/1410225/pexels-photo-1410225.jpeg?auto=compress&w=600',
  },
  {
    id: 'p6',
    name: 'Pulse Fitness Tracker',
    price: 119,
    category: 'Wellness',
    inventory: 20,
    featured: false,
    badge: 'Essential',
    description:
      'Track activity, sleep, and recovery with a vivid OLED display and week‑long battery.',
    imageUrl: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&w=600',
  },
];
function getStoredProducts() {
  const raw = localStorage.getItem(PRODUCT_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(defaultProducts));
    return [...defaultProducts];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(defaultProducts));
    return [...defaultProducts];
  } catch {
    localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(defaultProducts));
    return [...defaultProducts];
  }
}

// User auth helpers (shared with existing login/index.html via same keys)

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (!user) localStorage.removeItem(CURRENT_USER_KEY);
  else localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  if (typeof window !== 'undefined' && typeof window.syncMenuAuthLabel === 'function') {
    window.syncMenuAuthLabel();
  }
}

function ensureAdminSeedUser() {
  const users = getUsers();
  if (!users.find((u) => u.email === 'admin@example.com')) {
    users.push({
      id: 'admin',
      name: 'Administrator',
      email: 'admin@example.com',
      password: 'admin123',
      registeredAt: new Date().toLocaleString(),
    });
    setUsers(users);
  }
}

let products = getStoredProducts();

// Cart helpers
function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

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

// UI element references
const featuredRoot = document.getElementById('featured-products');
const productsGrid = document.getElementById('products-grid');
const offersGrid = document.getElementById('offers-grid');
const categoryChipsRoot = document.getElementById('category-chips');
const searchInput = document.getElementById('search-input');
const maxPriceInput = document.getElementById('max-price-input');
const cartCountEl = document.getElementById('cart-count');
const cartToggleBtn = document.getElementById('cart-toggle-btn');
const heroShopBtn = document.getElementById('hero-shop-btn');
const heroOffersBtn = document.getElementById('hero-offers-btn');
const viewOrdersBtn = document.getElementById('view-orders-btn');
const catalogStats = document.getElementById('catalog-stats');
const orderListRoot = document.getElementById('order-list');
const checkoutBody = document.getElementById('checkout-body');
const checkoutStepsRoot = document.getElementById('checkout-steps');
const modalRoot = document.getElementById('product-modal-root');
const toastContainer = document.getElementById('toast-container');
const accountBtn = document.getElementById('account-btn');
const accountLabel = document.getElementById('account-label');
const authModalRoot = document.getElementById('auth-modal-root');

let activeCategory = 'All';
let currentCheckoutStep = 'cart';

// ---------------------------------------------------------
// Utility
// ---------------------------------------------------------

function formatPrice(value) {
  return `$${value.toFixed(2)}`;
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('animate-out');
    toast.remove();
  }, 2600);
}

// ---------------------------------------------------------
// Catalog rendering & filters
// ---------------------------------------------------------

function renderFeatured() {
  featuredRoot.innerHTML = '';
  const featured = products.filter((p) => p.featured).slice(0, 4);
  featured.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'mini-product';
    card.innerHTML = `
      <h4>${p.name}</h4>
      <div class="product-meta">
        <span>${p.category}</span>
        <span class="product-price">${formatPrice(p.price)}</span>
      </div>
      <div class="mini-product-bottom">
        <span class="text-muted">${p.badge || 'Featured'}</span>
        <button type="button" class="btn-ghost" data-view="${p.id}">View</button>
      </div>
    `;
    featuredRoot.appendChild(card);
  });

  featuredRoot.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-view]');
    if (!btn) return;
    const id = btn.getAttribute('data-view');
    const product = products.find((p) => p.id === id);
    if (product) openProductModal(product);
  });
}

function renderCategoryChips() {
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const all = ['All', ...categories];
  categoryChipsRoot.innerHTML = '';
  all.forEach((cat) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `chip ${activeCategory === cat ? 'active' : ''}`;
    chip.textContent = cat;
    chip.dataset.category = cat;
    categoryChipsRoot.appendChild(chip);
  });

  categoryChipsRoot.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-category]');
    if (!btn) return;
    activeCategory = btn.dataset.category;
    [...categoryChipsRoot.querySelectorAll('.chip')].forEach((c) =>
      c.classList.toggle('active', c.dataset.category === activeCategory)
    );
    renderCatalog();
  });
}

function filterProducts() {
  const term = (searchInput.value || '').toLowerCase();
  const maxPrice = parseFloat(maxPriceInput.value || '');
  return products.filter((p) => {
    if (activeCategory !== 'All' && p.category !== activeCategory) return false;
    if (!Number.isNaN(maxPrice) && p.price > maxPrice) return false;
    if (term && !`${p.name} ${p.category} ${p.description}`.toLowerCase().includes(term)) return false;
    return true;
  });
}

function renderCatalog() {
  const filtered = filterProducts();
  productsGrid.innerHTML = '';

  catalogStats.textContent = `${filtered.length} of ${products.length} products visible`;

  filtered.forEach((p) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = p.id;
    const mediaHtml = p.imageUrl
      ? `<div class="product-media"><img src="${p.imageUrl}" alt="${p.name}" /></div>`
      : `<div class="product-media"><div class="product-img-placeholder">${p.category}</div><div class="product-pill">${p.badge || p.category}</div></div>`;
    card.innerHTML = `
      ${mediaHtml}
      <div class="product-body">
        <div class="product-title">${p.name}</div>
        <div class="product-meta">
          <span>Stock: ${p.inventory}</span>
          <span class="product-price">${formatPrice(p.price)}</span>
        </div>
        <div class="product-actions">
          <button type="button" class="btn-ghost" data-view="${p.id}">Details</button>
          <button type="button" class="btn-solid" data-add="${p.id}">Add to cart</button>
        </div>
      </div>
    `;
    productsGrid.appendChild(card);
  });
}

function renderOffers() {
  offersGrid.innerHTML = '';
  const picks = products.slice(0, 3);
  picks.forEach((p) => {
    const offer = document.createElement('article');
    offer.className = 'product-card';
    const discounted = Math.round(p.price * 0.85);
    const mediaHtml = p.imageUrl
      ? `<div class="product-media"><img src="${p.imageUrl}" alt="${p.name}" /></div>`
      : `<div class="product-media"><div class="product-img-placeholder">Offer</div><div class="product-pill">Today only</div></div>`;
    offer.innerHTML = `
      ${mediaHtml}
      <div class="product-body">
        <div class="product-title">${p.name}</div>
        <div class="product-meta">
          <span class="text-muted">Was <s>${formatPrice(p.price)}</s></span>
          <span class="product-price">${formatPrice(discounted)}</span>
        </div>
        <div class="product-actions">
          <button type="button" class="btn-solid" data-add="${p.id}">Add to cart</button>
        </div>
      </div>
    `;
    offersGrid.appendChild(offer);
  });
}

// ---------------------------------------------------------
// Cart
// ---------------------------------------------------------

function updateCartCount() {
  const cart = getCart();
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  if (!cartCountEl) return;
  cartCountEl.textContent = String(count);
}

function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  const cart = getCart();
  const existing = cart.find((c) => c.productId === productId);
  if (existing) {
    existing.qty = Math.min(existing.qty + 1, product.inventory);
  } else {
    cart.push({ productId, qty: 1 });
  }
  setCart(cart);
  updateCartCount();
  showToast('Added to cart');
  if (currentCheckoutStep === 'cart') renderCheckoutCart();
}

function updateCartQty(productId, delta) {
  const cart = getCart();
  const item = cart.find((c) => c.productId === productId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    const idx = cart.indexOf(item);
    cart.splice(idx, 1);
  }
  setCart(cart);
  updateCartCount();
  if (currentCheckoutStep === 'cart') renderCheckoutCart();
}

function removeFromCart(productId) {
  const cart = getCart().filter((c) => c.productId !== productId);
  setCart(cart);
  updateCartCount();
  if (currentCheckoutStep === 'cart') renderCheckoutCart();
}

// ---------------------------------------------------------
// Checkout steps
// ---------------------------------------------------------

let shippingFormState = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zip: '',
};

let paymentFormState = {
  method: 'card',
  cardNumber: '',
  cardExpiry: '',
};

function setCheckoutStep(step) {
  currentCheckoutStep = step;
  document
    .querySelectorAll('.step-pill')
    .forEach((pill) => pill.classList.toggle('active', pill.dataset.step === step));

  if (step === 'cart') renderCheckoutCart();
  if (step === 'shipping') renderCheckoutShipping();
  if (step === 'payment') renderCheckoutPayment();
  if (step === 'confirm') renderCheckoutConfirm();
}

function computeCartSummary() {
  const cart = getCart();
  const lines = cart.map((item) => {
    const product = products.find((p) => p.id === item.productId);
    return {
      product,
      qty: item.qty,
      lineTotal: product ? product.price * item.qty : 0,
    };
  });
  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const shipping = subtotal > 0 && subtotal < 75 ? 7 : 0;
  const total = subtotal + shipping;
  return { lines, subtotal, shipping, total };
}

function renderCheckoutCart() {
  const { lines, subtotal, shipping, total } = computeCartSummary();
  const cart = getCart();
  if (cart.length === 0) {
    checkoutBody.innerHTML = `
      <p class="text-muted">Your cart is empty. Browse the catalog to add items, then return here to checkout.</p>
      <div style="margin-top:0.7rem;">
        <button type="button" class="btn-solid" id="cart-browse-btn">Browse products</button>
      </div>
    `;
    document.getElementById('cart-browse-btn').onclick = () => scrollToSection('catalog');
    return;
  }

  const linesHtml = lines
    .map((l) => {
      if (!l.product) return '';
      return `
        <div class="cart-line" data-id="${l.product.id}">
          <div class="cart-line-thumb"></div>
          <div class="cart-line-main">
            <div class="cart-line-title">${l.product.name}</div>
            <div class="cart-line-meta">
              <span>${l.product.category}</span>
              <span>${formatPrice(l.product.price)} ea</span>
            </div>
          </div>
          <div class="cart-line-actions">
            <div class="qty-control">
              <button type="button" class="qty-btn" data-qty="-1">−</button>
              <span class="qty-value">${l.qty}</span>
              <button type="button" class="qty-btn" data-qty="1">+</button>
            </div>
            <div class="text-accent cart-line-price">${formatPrice(l.lineTotal)}</div>
            <button type="button" class="btn-ghost" data-remove="1">Remove</button>
          </div>
        </div>
      `;
    })
    .join('');

  checkoutBody.innerHTML = `
    <div class="cart-items">${linesHtml}</div>
    <div class="cart-summary">
      <div class="cart-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
      <div class="cart-row"><span>Shipping</span><span>${shipping ? formatPrice(shipping) : 'Free'}</span></div>
      <div class="cart-row cart-total"><span>Total</span><span>${formatPrice(total)}</span></div>
      <div class="cart-actions">
        <button type="button" class="btn-solid" id="to-shipping-btn">Continue to shipping</button>
        <button type="button" class="btn-ghost" id="clear-cart-btn">Clear cart</button>
      </div>
    </div>
  `;

  checkoutBody.querySelectorAll('.cart-line').forEach((lineEl) => {
    const id = lineEl.dataset.id;
    lineEl.addEventListener('click', (e) => {
      if (e.target.matches('[data-qty]')) {
        const delta = Number(e.target.getAttribute('data-qty'));
        updateCartQty(id, delta);
      } else if (e.target.matches('[data-remove]')) {
        removeFromCart(id);
      }
    });
  });

  document.getElementById('to-shipping-btn').onclick = () => setCheckoutStep('shipping');
  document.getElementById('clear-cart-btn').onclick = () => {
    setCart([]);
    updateCartCount();
    renderCheckoutCart();
  };
}

function renderCheckoutShipping() {
  const html = `
    <form id="shipping-form">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">Full name</label>
          <input class="form-input" name="fullName" value="${shippingFormState.fullName}" required />
        </div>
        <div class="form-field">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" name="email" value="${shippingFormState.email}" required />
        </div>
        <div class="form-field">
          <label class="form-label">Phone</label>
          <input class="form-input" name="phone" value="${shippingFormState.phone}" required />
        </div>
        <div class="form-field">
          <label class="form-label">City</label>
          <input class="form-input" name="city" value="${shippingFormState.city}" required />
        </div>
        <div class="form-field">
          <label class="form-label">Address</label>
          <input class="form-input" name="address" value="${shippingFormState.address}" required />
        </div>
        <div class="form-field">
          <label class="form-label">ZIP / Postal code</label>
          <input class="form-input" name="zip" value="${shippingFormState.zip}" required />
        </div>
      </div>
      <div style="margin-top:0.8rem; display:flex; gap:0.5rem;">
        <button type="button" class="btn-ghost" id="back-to-cart-btn">Back to cart</button>
        <button type="submit" class="btn-solid">Continue to payment</button>
      </div>
      <div class="form-error" id="shipping-error"></div>
    </form>
  `;
  checkoutBody.innerHTML = html;

  document.getElementById('back-to-cart-btn').onclick = () => setCheckoutStep('cart');
  const form = document.getElementById('shipping-form');
  const errorEl = document.getElementById('shipping-error');
  form.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const vals = Object.fromEntries(data.entries());
    const missing = Object.entries(vals).filter(([, v]) => !String(v).trim());
    if (missing.length) {
      errorEl.textContent = 'Please fill in all fields.';
      return;
    }
    shippingFormState = vals;
    errorEl.textContent = '';
    setCheckoutStep('payment');
  };
}

function renderCheckoutPayment() {
  const html = `
    <form id="payment-form">
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">Payment method</label>
          <select class="form-select" name="method">
            <option value="card" ${paymentFormState.method === 'card' ? 'selected' : ''}>Credit card</option>
            <option value="cod" ${paymentFormState.method === 'cod' ? 'selected' : ''}>Cash on delivery</option>
          </select>
        </div>
        <div class="form-field" data-card-only>
          <label class="form-label">Card number</label>
          <input class="form-input" name="cardNumber" value="${paymentFormState.cardNumber}" placeholder="**** **** **** 4242" />
        </div>
        <div class="form-field" data-card-only>
          <label class="form-label">Expiry</label>
          <input class="form-input" name="cardExpiry" value="${paymentFormState.cardExpiry}" placeholder="MM/YY" />
        </div>
      </div>
      <div style="margin-top:0.8rem; display:flex; gap:0.5rem;">
        <button type="button" class="btn-ghost" id="back-to-shipping-btn">Back to shipping</button>
        <button type="submit" class="btn-solid">Review & confirm</button>
      </div>
      <div class="form-error" id="payment-error"></div>
    </form>
  `;
  checkoutBody.innerHTML = html;

  const form = document.getElementById('payment-form');
  const methodSelect = form.elements.namedItem('method');
  const errorEl = document.getElementById('payment-error');
  const updateCardVisibility = () => {
    const cardOnlyFields = form.querySelectorAll('[data-card-only]');
    const useCard = methodSelect.value === 'card';
    cardOnlyFields.forEach((el) => {
      el.style.display = useCard ? 'block' : 'none';
    });
  };
  updateCardVisibility();

  methodSelect.addEventListener('change', updateCardVisibility);

  document.getElementById('back-to-shipping-btn').onclick = () => setCheckoutStep('shipping');

  form.onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const vals = Object.fromEntries(data.entries());
    if (vals.method === 'card') {
      if (!vals.cardNumber.trim() || !vals.cardExpiry.trim()) {
        errorEl.textContent = 'Please provide card details or switch to COD.';
        return;
      }
    }
    paymentFormState = vals;
    errorEl.textContent = '';
    setCheckoutStep('confirm');
  };
}

function renderCheckoutConfirm() {
  const { lines, subtotal, shipping, total } = computeCartSummary();
  const itemsHtml = lines
    .map((l) => {
      if (!l.product) return '';
      return `<div class="cart-row"><span>${l.qty} × ${l.product.name}</span><span>${formatPrice(
        l.lineTotal
      )}</span></div>`;
    })
    .join('');
  checkoutBody.innerHTML = `
    <div class="order-card">
      <div class="order-header"><span>Order summary</span><span class="status-pill status-pending">Pending</span></div>
      <div class="order-body">
        <div class="cart-summary">
          ${itemsHtml || '<div class="text-muted">No items in cart.</div>'}
          <div class="cart-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
          <div class="cart-row"><span>Shipping</span><span>${shipping ? formatPrice(shipping) : 'Free'}</span></div>
          <div class="cart-row cart-total"><span>Total</span><span>${formatPrice(total)}</span></div>
        </div>
        <div style="margin-top:0.7rem; font-size:0.78rem;">
          <div><strong>Ship to:</strong> ${shippingFormState.fullName}, ${shippingFormState.address}, ${
    shippingFormState.city
  } ${shippingFormState.zip}</div>
          <div><strong>Contact:</strong> ${shippingFormState.email} · ${shippingFormState.phone}</div>
          <div><strong>Payment:</strong> ${
            paymentFormState.method === 'card' ? 'Credit card' : 'Cash on delivery'
          }</div>
        </div>
      </div>
    </div>
    <div style="margin-top:0.8rem; display:flex; gap:0.5rem;">
      <button type="button" class="btn-ghost" id="edit-payment-btn">Back</button>
      <button type="button" class="btn-solid" id="place-order-btn">Place order</button>
    </div>
  `;

  document.getElementById('edit-payment-btn').onclick = () => setCheckoutStep('payment');
  document.getElementById('place-order-btn').onclick = placeOrder;
}

function placeOrder() {
  const { lines, subtotal, shipping, total } = computeCartSummary();
  if (!lines.length) {
    showToast('Your cart is empty.', 'error');
    setCheckoutStep('cart');
    return;
  }
  const currentUser = getCurrentUser();
  const emailFromShipping = (shippingFormState && shippingFormState.email) || null;
  const userEmail = currentUser ? currentUser.email : emailFromShipping;
  const order = {
    id: `ORD-${Date.now().toString(36).toUpperCase()}`,
    items: lines.map((l) => ({
      id: l.product.id,
      name: l.product.name,
      price: l.product.price,
      qty: l.qty,
    })),
    subtotal,
    shipping,
    total,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    customer: shippingFormState,
    payment: paymentFormState,
    userEmail,
    userId: currentUser ? currentUser.id : null,
  };

  const orders = getOrders();
  orders.unshift(order);
  setOrders(orders);

  // Clear cart
  setCart([]);
  updateCartCount();
  renderOrderHistory();

  showToast('Order placed! You can track it in Order history.');
  setCheckoutStep('cart');
}

// ---------------------------------------------------------
// Order history rendering
// ---------------------------------------------------------

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

function renderOrderHistory() {
  const orders = getOrders();
  const currentUser = getCurrentUser();
  const scoped = currentUser
    ? orders.filter((o) =>
        o.userEmail === currentUser.email ||
        o.userId === currentUser.id
      )
    : [];

  if (!scoped.length) {
    orderListRoot.innerHTML = '<p class="text-muted">No orders for this account yet. Place an order and it will appear here.</p>';
    return;
  }

  orderListRoot.innerHTML = scoped
    .map((o) => {
      const date = new Date(o.createdAt).toLocaleString();
      const itemsLabel = `${o.items.length} item${o.items.length > 1 ? 's' : ''}`;
      return `
        <article class="order-card">
          <div class="order-header">
            <div>
              <div style="font-size:0.78rem;">${o.id}</div>
              <div class="text-muted" style="font-size:0.72rem;">${date}</div>
            </div>
            <span class="status-pill ${statusClass(o.status)}">${o.status}</span>
          </div>
          <div class="order-body">
            <div class="cart-row"><span>${itemsLabel}</span><span>${formatPrice(o.total)}</span></div>
            <div class="text-muted" style="margin-top:0.2rem; font-size:0.74rem;">Ship to ${
              o.customer.fullName
            }</div>
          </div>
        </article>
      `;
    })
    .join('');
}

// ---------------------------------------------------------
// Product detail modal
// ---------------------------------------------------------

function openProductModal(product) {
  modalRoot.style.display = 'block';
  const mediaHtml = product.imageUrl
    ? `<div class="product-media" style="margin-bottom:0.7rem;"><img src="${product.imageUrl}" alt="${product.name}" /></div>`
    : `<div class="product-media" style="margin-bottom:0.7rem;"><div class="product-img-placeholder">${product.category}</div><div class="product-pill">${product.badge || product.category}</div></div>`;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <h3>${product.name}</h3>
          <button type="button" class="modal-close" id="modal-close">×</button>
        </div>
        ${mediaHtml}
        <p class="text-muted" style="font-size:0.85rem;">${product.description}</p>
        <div style="margin-top:0.6rem; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div class="product-price">${formatPrice(product.price)}</div>
            <div class="text-muted" style="font-size:0.78rem;">Stock: ${product.inventory}</div>
          </div>
          <button type="button" class="btn-solid" id="modal-add">Add to cart</button>
        </div>
      </div>
    </div>
  `;

  const closeModal = () => {
    modalRoot.innerHTML = '';
    modalRoot.style.display = 'none';
  };

  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  document.getElementById('modal-close').onclick = closeModal;
  document.getElementById('modal-add').onclick = () => {
    addToCart(product.id);
    closeModal();
  };
}

// ---------------------------------------------------------
// Auth modal (login/register/logout)
// ---------------------------------------------------------

function renderAuthModal(mode = 'login') {
  const current = getCurrentUser();
  if (current && mode !== 'logout') mode = 'logout';
  authModalRoot.style.display = 'block';
  let inner = '';
  if (mode === 'logout') {
    inner = `
      <div class="modal-header">
        <h3>Account</h3>
        <button type="button" class="modal-close" data-auth-close>×</button>
      </div>
      <p class="text-muted" style="font-size:0.85rem;">Signed in as <strong>${
        current.name || current.email
      }</strong></p>
      <div style="margin-top:0.8rem; display:flex; gap:0.5rem;">
        <button type="button" class="btn-ghost" data-auth-close>Close</button>
        <button type="button" class="btn-solid" id="logout-btn">Logout</button>
      </div>
    `;
  } else if (mode === 'register') {
    inner = `
      <div class="modal-header">
        <h3>Create account</h3>
        <button type="button" class="modal-close" data-auth-close>×</button>
      </div>
      <form id="register-form" class="checkout-body">
        <div class="form-field">
          <label class="form-label">Full name</label>
          <input class="form-input" name="name" required />
        </div>
        <div class="form-field" style="margin-top:0.4rem;">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" name="email" required />
        </div>
        <div class="form-field" style="margin-top:0.4rem;">
          <label class="form-label">Password</label>
          <input class="form-input" type="password" name="password" required />
        </div>
        <div class="form-error" id="register-error"></div>
        <div style="margin-top:0.8rem; display:flex; gap:0.5rem;">
          <button type="button" class="btn-ghost" data-switch-auth="login">Have an account?</button>
          <button type="submit" class="btn-solid">Register</button>
        </div>
      </form>
    `;
  } else {
    inner = `
      <div class="modal-header">
        <h3>Sign in</h3>
        <button type="button" class="modal-close" data-auth-close>×</button>
      </div>
      <form id="login-form" class="checkout-body">
        <div class="form-field">
          <label class="form-label">Email</label>
          <input class="form-input" type="email" name="email" required />
        </div>
        <div class="form-field" style="margin-top:0.4rem;">
          <label class="form-label">Password</label>
          <input class="form-input" type="password" name="password" required />
        </div>
        <div class="form-error" id="login-error"></div>
        <div style="margin-top:0.8rem; display:flex; gap:0.5rem;">
          <button type="button" class="btn-ghost" data-switch-auth="register">Create account</button>
          <button type="submit" class="btn-solid">Sign in</button>
        </div>
      </form>
    `;
  }

  authModalRoot.innerHTML = `
    <div class="modal-backdrop" id="auth-backdrop">
      <div class="modal">
        ${inner}
      </div>
    </div>
  `;

  const close = () => {
    authModalRoot.innerHTML = '';
    authModalRoot.style.display = 'none';
  };

  const backdrop = document.getElementById('auth-backdrop');
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  authModalRoot.querySelectorAll('[data-auth-close]').forEach((btn) => {
    btn.addEventListener('click', close);
  });

  const switchBtns = authModalRoot.querySelectorAll('[data-switch-auth]');
  switchBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      renderAuthModal(btn.getAttribute('data-switch-auth'));
    });
  });

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const errorEl = document.getElementById('login-error');
    loginForm.onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(loginForm);
      const email = String(data.get('email') || '').trim();
      const password = String(data.get('password') || '').trim();
      const users = getUsers();
      const user = users.find((u) => u.email === email && u.password === password);
      if (!user) {
        errorEl.textContent = 'Invalid email or password.';
        return;
      }
      setCurrentUser(user);
      updateAccountLabel();
      showToast('Signed in');
      close();
    };
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    const errorEl = document.getElementById('register-error');
    registerForm.onsubmit = (e) => {
      e.preventDefault();
      const data = new FormData(registerForm);
      const vals = Object.fromEntries(data.entries());
      if (!vals.name.trim() || !vals.email.trim() || !vals.password.trim()) {
        errorEl.textContent = 'Please fill in all fields.';
        return;
      }
      const users = getUsers();
      if (users.find((u) => u.email === vals.email.trim())) {
        errorEl.textContent = 'User with this email already exists.';
        return;
      }
      const newUser = {
        id: Date.now().toString(),
        name: vals.name.trim(),
        email: vals.email.trim(),
        password: vals.password.trim(),
        registeredAt: new Date().toLocaleString(),
      };
      users.push(newUser);
      setUsers(users);
      setCurrentUser(newUser);
      updateAccountLabel();
      showToast('Account created and signed in');
      close();
    };
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      setCurrentUser(null);
      updateAccountLabel();
      showToast('Logged out');
      close();
    };
  }
}

function updateAccountLabel() {
  const user = getCurrentUser();
  if (!accountLabel) return;
  accountLabel.textContent = user ? user.name || user.email : 'Sign in';
}

// ---------------------------------------------------------
// Event wiring
// ---------------------------------------------------------

function wireCatalogEvents() {
  productsGrid.addEventListener('click', (e) => {
    const addBtn = e.target.closest('button[data-add]');
    const viewBtn = e.target.closest('button[data-view]');
    if (addBtn) {
      addToCart(addBtn.getAttribute('data-add'));
    } else if (viewBtn) {
      const id = viewBtn.getAttribute('data-view');
      const product = products.find((p) => p.id === id);
      if (product) openProductModal(product);
    }
  });

  offersGrid.addEventListener('click', (e) => {
    const addBtn = e.target.closest('button[data-add]');
    if (!addBtn) return;
    addToCart(addBtn.getAttribute('data-add'));
  });

  if (searchInput) searchInput.addEventListener('input', () => renderCatalog());
  if (maxPriceInput) maxPriceInput.addEventListener('input', () => renderCatalog());

  if (heroShopBtn) heroShopBtn.addEventListener('click', () => scrollToSection('catalog'));
  if (heroOffersBtn) heroOffersBtn.addEventListener('click', () => scrollToSection('offers'));
  if (viewOrdersBtn) viewOrdersBtn.addEventListener('click', () => scrollToSection('orders'));

  if (cartToggleBtn) {
    cartToggleBtn.addEventListener('click', () => {
      scrollToSection('orders');
      setCheckoutStep('cart');
    });
  }

  checkoutStepsRoot.addEventListener('click', (e) => {
    const pill = e.target.closest('.step-pill');
    if (!pill) return;
    const step = pill.dataset.step;
    if (step === 'cart') setCheckoutStep('cart');
    if (step === 'shipping') setCheckoutStep('shipping');
    if (step === 'payment') setCheckoutStep('payment');
    if (step === 'confirm') setCheckoutStep('confirm');
  });

  if (accountBtn) {
    accountBtn.addEventListener('click', () => {
      const user = getCurrentUser();
      renderAuthModal(user ? 'logout' : 'login');
    });
  }
}

// ---------------------------------------------------------
// Initialisation
// ---------------------------------------------------------

function init() {
  ensureAdminSeedUser();
  renderFeatured();
  renderCategoryChips();
  renderCatalog();
  renderOffers();
  renderOrderHistory();
  updateCartCount();
  setCheckoutStep('cart');
  wireCatalogEvents();

  // Listen for updates from admin dashboard (other tab) via localStorage
  window.addEventListener('storage', (e) => {
    if (e.key === PRODUCT_STORAGE_KEY) {
      products = getStoredProducts();
      renderCategoryChips();
      renderCatalog();
      renderOffers();
      renderFeatured();
    }
    if (e.key === ORDERS_STORAGE_KEY) {
      renderOrderHistory();
    }
    if (e.key === CURRENT_USER_KEY) {
      updateAccountLabel();
    }
  });
  updateAccountLabel();
}

document.addEventListener('DOMContentLoaded', init);

