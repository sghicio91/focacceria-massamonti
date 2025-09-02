'use strict';

/* =========================
   Config
========================= */
const MIN_ORDER = 20;        // minimo ordine (esclusa spedizione)
const SHIPPING_COST = 5;     // costo spedizione
// URL del Web App di Google Apps Script (deployment con accesso "Anyone")
const WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwyI7nufMTvpLzOmuSztuU9EK0ysY7TLjXMcjwqt2nDtKAMd1xzn6AfGJk2xTLrFE9-/exec';

// Indirizzo negozio usato per gli ordini con "Recogida"
const STORE_ADDRESS = 'Calle Suárez Guerra 47, Santa Cruz de Tenerife';

// Fulfillment helpers
function getFulfillment(){
  const sel = document.querySelector('input[name="fulfillment"]:checked');
  return sel ? sel.value : 'delivery';
}
function currentShipping(){
  return getFulfillment() === 'pickup' ? 0 : SHIPPING_COST;
}
function syncFulfillmentUI(){
  const addressField = document.getElementById('addressField') || document.getElementById('address')?.parentElement;
  if (!addressField) return;
  if (getFulfillment() === 'pickup'){
    addressField.style.display = 'none';
  } else {
    addressField.style.display = '';
  }
  // Aggiorna i totali quando cambia il metodo
  renderCart();
}
// Listeners (se gli elementi esistono)
document.getElementById('fulfillmentDelivery')?.addEventListener('change', syncFulfillmentUI);
document.getElementById('fulfillmentPickup')?.addEventListener('change', syncFulfillmentUI);


/* =========================
   Traduzioni UI (ES/IT/EN)
========================= */
const T = {
  es: {
    restaurantName: "Focacceria Massamonti (Calle Suárez Guerra 47)",
    deliveryText: "Pedido para Deliveroo",
    menu: "Nuestro Menú",
    addToCart: "Añadir al carrito",
    cart: "Carrito",
    total: "Total",
    customerData: "Datos del Cliente",
    name: "Nombre",
    address: "Dirección",
    phone: "Teléfono",
    paymentMethod: "Método de pago",
    selectPayment: "Selecciona método de pago",
    cash: "Efectivo",
    card: "Tarjeta",
    privacyPolicy: "Acepto la política de privacidad",
    sendOrder: "Enviar pedido",
    quantity: "Cantidad",
    empty: "Tu carrito está vacío",
    required: "Campo obligatorio",
    orderOk: "¡Pedido enviado correctamente!",
    shippingAndFees: "Envío y gestión",
    size: "Tamaño",
    medium: "Mediana",
    large: "Grande",
    minOrderBanner: "Pedido mínimo 20 € (sin envío)",
    minOrderMissingA: "Pedido mínimo 20 € (sin envío). Te faltan",
    minOrderMissingB: "€.",
    subtotal: "Subtotal"
  },
  it: {
    restaurantName: "Focacceria Massamonti (Calle Suárez Guerra 47)",
    deliveryText: "Ordine per Deliveroo",
    menu: "Il nostro menù",
    addToCart: "Aggiungi al carrello",
    cart: "Carrello",
    total: "Totale",
    customerData: "Dati cliente",
    name: "Nome",
    address: "Indirizzo",
    phone: "Telefono",
    paymentMethod: "Metodo di pagamento",
    selectPayment: "Seleziona il metodo di pagamento",
    cash: "Contanti",
    card: "Carta",
    privacyPolicy: "Accetto l'informativa sulla privacy",
    sendOrder: "Invia ordine",
    quantity: "Quantità",
    empty: "Il carrello è vuoto",
    required: "Campo obbligatorio",
    orderOk: "Ordine inviato correttamente!",
    shippingAndFees: "Spedizione e costi di gestione",
    size: "Dimensione",
    medium: "Media",
    large: "Grande",
    minOrderBanner: "Ordine minimo 20 € (esclusa spedizione)",
    minOrderMissingA: "Ordine minimo 20 € (senza spedizione). Ti mancano",
    minOrderMissingB: "€.",
    subtotal: "Subtotale"
  },
  en: {
    restaurantName: "Focacceria Massamonti (Calle Suárez Guerra 47)",
    deliveryText: "Order for Deliveroo",
    menu: "Our Menu",
    addToCart: "Add to cart",
    cart: "Cart",
    total: "Total",
    customerData: "Customer Data",
    name: "Name",
    address: "Address",
    phone: "Phone",
    paymentMethod: "Payment method",
    selectPayment: "Select payment method",
    cash: "Cash",
    card: "Card",
    privacyPolicy: "I accept the privacy policy",
    sendOrder: "Send order",
    quantity: "Quantity",
    empty: "Your cart is empty",
    required: "Required field",
    orderOk: "Order sent successfully!",
    shippingAndFees: "Shipping & handling",
    size: "Size",
    medium: "Medium",
    large: "Large",
    minOrderBanner: "Minimum order €20 (excl. shipping)",
    minOrderMissingA: "Minimum order €20 (excl. shipping). You’re missing",
    minOrderMissingB: "€.",
    subtotal: "Subtotal"
  },
};

