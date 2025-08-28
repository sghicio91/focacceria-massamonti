/* =========================
   Config
========================= */

// URL della tua Web App Apps Script (endpoint doPost)
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/XXXXXXX/exec';

// Impostazioni economiche
const SHIPPING_FIXED = 5.00;       // spedizione fissa
const MIN_ORDER_NO_SHIP = 20.00;   // ordine minimo (esclusa spedizione)

/* =========================
   Dati demo (menù)
   -> se già generi il menu via HTML, puoi rimuovere questo blocco e popolare #productGrid dal server o a mano
========================= */
const MENU = [
  { id: 'focaccia-classica', name: 'Focaccia Clásica', price: 7.50, desc: 'Aceite de oliva, romero y sal.' },
  { id: 'focaccia-mortadella', name: 'Focaccia con Mortadela', price: 9.00, desc: 'Mortadela italiana y pistacho.' },
  { id: 'focaccia-tomate', name: 'Focaccia con Tomate', price: 8.50, desc: 'Tomate fresco y albahaca.' },
];

/* =========================
   Utilità
========================= */

function euro(n) {
  const v = Number(n || 0);
  return '€' + v.toFixed(2).replace('.', ',');
}

// Normalizza telefono per WhatsApp/Sheet:
// - consente + e cifre in input
// - rimuove + e 00 iniziali -> ritorna solo cifre
function normalizePhone(input) {
  let d = String(input || '').trim();
  d = d.replace(/[^\d+]/g, '');   // tiene solo cifre e +
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  return d.replace(/\D/g, '');
}

function itemsToString(items) {
  // Formato leggibile per il foglio: "2x Focaccia (7.50) | 1x ... "
  return items.map(it => `${it.qty}x ${it.name} (${Number(it.price).toFixed(2)})`).join(' | ');
}

/* =========================
   Stato
========================= */

const state = {
  cart: []  // [{id, name, price, qty}]
};

/* =========================
   Selettori DOM (allineati al tuo HTML)
========================= */

const els = {
  productGrid: document.getElementById('productGrid'),
  cartBtn: document.getElementById('cartBtn'),
  cartCount: document.getElementById('cartCount'),
  cartPanel: document.getElementById('cartPanel'),
  closeCart: document.getElementById('closeCart'),
  cartItems: document.getElementById('cartList'),
  orderForm: document.getElementById('orderForm'),
  submitBtn: document.getElementById('submitBtn'),
  formMsg: document.getElementById('formMsg'),
  totalDisplay: document.getElementById('grandTotal'),
  modal: document.getElementById('modal'),
  modalBackdrop: document.getElementById('modalBackdrop'),
  modalClose: document.getElementById('modalClose'),
  modalTitle: document.getElementById('modalTitle'),
  modalBody: document.getElementById('modalBody'),
  modalPrice: document.getElementById('modalPrice'),
  modalAdd: document.getElementById('modalAdd'),
  toast: document.getElementById('toast'),
};

/* =========================
   Menù: render base
========================= */

