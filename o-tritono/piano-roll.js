/* Piano roll do MIDI transcrito, com o detector rodando no navegador.
 *
 * Nao toca audio e nao analisa audio: desenha as notas do arquivo .mid que
 * esta publicado em /o-tritono/reproduzir/ e marca as ocorrencias que o
 * detector encontra nele, com a mesma regra do detecta_tritono.py.
 *
 * Depende de reproduzir/detecta_tritono.js (window.Tritono).
 */
(function () {
  'use strict';

  var raiz = document.getElementById('rolo');
  if (!raiz || !window.Tritono) { return; }

  var T = window.Tritono;
  var idioma = raiz.getAttribute('data-idioma') === 'en' ? 'en' : 'pt';
  var base = '/o-tritono/reproduzir/';

  /* arquivos e os numeros que a tabela deste laudo publica */
  var ARQUIVOS = [
    { f: 'guitar_basic_pitch.mid',    pt: 'Basic Pitch — guitarra (solo)',           en: 'Basic Pitch — guitar (solo)',            notas: 1735, mel: 83, harm: 72 },
    { f: 'guitar_40ms.mid',           pt: 'Basic Pitch — guitarra (corte 40 ms)',    en: 'Basic Pitch — guitar (40 ms cut)',       notas: 1929, mel: 91, harm: 79 },
    { f: 'guitar_registro_grave.mid', pt: 'Basic Pitch — guitarra (passada grave)',  en: 'Basic Pitch — guitar (low-register run)', notas: 1133, mel: 49, harm: 42 },
    { f: 'guitar_anthemscore.mid',    pt: 'AnthemScore — guitarra (motor independente)', en: 'AnthemScore — guitar (independent engine)', notas: 2320, mel: 80, harm: 115 },
    { f: 'bass_basic_pitch.mid',      pt: 'Basic Pitch — baixo (contraprova interna)',   en: 'Basic Pitch — bass (internal control)',     notas: 790,  mel: 2,  harm: 0 }
  ];

  var TXT = {
    pt: {
      arquivo: 'Arquivo MIDI',
      recontar: 'Recontar neste navegador',
      contando: 'Contando…',
      janela: 'Janela',
      aproximar: 'Aproximar',
      afastar: 'Afastar',
      tudo: 'Faixa inteira',
      melodicos: 'Trítonos melódicos',
      harmonicos: 'Trítonos harmônicos',
      notas: 'Notas analisadas',
      tabela: 'tabela deste laudo:',
      confere: 'confere',
      diverge: 'DIVERGE — o erro é nosso, e queremos saber',
      ocorrencias: 'Primeiras ocorrências melódicas',
      mais: 'e mais {n}.',
      legenda: 'Piano roll do MIDI transcrito — não é a forma de onda do áudio. Eixo horizontal: tempo. Eixo vertical: altura. Em dourado, as notas que formam trítono.',
      erro: 'Não foi possível ler o MIDI aqui. O arquivo continua disponível para download acima.',
      arrasta: 'Clique ou arraste na barra acima para andar pela faixa.',
      primeira: 'primeira ocorrência'
    },
    en: {
      arquivo: 'MIDI file',
      recontar: 'Recount in this browser',
      contando: 'Counting…',
      janela: 'Window',
      aproximar: 'Zoom in',
      afastar: 'Zoom out',
      tudo: 'Whole track',
      melodicos: 'Melodic tritones',
      harmonicos: 'Harmonic tritones',
      notas: 'Notes analysed',
      tabela: 'table in this report:',
      confere: 'matches',
      diverge: 'MISMATCH — the error is ours, and we want to know',
      ocorrencias: 'First melodic occurrences',
      mais: 'and {n} more.',
      legenda: 'Piano roll of the transcribed MIDI — not the audio waveform. Horizontal axis: time. Vertical axis: pitch. In gold, the notes forming a tritone.',
      erro: 'The MIDI could not be read here. The file is still available for download above.',
      arrasta: 'Click or drag the bar above to move along the track.',
      primeira: 'first occurrence'
    }
  }[idioma];

  var JANELAS = [2, 4, 8, 16, 32, 64, 0];   // 0 = faixa inteira
  var estado = {
    arquivo: ARQUIVOS[0],
    midi: null,
    laudo: null,
    janela: 8,
    inicio: 0,
    verMel: true,
    verHarm: true
  };

  /* ---------- montagem ---------- */

  raiz.innerHTML =
    '<div class="rolo-topo">' +
      '<label class="rolo-rot" for="rolo-arq">' + TXT.arquivo + '</label>' +
      '<select id="rolo-arq" class="rolo-sel"></select>' +
      '<button type="button" id="rolo-recontar" class="rolo-bt rolo-bt-forte">' + TXT.recontar + '</button>' +
    '</div>' +
    '<div class="rolo-placar" id="rolo-placar" aria-live="polite"></div>' +
    '<canvas id="rolo-mapa" class="rolo-mapa" height="46" role="img" aria-label="' + TXT.arrasta + '"></canvas>' +
    '<canvas id="rolo-tela" class="rolo-tela" height="260" role="img"></canvas>' +
    '<div class="rolo-eixo" id="rolo-eixo"></div>' +
    '<div class="rolo-ctrl">' +
      '<span class="rolo-rot">' + TXT.janela + '</span>' +
      '<button type="button" id="rolo-menos" class="rolo-bt" title="' + TXT.afastar + '">&minus;</button>' +
      '<span id="rolo-janela" class="rolo-janela"></span>' +
      '<button type="button" id="rolo-mais" class="rolo-bt" title="' + TXT.aproximar + '">+</button>' +
      '<label class="rolo-check"><input type="checkbox" id="rolo-mel" checked> ' + TXT.melodicos + '</label>' +
      '<label class="rolo-check"><input type="checkbox" id="rolo-harm" checked> ' + TXT.harmonicos + '</label>' +
    '</div>' +
    '<p class="rolo-legenda">' + TXT.legenda + ' ' + TXT.arrasta + '</p>' +
    '<div class="rolo-lista" id="rolo-lista"></div>';

  var sel = document.getElementById('rolo-arq');
  ARQUIVOS.forEach(function (a, i) {
    var op = document.createElement('option');
    op.value = String(i);
    op.textContent = a[idioma];
    sel.appendChild(op);
  });

  var telaMapa = document.getElementById('rolo-mapa');
  var tela = document.getElementById('rolo-tela');
  var placar = document.getElementById('rolo-placar');
  var lista = document.getElementById('rolo-lista');
  var eixo = document.getElementById('rolo-eixo');
  var rotJanela = document.getElementById('rolo-janela');

  /* ---------- desenho ---------- */

  function ajusta(cv) {
    var r = window.devicePixelRatio || 1;
    var l = cv.clientWidth;
    var a = cv.getAttribute('height') * 1;
    if (cv.width !== Math.round(l * r) || cv.height !== Math.round(a * r)) {
      cv.width = Math.round(l * r);
      cv.height = Math.round(a * r);
    }
    var ctx = cv.getContext('2d');
    ctx.setTransform(r, 0, 0, r, 0, 0);
    ctx.clearRect(0, 0, l, a);
    return { ctx: ctx, l: l, a: a };
  }

  /* faixa de alturas do desenho: percentis 1 e 99, para que uma nota fantasma
     solta em outra oitava nao esmague o resto do desenho no meio da tela.
     O que cair fora fica na borda — nada some, nada e descartado da contagem. */
  var cacheEx = null;
  function extremos(notas) {
    if (cacheEx && cacheEx.ref === notas) { return cacheEx.v; }
    if (!notas.length) { return { min: 48, max: 84 }; }
    var alturas = notas.map(function (n) { return n.pitch; }).sort(function (a, b) { return a - b; });
    var min = alturas[Math.floor(alturas.length * 0.01)];
    var max = alturas[Math.min(alturas.length - 1, Math.ceil(alturas.length * 0.99))];
    if (max - min < 12) { max = min + 12; }
    var v = { min: min - 2, max: max + 2 };
    cacheEx = { ref: notas, v: v };
    return v;
  }

  function janelaAtual() {
    var dur = estado.midi ? estado.midi.duracao : 1;
    return estado.janela === 0 ? dur : Math.min(estado.janela, dur);
  }

  function desenhaMapa() {
    var d = ajusta(telaMapa);
    if (!estado.midi) { return; }
    var notas = estado.midi.notas, dur = estado.midi.duracao || 1;
    var ex = extremos(notas);
    var faixa = ex.max - ex.min || 1;

    d.ctx.fillStyle = 'rgba(232,226,214,.20)';
    for (var i = 0; i < notas.length; i++) {
      var n = notas[i];
      var x = n.start / dur * d.l;
      var q = Math.max(ex.min, Math.min(ex.max, n.pitch));
      var y = d.a - ((q - ex.min) / faixa) * (d.a - 6) - 3;
      d.ctx.fillRect(x, y, 1, 1.6);
    }
    /* ocorrencias */
    function marca(lista2, cor, alt) {
      d.ctx.fillStyle = cor;
      for (var k = 0; k < lista2.length; k++) {
        d.ctx.fillRect(lista2[k].t / dur * d.l, alt ? 0 : d.a - 4, 1, 4);
      }
    }
    if (estado.laudo) {
      if (estado.verHarm) { marca(estado.laudo.harmonicos, 'rgba(226,183,51,.45)', true); }
      if (estado.verMel) { marca(estado.laudo.melodicos, 'rgba(226,183,51,.95)', false); }
    }
    /* viewport */
    var jan = janelaAtual();
    var x0 = estado.inicio / dur * d.l;
    var w = Math.max(2, jan / dur * d.l);
    d.ctx.fillStyle = 'rgba(226,183,51,.12)';
    d.ctx.fillRect(x0, 0, w, d.a);
    d.ctx.strokeStyle = 'rgba(226,183,51,.75)';
    d.ctx.lineWidth = 1;
    d.ctx.strokeRect(x0 + .5, .5, w - 1, d.a - 1);
  }

  function desenha() {
    var d = ajusta(tela);
    if (!estado.midi) { return; }
    var notas = estado.midi.notas;
    var ex = extremos(notas);
    var faixa = ex.max - ex.min || 1;
    var jan = janelaAtual();
    var t0 = estado.inicio, t1 = t0 + jan;
    var alturaLinha = Math.max(2.5, Math.min(9, (d.a - 8) / faixa));

    function px(t) { return (t - t0) / jan * d.l; }
    function py(p) {
      var q = Math.max(ex.min, Math.min(ex.max, p));      // fora da faixa: fica na borda
      return d.a - 4 - ((q - ex.min) / faixa) * (d.a - 8) - alturaLinha / 2;
    }

    /* grade: oitavas */
    d.ctx.font = '10px Inter, system-ui, sans-serif';
    for (var p = Math.ceil(ex.min / 12) * 12; p <= ex.max; p += 12) {
      var y = py(p) + alturaLinha / 2;
      d.ctx.strokeStyle = 'rgba(58,50,66,.9)';
      d.ctx.beginPath(); d.ctx.moveTo(0, y); d.ctx.lineTo(d.l, y); d.ctx.stroke();
      d.ctx.fillStyle = 'rgba(179,167,149,.55)';
      d.ctx.fillText(T.nomeNota(p, idioma), 3, y - 3);
    }

    /* indices das notas em ocorrencia */
    var emMel = {}, emHarm = {};
    if (estado.laudo) {
      var k;
      if (estado.verMel) {
        for (k = 0; k < estado.laudo.melodicos.length; k++) {
          emMel[estado.laudo.melodicos[k].i] = 1; emMel[estado.laudo.melodicos[k].j] = 1;
        }
      }
      if (estado.verHarm) {
        for (k = 0; k < estado.laudo.harmonicos.length; k++) {
          emHarm[estado.laudo.harmonicos[k].i] = 1; emHarm[estado.laudo.harmonicos[k].j] = 1;
        }
      }
    }

    /* notas */
    for (var i = 0; i < notas.length; i++) {
      var n = notas[i];
      if (n.end < t0 || n.start > t1) { continue; }
      var x = px(n.start);
      var w = Math.max(1.5, px(n.end) - x);
      var y2 = py(n.pitch);
      if (emMel[i]) { d.ctx.fillStyle = '#e2b733'; }
      else if (emHarm[i]) { d.ctx.fillStyle = 'rgba(226,183,51,.55)'; }
      else { d.ctx.fillStyle = 'rgba(232,226,214,.26)'; }
      d.ctx.fillRect(x, y2, w, alturaLinha);
    }

    /* ligacoes dos pares melodicos */
    if (estado.laudo && estado.verMel) {
      d.ctx.strokeStyle = 'rgba(226,183,51,.75)';
      d.ctx.lineWidth = 1;
      for (var m = 0; m < estado.laudo.melodicos.length; m++) {
        var oc = estado.laudo.melodicos[m];
        if (oc.t < t0 - 1 || oc.t > t1) { continue; }
        var a = notas[oc.i], b = notas[oc.j];
        d.ctx.beginPath();
        d.ctx.moveTo(px(a.end), py(a.pitch) + alturaLinha / 2);
        d.ctx.lineTo(px(b.start), py(b.pitch) + alturaLinha / 2);
        d.ctx.stroke();
      }
      /* rotulo da primeira ocorrencia da faixa, quando estiver em vista */
      var pr = estado.laudo.melodicos[0];
      if (pr && pr.t >= t0 && pr.t <= t1) {
        var xr = px(pr.t);
        var rot = T.mmss(pr.t, idioma) + ' · ' + T.nomeNota(pr.p1, idioma) + ' → ' + T.nomeNota(pr.p2, idioma);
        d.ctx.font = '600 11px Inter, system-ui, sans-serif';
        var larg = d.ctx.measureText(rot).width;
        var lx = Math.min(Math.max(4, xr - larg / 2), d.l - larg - 8);
        var ly = Math.max(14, py(Math.max(pr.p1, pr.p2)) - 10);
        d.ctx.fillStyle = 'rgba(14,11,16,.88)';                 // etiqueta sobre fundo proprio
        d.ctx.fillRect(lx - 4, ly - 11, larg + 8, 15);
        d.ctx.strokeStyle = 'rgba(226,183,51,.35)';
        d.ctx.lineWidth = 1;
        d.ctx.strokeRect(lx - 3.5, ly - 10.5, larg + 7, 14);
        d.ctx.fillStyle = '#e2b733';
        d.ctx.fillText(rot, lx, ly);
      }
    }

    /* eixo de tempo */
    var passos = 5, html = '';
    for (var s = 0; s <= passos; s++) {
      html += '<span>' + T.mmss(t0 + jan * s / passos, idioma) + '</span>';
    }
    eixo.innerHTML = html;
    rotJanela.textContent = estado.janela === 0 ? TXT.tudo : (estado.janela + ' s');
    desenhaMapa();
  }

  /* ---------- placar e lista ---------- */

  function linhaPlacar(rot, valor, esperado) {
    var ok = valor === esperado;
    return '<div class="rolo-cel">' +
      '<span class="rolo-cel-rot">' + rot + '</span>' +
      '<strong class="rolo-cel-num">' + valor.toLocaleString(idioma === 'pt' ? 'pt-BR' : 'en-US') + '</strong>' +
      '<span class="' + (ok ? 'rolo-ok' : 'rolo-nok') + '">' + TXT.tabela + ' ' +
      esperado.toLocaleString(idioma === 'pt' ? 'pt-BR' : 'en-US') + ' · ' +
      (ok ? '&#10003; ' + TXT.confere : TXT.diverge) + '</span></div>';
  }

  function mostraPlacar() {
    var a = estado.arquivo, r = estado.laudo;
    placar.innerHTML =
      linhaPlacar(TXT.notas, r.total, a.notas) +
      linhaPlacar(TXT.melodicos, r.melodicos.length, a.mel) +
      linhaPlacar(TXT.harmonicos, r.harmonicos.length, a.harm);

    var html = '<h3 class="rolo-lista-tit">' + TXT.ocorrencias + '</h3><ol class="rolo-ol">';
    var n = Math.min(12, r.melodicos.length);
    for (var i = 0; i < n; i++) {
      var oc = r.melodicos[i];
      html += '<li><button type="button" class="rolo-ir" data-t="' + oc.t + '">' +
              '<span class="rolo-t">' + T.mmss(oc.t, idioma) + '</span> ' +
              T.nomeNota(oc.p1, idioma) + ' → ' + T.nomeNota(oc.p2, idioma) +
              (i === 0 ? ' <em>· ' + TXT.primeira + '</em>' : '') + '</button></li>';
    }
    html += '</ol>';
    if (r.melodicos.length > n) {
      html += '<p class="rolo-mais">' + TXT.mais.replace('{n}', r.melodicos.length - n) + '</p>';
    }
    lista.innerHTML = html;
    Array.prototype.forEach.call(lista.querySelectorAll('.rolo-ir'), function (bt) {
      bt.addEventListener('click', function () {
        var t = parseFloat(bt.getAttribute('data-t'));
        if (estado.janela === 0) { estado.janela = 4; }
        estado.inicio = Math.max(0, Math.min(t - janelaAtual() / 2, estado.midi.duracao - janelaAtual()));
        desenha();
      });
    });
  }

  /* ---------- carga ---------- */

  function carrega(arq) {
    estado.arquivo = arq;
    placar.innerHTML = '<p class="rolo-espera">' + TXT.contando + '</p>';
    lista.innerHTML = '';
    return fetch(base + arq.f)
      .then(function (r) {
        if (!r.ok) { throw new Error('HTTP ' + r.status); }
        return r.arrayBuffer();
      })
      .then(function (ab) {
        estado.midi = T.leMidi(ab);
        estado.laudo = T.detecta(estado.midi.notas);
        estado.inicio = 0;
        mostraPlacar();
        desenha();
      })
      .catch(function (e) {
        placar.innerHTML = '<p class="rolo-erro">' + TXT.erro + ' <span class="rolo-mais">(' + e.message + ')</span></p>';
      });
  }

  /* ---------- interacao ---------- */

  sel.addEventListener('change', function () { carrega(ARQUIVOS[sel.value * 1]); });
  document.getElementById('rolo-recontar').addEventListener('click', function () { carrega(estado.arquivo); });

  function mudaJanela(passo) {
    var i = JANELAS.indexOf(estado.janela);
    i = Math.max(0, Math.min(JANELAS.length - 1, i + passo));
    var centro = estado.inicio + janelaAtual() / 2;
    estado.janela = JANELAS[i];
    var jan = janelaAtual();
    var dur = estado.midi ? estado.midi.duracao : jan;
    estado.inicio = Math.max(0, Math.min(centro - jan / 2, dur - jan));
    desenha();
  }
  document.getElementById('rolo-mais').addEventListener('click', function () { mudaJanela(-1); });
  document.getElementById('rolo-menos').addEventListener('click', function () { mudaJanela(1); });
  document.getElementById('rolo-mel').addEventListener('change', function () { estado.verMel = this.checked; desenha(); });
  document.getElementById('rolo-harm').addEventListener('change', function () { estado.verHarm = this.checked; desenha(); });

  var arrastando = false;
  function moveMapa(ev) {
    if (!estado.midi) { return; }
    var r = telaMapa.getBoundingClientRect();
    var x = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) / r.width;
    var jan = janelaAtual();
    estado.inicio = Math.max(0, Math.min(x * estado.midi.duracao - jan / 2, estado.midi.duracao - jan));
    desenha();
  }
  telaMapa.addEventListener('mousedown', function (e) { arrastando = true; moveMapa(e); });
  window.addEventListener('mousemove', function (e) { if (arrastando) { moveMapa(e); } });
  window.addEventListener('mouseup', function () { arrastando = false; });
  telaMapa.addEventListener('touchstart', function (e) { moveMapa(e); e.preventDefault(); }, { passive: false });
  telaMapa.addEventListener('touchmove', function (e) { moveMapa(e); e.preventDefault(); }, { passive: false });

  var redim;
  window.addEventListener('resize', function () {
    clearTimeout(redim);
    redim = setTimeout(desenha, 120);
  });

  carrega(ARQUIVOS[0]);
})();