/* =========================
   MENU multilingua — categorie + prezzi
========================= */
const MENU = [
  {
    category: { es: "LIMITED CON GUANCIALE", it: "LIMITED con Guanciale", en: "LIMITED with Guanciale" },
    items: [
      { id: 1,
        name: { es:"CARBONARA", it:"CARBONARA", en:"CARBONARA" },
        desc: {
          es:"Crema carbonara casera (sin nata), guanciale D.O.P., queso pecorino romano D.O.P.",
          it:"Crema carbonara casalinga (senza panna), guanciale D.O.P., pecorino romano D.O.P.",
          en:"Homemade carbonara cream (no cream), D.O.P. guanciale, D.O.P. pecorino romano."
        },
        prices: { mediana: 7.00, grande: 12.00 }
      },
      { id: 2,
        name: { es:"GUANCIARELLA", it:"GUANCIARELLA", en:"GUANCIARELLA" },
        desc: {
          es:"Tomate cherry, queso provolone, guanciale D.O.P., rúcula",
          it:"Pomodorini, provolone, guanciale D.O.P., rucola",
          en:"Cherry tomatoes, provolone, D.O.P. guanciale, arugula"
        },
        prices: { mediana: 6.50, grande: 11.00 }
      },
      { id: 3,
        name: { es:"FABIO", it:"FABIO", en:"FABIO" },
        desc: {
          es:"Crema de pistacho, tomate seco, albahaca fresca, burrata fresca, guanciale D.O.P.",
          it:"Crema di pistacchio, pomodoro secco, basilico fresco, burrata fresca, guanciale D.O.P.",
          en:"Pistachio cream, sun-dried tomato, fresh basil, fresh burrata, D.O.P. guanciale"
        },
        prices: { mediana: 8.00, grande: 14.00 }
      },
    ],
  },
  {
    category: { es:"VEGETARIANAS", it:"VEGETARIANE", en:"VEGETARIAN" },
    items: [
      { id: 4,
        name:{ es:"GRAZIA", it:"GRAZIA", en:"GRAZIA" },
        desc:{
          es:"Crema de pistacho, mozzarella fresca, tomate seco",
          it:"Crema di pistacchio, mozzarella fresca, pomodoro secco",
          en:"Pistachio cream, fresh mozzarella, sun-dried tomato"
        },
        prices:{ mediana:6.00, grande:10.00 }
      },
      { id: 5,
        name:{ es:"SICILIANA", it:"SICILIANA", en:"SICILIANA" },
        desc:{
          es:"Tomate fresco, berenjenas al horno, mozzarella fresca, albahaca",
          it:"Pomodoro fresco, melanzane al forno, mozzarella fresca, basilico",
          en:"Fresh tomato, baked eggplant, fresh mozzarella, basil"
        },
        prices:{ mediana:6.00, grande:10.00 }
      },
      { id: 6,
        name:{ es:"SPLENDIDA", it:"SPLENDIDA", en:"SPLENDIDA" },
        desc:{
          es:"Mozzarella fresca, crema de alcachofas, tomate seco",
          it:"Mozzarella fresca, crema di carciofi, pomodoro secco",
          en:"Fresh mozzarella, artichoke cream, sun-dried tomato"
        },
        prices:{ mediana:6.00, grande:10.00 }
      },
      { id: 7,
        name:{ es:"CAPRESE", it:"CAPRESE", en:"CAPRESE" },
        desc:{
          es:"Tomate fresco, albahaca, mozzarella fresca",
          it:"Pomodoro fresco, basilico, mozzarella fresca",
          en:"Fresh tomato, basil, fresh mozzarella"
        },
        prices:{ mediana:6.00, grande:10.00 }
      },
    ],
  },
  {
    category: { es:"MÁS POPULARES", it:"PIÙ POPOLARI", en:"MOST POPULAR" },
    items: [
      { id: 8,
        name:{ es:"INFERNO", it:"INFERNO", en:"INFERNO" },
        desc:{
          es:"Porchetta Massamonti, berenjenas al horno, ’Nduja de Spilinga, rúcula",
          it:"Porchetta Massamonti, melanzane al forno, ’Nduja di Spilinga, rucola",
          en:"Massamonti porchetta, baked eggplant, ’Nduja from Spilinga, arugula"
        },
        prices:{ mediana:7.00, grande:12.00 }
      },
      { id: 9,
        name:{ es:"ÚNICA", it:"ÚNICA", en:"ÚNICA" },
        desc:{
          es:"Rúcula, bresaola, crema de parmesano",
          it:"Rucola, bresaola, crema di parmigiano",
          en:"Arugula, bresaola, parmesan cream"
        },
        prices:{ mediana:7.50, grande:13.00 }
      },
      { id: 10,
        name:{ es:"ESTIVA", it:"ESTIVA", en:"ESTIVA" },
        desc:{
          es:"Tomate fresco, albahaca fresca, mozzarella fresca, jamón serrano italiano",
          it:"Pomodoro fresco, basilico fresco, mozzarella fresca, prosciutto crudo italiano",
          en:"Fresh tomato, fresh basil, fresh mozzarella, Italian cured ham"
        },
        prices:{ mediana:6.00, grande:10.00 }
      },
      { id: 11,
        name:{ es:"TARTUFO", it:"TARTUFO", en:"TARTUFO" },
        desc:{
          es:"Mortadella I.G.P. con trufa, mozzarella fresca, crema de setas, rúcula",
          it:"Mortadella I.G.P. al tartufo, mozzarella fresca, crema di funghi, rucola",
          en:"I.G.P. truffle mortadella, fresh mozzarella, mushroom cream, arugula"
        },
        prices:{ mediana:6.50, grande:11.00 }
      },
      { id: 12,
        name:{ es:"SPECK TARTUFATA", it:"SPECK TARTUFATA", en:"SPECK TARTUFATA" },
        desc:{
          es:"Speck, scamorza ahumada, crema de trufa",
          it:"Speck, scamorza affumicata, crema di tartufo",
          en:"Speck, smoked scamorza, truffle cream"
        },
        prices:{ mediana:6.00, grande:10.00 }
      },
      { id: 13,
        name:{ es:"TARTUFINA", it:"TARTUFINA", en:"TARTUFINA" },
        desc:{
          es:"Salami milano, crema de trufa, provolone",
          it:"Salame Milano, crema di tartufo, provolone",
          en:"Milano salami, truffle cream, provolone"
        },
        prices:{ mediana:6.00, grande:10.00 }
      },
      { id: 14,
        name:{ es:"AMY", it:"AMY", en:"AMY" },
        desc:{
          es:"Mortadella I.G.P. con pistacho, crema de pistacho, queso stracciatella, pistacho troceado",
          it:"Mortadella I.G.P. al pistacchio, crema di pistacchio, stracciatella, granella di pistacchio",
          en:"I.G.P. pistachio mortadella, pistachio cream, stracciatella cheese, chopped pistachio"
        },
        prices:{ mediana:7.50, grande:13.00 }
      },
      { id: 15,
        name:{ es:"RÚSTICA", it:"RUSTICA", en:"RUSTICA" },
        desc:{
          es:"Crema de queso pecorino Romano D.O.P., pancetta enrollada, rúcula, tomate seco",
          it:"Crema di pecorino romano D.O.P., pancetta arrotolata, rucola, pomodoro secco",
          en:"D.O.P. pecorino romano cream, rolled pancetta, arugula, sun-dried tomato"
        },
        prices:{ mediana:6.00, grande:10.00 }
      },
    ],
  },
  {
    category: { es:"SPECIAL", it:"SPECIALI", en:"SPECIAL" },
    items: [
      { id: 16,
        name:{ es:"BURRATA", it:"BURRATA", en:"BURRATA" },
        desc:{
          es:"Mortadella I.G.P. con pistacho, burrata fresca, pistacho troceado",
          it:"Mortadella I.G.P. al pistacchio, burrata fresca, granella di pistacchio",
          en:"I.G.P. pistachio mortadella, fresh burrata, chopped pistachio"
        },
        prices:{ mediana:6.50, grande:11.00 }
      },
      { id: 17,
        name:{ es:"BURRATA TOP", it:"BURRATA TOP", en:"BURRATA TOP" },
        desc:{
          es:"Jamón serrano italiano, crema de trufa, burrata fresca",
          it:"Prosciutto crudo italiano, crema di tartufo, burrata fresca",
          en:"Italian cured ham, truffle cream, fresh burrata"
        },
        prices:{ mediana:7.00, grande:12.00 }
      },
      { id: 18,
        name:{ es:"SPECK TORRE", it:"SPECK TORRE", en:"SPECK TORRE" },
        desc:{
          es:"Speck, scamorza ahumada, crema de trufa, burrata fresca",
          it:"Speck, scamorza affumicata, crema di tartufo, burrata fresca",
          en:"Speck, smoked scamorza, truffle cream, fresh burrata"
        },
        prices:{ mediana:7.50, grande:13.00 }
      },
      { id: 19,
        name:{ es:"PISTACCHIELLA", it:"PISTACCHIELLA", en:"PISTACCHIELLA" },
        desc:{
          es:"Mortadella I.G.P. con pistacho, tomate seco, queso gorgonzola, crema de pistacho",
          it:"Mortadella I.G.P. al pistacchio, pomodoro secco, gorgonzola, crema di pistacchio",
          en:"I.G.P. pistachio mortadella, sun-dried tomato, gorgonzola, pistachio cream"
        },
        prices:{ mediana:6.50, grande:11.00 }
      },
      { id: 20,
        name:{ es:"SUPREMA", it:"SUPREMA", en:"SUPREMA" },
        desc:{
          es:"Salami finocchiona, crema de alcachofas, berenjenas al horno, scamorza ahumada",
          it:"Finocchiona, crema di carciofi, melanzane al forno, scamorza affumicata",
          en:"Finocchiona salami, artichoke cream, baked eggplant, smoked scamorza"
        },
        prices:{ mediana:7.00, grande:12.00 }
      },
      { id: 21,
        name:{ es:"BEA", it:"BEA", en:"BEA" },
        desc:{
          es:"Bresaola, mozzarella fresca, crema de setas, rúcula",
          it:"Bresaola, mozzarella fresca, crema di funghi, rucola",
          en:"Bresaola, fresh mozzarella, mushroom cream, arugula"
        },
        prices:{ mediana:7.50, grande:13.00 }
      },
      { id: 22,
        name:{ es:"TRICOLORE", it:"TRICOLORE", en:"TRICOLORE" },
        desc:{
          es:"Salami spianata picante, queso stracciatella, rúcula",
          it:"Spianata piccante, stracciatella, rucola",
          en:"Spicy spianata salami, stracciatella cheese, arugula"
        },
        prices:{ mediana:7.00, grande:12.00 }
      },
      { id: 23,
        name:{ es:"PRIMAVERA", it:"PRIMAVERA", en:"PRIMAVERA" },
        desc:{
          es:"Jamón serrano italiano, pesto de albahaca, mozzarella fresca, tomate seco",
          it:"Prosciutto crudo italiano, pesto al basilico, mozzarella fresca, pomodoro secco",
          en:"Italian cured ham, basil pesto, fresh mozzarella, sun-dried tomato"
        },
        prices:{ mediana:6.50, grande:11.00 }
      },
    ],
  },
  {
    category: { es:"Cervezas", it:"Birre", en:"Beers" },
    items: [
      { id: 101, name: { es:"Cerveza Moretti 33cl", it:"Birra Moretti 33cl", en:"Moretti 33cl" }, price: 2.50 },
      { id: 102, name: { es:"Cerveza Peroni 33cl",  it:"Birra Peroni 33cl",  en:"Peroni 33cl" },  price: 2.50 },
      { id: 104, name: { es:"Cerveza Messina 33cl", it:"Birra Messina 33cl", en:"Messina 33cl" }, price: 3.50 },
      { id: 105, name: { es:"Cerveza Ichnusa 33cl", it:"Birra Ichnusa 33cl", en:"Ichnusa 33cl" }, price: 3.50 },
    ],
  },
  {
    category: { es:"Refrescos en lata", it:"Bibite in lattina", en:"Canned soft drinks" },
    items: [
      { id: 201, name: { es:"Coca Cola",            it:"Coca-Cola",             en:"Coca-Cola" },            price: 2.50 },
      { id: 202, name: { es:"Coca Cola Zero",       it:"Coca-Cola Zero",        en:"Coca-Cola Zero" },       price: 2.50 },
      { id: 203, name: { es:"Coca Cola Zero Zero",  it:"Coca-Cola Zero Zero",   en:"Coca-Cola Zero Zero" },  price: 2.50 },
      { id: 204, name: { es:"Fanta",                it:"Fanta",                 en:"Fanta" },                price: 2.50 },
      { id: 205, name: { es:"Fuzetea Mango Piña",   it:"Fuzetea Mango Ananas",  en:"Fuzetea Mango Pineapple" }, price: 2.50 },
      { id: 206, name: { es:"Nestea Maracuyá",      it:"Nestea Maracuja",       en:"Nestea Passion Fruit" }, price: 2.50 },
      { id: 207, name: { es:"Appletizer",           it:"Appletiser",            en:"Appletiser" },           price: 2.50 },
      { id: 208, name: { es:"Chinotto",             it:"Chinotto",              en:"Chinotto" },             price: 2.50 },
      { id: 209, name: { es:"Estathé Limón",        it:"Estathé Limone",        en:"Estathé Lemon" },        price: 2.50 },
      { id: 210, name: { es:"Estathé Melocotón",    it:"Estathé Pesca",         en:"Estathé Peach" },        price: 2.50 },
    ],
  },
  {
    category: { es:"Otras bebidas", it:"Altre bevande", en:"Other drinks" },
    items: [
      { id: 103, name: { es:"Agua pequeña", it:"Acqua piccola", en:"Small water" }, price: 1.00 },
    ],
  },
];

