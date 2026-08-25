# -*- coding: utf-8 -*-
"""Detector de tritonos (intervalo de 6 semitons) em MIDIs transcritos.

Melodico: notas consecutivas (onset seguinte ate 0,6 s do fim da anterior)
com |diferenca de pitch| mod 12 == 6.
Harmonico: pares de notas com sobreposicao temporal >= 30 ms e classe de
intervalo 6.
"""
import sys
import pretty_midi

def mmss(t):
    return f"{int(t//60)}:{t%60:04.1f}"

def analisa(caminho):
    pm = pretty_midi.PrettyMIDI(caminho)
    notas = []
    for inst in pm.instruments:
        if inst.is_drum:
            continue
        notas.extend(inst.notes)
    notas.sort(key=lambda n: (n.start, n.pitch))
    total = len(notas)

    melodicos = []
    for i in range(len(notas) - 1):
        a = notas[i]
        # proxima nota com onset apos o onset de a (evita par harmonico duplicado)
        for j in range(i + 1, min(i + 6, len(notas))):
            b = notas[j]
            if b.start <= a.start + 0.02:
                continue  # praticamente simultanea -> harmonico, nao melodico
            if b.start - a.end > 0.6:
                break
            if abs(b.pitch - a.pitch) % 12 == 6:
                melodicos.append((a.start, a.pitch, b.pitch))
            break  # so o proximo evento melodico real

    harmonicos = []
    for i in range(len(notas)):
        a = notas[i]
        for j in range(i + 1, len(notas)):
            b = notas[j]
            if b.start >= a.end:
                break
            solap = min(a.end, b.end) - b.start
            if solap >= 0.03 and abs(b.pitch - a.pitch) % 12 == 6:
                harmonicos.append((b.start, a.pitch, b.pitch))

    nome = pretty_midi.note_number_to_name
    print(f"== {caminho}")
    print(f"   notas analisadas: {total}")
    print(f"   TRITONOS MELODICOS: {len(melodicos)}")
    for t, p1, p2 in melodicos[:12]:
        print(f"      {mmss(t)}  {nome(p1)} -> {nome(p2)}")
    if len(melodicos) > 12:
        print(f"      ... e mais {len(melodicos)-12}")
    print(f"   TRITONOS HARMONICOS (sobrepostos >=30ms): {len(harmonicos)}")
    for t, p1, p2 in harmonicos[:12]:
        print(f"      {mmss(t)}  {nome(p1)} + {nome(p2)}")
    if len(harmonicos) > 12:
        print(f"      ... e mais {len(harmonicos)-12}")
    print()
    return total, len(melodicos), len(harmonicos)

if __name__ == "__main__":
    resumo = []
    for caminho in sys.argv[1:]:
        try:
            t, m, h = analisa(caminho)
            resumo.append((caminho, t, m, h))
        except Exception as e:
            print(f"== {caminho}\n   ERRO: {e}\n")
    print("===== RESUMO =====")
    for caminho, t, m, h in resumo:
        print(f"{caminho}: {t} notas | melodicos={m} | harmonicos={h}")