function renderMenu() {
  if (!els.productGrid) return;
  els.productGrid.innerHTML = '';
  MENU.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card__body">
        <h3 class="card__title">${p.name}</h3>
        <p class="card__desc">${p.desc || ''}</p>
      </div>
      <div class="card__footer">
        <span class="card__price">${euro(p.price)}</span>
        <button class="btn add-to-cart" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}">Añadir</button>
      </div>
    `;
    els.productGrid.appendChild(card);
  });

  // wire bottoni "Añadir"
  els.productGrid.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const price = Number(btn.getAttribute('data-price'));
      addToCart({ id, name, price });
      toast(`Añadido: ${name}`);
    });
  });
}

/* =========================
   Carrello — logica
========================= */

function findItemIndex(id) {
  return state.cart.findIndex(x => x.id === id);
}

function addToCart({ id, name, price }) {
  const idx = findItemIndex(id);
  if (idx >= 0) {
    state.cart[idx].qty += 1;
  } else {
    state.cart.push({ id, name, price: Number(price), qty: 1 });
  }
  renderCart();
}

function changeQty(id, delta) {
  const idx = findItemIndex(id);
  if (idx === -1) return;
  state.cart[idx].qty += delta;
  if (state.cart[idx].qty <= 0) {
    state.cart.splice(idx, 1);
  }
  renderCart();
}

function removeItem(id) {
  const idx = findItemIndex(id);
  if (idx === -1) return;
  const name = state.cart[idx].name;
  state.cart.splice(idx, 1);
  renderCart();
  toast(`Eliminado: ${name}`);
}

function calcSubtotal() {
  return state.cart.reduce((sum, it) => sum + it.price * it.qty, 0);
}

function calcShipping(subtotal) {
  return state.cart.length > 0 ? SHIPPING_FIXED : 0;
}

function calcTotal() {
  const subtotal = calcSubtotal();
  const shipping = calcShipping(subtotal);
  return { subtotal, shipping, total: subtotal + shipping };
}

/* =========================
   Carrello — render UI
========================= */

function renderCart() {
  // badge conteggio
  if (els.cartCount) {
    const count = state.cart.reduce((n, it) => n + it.qty, 0);
    els.cartCount.textContent = String(count);
  }

  if (!els.cartItems) return;
  els.cartItems.innerHTML = '';

  if (state.cart.length === 0) {
    els.cartItems.innerHTML = `<p class="muted">El carrito está vacío</p>`;
  } else {
    state.cart.forEach(it => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML = `
        <div class="cart-row__main">
          <strong>${it.name}</strong>
          <span class="muted">${euro(it.price)} × ${it.qty}</span>
        </div>
        <div class="cart-row__actions">
          <button type="button" class="qty-btn" data-act="dec" data-id="${it.id}">−</button>
          <span class="qty">${it.qty}</span>
          <button type="button" class="qty-btn" data-act="inc" data-id="${it.id}">+</button>
          <button type="button" class="remove-btn" data-id="${it.id}">✕</button>
        </div>
      `;
      els.cartItems.appendChild(row);
    });
  }

  // totale grande nel form
  renderTotalsOnly();

  // wire azioni righe
  els.cartItems.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-act');
      changeQty(id, act === 'inc' ? 1 : -1);
    });
  });
  els.cartItems.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeItem(btn.getAttribute('data-id')));
  });

  updateSubmitState();
}

function renderTotalsOnly() {
  const { total } = calcTotal();
  if (els.totalDisplay) els.totalDisplay.textContent = euro(total);
}

/* =========================
   UI: pannello carrello / modal / toast
========================= */

function openCart() {
  if (!els.cartPanel) return;
  els.cartPanel.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  if (!els.cartPanel) return;
  els.cartPanel.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}
els.cartBtn?.addEventListener('click', openCart);
els.closeCart?.addEventListener('click', closeCart);

// Toast semplice
let toastTimer = null;
function toast(text = '', ms = 1400) {
  if (!els.toast) return;
  els.toast.textContent = text;
  els.toast.classList.add('toast--show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('toast--show'), ms);
}

/* =========================
   Messaggi form centralizzati
========================= */

function setFormMsg(text, type = '') {
  if (!els.formMsg) return;
  els.formMsg.textContent = text || '';
  els.formMsg.className = 'form__msg' + (type ? ` form__msg--${type}` : '');
}

/* =========================
   Abilitazione invio (regole reali)
========================= */

function canSubmit(form) {
  const { subtotal } = calcTotal();
  const hasCart = state.cart && state.cart.length > 0;
  const minOk = subtotal >= MIN_ORDER_NO_SHIP;

  const nameOk = !!form.name.value.trim();
  const addrOk = !!form.address.value.trim();
  const phoneOk = normalizePhone(form.phone.value).length >= 7;
  const payOk = !!form.payment.value;
  const privacyOk = document.getElementById('privacy')?.checked;

  return hasCart && minOk && nameOk && addrOk && phoneOk && payOk && privacyOk;
}

function updateSubmitState() {
  if (!els.orderForm || !els.submitBtn) return;
  els.submitBtn.disabled = !canSubmit(els.orderForm);
}

/* =========================
   Invio ordine → Apps Script
========================= */

function buildPayloadFromForm(form) {
  const { subtotal, shipping, total } = calcTotal();

  return {
    // colonne del Google Sheet:
    // timestamp (lo genera Apps Script o il foglio),
    items: itemsToString(state.cart),
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number(total.toFixed(2)),
    name: form.name.value.trim(),
    address: form.address.value.trim(),
    phone: normalizePhone(form.phone.value),
    payment: form.payment.value,
    status: 'nuevo',
    notify_whatsapp: '' // lasciamo vuoto: lo popola Apps Script o formula del foglio
  };
}

async function submitOrder(payload) {
  const res = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Error ${res.status}: ${text || 'fallo de envío'}`);
  }
  // Se la tua web app risponde con JSON
  return res.json().catch(() => ({}));
}

/* =========================
   Gestione form
========================= */

function wireOrderForm() {
  if (!els.orderForm) return;

  // Abilita/disabilita submit in tempo reale
  ['input', 'change', 'keyup'].forEach(ev => {
    els.orderForm.addEventListener(ev, updateSubmitState, true);
  });

  els.orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setFormMsg('', '');

    if (!canSubmit(els.orderForm)) {
      setFormMsg('Completa los datos y cumple el pedido mínimo (20 € sin envío).', 'err');
      return;
    }

    // blocca doppio invio
    if (els.submitBtn) els.submitBtn.disabled = true;

    try {
      const payload = buildPayloadFromForm(els.orderForm);
      await submitOrder(payload);

      setFormMsg('¡Pedido enviado! La confirmación por WhatsApp se generará en el Sheet.', 'ok');

      // reset carrello + form
      state.cart = [];
      renderCart();
      els.orderForm.reset();
      updateSubmitState();

      // chiudi carrello se aperto
      closeCart();

    } catch (err) {
      console.error(err);
      setFormMsg('No se pudo enviar el pedido. Inténtalo de nuevo en unos segundos.', 'err');
    } finally {
      if (els.submitBtn) els.submitBtn.disabled = !canSubmit(els.orderForm);
    }
  });
}

/* =========================
   Init
========================= */

function init() {
  renderMenu();
  renderCart();
  wireOrderForm();
  updateSubmitState();
}

document.addEventListener('DOMContentLoaded', init);