/* =========================
   Helpers
========================= */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const fmt = (n) => `€${Number(n).toFixed(2).replace('.', ',')}`;

// Localizzatore: accetta stringhe o oggetti {es,it,en}
const L = (val) => {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    return val[lang] || val.es || Object.values(val)[0] || '';
  }
  return '';
};

// Lingua: ?lang > localStorage > navigator > 'es'
const params = new URLSearchParams(location.search);
let lang =
  params.get('lang') ||
  localStorage.getItem('preferred-lang') ||
  (navigator.language || 'es').slice(0,2).toLowerCase();
if (!T[lang]) lang = 'es';
document.documentElement.lang = lang;

const state = {
  cart: [],            // {id, name, size?, price, qty}
  selected: null,      // prodotto in modale
  selectedSize: null,  // "mediana" | "grande" | null
};

/* =========================
   Elementi DOM
========================= */
const productGrid = $('#productGrid');
const cartBtn     = $('#cartBtn');
const cartPanel   = $('#cartPanel');
const closeCartBtn= $('#closeCart');
const cartList    = $('#cartList');
const cartCount   = $('#cartCount');
const grandTotal  = $('#grandTotal');
const orderSummary = $('#orderSummary'); // riepilogo prodotti in fondo
const orderForm   = $('#orderForm');
const formMsg     = $('#formMsg');
const submitBtn   = $('#submitBtn'); // bottone invio ordine

