/*
 * RiO de NARA — Admin dashboard
 * ================================
 * Requires a configured Firebase project (see js/firebase-config.js and
 * SETUP.md). Sign in with an account you created in the Firebase
 * console's Authentication tab, then manage live orders, reservations
 * and the menu.
 */

const FB_CFG = window.RDN_FIREBASE_CONFIG || {};
const firebaseConfigured = !!(FB_CFG.apiKey && String(FB_CFG.apiKey).indexOf('REPLACE_') !== 0);

const FALLBACK_MENU = [
  { name_en:'Espresso', name_id:'Espresso', category_en:'Coffee', category_id:'Kopi', price:18000, order:1 },
  { name_en:'Americano', name_id:'Americano', category_en:'Coffee', category_id:'Kopi', price:20000, order:2 },
  { name_en:'Cappuccino', name_id:'Cappuccino', category_en:'Coffee', category_id:'Kopi', price:28000, order:3 },
  { name_en:'Papuan Pour Over', name_id:'Kopi Papua Seduh Manual', category_en:'Coffee', category_id:'Kopi', price:32000, order:4 },
  { name_en:'Iced Coffee Milk', name_id:'Kopi Susu Es', category_en:'Coffee', category_id:'Kopi', price:25000, order:5 },
  { name_en:'Tea', name_id:'Teh', category_en:'Tea & Mocktails', category_id:'Teh & Mocktail', price:15000, order:6 },
  { name_en:'Lemon Mocktail', name_id:'Mocktail Lemon', category_en:'Tea & Mocktails', category_id:'Teh & Mocktail', price:25000, order:7 },
  { name_en:'Fresh Orange Juice', name_id:'Jus Jeruk Segar', category_en:'Juice', category_id:'Jus', price:22000, order:8 },
  { name_en:'Avocado Juice', name_id:'Jus Alpukat', category_en:'Juice', category_id:'Jus', price:25000, order:9 },
  { name_en:'Fried Rice', name_id:'Nasi Goreng', category_en:'Food', category_id:'Makanan', price:35000, order:10 },
  { name_en:'Grilled Chicken', name_id:'Ayam Bakar', category_en:'Food', category_id:'Makanan', price:45000, order:11 },
  { name_en:'Fried Noodles', name_id:'Mie Goreng', category_en:'Food', category_id:'Makanan', price:30000, order:12 }
];

const configWarning = document.getElementById('configWarning');
const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');

if(!firebaseConfigured){
  configWarning.hidden = false;
}else{
  runAdmin();
}

