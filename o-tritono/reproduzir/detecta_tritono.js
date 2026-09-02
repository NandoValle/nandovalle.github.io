/* -*- coding: utf-8 -*-
 * Detector de tritonos (classe de intervalo 6) em MIDIs transcritos.
 *
 * Porte em JavaScript de detecta_tritono.py, publicado no mesmo diretorio.
 * Mesma regra, mesmos limiares, mesma ordenacao — para que o navegador do
 * leitor chegue ao mesmo numero da tabela do laudo sem instalar nada.
 *
 * Melodico: notas consecutivas (onset seguinte ate 0,6 s do fim da anterior)
 * com |diferenca de pitch| mod 12 == 6.
 * Harmonico: pares de notas com sobreposicao temporal >= 30 ms e classe de
 * intervalo 6.
 *
 * O leitor de MIDI abaixo reproduz o comportamento do pretty_midi usado no
 * script Python: funde as notas de todos os instrumentos nao-percussivos
 * (canal 10 fica de fora), converte ticks em segundos pelo mapa de andamento
 * do arquivo e ordena por (inicio, altura).
 *
 * Limite conhecido: quando duas notas tem exatamente o mesmo inicio e a mesma
 * altura, a ordem entre elas depende da ordem de leitura, que nao e a mesma no
 * pretty_midi e aqui. Nos cinco MIDIs publicados isso nao muda contagem alguma
 * — as cinco linhas da tabela batem. Em outro arquivo, pode mudar.
 */