// Modal
const modal         = $('#modal');
const modalTitle    = $('#modalTitle');
const modalBody     = $('#modalBody');
const modalPrice    = $('#modalPrice');
const modalAdd      = $('#modalAdd');
const modalClose    = $('#modalClose');
const modalBackdrop = $('#modalBackdrop');

// Toast
const toast = $('#toast');
function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 2200);
}

/* =========================
   i18n (solo UI)
========================= */
function t(key){ return T[lang][key]; }
function updateStaticTexts(){
  $$('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });
  const opt = $('#payment')?.querySelector('option[value=""]');
  if (opt) opt.textContent = t('selectPayment');
  document.documentElement.lang = lang;
  localStorage.setItem('preferred-lang', lang);

  ensureMinBanner(); // crea/aggiorna il banner sotto al titolo
}

/* Prezzi / taglie */
const hasSizes = (item) => !!item.prices;
const priceFor = (item, size) => hasSizes(item) ? item.prices[size] : item.price;
const sizeLabel = (s) => s==='mediana' ? t('medium') : (s==='grande' ? t('large') : '');

/* =========================
   Banner "ordine minimo"
========================= */
function ensureMinBanner(){
  const existing = $('#minOrderBanner');
  if (existing) {
    existing.textContent = t('minOrderBanner');
    return;
  }
  const anchor = $('[data-i18n="restaurantName"]') || $('[data-i18n="deliveryText"]') || document.body.firstElementChild;
  if (!anchor) return;
  const banner = document.createElement('div');
  banner.id = 'minOrderBanner';
  banner.setAttribute('role','status');
  banner.style.margin = '.35rem 0 1rem';
  banner.style.padding = '.5rem .75rem';
  banner.style.border = '1px solid #ffd8a8';
  banner.style.background = '#fff4e5';
  banner.style.borderRadius = '12px';
  banner.style.fontWeight = '500';
  banner.textContent = t('minOrderBanner');
  anchor.insertAdjacentElement('afterend', banner);
}

/* =========================
   Render prodotti (raggruppati per categoria)
========================= */
function renderProducts(){
  productGrid.innerHTML = '';

  function buildRow(p){
    const card = document.createElement('div');
    card.className = 'card';

    const left = document.createElement('button');
    left.className = 'card__header';
    left.type = 'button';
    left.setAttribute('aria-label', `${L(p.name)} - ${L(p.desc) || ''}`);
    left.addEventListener('click', ()=> openDetail(p));

    const meta = document.createElement('div');
    meta.className = 'card__meta';

    const title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = L(p.name);

    const price = document.createElement('div');
    price.className = 'card__price';
    if (p.prices) {
      // slash corretta fra mediana e grande
      price.textContent = `€${p.prices.mediana.toFixed(2)} / €${p.prices.grande.toFixed(2)}`;
    } else {
      price.textContent = `€${p.price.toFixed(2)}`;
    }

    const desc = document.createElement('p');
    desc.className = 'card__desc';
    desc.textContent = L(p.desc) || '';

    meta.append(title, price, desc);
    left.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'card__actions';

    const existing = p.prices
      ? state.cart.find(x => x.id === p.id)
      : state.cart.find(x => x.id === p.id);

    if (existing){
      const wrap = document.createElement('div');
      wrap.className = 'qty-inline';

      const minus = document.createElement('button');
      minus.className = 'btn btn--ghost';
      minus.textContent = '−';
      minus.addEventListener('click', ()=>{
        if (p.prices){
          updateVariantQty(existing, existing.qty - 1);
        } else {
          updateQtyVariant(p, -1);
        }
      });

      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = String(existing.qty);

      const plus = document.createElement('button');
      plus.className = 'btn btn--ghost';
      plus.textContent = '+';
      plus.addEventListener('click', ()=>{
        if (p.prices){
          updateVariantQty(existing, existing.qty + 1);
        } else {
          updateQtyVariant(p, +1);
        }
      });

      wrap.append(minus, count, plus);
      actions.appendChild(wrap);
    } else {
      const add = document.createElement('button');
      add.className = 'btn btn--circle btn';
      add.textContent = '+';
      add.addEventListener('click', ()=>{
        if (p.prices){
          openDetail(p);
        } else {
          addToCart(p);
        }
      });
      actions.appendChild(add);
    }

    card.append(left, actions);
    return card;
  }

  for (const cat of MENU){
    const section = document.createElement('section');
    section.className = 'category-section';

    const h = document.createElement('h2');
    h.className = 'section__title section__title--center';
    h.textContent = L(cat.category);
    section.appendChild(h);

    for (const p of cat.items){
      section.appendChild(buildRow(p));
    }

    productGrid.appendChild(section);
  }
}

/* aggiorna qty per la "variante" attiva o item semplice */
function updateQtyVariant(p, delta){
  if (hasSizes(p)){
    let entry = state.cart.find(x => x.id === p.id);
    if (!entry){ openDetail(p); return; }
    const newQty = entry.qty + delta;
    if (newQty <= 0) {
      state.cart = state.cart.filter(x => !(x.id===p.id && x.size===entry.size));
    } else {
      entry.qty = newQty;
    }
  } else {
    let entry = state.cart.find(x => x.id === p.id);
    if (!entry){ state.cart.push({ id:p.id, name:L(p.name), price:p.price, qty:1 }); }
    else {
      const q = entry.qty + delta;
      if (q <= 0) state.cart = state.cart.filter(x => x.id !== p.id);
      else entry.qty = q;
    }
  }
  renderCart();
  renderProducts();
}

/* =========================
   Carrello + Totale + Minimo Ordine
========================= */
function getSubtotal(){ return state.cart.reduce((s,i)=> s + i.price * i.qty, 0); }

function renderCart(){
  cartList.innerHTML = '';
  if (state.cart.length === 0){
    const empty = document.createElement('p');
    empty.textContent = t('empty');
    empty.style.color = 'var(--muted)';
    cartList.appendChild(empty);
  } else {
    for (const item of state.cart){
      const row = document.createElement('div');
      row.className = 'cart__item';

      const meta = document.createElement('div');
      meta.className = 'item__meta';

      const name = document.createElement('div');
      name.className = 'item__name';
      name.textContent = item.size ? `${item.name} (${sizeLabel(item.size)})` : item.name;

      const lineSubtotal = item.price * item.qty;

      const price = document.createElement('div');
      price.className = 'item__price';
      price.textContent = `${fmt(item.price)} × ${item.qty} = ${fmt(lineSubtotal)}`;

      meta.append(name, price);

      const qty = document.createElement('div');
      qty.className = 'qty';

      const minus = document.createElement('button');
      minus.className = 'btn btn--ghost';
      minus.textContent = '−';
      minus.addEventListener('click', ()=> updateVariantQty(item, item.qty - 1));

      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = String(item.qty);

      const plus = document.createElement('button');
      plus.className = 'btn btn--ghost';
      plus.textContent = '+';
      plus.addEventListener('click', ()=> updateVariantQty(item, item.qty + 1));

      const del = document.createElement('button');
      del.className = 'btn btn--ghost';
      del.textContent = '🗑';
      del.addEventListener('click', ()=> removeVariant(item));

      qty.append(minus, count, plus, del);
      row.append(meta, qty);
      cartList.appendChild(row);
    }
  }

  const totalItems = state.cart.reduce((a,b)=>a+b.qty, 0);
  cartCount.textContent = String(totalItems);

  const subtotal = getSubtotal();
const shipping = currentShipping();
const total = subtotal + shipping;

grandTotal.innerHTML = `
  <div class="form__line"><strong>${t('subtotal')}:</strong> ${fmt(subtotal)}</div>
  <div class="form__line">${t('shippingAndFees')}: <strong>${fmt(shipping)}</strong></div>
  <div class="form__line">${t('total')}: <strong>${fmt(total)}</strong></div>
  <p id="minOrderNotice" class="alert" style="display:none;margin-top:.5rem;"></p>
`;


  enforceMinOrder(subtotal);

  // Riepilogo in fondo al form (prima di Subtotal)
  const summary = orderSummary;
  if (summary){
    if (state.cart.length === 0){
      summary.innerHTML = '';
    } else {
      const frag = document.createDocumentFragment();
      state.cart.forEach(item => {
        const row = document.createElement('div');
        row.className = 'order-summary__row';
        const name = document.createElement('div');
        name.className = 'order-summary__name';
        name.textContent = item.size ? `${item.name} (${sizeLabel(item.size)}) × ${item.qty}` : `${item.name} × ${item.qty}`;
        const price = document.createElement('div');
        price.className = 'order-summary__price';
        price.textContent = fmt(item.price * item.qty);
        row.append(name, price);
        frag.appendChild(row);
      });
      summary.innerHTML = '';
      summary.appendChild(frag);
    }
  }
}

function enforceMinOrder(subtotal){
  const btn  = submitBtn;
  const note = $('#minOrderNotice');
  if (!btn || !note) return;

  // ➜ Nessun minimo se è ritiro in negozio
  if (getFulfillment() === 'pickup') {
    btn.disabled = false;
    btn.classList.remove('btn-disabled');
    note.style.display = 'none';
    note.textContent = '';
    return;
  }

  const remaining = Math.max(0, MIN_ORDER - subtotal);
  if (remaining > 0){
    btn.disabled = true;
    btn.classList.add('btn-disabled');
    note.style.display = '';
    note.textContent = `${t('minOrderMissingA')} ${remaining.toFixed(2).replace('.', ',')} ${t('minOrderMissingB')}`;
    note.style.background = '#fff4e5';
    note.style.border = '1px solid #ffd8a8';
    note.style.borderRadius = '12px';
    note.style.padding = '.5rem .75rem';
  } else {
    btn.disabled = false;
    btn.classList.remove('btn-disabled');
    note.style.display = 'none';
    note.textContent = '';
  }
}


function updateVariantQty(item, newQty){
  if (newQty <= 0){ removeVariant(item); return; }
  const e = state.cart.find(x => x.id===item.id && x.size===item.size && x.price===item.price);
  if (e) e.qty = newQty;
  renderCart();
  renderProducts();
}
function removeVariant(item){
  state.cart = state.cart.filter(x => !(x.id===item.id && x.size===item.size && x.price===item.price));
  renderCart();
  renderProducts();
}

/* =========================
   Add to cart (varianti)
========================= */
function addToCart(p, size=null){
  if (hasSizes(p)){
    const chosen = size || state.selectedSize || 'mediana';
    const unit = priceFor(p, chosen);
    const i = state.cart.findIndex(x => x.id===p.id && x.size===chosen);
    if (i>=0) state.cart[i].qty += 1;
    else state.cart.push({ id:p.id, name:L(p.name), size:chosen, price:unit, qty:1 });
  } else {
    const i = state.cart.findIndex(x => x.id===p.id);
    if (i>=0) state.cart[i].qty += 1;
    else state.cart.push({ id:p.id, name:L(p.name), price:p.price, qty:1 });
  }
  renderCart();
  renderProducts();
  showToast(`${L(p.name)} — ${t('addToCart')}`);
}

/* =========================
   Modale (scelta taglia)
========================= */
function openDetail(p){
  state.selected = p;
  modalTitle.textContent = L(p.name);
  modalBody.textContent  = L(p.desc) || '';

  if (hasSizes(p)){
    const radios = document.createElement('div');
    radios.style.display='flex';
    radios.style.gap='12px';
    radios.style.marginTop='8px';
    radios.innerHTML = `
      <label><input type="radio" name="size" value="mediana" checked> ${t('medium')} (€${p.prices.mediana.toFixed(2)})</label>
      <label><input type="radio" name="size" value="grande"> ${t('large')} (€${p.prices.grande.toFixed(2)})</label>
    `;
    modalBody.innerHTML = `${L(p.desc) || ''}`;
    modalBody.appendChild(radios);

    state.selectedSize = 'mediana';
    radios.querySelectorAll('input[name="size"]').forEach(r=>{
      r.addEventListener('change', e=>{
        state.selectedSize = e.target.value;
        modalPrice.textContent = `€${priceFor(p, state.selectedSize).toFixed(2)}`;
      });
    });
    modalPrice.textContent = `€${p.prices.mediana.toFixed(2)}`;
  } else {
    state.selectedSize = null;
    modalPrice.textContent = `€${p.price.toFixed(2)}`;
  }

  modal.removeAttribute('inert');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';

  // Porta il focus dentro la modale (accessibilità)
  const focusable = modal.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable) focusable.focus({ preventScroll: true });
}
function closeDetail(){
  const hadFocusInside = modal.contains(document.activeElement);
  if (hadFocusInside) {
    document.activeElement.blur();
  }
  // Previeni focus interno
  modal.setAttribute('inert','');
  document.body.style.overflow='';
  state.selected=null;
  state.selectedSize=null;
  // Nascondi dopo che il blur è avvenuto
  setTimeout(()=>{
    modal.setAttribute('aria-hidden','true');
    if (hadFocusInside && cartBtn && typeof cartBtn.focus === 'function') {
      try { cartBtn.focus({ preventScroll: true }); } catch(e) {}
    }
  },0);
}
modalAdd.addEventListener('click', ()=>{
  if (state.selected) addToCart(state.selected, state.selectedSize);
  closeDetail();
});
modalClose.addEventListener('click', closeDetail);
modalBackdrop.addEventListener('click', closeDetail);
document.addEventListener('keydown', e=>{ if (e.key==='Escape') closeDetail(); });

