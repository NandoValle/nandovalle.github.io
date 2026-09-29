/* Meta Pixel: carrega direto em todas as paginas, sem aviso de cookies.
   (Ate 29/09/2026 havia um aviso Aceitar/Recusar; retirado a pedido.) */
(function () {
  var PIXEL_ID = '1092820289901687';
  var en = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;

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

  function init() {
    loadPixel();
    document.addEventListener('click', function (e) {
      // Evento "OuvirAgora": botao "Ouvir agora" / "Listen now" do topo (a.nav-cta).
      var cta = e.target.closest && e.target.closest('a.nav-cta');
      if (cta && window.fbq) {
        window.fbq('trackCustom', 'OuvirAgora', {
          pagina: location.pathname, idioma: en ? 'en' : 'pt', destino: cta.href
        });
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