(function (global) {
  'use strict';

  /* ---------- leitura do arquivo MIDI (Standard MIDI File) ---------- */

  function leMidi(arrayBuffer) {
    var dv = new DataView(arrayBuffer);
    var p = 0;

    function texto(n) {
      var s = '';
      for (var i = 0; i < n; i++) { s += String.fromCharCode(dv.getUint8(p++)); }
      return s;
    }
    function u32() { var v = dv.getUint32(p); p += 4; return v; }
    function u16() { var v = dv.getUint16(p); p += 2; return v; }
    function u8() { return dv.getUint8(p++); }

    if (texto(4) !== 'MThd') { throw new Error('arquivo sem cabecalho MThd — nao e um MIDI'); }
    var tamCabecalho = u32();
    var formato = u16();
    var nTrilhas = u16();
    var divisao = u16();
    p += tamCabecalho - 6;

    var porQuadro = null, ticksPorSeminima = null;
    if (divisao & 0x8000) {
      var fps = 256 - ((divisao >> 8) & 0xFF);   // SMPTE: quadros por segundo
      var ticksPorQuadro = divisao & 0xFF;
      porQuadro = 1 / (fps * ticksPorQuadro);
    } else {
      ticksPorSeminima = divisao;
    }

    var eventosTempo = [];   // { tick, usecPorSeminima }
    var eventosNota = [];    // { tick, ligada, canal, altura, velocidade, ordem }
    var ordem = 0;

    for (var t = 0; t < nTrilhas; t++) {
      if (p >= dv.byteLength) { break; }
      var marca = texto(4);
      var tamTrilha = u32();
      var fimTrilha = p + tamTrilha;
      if (marca !== 'MTrk') { p = fimTrilha; continue; }

      var tick = 0;
      var statusCorrente = null;

      while (p < fimTrilha) {
        var delta = 0, b;                          // delta de tamanho variavel
        do { b = u8(); delta = (delta << 7) | (b & 0x7F); } while (b & 0x80);
        tick += delta;

        var status = dv.getUint8(p);
        if (status & 0x80) { p++; statusCorrente = status; }
        else { status = statusCorrente; }          // status corrente
        if (status === null) { break; }

        if (status === 0xFF) {                     // meta evento
          var tipoMeta = u8();
          var tam = 0, mb;
          do { mb = u8(); tam = (tam << 7) | (mb & 0x7F); } while (mb & 0x80);
          if (tipoMeta === 0x51 && tam === 3) {
            var usec = (dv.getUint8(p) << 16) | (dv.getUint8(p + 1) << 8) | dv.getUint8(p + 2);
            eventosTempo.push({ tick: tick, usecPorSeminima: usec });
          }
          p += tam;
          if (tipoMeta === 0x2F) { break; }        // fim da trilha
        } else if (status === 0xF0 || status === 0xF7) {
          var tamSx = 0, sb;                       // sysex: pula
          do { sb = u8(); tamSx = (tamSx << 7) | (sb & 0x7F); } while (sb & 0x80);
          p += tamSx;
        } else {
          var tipo = status & 0xF0;
          var canal = status & 0x0F;
          if (tipo === 0x90 || tipo === 0x80) {
            var altura = u8();
            var velocidade = u8();
            eventosNota.push({
              tick: tick,
              ligada: (tipo === 0x90 && velocidade > 0),
              canal: canal,
              altura: altura,
              velocidade: velocidade,
              ordem: ordem++
            });
          } else if (tipo === 0xC0 || tipo === 0xD0) {
            p += 1;
          } else {
            p += 2;
          }
        }
      }
      p = fimTrilha;
    }

    /* mapa de andamento -> segundos, como no pretty_midi:
       cada trecho tem uma escala fixa de segundos por tick */
    eventosTempo.sort(function (a, b) { return a.tick - b.tick; });
    var escalas = [{ tick: 0, spt: porQuadro !== null ? porQuadro : 0.5 / (ticksPorSeminima || 480) }];
    if (porQuadro === null) {
      for (var e = 0; e < eventosTempo.length; e++) {
        var spt = eventosTempo[e].usecPorSeminima / 1e6 / ticksPorSeminima;
        if (eventosTempo[e].tick === 0) { escalas[0] = { tick: 0, spt: spt }; }
        else { escalas.push({ tick: eventosTempo[e].tick, spt: spt }); }
      }
    }

    function tickParaSegundos(tk) {
      var tempo = 0;
      for (var i = 0; i < escalas.length; i++) {
        var ini = escalas[i].tick;
        var fim = (i + 1 < escalas.length) ? escalas[i + 1].tick : Infinity;
        if (tk <= fim) { return tempo + escalas[i].spt * (tk - ini); }
        tempo += escalas[i].spt * (fim - ini);
      }
      return tempo;
    }

    /* pareamento nota-ligada / nota-desligada por (canal, altura), como no
       pretty_midi: a nota-desligada fecha todas as ligadas abertas daquela
       chave, menos as de duracao zero, que continuam abertas */
    eventosNota.sort(function (a, b) {
      if (a.tick !== b.tick) { return a.tick - b.tick; }
      return a.ordem - b.ordem;
    });
    var abertas = {};
    var notas = [];
    for (var k = 0; k < eventosNota.length; k++) {
      var ev = eventosNota[k];
      if (ev.canal === 9) { continue; }            // percussao (canal 10) fora
      var chave = ev.canal + ':' + ev.altura;
      if (ev.ligada) {
        (abertas[chave] || (abertas[chave] = [])).push(ev);
      } else if (abertas[chave] && abertas[chave].length) {
        var mantidas = [];
        for (var m = 0; m < abertas[chave].length; m++) {
          var abre = abertas[chave][m];
          if (abre.tick === ev.tick) { mantidas.push(abre); continue; }
          notas.push({
            start: tickParaSegundos(abre.tick),
            end: tickParaSegundos(ev.tick),
            pitch: abre.altura,
            velocity: abre.velocidade
          });
        }
        abertas[chave] = mantidas;
      }
    }

    notas.sort(function (a, b) {
      if (a.start !== b.start) { return a.start - b.start; }
      return a.pitch - b.pitch;
    });

    var duracao = 0;
    for (var d = 0; d < notas.length; d++) { if (notas[d].end > duracao) { duracao = notas[d].end; } }

    return {
      notas: notas,
      duracao: duracao,
      formato: formato,
      trilhas: nTrilhas,
      divisao: divisao
    };
  }

  /* ---------- o detector, linha a linha como no Python ---------- */

  function detecta(notas) {
    var melodicos = [];
    for (var i = 0; i < notas.length - 1; i++) {
      var a = notas[i];
      // proxima nota com onset apos o onset de a (evita par harmonico duplicado)
      for (var j = i + 1; j < Math.min(i + 6, notas.length); j++) {
        var b = notas[j];
        if (b.start <= a.start + 0.02) { continue; }   // simultanea -> harmonico
        if (b.start - a.end > 0.6) { break; }
        if (Math.abs(b.pitch - a.pitch) % 12 === 6) {
          melodicos.push({ t: a.start, p1: a.pitch, p2: b.pitch, i: i, j: j });
        }
        break;                                          // so o proximo evento melodico real
      }
    }
    var harmonicos = [];
    for (var x = 0; x < notas.length; x++) {
      var c = notas[x];
      for (var y = x + 1; y < notas.length; y++) {
        var e = notas[y];
        if (e.start >= c.end) { break; }
        var solap = Math.min(c.end, e.end) - e.start;
        if (solap >= 0.03 && Math.abs(e.pitch - c.pitch) % 12 === 6) {
          harmonicos.push({ t: e.start, p1: c.pitch, p2: e.pitch, i: x, j: y });
        }
      }
    }
    return { total: notas.length, melodicos: melodicos, harmonicos: harmonicos };
  }

  /* ---------- nomes e formatos ---------- */

  var NOMES = {
    pt: ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'],
    en: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
  };

  function nomeNota(altura, idioma) {
    var tab = NOMES[idioma] || NOMES.en;
    return tab[altura % 12] + (Math.floor(altura / 12) - 1);
  }

  function mmss(t, idioma) {
    var m = Math.floor(t / 60);
    var s = t % 60;
    var txt = (s < 10 ? '0' : '') + s.toFixed(1);
    return m + ':' + (idioma === 'pt' ? txt.replace('.', ',') : txt);
  }

  global.Tritono = {
    leMidi: leMidi,
    detecta: detecta,
    nomeNota: nomeNota,
    mmss: mmss
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) { module.exports = globalThis.Tritono; }