/* =========================
   Pannello carrello (overlay) — robusto
========================= */
document.addEventListener('DOMContentLoaded', () => {
  if (!cartBtn || !cartPanel) return;

  // Backdrop scuro cliccabile (creato 1 volta)
  let backdrop = document.getElementById('cartBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'cartBackdrop';
    Object.assign(backdrop.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0,0,0,.45)',
      zIndex: '8',   // sotto al pannello .cart (z-index:9)
      display: 'none'
    });
    document.body.appendChild(backdrop);
  }

  const isOpen = () => cartPanel.getAttribute('aria-hidden') === 'false';

  function openCart() {
    cartPanel.setAttribute('aria-hidden', 'false');
    cartBtn.setAttribute('aria-expanded', 'true');
    cartPanel.style.display = 'flex';    // fallback
    backdrop.style.display = 'block';
    document.body.style.overflow = 'hidden';

    const focusable = cartPanel.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  function closeCart() {
    cartPanel.setAttribute('aria-hidden', 'true');
    cartBtn.setAttribute('aria-expanded', 'false');
    cartPanel.style.display = 'none';
    backdrop.style.display = 'none';
    document.body.style.overflow = '';
    cartBtn.focus({ preventScroll: true });
  }

  cartBtn.addEventListener('click', () => { isOpen() ? closeCart() : openCart(); });
  if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop && isOpen()) closeCart(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen()) closeCart(); });

  // Stato iniziale
  cartPanel.setAttribute('aria-hidden', 'true');
  cartPanel.style.display = 'none';
  cartBtn.setAttribute('aria-expanded', 'false');
});

