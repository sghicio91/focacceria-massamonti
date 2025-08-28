/* =========================
   Config
========================= */

// URL della tua Web App Apps Script (endpoint doPost)
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXX/exec';

// Impostazioni economiche
const SHIPPING_FIXED = 5.00;         // spedizione fissa (adatta se necessario)
const MIN_ORDER_NO_SHIP = 20.00;     // ordine minimo ESCLUDENDO la spedizione

/* =========================
   Utilità
========================= */

// Formatta in euro
function euro(n) {
  const v = Number(n || 0);
  return '€ ' + v.toFixed(2).replace('.', ',');
}

// Normalizza il telefono per WhatsApp/Sheet
// - accetta + e cifre
// - rimuove + e 00 iniziali, restituisce solo cifre (con eventuale prefisso paese)
function normalizePhone(input) {
  let d = String(input || '').trim();
  d = d.replace(/[^\d+]/g, '');   // tiene solo cifre e +
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  return d.replace(/\D/g, '');
}

// Serializza gli articoli carrello in una stringa leggibile per il foglio
function itemsToString(items) {
  // "2x Focaccia Classica (7.50) | 1x Focaccia Mortadella (9.00)"
  return items.map(it => `${it.qty}x ${it.name} (${Number(it.price).toFixed(2)})`).join(' | ');
}

/* =========================
   Stato applicazione
========================= */

const state = {
  cart: []  // [{id, name, price, qty}]
};

/* =========================
   Selettori DOM attesi
========================= */
/*
HTML atteso (adatta i tuoi id/class se diverso):
- Bottoni "Aggiungi al carrello": .add-to-cart con data-id, data-name, data-price
- Contenitore lista carrello:    #cartItems
- Totali:                        #subtotalValue, #shippingValue, #totalValue
- Form ordine:                   #orderForm
- Bottone invio:                 #submitOrder
- Campi form:                    name="name" | name="address" | name="phone" | name="payment"
- Messaggi UI (facoltativi):     #cartEmpty, #errorBox, #successBox
*/

// --- Adattamento selettori per il tuo HTML ---
const els = {
  cartItems: document.getElementById('cartList'),     // era #cartItems
  totalDisplay: document.getElementById('grandTotal'),// aggiunto: totale unico in testata form
  orderForm: document.getElementById('orderForm'),
  submitBtn: document.getElementById('submitBtn'),
  formMsg: document.getElementById('formMsg'),
  cartPanel: document.getElementById('cartPanel'),
  cartBtn: document.getElementById('cartBtn'),
  closeCart: document.getElementById('closeCart'),
};


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
  state.cart.splice(idx, 1);
  renderCart();
}

function calcSubtotal() {
  return state.cart.reduce((sum, it) => sum + it.price * it.qty, 0);
}

function calcShipping(subtotal) {
  // Se vuoi logiche per zona, sostituisci qui.
  return state.cart.length > 0 ? SHIPPING_FIXED : 0;
}

function calcTotal() {
  const subtotal = calcSubtotal();
  const shipping = calcShipping(subtotal);
  return { subtotal, shipping, total: subtotal + shipping };
}

/* =========================
   Carrello — render
========================= */

