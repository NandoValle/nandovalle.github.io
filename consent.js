/* Aviso de cookies (LGPD). O Meta Pixel so carrega depois de "Aceitar".
   Escolha guardada em localStorage["nv-consent"] = "granted" | "denied".
   Qualquer elemento com [data-cookie-prefs] reabre o aviso; o link "Cookies"
   e inserido sozinho no rodape de cada pagina. */
(function () {
  var PIXEL_ID = '1092820289901687';
  var KEY = 'nv-consent';
  var en = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = en ? {
    text: 'This site uses the Meta Pixel to measure visits and ads. It only loads if you allow it.',
    accept: 'Accept', decline: 'Decline', link: 'Cookies', label: 'Cookie notice'
  } : {
    text: 'Este site usa o Pixel da Meta para medir visitas e anúncios. Ele só carrega se você permitir.',
    accept: 'Aceitar', decline: 'Recusar', link: 'Cookies', label: 'Aviso de cookies'
  };

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadPixel() {
    if (window.fbq) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  var css =
    '.nv-cookie{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;' +
    'display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;padding:16px 18px;border-radius:14px;' +
    'background:rgba(20,15,17,.96);border:1px solid rgba(230,189,107,.28);box-shadow:0 18px 50px rgba(0,0,0,.55);' +
    'color:#e0d2bc;font-family:inherit;font-size:13px;line-height:1.55}' +
    '.nv-cookie p{margin:0;flex:1 1 260px}' +
    '.nv-cookie .nv-btns{display:flex;gap:8px;flex:0 0 auto}' +
    '.nv-cookie button{font:inherit;font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;' +
    'padding:9px 14px;border-radius:999px;border:1px solid rgba(230,189,107,.45);background:transparent;color:#e6bd6b}' +
    '.nv-cookie button.nv-ok{background:#e6bd6b;color:#070607;border-color:#e6bd6b}' +
    '.nv-cookie button:focus-visible{outline:2px solid #f2d9a4;outline-offset:2px}' +
    '.nv-cookie-link{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:inherit}';

  var box;
  function show() {
    if (box) { box.hidden = false; box.querySelector('.nv-ok').focus(); return; }
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    box = document.createElement('div');
    box.className = 'nv-cookie'; box.setAttribute('role', 'region'); box.setAttribute('aria-label', T.label);
    box.innerHTML = '<p></p><div class="nv-btns"><button type="button" class="nv-no"></button>' +
                    '<button type="button" class="nv-ok"></button></div>';
    box.querySelector('p').textContent = T.text;
    box.querySelector('.nv-no').textContent = T.decline;
    box.querySelector('.nv-ok').textContent = T.accept;
    box.querySelector('.nv-ok').onclick = function () { save('granted'); box.hidden = true; loadPixel(); };
    box.querySelector('.nv-no').onclick = function () {
      var had = !!window.fbq; save('denied'); box.hidden = true;
      if (had) location.reload(); // descarrega o pixel que ja estava ativo
    };
    document.body.appendChild(box);
  }

  function addFooterLink() {
    var footer = document.querySelector('footer');
    if (!footer || footer.querySelector('[data-cookie-prefs]')) return;
    var host = footer.querySelector('.footer-links') || footer;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'nv-cookie-link'; b.setAttribute('data-cookie-prefs', '');
    b.textContent = T.link;
    if (host === footer) { var p = document.createElement('p'); p.appendChild(b); footer.appendChild(p); }
    else host.appendChild(b);
  }

  function init() {
    addFooterLink();
    document.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('[data-cookie-prefs]');
      if (t) { e.preventDefault(); show(); }
    });
    var c = read();
    if (c === 'granted') loadPixel();
    else if (c !== 'denied') show();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