/* =========================
   INVIO ORDINE — HOTFIX CORS
========================= */

// invia la POST in modalità no-cors e non legge la risposta
async function submitOrder(payload){
  // Evita header personalizzati per non innescare preflight
  await fetch(WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify(payload)
  });
  // In no-cors la risposta è "opaque": se non lancia, consideriamo ok
  return { ok: true };
}

/* =========================
   Submit ordine (con guard minimo)
========================= */
orderForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  formMsg.textContent = '';

  if (state.cart.length === 0){
    formMsg.textContent = t('empty');
    return;
  }

  const fulfillment = getFulfillment(); // 'delivery' | 'pickup'
const name = $('#name').value.trim();
let address = $('#address').value.trim();
const phone = $('#phone').value.trim();
const payment = $('#payment').value;
const privacy = $('#privacy').checked;

// Se è ritiro in negozio, usiamo l'indirizzo del locale
if (fulfillment === 'pickup') {
  address = `Recogida en tienda - ${STORE_ADDRESS}`;
}

if (!name || (fulfillment === 'delivery' && !address) || !phone || !payment || !privacy){
  formMsg.textContent = t('required');
  return;
}


  const subtotal = getSubtotal();
  if (subtotal < MIN_ORDER){
    enforceMinOrder(subtotal);
    return;
  }

  const payload = {
    items: state.cart.map(i => ({
      id: i.id,
      name: i.name,
      size: i.size || null,
      price: i.price,
      qty: i.qty
    })),
    subtotal,
shipping_fee: currentShipping(),
total: subtotal + currentShipping(),
     fulfillment, // 'delivery' | 'pickup'
    customer: { name, address, phone, payment, privacy }
  };

  // disabilita per evitare doppi invii
  submitBtn.disabled = true;
  submitBtn.classList.add('btn-disabled');

  try{
    await submitOrder(payload); // no-cors: niente lettura della risposta
    showToast(t('orderOk'));
    // reset
    state.cart = [];
    orderForm.reset();
    renderCart();
    renderProducts();
  }catch(err){
    console.error('[Order submit]', err);
    formMsg.textContent = 'Errore invio ordine. Riprova.';
  }finally{
    submitBtn.disabled = false;
    submitBtn.classList.remove('btn-disabled');
  }
});

/* =========================
   Init
========================= */
updateStaticTexts();
renderProducts();
syncFulfillmentUI();
renderCart();