function renderCart() {
  // Nascondi/mostra messaggio carrello vuoto
  if (els.cartEmpty) {
    els.cartEmpty.style.display = state.cart.length ? 'none' : '';
  }

  // Pulisci contenitore
  if (!els.cartItems) return;
  els.cartItems.innerHTML = '';

  if (state.cart.length === 0) {
    if (els.subtotal) els.subtotal.textContent = euro(0);
    if (els.shipping) els.shipping.textContent = euro(0);
    if (els.total) els.total.textContent = euro(0);
    return;
  }

  // Crea righe
  state.cart.forEach(it => {
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <div class="cart-row-main">
        <strong>${it.name}</strong>
        <span>${euro(it.price)} x ${it.qty}</span>
      </div>
      <div class="cart-row-actions">
        <button type="button" class="qty-btn" data-act="dec" data-id="${it.id}">−</button>
        <span class="qty">${it.qty}</span>
        <button type="button" class="qty-btn" data-act="inc" data-id="${it.id}">+</button>
        <button type="button" class="remove-btn" data-id="${it.id}">✕</button>
      </div>
    `;
    els.cartItems.appendChild(row);
  });

  // Totali
  const { subtotal, shipping, total } = calcTotal();
  if (els.subtotal) els.subtotal.textContent = euro(subtotal);
  if (els.shipping) els.shipping.textContent = euro(shipping);
  if (els.total) els.total.textContent = euro(total);

  // Wire azioni righe
  els.cartItems.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.getAttribute('data-id');
      const act = btn.getAttribute('data-act');
      changeQty(id, act === 'inc' ? 1 : -1);
    });
  });
  els.cartItems.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeItem(btn.getAttribute('data-id')));
  });
}

/* =========================
   UI — messaggi
========================= */

function showError(msg) {
  if (els.errorBox) {
    els.errorBox.textContent = msg;
    els.errorBox.style.display = '';
  } else {
    alert(msg);
  }
}

function clearError() {
  if (els.errorBox) els.errorBox.style.display = 'none';
}

function showSuccess(msg) {
  if (els.successBox) {
    els.successBox.textContent = msg;
    els.successBox.style.display = '';
  } else {
    alert(msg);
  }
}

function clearSuccess() {
  if (els.successBox) els.successBox.style.display = 'none';
}

/* =========================
   Invio ordine
========================= */

async function submitOrder(payload) {
  const res = await fetch(GAS_WEB_APP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
      // Se la tua web app Apps Script richiede CORS, abilitalo lato server
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Errore ${res.status}: ${text || 'invio non riuscito'}`);
  }
  return res.json().catch(() => ({}));
}

function buildPayloadFromForm(form) {
  const { subtotal, shipping, total } = calcTotal();

  return {
    // colonne del Google Sheet
    items: itemsToString(state.cart),
    subtotal: Number(subtotal.toFixed(2)),
    shipping: Number(shipping.toFixed(2)),
    total: Number(total.toFixed(2)),
    name: form.name.value.trim(),
    address: form.address.value.trim(),
    phone: normalizePhone(form.phone.value),
    payment: form.payment.value,     // es: 'contanti' | 'bancomat'
    status: 'nuovo',                 // opzionale
    notify_whatsapp: ''              // lascia vuoto: lo popola il foglio/Apps Script
  };
}

/* =========================
   Validazioni
========================= */

function validateBeforeSend(form) {
  clearError();

  if (state.cart.length === 0) {
    showError('Il carrello è vuoto.');
    return false;
  }

  const { subtotal } = calcTotal();
  if (subtotal < MIN_ORDER_NO_SHIP) {
    showError(`Ordine minimo ${euro(MIN_ORDER_NO_SHIP)} (esclusa spedizione).`);
    return false;
  }

  if (!form.name.value.trim()) {
    showError('Inserisci il nome.');
    return false;
  }
  if (!form.address.value.trim()) {
    showError('Inserisci l’indirizzo.');
    return false;
  }
  const phone = normalizePhone(form.phone.value);
  if (!phone || phone.length < 7) {
    showError('Inserisci un numero di telefono valido.');
    return false;
  }
  if (!form.payment.value) {
    showError('Seleziona il metodo di pagamento.');
    return false;
  }

  return true;
}

/* =========================
   Event wiring
========================= */

function wireAddToCartButtons() {
  // Bottoni prodotti: .add-to-cart con data-*
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const price = btn.getAttribute('data-price');
      if (!id || !name || !price) {
        showError('Prodotto non configurato correttamente.');
        return;
      }
      addToCart({ id, name, price });
    });
  });
}

function wireOrderForm() {
  if (!els.orderForm) return;

  els.orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();
    clearSuccess();

    if (!validateBeforeSend(els.orderForm)) return;

    // Disabilita bottone durante l’invio
    if (els.submitBtn) els.submitBtn.disabled = true;

    try {
      const payload = buildPayloadFromForm(els.orderForm);
      const response = await submitOrder(payload);

      // Successo
      showSuccess('Ordine inviato! La conferma WhatsApp verrà generata nel foglio.');
      // reset carrello + form
      state.cart = [];
      renderCart();
      els.orderForm.reset();

    } catch (err) {
      console.error(err);
      showError('Invio non riuscito. Riprova tra poco.');
    } finally {
      if (els.submitBtn) els.submitBtn.disabled = false;
    }
  });
}

/* =========================
   Init
========================= */

function init() {
  clearError();
  clearSuccess();
  wireAddToCartButtons();
  wireOrderForm();
  renderCart(); // inizializza UI
}

document.addEventListener('DOMContentLoaded', init);
