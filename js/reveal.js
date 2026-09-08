/*
 * RiO de NARA — one-shot scroll reveal
 * =======================================
 * Progressive enhancement only: elements marked `.reveal` start hidden
 * via CSS (see css/site.css) and this script adds `.in-view` the first
 * time each one enters the viewport. If IntersectionObserver isn't
 * available, or the visitor prefers reduced motion, everything is
 * revealed immediately — content is never gated behind JS.
 */
(function(){
  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var els = document.querySelectorAll('.reveal');

  if(prefersReduced || !('IntersectionObserver' in window)){
    els.forEach(function(el){ el.classList.add('in-view'); });
    return;
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  els.forEach(function(el){ io.observe(el); });
})();
