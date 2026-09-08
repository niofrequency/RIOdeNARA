/*
 * RiO de NARA — Reservation page logic
 * =======================================
 * On submit: saves the reservation to Firestore (collection
 * "reservations") if Firebase is configured, so it shows up on /admin,
 * and opens a pre-filled WhatsApp message to the restaurant's number
 * if configured. See SETUP.md to connect both.
 */

const FB_CFG = window.RDN_FIREBASE_CONFIG || {};
const WA_NUMBER = window.RDN_WHATSAPP_NUMBER || '';
const firebaseConfigured = !!(FB_CFG.apiKey && String(FB_CFG.apiKey).indexOf('REPLACE_') !== 0);
const whatsappConfigured = !!(WA_NUMBER && String(WA_NUMBER).indexOf('REPLACE_') !== 0);

const t = function(key){ return window.RDN_t ? window.RDN_t(key) : key; };
const normalizePhone = window.RDN_normalizePhone || function(p){ return String(p || '').replace(/[^0-9]/g, ''); };

const form = document.getElementById('reserveForm');
const submitBtn = document.getElementById('submitBtn');
const formMsg = document.getElementById('formMsg');
const unconfiguredNotice = document.getElementById('unconfiguredNotice');
const resDateInput = document.getElementById('resDate');

if(resDateInput){
  resDateInput.min = new Date().toISOString().split('T')[0];
}

let db = null;

function showMsg(text, kind){
  formMsg.innerHTML = '';
  const div = document.createElement('div');
  div.className = 'form-msg ' + kind;
  div.textContent = text;
  formMsg.appendChild(div);
}
function clearMsg(){ formMsg.innerHTML = ''; }

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
}

form.addEventListener('submit', async function(e){
  e.preventDefault();
  clearMsg();

  const name = document.getElementById('resName').value.trim();
  const phone = document.getElementById('resPhone').value.trim();
  const date = document.getElementById('resDate').value;
  const time = document.getElementById('resTime').value;
  const party = document.getElementById('resParty').value;
  const notes = document.getElementById('resNotes').value.trim();

  if(!name || !phone || !date || !time || !party){
    showMsg(t('reserve.error.fields'), 'error');
    return;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = t('reserve.form.submitting');

  let saved = false;
  if(db){
    try{
      const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js');
      await addDoc(collection(db, 'reservations'), {
        customerName: name,
        phone: phone,
        date: date,
        time: time,
        partySize: Number(party),
        notes: notes,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      saved = true;
    }catch(err){
      console.error('RiO de NARA: could not save reservation to database.', err);
    }
  }

  if(whatsappConfigured){
    const msg = '*New Reservation — RiO de NARA*\n' +
      'Name: ' + name + '\n' +
      'Phone: ' + phone + '\n' +
      'Date: ' + date + '\n' +
      'Time: ' + time + '\n' +
      'Guests: ' + party +
      (notes ? '\nNotes: ' + notes : '');
    window.open('https://wa.me/' + normalizePhone(WA_NUMBER) + '?text=' + encodeURIComponent(msg), '_blank');
  }

  submitBtn.disabled = false;
  submitBtn.textContent = originalLabel;

  if(saved || whatsappConfigured){
    showMsg(t('reserve.success'), 'success');
    form.reset();
  }else{
    showMsg(t('reserve.error'), 'error');
  }
});

init();
