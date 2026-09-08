/*
 * RiO de NARA — Order page logic
 * =================================
 * - Loads the menu from Firestore (collection "menu") if Firebase is
 *   configured; otherwise (or if that collection is empty) falls back
 *   to a small starter menu defined below, so the page always works.
 * - Builds a cart client-side, then on submit:
 *     1. Saves the order to Firestore (collection "orders") if configured,
 *        so it shows up on /admin.
 *     2. Opens a pre-filled WhatsApp message to the restaurant's number,
 *        if configured.
 * See SETUP.md to connect a real Firebase project and WhatsApp number.
 */

const FALLBACK_MENU = [
  { id:'espresso', category_en:'Coffee', category_id:'Kopi', name_en:'Espresso', name_id:'Espresso', price:18000, order:1 },
  { id:'americano', category_en:'Coffee', category_id:'Kopi', name_en:'Americano', name_id:'Americano', price:20000, order:2 },
  { id:'cappuccino', category_en:'Coffee', category_id:'Kopi', name_en:'Cappuccino', name_id:'Cappuccino', price:28000, order:3 },
  { id:'pourover', category_en:'Coffee', category_id:'Kopi', name_en:'Papuan Pour Over', name_id:'Kopi Papua Seduh Manual', price:32000, order:4 },
  { id:'icedcoffee', category_en:'Coffee', category_id:'Kopi', name_en:'Iced Coffee Milk', name_id:'Kopi Susu Es', price:25000, order:5 },
  { id:'tea', category_en:'Tea & Mocktails', category_id:'Teh & Mocktail', name_en:'Tea', name_id:'Teh', price:15000, order:6 },
  { id:'mocktail', category_en:'Tea & Mocktails', category_id:'Teh & Mocktail', name_en:'Lemon Mocktail', name_id:'Mocktail Lemon', price:25000, order:7 },
  { id:'orangejuice', category_en:'Juice', category_id:'Jus', name_en:'Fresh Orange Juice', name_id:'Jus Jeruk Segar', price:22000, order:8 },
  { id:'avocadojuice', category_en:'Juice', category_id:'Jus', name_en:'Avocado Juice', name_id:'Jus Alpukat', price:25000, order:9 },
  { id:'friedrice', category_en:'Food', category_id:'Makanan', name_en:'Fried Rice', name_id:'Nasi Goreng', price:35000, order:10 },
  { id:'grilledchicken', category_en:'Food', category_id:'Makanan', name_en:'Grilled Chicken', name_id:'Ayam Bakar', price:45000, order:11 },
  { id:'friednoodle', category_en:'Food', category_id:'Makanan', name_en:'Fried Noodles', name_id:'Mie Goreng', price:30000, order:12 }
];

const FB_CFG = window.RDN_FIREBASE_CONFIG || {};
const WA_NUMBER = window.RDN_WHATSAPP_NUMBER || '';
const firebaseConfigured = !!(FB_CFG.apiKey && String(FB_CFG.apiKey).indexOf('REPLACE_') !== 0);
const whatsappConfigured = !!(WA_NUMBER && String(WA_NUMBER).indexOf('REPLACE_') !== 0);

const t = function(key){ return window.RDN_t ? window.RDN_t(key) : key; };
const formatIDR = window.RDN_formatIDR || function(n){ return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); };
const normalizePhone = window.RDN_normalizePhone || function(p){ return String(p || '').replace(/[^0-9]/g, ''); };

const menuStatus = document.getElementById('menuStatus');
const menuContainer = document.getElementById('menuContainer');
const sampleNotice = document.getElementById('sampleNotice');
const unconfiguredNotice = document.getElementById('unconfiguredNotice');
const cartLines = document.getElementById('cartLines');
const cartTotalRow = document.getElementById('cartTotalRow');
const cartTotal = document.getElementById('cartTotal');
const form = document.getElementById('orderForm');
const submitBtn = document.getElementById('submitBtn');
const formMsg = document.getElementById('formMsg');

const cartPanel = document.getElementById('cartPanel');
const cartBackdrop = document.getElementById('cartBackdrop');
const sheetClose = document.getElementById('sheetClose');
const mobileCartBar = document.getElementById('mobileCartBar');
const mcbTotal = document.getElementById('mcbTotal');
const mcbCount = document.getElementById('mcbCount');
const mcbReview = document.getElementById('mcbReview');

let db = null;
let currentItems = [];
const cart = new Map();

