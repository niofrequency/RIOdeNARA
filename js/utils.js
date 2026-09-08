/*
 * RiO de NARA — small shared helpers
 * =====================================
 * Loaded before app-order.js / app-reserve.js / app-admin.js. Pure
 * presentation helpers only — no Firebase/DOM assumptions, so they're
 * safe to share without touching submit payloads or Firestore fields.
 */

window.RDN_formatIDR = function(n){
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
};

/*
 * Normalizes a phone number for use in a wa.me deep link:
 * strips spaces/dashes/parens/"+", then converts a leading "0" to the
 * Indonesian country code "62" (the common local-format guests type,
 * e.g. "0812-3456-7890"). Numbers already in international format are
 * left as-is. This only affects the wa.me URL built at click time —
 * it never changes what's stored in Firestore.
 */
window.RDN_normalizePhone = function(raw){
  var digits = String(raw || '').replace(/[^0-9]/g, '');
  if(digits.indexOf('0') === 0){ digits = '62' + digits.slice(1); }
  return digits;
};
