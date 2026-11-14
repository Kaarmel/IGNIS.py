# Dane — NASA PSI (Physical Science Informatics)

Źródło: [NASA PSI](https://psi.nasa.gov/physci/repo/) — publiczna baza wyników eksperymentów
fizycznych z ISS, Shuttle, lotów parabolicznych i badań naziemnych.

Licencja: **CC0-1.0** (Creative Commons Zero, domena publiczna). Cytowanie DOI mile widziane.

## Co tu leży

- `psi_data/` — pliki pobrane z PSI (poza gitem, patrz `.gitignore`)
- `index.json` — indeks wszystkich plików z metadanymi

## Zakres pobrania

Wszystkie 22 akcesje z `Research Area = "Combustion Science"`, pliki CSV/TXT/PDF/XLS/DOCX.
Surowe wideo (mp4, ~13 TB) celowo pominięte — nie ma wartości analitycznej dla tego zadania.

## Odtworzenie

API PSI jest nieudokumentowane. Endpointy:

```
GET  /geode-py/ws/repo/search?term=&size=500&ffield=Research%20Area&fvalue=combustion%20science
GET  /geode-py/ws/repo/investigations/{ACCESSION}
GET  /geode-py/ws/studies/{ACCESSION}/download?file={NAME}&version={VER}&redirect=false
     → zwraca presigned S3 URL, nie plik; trzeba go pobrać osobno
```

## Eksperymenty

| Accession | Akronim | Paliwo | Wymiary w tabeli |
|---|---|---|---|
| PSI-159 | ACME CFI-G | gaz | O₂, ciśnienie, przepływ, wynik |
| PSI-10 | ACME / Flame Design | gaz | O₂, ciśnienie |
| PSI-69 | FLEX | kropla cieczy | O₂, ciśnienie, wynik |
| PSI-68 | FLEX-2 | kropla cieczy | plan testów (8 wierszy) |
| PSI-25 | BASS-II | ciało stałe | O₂, przepływ |
| PSI-26 | BASS | ciało stałe | materiał |
| PSI-98/99/100 | SAFFIRE-I/II/III | ciało stałe | O₂, przepływ, wynik |
| PSI-39 | CFI | kropla cieczy | O₂, ciśnienie |
| PSI-107 | SPICE | gaz | przepływ, wynik |
| PSI-20/21/22/23 | ACME BRE / CLD / E-FIELD / s-Flame | gaz | częściowe |
| PSI-101/102 | SAME-R / SAME | aerozol | przepływ |
| PSI-47 | DAFT / DAFT-2 | pył | materiał |
| PSI-106 | SLICE | gaz | materiał |

## Znana luka

**Żaden eksperyment z ciałem stałym nie został przeprowadzony przy ciśnieniu
projektowym bazy księżycowej.** 252 z 264 punktów stałych ma ciśnienie zapisane
gdzieś w korpusie — 121 w tabeli testu (macierz „as run” BASS), 129 w raporcie
zbiorczym BASS-II (99,2–99,5 kPa), 2 w arkuszu czujników Saffire-I
(14,85–14,90 psia) — i wszystkie leżą między 0,983 a 1,028 bar, czyli przy jednej
atmosferze. Dwanaście punktów nie ma ciśnienia nigdzie. Osi ciśnienia nigdy nie
zmieniano; zmieniano tylko tlen i tylko w dół — BASS-II rozcieńczał powietrze ISS
azotem od 13,6 do 22,2% O₂, więc sufit 22,7% jest granicą metody, a nie
bezpieczeństwa. Zachowanie tkanin i plastików przy planowanym ciśnieniu bazy
księżycowej (10.2 psi ≈ 0.70 bar, ≥26,5% O₂) **nie jest pokryte przez publiczne
dane PSI**.