async function runAdmin(){
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js');
  const authMod = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js');
  const fsMod = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');

  const app = initializeApp(FB_CFG);
  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);

  const formatIDR = window.RDN_formatIDR || function(n){ return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); };
  const normalizePhone = window.RDN_normalizePhone || function(p){ return String(p || '').replace(/[^0-9]/g, ''); };
  const formatDate = function(ts){
    try{
      const d = ts && ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleString();
    }catch(e){ return ''; }
  };

  /* ---------- auth ---------- */
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginMsg = document.getElementById('loginMsg');
  const signOutBtn = document.getElementById('signOutBtn');
  const userEmail = document.getElementById('userEmail');

  loginForm.addEventListener('submit', async function(e){
    e.preventDefault();
    loginMsg.innerHTML = '';
    loginBtn.disabled = true;
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    try{
      await authMod.signInWithEmailAndPassword(auth, email, password);
    }catch(err){
      const div = document.createElement('div');
      div.className = 'form-msg error';
      div.textContent = 'Sign-in failed: ' + (err && err.code ? err.code.replace('auth/','').replace(/-/g,' ') : 'please check your email and password.');
      loginMsg.innerHTML = '';
      loginMsg.appendChild(div);
    }
    loginBtn.disabled = false;
  });

  signOutBtn.addEventListener('click', function(){ authMod.signOut(auth); });

  let unsubOrders = null, unsubRes = null, unsubMenu = null;

  authMod.onAuthStateChanged(auth, function(user){
    if(user){
      loginView.hidden = true;
      dashboardView.hidden = false;
      userEmail.textContent = user.email || '';
      startListeners();
    }else{
      dashboardView.hidden = true;
      loginView.hidden = false;
      if(unsubOrders){ unsubOrders(); unsubOrders = null; }
      if(unsubRes){ unsubRes(); unsubRes = null; }
      if(unsubMenu){ unsubMenu(); unsubMenu = null; }
    }
  });

  /* ---------- tabs ---------- */
  document.querySelectorAll('.tab-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var target = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-panel').forEach(function(p){ p.hidden = true; });
      document.getElementById('tab' + target.charAt(0).toUpperCase() + target.slice(1)).hidden = false;
    });
  });

  /* ---------- orders ---------- */
  let ordersCache = [];
  let ordersFilter = 'all';

  document.querySelectorAll('#ordersFilter .filter-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('#ordersFilter .filter-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      ordersFilter = btn.getAttribute('data-status');
      renderOrders();
    });
  });

  function renderOrders(){
    const list = document.getElementById('ordersList');
    const filtered = ordersFilter === 'all' ? ordersCache : ordersCache.filter(function(o){ return o.status === ordersFilter; });
    const countBadge = document.getElementById('ordersCount');
    const newCount = ordersCache.filter(function(o){ return o.status === 'new'; }).length;
    if(newCount > 0){ countBadge.hidden = false; countBadge.textContent = newCount; } else { countBadge.hidden = true; }

    if(!filtered.length){
      list.innerHTML = '<p class="empty-state">No orders here yet.</p>';
      return;
    }
    list.innerHTML = '';
    filtered.forEach(function(o){
      const card = document.createElement('div');
      card.className = 'card is-status-' + (o.status || 'new');

      const top = document.createElement('div');
      top.className = 'card-top';
      const title = document.createElement('div');
      title.innerHTML = '<div class="card-title">' + escapeHtml(o.customerName || 'Guest') + '</div>' +
        '<div class="card-meta">' + escapeHtml(o.phone || '') + (o.phone ? ' · <a class="wa-link" href="https://wa.me/' + normalizePhone(o.phone) + '" target="_blank">WhatsApp ↗</a>' : '') + ' · ' + formatDate(o.createdAt) + '</div>';
      const pill = document.createElement('span');
      pill.className = 'status-pill status-' + (o.status || 'new');
      pill.textContent = o.status || 'new';
      top.appendChild(title);
      top.appendChild(pill);
      card.appendChild(top);

      const body = document.createElement('div');
      body.className = 'card-body';
      body.textContent = (o.fulfillment === 'dinein' ? 'Dine-in' : 'Pickup') + (o.pickupTime ? ' @ ' + o.pickupTime : '');
      card.appendChild(body);

      if(o.items && o.items.length){
        const ul = document.createElement('ul');
        ul.className = 'card-items';
        o.items.forEach(function(i){
          const li = document.createElement('li');
          li.textContent = i.qty + 'x ' + (i.name_en || i.name_id) + ' — ' + formatIDR(i.price * i.qty);
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }

      if(o.notes){
        const notes = document.createElement('div');
        notes.className = 'card-notes';
        notes.textContent = 'Note: ' + o.notes;
        card.appendChild(notes);
      }

      const bottom = document.createElement('div');
      bottom.className = 'card-bottom';
      const total = document.createElement('div');
      total.className = 'card-total';
      total.textContent = formatIDR(o.total);
      const select = document.createElement('select');
      select.className = 'status-select';
      ['new','confirmed','preparing','ready','completed','cancelled'].forEach(function(s){
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        if(o.status === s){ opt.selected = true; }
        select.appendChild(opt);
      });
      select.addEventListener('change', async function(){
        try{
          await fsMod.updateDoc(fsMod.doc(db, 'orders', o.id), { status: select.value });
        }catch(err){ console.error(err); alert('Could not update status.'); }
      });
      bottom.appendChild(total);
      bottom.appendChild(select);
      card.appendChild(bottom);

      list.appendChild(card);
    });
  }

  /* ---------- reservations ---------- */
  let resCache = [];
  let resFilter = 'all';

  document.querySelectorAll('#resFilter .filter-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('#resFilter .filter-btn').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      resFilter = btn.getAttribute('data-status');
      renderReservations();
    });
  });

  function renderReservations(){
    const list = document.getElementById('resList');
    const filtered = resFilter === 'all' ? resCache : resCache.filter(function(r){ return r.status === resFilter; });
    const countBadge = document.getElementById('resCount');
    const pendingCount = resCache.filter(function(r){ return r.status === 'pending'; }).length;
    if(pendingCount > 0){ countBadge.hidden = false; countBadge.textContent = pendingCount; } else { countBadge.hidden = true; }

    if(!filtered.length){
      list.innerHTML = '<p class="empty-state">No reservations here yet.</p>';
      return;
    }
    list.innerHTML = '';
    filtered.forEach(function(r){
      const card = document.createElement('div');
      card.className = 'card is-status-' + (r.status || 'pending');

      const top = document.createElement('div');
      top.className = 'card-top';
      const title = document.createElement('div');
      title.innerHTML = '<div class="card-title">' + escapeHtml(r.customerName || 'Guest') + '</div>' +
        '<div class="card-meta">' + escapeHtml(r.phone || '') + (r.phone ? ' · <a class="wa-link" href="https://wa.me/' + normalizePhone(r.phone) + '" target="_blank">WhatsApp ↗</a>' : '') + ' · requested ' + formatDate(r.createdAt) + '</div>';
      const pill = document.createElement('span');
      pill.className = 'status-pill status-' + (r.status || 'pending');
      pill.textContent = r.status || 'pending';
      top.appendChild(title);
      top.appendChild(pill);
      card.appendChild(top);

      const body = document.createElement('div');
      body.className = 'card-body';
      body.textContent = 'Table for ' + (r.partySize || '?') + ' on ' + (r.date || '') + ' at ' + (r.time || '');
      card.appendChild(body);

      if(r.notes){
        const notes = document.createElement('div');
        notes.className = 'card-notes';
        notes.textContent = 'Note: ' + r.notes;
        card.appendChild(notes);
      }

      const bottom = document.createElement('div');
      bottom.className = 'card-bottom';
      const spacer = document.createElement('div');
      const select = document.createElement('select');
      select.className = 'status-select';
      ['pending','confirmed','completed','cancelled'].forEach(function(s){
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s.charAt(0).toUpperCase() + s.slice(1);
        if(r.status === s){ opt.selected = true; }
        select.appendChild(opt);
      });
      select.addEventListener('change', async function(){
        try{
          await fsMod.updateDoc(fsMod.doc(db, 'reservations', r.id), { status: select.value });
        }catch(err){ console.error(err); alert('Could not update status.'); }
      });
      bottom.appendChild(spacer);
      bottom.appendChild(select);
      card.appendChild(bottom);

      list.appendChild(card);
    });
  }

  /* ---------- menu ---------- */
  let menuCache = [];

  function renderMenuAdmin(){
    const list = document.getElementById('menuList');
    const seedRow = document.getElementById('seedRow');
    seedRow.hidden = menuCache.length > 0;

    if(!menuCache.length){
      list.innerHTML = '<p class="empty-state">No menu items yet — load the starter menu below or add your first item.</p>';
      return;
    }
    list.innerHTML = '';
    const groups = {};
    const order = [];
    menuCache.forEach(function(item){
      const key = item.category_en || 'Menu';
      if(!groups[key]){ groups[key] = []; order.push(key); }
      groups[key].push(item);
    });
    order.forEach(function(cat){
      const h = document.createElement('div');
      h.className = 'menu-group-title';
      h.textContent = cat;
      list.appendChild(h);
      groups[cat].forEach(function(item){ list.appendChild(renderMenuRow(item)); });
    });
  }

  function renderMenuRow(item){
    const row = document.createElement('div');
    row.className = 'menu-row';

    const nameEn = document.createElement('input');
    nameEn.type = 'text'; nameEn.value = item.name_en || ''; nameEn.placeholder = 'Name (EN)';
    const nameId = document.createElement('input');
    nameId.type = 'text'; nameId.value = item.name_id || ''; nameId.placeholder = 'Nama (ID)';
    const price = document.createElement('input');
    price.type = 'number'; price.min = '0'; price.step = '500'; price.value = item.price || 0;

    const availLabel = document.createElement('label');
    availLabel.className = 'avail';
    const availCb = document.createElement('input');
    availCb.type = 'checkbox'; availCb.checked = item.available !== false;
    availLabel.appendChild(availCb);
    availLabel.appendChild(document.createTextNode('Available'));

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button'; saveBtn.className = 'icon-btn'; saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async function(){
      try{
        await fsMod.updateDoc(fsMod.doc(db, 'menu', item.id), {
          name_en: nameEn.value.trim(),
          name_id: nameId.value.trim(),
          price: Number(price.value) || 0,
          available: availCb.checked
        });
        saveBtn.textContent = 'Saved ✓';
        setTimeout(function(){ saveBtn.textContent = 'Save'; }, 1500);
      }catch(err){ console.error(err); alert('Could not save item.'); }
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.className = 'icon-btn danger'; delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async function(){
      if(!confirm('Delete "' + (item.name_en || 'this item') + '"?')) return;
      try{
        await fsMod.deleteDoc(fsMod.doc(db, 'menu', item.id));
      }catch(err){ console.error(err); alert('Could not delete item.'); }
    });

    row.appendChild(nameEn);
    row.appendChild(nameId);
    row.appendChild(price);
    row.appendChild(availLabel);
    row.appendChild(saveBtn);
    row.appendChild(delBtn);
    return row;
  }

  document.getElementById('seedBtn').addEventListener('click', async function(){
    if(!confirm('Load 12 starter menu items? You can edit or delete them anytime afterward.')) return;
    try{
      const batch = fsMod.writeBatch(db);
      FALLBACK_MENU.forEach(function(item){
        const ref = fsMod.doc(fsMod.collection(db, 'menu'));
        batch.set(ref, Object.assign({}, item, { available: true }));
      });
      await batch.commit();
    }catch(err){ console.error(err); alert('Could not load starter menu.'); }
  });

  document.getElementById('addItemForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const msg = document.getElementById('addItemMsg');
    msg.innerHTML = '';
    const nameEn = document.getElementById('newNameEn').value.trim();
    const nameId = document.getElementById('newNameId').value.trim();
    const catEn = document.getElementById('newCatEn').value.trim();
    const catId = document.getElementById('newCatId').value.trim();
    const price = Number(document.getElementById('newPrice').value) || 0;
    const order = Number(document.getElementById('newOrder').value) || 0;
    if(!nameEn || !nameId || !catEn || !catId){ return; }
    try{
      await fsMod.addDoc(fsMod.collection(db, 'menu'), {
        name_en: nameEn, name_id: nameId,
        category_en: catEn, category_id: catId,
        price: price, order: order, available: true
      });
      document.getElementById('addItemForm').reset();
      const div = document.createElement('div');
      div.className = 'form-msg success';
      div.textContent = 'Item added.';
      msg.appendChild(div);
      setTimeout(function(){ msg.innerHTML = ''; }, 2000);
    }catch(err){
      console.error(err);
      const div = document.createElement('div');
      div.className = 'form-msg error';
      div.textContent = 'Could not add item.';
      msg.appendChild(div);
    }
  });

  /* ---------- realtime listeners ---------- */
  function startListeners(){
    if(unsubOrders) unsubOrders();
    if(unsubRes) unsubRes();
    if(unsubMenu) unsubMenu();

    const ordersQ = fsMod.query(fsMod.collection(db, 'orders'), fsMod.orderBy('createdAt', 'desc'));
    unsubOrders = fsMod.onSnapshot(ordersQ, function(snap){
      ordersCache = [];
      snap.forEach(function(d){ ordersCache.push(Object.assign({ id: d.id }, d.data())); });
      renderOrders();
    }, function(err){ console.error('orders listener error', err); });

    const resQ = fsMod.query(fsMod.collection(db, 'reservations'), fsMod.orderBy('createdAt', 'desc'));
    unsubRes = fsMod.onSnapshot(resQ, function(snap){
      resCache = [];
      snap.forEach(function(d){ resCache.push(Object.assign({ id: d.id }, d.data())); });
      renderReservations();
    }, function(err){ console.error('reservations listener error', err); });

    const menuQ = fsMod.query(fsMod.collection(db, 'menu'), fsMod.orderBy('order', 'asc'));
    unsubMenu = fsMod.onSnapshot(menuQ, function(snap){
      menuCache = [];
      snap.forEach(function(d){ menuCache.push(Object.assign({ id: d.id }, d.data())); });
      renderMenuAdmin();
    }, function(err){ console.error('menu listener error', err); });
  }

  function escapeHtml(str){
    return String(str).replace(/[&<>"']/g, function(c){
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
}
