# IGNIS — 3-minute talk

Local round format: **3 min presentation + 2 min Q&A.** The script below is in English so it matches
the slides; deliver it in Polish if the room prefers — the beats and the numbers are the same.
Numbers in **bold** are the ones to say slowly.

Every figure here is computed by `scripts/build_dataset.py` from the NASA PSI tables. If a number in
this script and a number in the app ever disagree, the app is right and this file is a bug.

---

## The script

Seven pages in the deck: five slides, about 300 spoken words — under three minutes at a calm pace, with
room for the live demo — and two backup slides (the challenge's three questions, the row funnel) for Q&A.

### Slide 1 — the hook (0:00–0:35)

> The Apollo 1 crew died in a fire in an oxygen-filled spacecraft. The challenge says the Moon Base and
> pressurized rovers will run at **30 percent oxygen or more**. We read NASA's open microgravity archive:
> **264** tests on solid materials — fabrics, films, plastics, what a habitat is built from. **Zero** at
> 30 percent. They stop at **22.7**. Not in all of science — SoFIE-GEL burned plastic on the ISS up to 34
> percent — but its points are not in the open archive.

### Slide 2 — same oxygen, not the same fire (0:35–1:05)

> Oxygen across, pressure up. The orange box is the challenge atmosphere: **83** tests inside, gas flames
> and droplets — **zero** solids. You could say: at 10.2 psi, 30 percent is about as much oxygen as in the
> tests' own cabin air. True — that is the dotted curve, and **86** solid tests reached it. None reached
> the **30 percent share**. And NASA certifies materials at exactly 30 percent and 10.2 psia, because the
> share drives flammability.

### Slide 3 — ask what the data cannot answer (1:05–1:55)

> How would polyurethane foam burn at 30 percent, compared with Nomex?
> *(Demo: Search and ask → Ask the SI → "Beyond the data". If the network fails, the page shows a saved
> real answer, labelled with its date — say so.)*
> The archive has no foam, and the SI says so. It names the nearest real test — fabric, BASS row 55 —
> and its **distance from evidence**: **7.3 points** short on oxygen, **43 percent** high on pressure.
> Then it names the test that would close it. Every source and number is checked before it is shown.
> *(Click "BASS · PSI-26 · row 55": the NASA file and row open.)*

### Slide 4 — where to test next (1:55–2:30)

> Step zero costs nothing: publish SoFIE-GEL in PSI. Then **30** tests: the five materials already burned
> closest to the ceiling, at three oxygen levels and two pressures, one test each — what BASS did for 131
> of its 174 conditions. They are the hollow circles on the map.

### Slide 5 — what a designer gets today (2:30–3:00)

> A line not to extrapolate past: **22.7 percent**, and only near one atmosphere. The **30** tests that
> would remove it. And three signals to test first: **16 of 18** nitrogen attempts left a burning solid
> lit; **0 of 17** droplets near the design pressure went out on their own; much of the smoke is under
> **500 nanometres**. Every number opens its NASA row. IGNIS — where to test next.

---

## Q&A — 10 kart

Ułożone od pytania najbardziej prawdopodobnego i najważniejszego (karta 1) do najmniej (karta 10).
Każda karta: odpowiedź na ~20 sekund, jedno zdanie na dopytanie i czego nie mówić.

### Karta 1 — „Gdzie tu jest SI? To tylko wykresy.”

**Odpowiedź.** W dwóch miejscach. *Zapytaj SI*: model językowy (DeepSeek V4.1 Flash) sam odpytuje te same
1 936 punktów testowych, więc liczby w odpowiedzi pochodzą z danych, nie z pamięci modelu. Zanim
odpowiedź się pokaże, każde źródło, cytat i liczba są sprawdzane względem korpusu; czego nie da się
potwierdzić, jest na czerwono. Drugie: SI szereguje badania w Atlasie dla opisanej misji. Pokażę na żywo.
**Jeśli dopytają:** pod spodem jest 107 dosłownych cytatów z raportów NASA, które skrypt sprawdza w plikach źródłowych.
**Nie mów:** „SI wie”, „SI jest nieomylne”.

### Karta 2 — „Co z tego ma NASA? Kto tego użyje jutro?”

**Odpowiedź.** Inżynier bezpieczeństwa pożarowego habitatu, który musi powiedzieć, czy materiały wnętrza
są sprawdzone dla atmosfery bazy. Dostaje trzy rzeczy: granicę, poza którą nie wolno ekstrapolować
(22,7% tlenu, tylko przy około 1 bar), listę 30 testów, które ją przesuną, z odległością każdego od
najbliższego prawdziwego testu, i jednostronicowy raport do wydruku. Krok zero nic nie kosztuje:
opublikować w PSI dane SoFIE-GEL.
**Jeśli dopytają:** użytkownik to hipoteza — nie było rozmowy z inżynierem NASA przed wydarzeniem; mówimy to wprost (slajd zapasowy 1).
**Nie mów:** „NASA musi”, „to jest bezpieczne / niebezpieczne”.

### Karta 3 — „Skąd pewność, że 22,7% to nie błąd parsera?”

**Odpowiedź.** Każda tabela jest opisana ręcznie, bo zwykły parser myli jednostki (atm, bar, mmHg; tlen
jako ułamek i jako procent). Rachunek się domyka: 2 870 wierszy, 959 odrzuconych z nazwaną przyczyną,
1 936 punktów. Najwyższy punkt stały to konkretny wiersz: BASS, PSI-26, wiersz 55 — można go otworzyć na
stronie. A sam raport BASS-II mówi, że tlen obniżano, dodając azot do powietrza stacji — metoda mogła
iść tylko w dół. To granica metody, nie parsera.
**Jeśli dopytają:** 252 z 264 punktów stałych ma ciśnienie zapisane gdzieś w korpusie i wszystkie leżą między 0,98 a 1,03 bar (slajd zapasowy 2).
**Nie mów:** „to na pewno granica bezpieczeństwa”.

### Karta 4 — „Przy 10,2 psi i 30% tlenu jest tyle tlenu co w powietrzu. W czym problem?”

**Odpowiedź.** Zgadza się co do ilości: ciśnienie cząstkowe tlenu to około 0,21 bar — to kropkowana
krzywa na mapie i 86 z 252 testów stałych ją osiąga. Ale palność zależy bardziej od **udziału** tlenu niż
od jego ciśnienia cząstkowego: mniej azotu to mniej gazu, który odbiera płomieniowi ciepło. To nie nasza
teza — NASA z tego powodu certyfikuje wszystkie materiały statków przy 30% O₂ i 10,2 psia (Hirsch i in.,
NTRS 20090012334), a praca Harper i in. (NTRS 20160001047) stwierdza, że palność bardziej zależy od
stężenia tlenu niż od równoważnego ciśnienia cząstkowego.
**Jeśli dopytają:** tego udziału — 30% — nie osiągnął w archiwum żaden test materiału stałego.
**Nie mów:** konkretnych liczb z tych prac poza 30% i 10,2 psia — nie ma ich w korpusie.

### Karta 5 — „Dlaczego nie ma modelu predykcyjnego?”

**Odpowiedź.** Challenge prosi o dane, które wspierają modelowanie, nie o sam model. Powyżej 22,7% dla
materiałów stałych w archiwum nie ma ani jednego punktu treningowego — model dałby tam pewną siebie
odpowiedź nad dziurą. Zamiast tego jest znormalizowany zbiór do pobrania (CSV i JSON, z jednostką,
akcesją i numerem wiersza przy każdej wartości) i zdanie, w jakim zakresie model by ekstrapolował.
**Jeśli dopytają:** solver to wyszukiwanie plus jawna arytmetyka odległości — każdy może go sprawdzić.
**Nie mów:** „model” o czymś, co nim nie jest; mów „zbiór gotowy do modelowania”.

### Karta 6 — „SoFIE badał wyższy tlen na ISS. Czy luka naprawdę jest?”

**Odpowiedź.** Jest — w otwartym archiwum. SoFIE-GEL spalał na ISS kule PMMA przy 13–34% O₂ i
0,15–1,1 atm (James i in., *Combustion and Flame* 277). Tych punktów nie ma w PSI, więc nikt, kto pracuje
na otwartych danych, ich nie użyje. Dlatego krok zero planu to opublikować je w PSI. Mówimy to na
pierwszym slajdzie.
**Jeśli dopytają (NASA-STD-6001):** test kwalifikacyjny biegnie w 1 g, a sam korpus pokazuje, że w mikrograwitacji bywa gorzej — BASS widział palność w geometrii, która w 1 g sama gaśnie.
**Nie mów:** „NASA tego nie zbadała”.

### Karta 7 — „SI cytuje dobrze, a co jeśli źle rozumuje?”

**Odpowiedź.** Weryfikacja łapie to, co da się sprawdzić automatycznie: nieistniejące badanie, cytat,
którego nie ma w pliku, liczbę bez pokrycia w danych — taka odpowiedź wraca do modelu do poprawki albo
dostaje czerwone oznaczenie. Wnioskowania automat nie sprawdzi — dlatego SI tylko podpowiada, a każde
twierdzenie ma klikalne źródło, które człowiek może otworzyć.
**Jeśli dopytają:** zapisane odpowiedzi zapasowe przechodzą ten sam test przy każdym `check_all.sh`.
**Nie mów:** „halucynacje są wyeliminowane”.

### Karta 8 — „Jak zrobić te 30 testów, skoro BASS mógł tylko obniżać tlen?”

**Odpowiedź.** W komorze z własną atmosferą, nie w powietrzu stacji. Taka aparatura już istnieje:
SoFIE-GEL na ISS doszedł do 34% tlenu przy 0,15–1,1 atm. Plan to pięć materiałów już spalonych najbliżej
sufitu, trzy poziomy tlenu i dwa ciśnienia, po jednym teście — tyle, ile BASS robił dla 131 ze swoich 174
warunków.
**Jeśli dopytają o koszt:** nie liczyliśmy go; podajemy, co zmierzyć, nie budżet.
**Nie mów:** liczb kosztów ani terminów.

### Karta 9 — „Dlaczego 30%, a nie 26,5%?”

**Odpowiedź.** 30% to liczba z samego challenge'u: „30% or greater, with a corresponding pressure of 10.2
psi or less”. 26,5% to nominał referencyjnego habitatu Artemis (Kessler i in., NTRS 20220000245), a 34% to
jego tryb awaryjny — oba są w solverze. Sufit jest ten sam: brakuje 7,3 punktu do 30%, 3,8 do 26,5% i
11,3 do 34%.
**Nie mów:** „wymóg NASA” o 30% — challenge pisze „likely”.

### Karta 10 — „A jeśli SI albo internet padnie na scenie?”

**Odpowiedź.** Cała strona poza SI działa z pliku, bez serwera i bez zależności. Gdy SI nie odpowie w 25
sekund, strona sama pokazuje prawdziwą odpowiedź zapisaną wcześniej z działającej usługi, z datą i
napisem „nie na żywo”, i przycisk ponowienia. Do tego nagranie `pitch/img/demo.gif`.
**Nie mów:** że zapisana odpowiedź jest na żywo.

### Rezerwa (jedno zdanie każda)

- **Dlaczego DeepSeek?** Szybki i tani; model to jedna linia w workerze, a weryfikacja nie zależy od modelu.
- **BRE?** Palnik gazowy emulujący płonącą powierzchnię, 21–40% O₂, bez zapisanego ciśnienia — dlatego osobna klasa, nie test materiału stałego.
- **„Wyłączenie wentylacji to stara wiedza.”** Zgoda — pokazujemy, skąd to widać w otwartych danych: 16 z 18 prób gaszenia azotem nieudanych, w 10 płomień zgasł po odcięciu przepływu. Sygnał, nie procedura.
- **Co powstało w czasie hackathonu?** Odpowiedz sam(a), zgodnie z prawdą — tego dokument nie wie.

---

## Delivery notes

- **Nie czytaj slajdów.** Slajdy mają liczby; ty masz powiedzieć, co one znaczą.
- Najważniejsze zdania: *„Not in all of science — but its points are not in the open archive.”* oraz na
  slajdzie 2 *„Same oxygen, not the same fire.”* Zawsze mów „w otwartym archiwum PSI”, nigdy „NASA tego nie zbadała”.
- Prosty język w pierwszych 30 sekundach: „otwarte archiwum NASA”, „punkty procentowe”, nie „PSI”, „pp”, „akcesja”.
- Jeśli zegar ucieka, skróć slajd 5 do jednego zdania. Nie skracaj slajdów 1 ani 3.
- Demo SI: w sekcji *Search and ask* kliknij zakładkę *Ask the SI*, potem *Beyond the data*, nie wpisuj na
  żywo. Zmierzone 14.11 na wdrożeniu końcowym: zwykle 2.6–11.0 s, raz 26.0 s; na ekranie widać kolejne
  etapy — możesz je czytać na głos; limit 25 s. Jeśli sieć padnie, strona sama pokaże zapisaną odpowiedź
  z datą — powiedz to głośno. Potem kliknij w odpowiedzi „BASS · PSI-26 · row 55”.
- Na stronie przycisk *Check the Moon-base atmosphere* na pierwszym ekranie daje werdykt jednym kliknięciem — dobry zapas, gdy SI jest wolne.
- Nie mów „model”, jeśli nie chcesz karty 5. Mów „zbiór gotowy do modelowania”.