function openCartSheet(){
  if(!cartPanel) return;
  cartPanel.classList.add('open');
  cartBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCartSheet(){
  if(!cartPanel) return;
  cartPanel.classList.remove('open');
  cartBackdrop.classList.remove('open');
  document.body.style.overflow = '';
}
if(mcbReview){ mcbReview.addEventListener('click', openCartSheet); }
if(sheetClose){ sheetClose.addEventListener('click', closeCartSheet); }
if(cartBackdrop){ cartBackdrop.addEventListener('click', closeCartSheet); }

function showMsg(text, kind){
  formMsg.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'form-msg ' + kind;
  div.textContent = text;
  formMsg.appendChild(div);
}
function clearMsg(){ formMsg.innerHTML = ''; }

function renderItemRow(item, lang){
  const row = document.createElement('div');
  row.className = 'menu-item';

  const info = document.createElement('div');
  info.className = 'menu-item-info';
  const h3 = document.createElement('h3');
  h3.textContent = lang === 'id' ? (item.name_id || item.name_en) : item.name_en;
  const price = document.createElement('div');
  price.className = 'menu-item-price';
  price.textContent = formatIDR(item.price);
  info.appendChild(h3);
  info.appendChild(price);
  row.appendChild(info);

  const addWrap = document.createElement('div');
  addWrap.className = 'menu-item-add';
  const stepper = document.createElement('div');
  stepper.className = 'qty-stepper';
  const minus = document.createElement('button');
  minus.type = 'button'; minus.textContent = '–'; minus.setAttribute('aria-label','Decrease quantity');
  const qtySpan = document.createElement('span');
  const plus = document.createElement('button');
  plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label','Increase quantity');

  const qty = cart.has(item.id) ? cart.get(item.id).qty : 0;
  qtySpan.textContent = qty;
  minus.disabled = qty === 0;

  minus.addEventListener('click', function(){ changeQty(item, -1); });
  plus.addEventListener('click', function(){ changeQty(item, 1); });

  stepper.appendChild(minus);
  stepper.appendChild(qtySpan);
  stepper.appendChild(plus);
  addWrap.appendChild(stepper);
  row.appendChild(addWrap);
  return row;
}

function changeQty(item, delta){
  const entry = cart.get(item.id) || { id:item.id, name_en:item.name_en, name_id:item.name_id, price:item.price, qty:0 };
  entry.qty = Math.max(0, entry.qty + delta);
  if(entry.qty === 0){ cart.delete(item.id); } else { cart.set(item.id, entry); }
  renderMenu();
  renderCart();
}

function renderMenu(){
  const lang = window.RDN_getLang ? window.RDN_getLang() : 'en';
  const groups = [];
  const seen = {};
  currentItems.forEach(function(item){
    const catKey = item.category_en || 'Menu';
    if(!seen[catKey]){
      seen[catKey] = { label: lang === 'id' ? (item.category_id || item.category_en) : item.category_en, items: [] };
      groups.push(seen[catKey]);
    }
    seen[catKey].items.push(item);
  });
  menuContainer.innerHTML = '';
  groups.forEach(function(g){
    const section = document.createElement('div');
    section.className = 'menu-category';
    const h2 = document.createElement('h2');
    h2.className = 'category-rail';
    h2.textContent = g.label;
    section.appendChild(h2);
    g.items.forEach(function(item){ section.appendChild(renderItemRow(item, lang)); });
    menuContainer.appendChild(section);
  });
}

function renderCart(){
  const lang = window.RDN_getLang ? window.RDN_getLang() : 'en';
  cartLines.innerHTML = '';
  if(cart.size === 0){
    const p = document.createElement('p');
    p.className = 'cart-empty';
    p.textContent = t('order.cart.empty');
    cartLines.appendChild(p);
    cartTotalRow.hidden = true;
    syncMobileCartBar(0, 0);
    return;
  }
  let total = 0;
  let count = 0;
  cart.forEach(function(entry){
    total += entry.price * entry.qty;
    count += entry.qty;
    const line = document.createElement('div');
    line.className = 'cart-line';
    const name = document.createElement('span');
    name.className = 'cl-name';
    name.textContent = entry.qty + 'x ' + (lang === 'id' ? (entry.name_id || entry.name_en) : entry.name_en);
    const sub = document.createElement('span');
    sub.textContent = formatIDR(entry.price * entry.qty);
    const rm = document.createElement('button');
    rm.type = 'button'; rm.className = 'cl-remove'; rm.innerHTML = '&times;';
    rm.setAttribute('aria-label', 'Remove');
    rm.addEventListener('click', function(){ cart.delete(entry.id); renderMenu(); renderCart(); });
    line.appendChild(name); line.appendChild(sub); line.appendChild(rm);
    cartLines.appendChild(line);
  });
  cartTotalRow.hidden = false;
  cartTotal.textContent = formatIDR(total);
  syncMobileCartBar(count, total);
}

function syncMobileCartBar(count, total){
  if(!mobileCartBar) return;
  mcbTotal.textContent = formatIDR(total);
  if(count > 0){
    mcbCount.removeAttribute('data-i18n');
    mcbCount.textContent = count + (count === 1 ? ' item' : ' items');
  }else{
    mcbCount.setAttribute('data-i18n', 'order.cart.empty');
    mcbCount.textContent = t('order.cart.empty');
    closeCartSheet();
  }
}

async function loadMenu(){
  if(db){
    try{
      const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');
      const q = query(collection(db, 'menu'), orderBy('order', 'asc'));
      const snap = await getDocs(q);
      const items = [];
      snap.forEach(function(d){ items.push(Object.assign({ id: d.id }, d.data())); });
      const available = items.filter(function(i){ return i.available !== false; });
      if(available.length){ return { items: available, sample: false }; }
    }catch(e){
      console.error('RiO de NARA: menu load failed, showing starter menu instead.', e);
    }
  }
  return { items: FALLBACK_MENU, sample: true };
}

async function init(){
  if(firebaseConfigured){
    try{
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js');
      const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');
      const app = initializeApp(FB_CFG);
      db = getFirestore(app);
    }catch(e){
      console.error('RiO de NARA: Firebase init failed.', e);
      db = null;
    }
  }

  if(!firebaseConfigured && !whatsappConfigured){
    unconfiguredNotice.hidden = false;
    submitBtn.disabled = true;
  }

  const result = await loadMenu();
  currentItems = result.items;
  if(result.sample){ sampleNotice.hidden = false; }

  if(!currentItems.length){
    menuStatus.hidden = false;
    menuStatus.textContent = t('order.empty');
    return;
  }
  menuStatus.hidden = true;
  renderMenu();
  renderCart();
}

form.addEventListener('submit', async function(e){
  e.preventDefault();
  clearMsg();

  if(cart.size === 0){ showMsg(t('order.error.empty'), 'error'); return; }

  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  if(!name || !phone){ showMsg(t('order.error.fields'), 'error'); return; }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = t('order.form.submitting');

  const lang = window.RDN_getLang ? window.RDN_getLang() : 'en';
  const itemsArr = Array.from(cart.values());
  const total = itemsArr.reduce(function(s, i){ return s + i.price * i.qty; }, 0);
  const fulfillment = form.querySelector('input[name="fulfillment"]:checked').value;
  const time = document.getElementById('custTime').value;
  const notes = document.getElementById('custNotes').value.trim();

  let saved = false;
  if(db){
    try{
      const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');
      await addDoc(collection(db, 'orders'), {
        customerName: name,
        phone: phone,
        fulfillment: fulfillment,
        pickupTime: time,
        notes: notes,
        items: itemsArr.map(function(i){ return { id: i.id, name_en: i.name_en, name_id: i.name_id, price: i.price, qty: i.qty }; }),
        total: total,
        status: 'new',
        createdAt: serverTimestamp()
      });
      saved = true;
    }catch(err){
      console.error('RiO de NARA: could not save order to database.', err);
    }
  }

  if(whatsappConfigured){
    const fulfillmentLabel = fulfillment === 'pickup' ? t('order.form.pickup') : t('order.form.dinein');
    const lines = itemsArr.map(function(i){
      const label = lang === 'id' ? (i.name_id || i.name_en) : i.name_en;
      return '• ' + i.qty + 'x ' + label + ' — ' + formatIDR(i.price * i.qty);
    }).join('\n');
    const msg = '*New Order — RiO de NARA*\n' +
      'Name: ' + name + '\n' +
      'Phone: ' + phone + '\n' +
      fulfillmentLabel + (time ? ' @ ' + time : '') + '\n\n' +
      lines + '\n\n' +
      t('order.cart.total') + ': ' + formatIDR(total) +
      (notes ? '\nNotes: ' + notes : '');
    window.open('https://wa.me/' + normalizePhone(WA_NUMBER) + '?text=' + encodeURIComponent(msg), '_blank');
  }

  submitBtn.disabled = false;
  submitBtn.textContent = originalLabel;

  if(saved || whatsappConfigured){
    showMsg(t('order.success'), 'success');
    cart.clear();
    renderMenu();
    renderCart();
    form.reset();
    closeCartSheet();
  }else{
    showMsg(t('order.error'), 'error');
  }
});

document.addEventListener('rdn:langchange', function(){
  renderMenu();
  renderCart();
});

init();
