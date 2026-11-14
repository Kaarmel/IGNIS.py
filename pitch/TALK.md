# IGNIS — 3-minute talk

Local round format: **3 min presentation + 2 min Q&A.** The script below is in English so it matches
the slides; deliver it in Polish if the room prefers — the beats and the numbers are the same.
Numbers in **bold** are the ones to say slowly.

Every figure here is computed by `scripts/build_dataset.py` from the NASA PSI tables. If a number in
this script and a number in the app ever disagree, the app is right and this file is a bug.

---

## The script

Five slides, about 300 spoken words — under three minutes at a calm pace, with room for the live demo.
Backup slides 1–5 (the question, the funnel, air flow, the SI layer, the full verdict) are for Q&A only.

### Slide 1 — the hook (0:00–0:35)

> The Apollo 1 crew died in a fire in an oxygen-filled spacecraft. The challenge says the Moon Base and
> pressurized rovers will run at **30 percent oxygen or more** — making materials much more flammable.
> We read NASA's open microgravity archive, PSI: **264** solid-material test points. **Zero** at 30 percent.
> Every one stops at **22.7**. That is **7.3 points** of oxygen with no solid test in the open archive.
> Not in all of science — SoFIE-GEL burned plastic on the ISS up to 34 percent — but its points are not in PSI.

### Slide 2 — where the data exists (0:35–1:05)

> Oxygen across, pressure up. The shaded box is the lunar cabin. **83** points sit inside it: gas flames and
> droplets. **Zero** solids. The solids all ran at one atmosphere, and their oxygen was lowered by adding
> nitrogen to cabin air — the method could only go down.

### Slide 3 — ask what the data cannot answer (1:05–1:55)

> A judge's question: how would polyurethane foam burn at 30 percent, compared with Nomex?
> *(Demo: "Beyond the data" — about five seconds. If the network fails, the page shows a saved real answer, labelled.)*
> The archive has no foam. The SI does not guess. It names the nearest measured solid and its
> **distance from evidence**: **7.3 points** short on oxygen, **43 percent** high on pressure — two numbers,
> no weights. Then it names the test that would close it. Every citation is checked before it is shown.

### Slide 4 — what closes it (1:55–2:30)

> Step zero costs nothing: publish SoFIE-GEL in PSI. Then **30** tests — five materials already burned near the
> ceiling, three oxygen levels, two pressures, one test per condition, which is what BASS did most of the time.
> Every cell is computed from the corpus.

### Slide 5 — what a designer gets (2:30–3:00)

> Three signals. **16 of 18** nitrogen attempts left a burning solid lit — test cutting the air flow first.
> **0 of 17** droplets near the design pressure went out on their own. Much of the smoke is under
> **500 nanometres**, and detection is slower. Analogues, all three. The campaign turns them into answers.

---

## Q&A — prepared answers

**1. „Gdzie tu jest SI? To tylko wykresy."**
Dwa miejsca: panel *Zapytaj IGNIS* i ranking Atlasu „Opisz misję”. Model językowy (DeepSeek V4.1 Flash przez OpenRouter, serwer na
Cloudflare Workers) dostaje te same 1936 punktów i sam je odpytuje narzędziem `query_points`, więc liczby
w odpowiedzi pochodzą z danych, a nie z pamięci modelu. Każde badanie, które cytuje, i każde zdanie
w cudzysłowie jest sprawdzane względem korpusu przed wyświetleniem; nieznane źródło jest na czerwono.
Pięć gotowych pytań odpowiada czasownikom z challenge'u: uszereguj, wyciągnij dane, zinterpretuj,
Ziemia i luka. Dla opisanej misji (łazik, baza, kabina tranzytowa) model zwraca kolejność badań z jednym
zdaniem uzasadnienia; worker odrzuca listę z nieistniejącym lub powtórzonym badaniem albo z cytatem,
którego nie ma w korpusie, i wtedy strona wraca do rankingu regułowego. Pod spodem druga warstwa: 107 dosłownych cytatów (84 z PSI, 23 z przewodnika NASA 2015),
które `scripts/verify_insights.py` sprawdza ponownie w plikach źródłowych.

**2. „Dlaczego 30%, a nie 26,5%?"**
Bo 30% to liczba z samego challenge'u: „will likely be 30% or greater, with a corresponding pressure of
10.2 psi or less". 26,5% to drugi znacznik — nominał referencyjnego habitatu Artemis z NTRS
20220000245 — i dalej go pokazujemy, razem z trybem 8,2 psia / 34%. Oba są na mapie i w solverze.
Różnica jest taka, że 30% to punkt, względem którego challenge każe oceniać korpus, więc to on jest
domyślnym środowiskiem rankingu. Sufit 22,7% jest ten sam w obu przypadkach: 7,3 punktu do 30%,
3,8 do 26,5%, 11,3 do 34%.

**3. „A co z BRE? To przecież badanie palności materiałów."**
Tak — i dlatego ma własną klasę, a nie zostało wciśnięte w gazowe. BRE to 18 dni testowych, 194
zapalone płomienie, 21–40% tlenu, palniki 25 i 50 mm. To emulacja przypowierzchniowego spalania
materiału stałego palnikiem gazowym, nie test próbki stałej. I nie da się go położyć na mapie: tabela
nie ma kolumny ciśnienia, a jej własna notatka mówi, że ciśnienia „were also varied but are not
identified in this summary table". Dlatego w obwiedni dwuosiowej liczy się jako zero, a w opisie jako
to, czym jest — jedyne badanie w PSI sięgające powyżej 22,7% dla materiałów palnych.

**4. „Dlaczego nie ma modelu predykcyjnego?"**
Challenge prosi o wyciągnięcie danych, które wspierają modelowanie („Extract data that supports predictive
modeling”), a nie o sam model. A powyżej 22,7% dla materiałów stałych w PSI nie ma ani jednego punktu treningowego — model w tym miejscu
byłby pewną siebie odpowiedzią nad dziurą, a w bezpieczeństwie pożarowym pewna siebie zła odpowiedź
zabija ludzi. Zamiast modelu dostarczamy to, czego model potrzebuje: znormalizowany zbiór do pobrania
w CSV i JSON, z jednostkami, akcesją, numerem wiersza i informacją, skąd wzięło się ciśnienie — plus
jedno zdanie na ekranie, które mówi, jakie zakresy zbiór pokrywa i gdzie model ekstrapolowałby.
Solver to wyszukiwanie plus jawna arytmetyka odległości, więc każdy może go sprawdzić wiersz po
wierszu.

**5. „Skąd pewność, że 22,7% to nie artefakt parsera?"**
Bo sprawdziliśmy to niezależnie. 252 z 264 punktów stałych ma ciśnienie zapisane gdzieś w korpusie —
BASS w macierzy „as run", BASS-II w raporcie zbiorczym, Saffire-I w arkuszu czujników — a wszystkie
252 leżą między 0,98 i 1,03 bar. Sufit 22,7% policzony jest z 261 punktów, które poziom tlenu
faktycznie zapisują; najwyższy z nich to wiersz 55 BASS (PSI-26). Sam raport BASS-II mówi, że rozcieńczał powietrze ISS azotem — czyli sufit jest
granicą metody, nie granicą bezpieczeństwa. Rachunek się domyka i jest na slajdzie: 2 870 wierszy,
959 odrzuconych, 1 911 wierszy dających punkty i 1 936 punktów, bo 18 wierszy BRE rozwija się w 43.

**6. Czy to działa bez internetu?**
Wszystko poza SI na żywo — otwiera się z pliku, zero zależności. Gdy serwer SI nie odpowiada albo minie
25 s, strona pokazuje prawdziwą odpowiedź zapisaną wcześniej z działającego serwera, z etykietą „odpowiedź
zapisana <data>, nie na żywo”, i przyciskiem ponowienia. Dotyczy to sześciu gotowych pytań i trzech misji.

**7. Czy liczby są wpisane ręcznie?**
Nie. Każda liczba jest liczona z tabel NASA przez `scripts/build_dataset.py` i
`scripts/build_telemetry.py`, a cytaty sprawdza `scripts/verify_insights.py`. Liczby w README, zgłoszeniu,
tym skrypcie i decku sprawdza `scripts/check_docs.py`: każda musi występować w `dataset.js`, a wyjątki
(lata, zmierzone czasy odpowiedzi) są wypisane z powodem. Wszystko naraz: `sh scripts/check_all.sh`.

**8. Co z tego ma NASA?**
Cztery rzeczy: nazwany zakres, którego nie wolno ekstrapolować (powyżej 22,7% O₂ dla materiałów
stałych, przy 0,98–1,03 bar), zmierzony wynik testów kropelkowych przy atmosferze projektowej
(0 wygaśnięć na 17, wobec 14 na 29 w tej samej serii rozcieńczanej azotem przy powietrzu kabinowym),
drugą oś, której nikt nie narysował (przepływ: 498 punktów z obiema osiami), i gotowy zbiór do
modelowania z jawnie podanym zakresem ważności.

**9. Co z tego ma Ziemia?**
Karta *Na Ziemi*: wykrywanie (SAME mierzy, czym dym w mikrograwitacji różni się od ziemskiego; wśród
osiągnięć tego obszaru przewodnik NASA wymienia czujnik, który w testach z FAA pokonał lotnicze czujniki dymu w odrzucaniu
fałszywych alarmów), gaszenie (mgła wodna na ISS, z jasnym zaznaczeniem, że w tych akcesjach
nie ma testu mgły) i paliwa (modele heptanu i metanolu z FLEX są podstawą modeli diesla i paliwa
lotniczego). Cytaty z przewodnika NASA przechodzą przez ten sam weryfikator.

**10. „SoFIE badał wyższy tlen na ISS. Czy luki naprawdę nie ma?"**
Jest — w otwartym archiwum. SoFIE-GEL spalał na ISS kule PMMA 4 cm przy 13–34% O₂ i 0,15–1,1 atm
(James i in., *Combustion and Flame* 277, 114244, 2025). Tych punktów nie ma w PSI, więc nikt, kto
pracuje na otwartych danych, ich nie użyje. Dlatego pierwszy krok kampanii to opublikować je w PSI.
Na stronie stoi to w werdykcie, z tym samym źródłem.

**11. „Materiały kwalifikuje się na Ziemi w docelowej atmosferze (NASA-STD-6001), więc luki nie ma."**
Test na Ziemi biegnie w 1 g. Sam korpus mówi, że to nie jest najgorszy przypadek: BASS zobaczył
podwyższoną palność w mikrograwitacji w geometrii, w której w powietrzu przy 1 g płomień sam gaśnie
(PSI-26), a cel BASS-II to porównać najgorszy przypadek w statku z „terrestrial upward burning used to
screen the materials” (PSI-25). Oba cytaty przechodzą weryfikator. Pytanie brzmi więc nie „czy materiał
przeszedł Test 1”, tylko „czy w mikrograwitacji przy 30% jest gorzej” — i tego PSI nie zawiera.

**12. „Wyłączenie wentylacji to wiedza operacyjna NASA od dawna."**
Zgadza się — i nie sprzedajemy tego jako odkrycia. Pokazujemy, skąd to wiadomo w otwartych danych:
18 prób gaszenia azotem w notatkach operatorów BASS, 16 nieudanych, w 10 płomień zgasł po odcięciu
przepływu. To małe próbki w komorze rękawicowej — sygnał do sprawdzenia w skali kabiny, nie przepis.

**13. „To tylko SQL w języku naturalnym — na większość pytań odpowie »brak danych«."**
Na pytanie spoza archiwum (gotowy przycisk *Poza danymi*: pianka poliuretanowa przy 30% O₂) SI nie
odpowiada „brak danych”. Mówi, czego brakuje, podaje najbliższy zmierzony punkt z odległością od dowodu
— osobno w tlenie (pp) i w ciśnieniu (%), bez wag — i nazywa test, który by tę lukę zamknął. To samo
liczy solver. Model nie zgaduje, ale odpowiedź jest użyteczna dla inżyniera.

---

## Delivery notes

- **Nie czytaj slajdów.** Slajdy mają liczby; ty masz powiedzieć, co one znaczą.
- Najważniejsze zdanie: *„Not in all of science — but its points are not in PSI."* Zawsze mów „w otwartym
  archiwum PSI”, nigdy „NASA tego nie zbadała”.
- Jeśli zegar ucieka, skróć slajd 5 do jednego zdania. Nie skracaj slajdów 1 ani 3.
- Na pytanie „a co jeśli dane są złe?" — odpowiedź 5 jest gotowa; „SoFIE?" — 10; „STD-6001?" — 11;
  „to tylko SQL?" — 13. Slajdy zapasowe: strzałka w prawo za slajdem 5.
- Nie mów „model", jeśli nie chcesz pytania 4. Mów „zbiór gotowy do modelowania".
- Demo SI: kliknij *Beyond the data*, nie wpisuj na żywo. Zmierzone 14.11 na wdrożeniu końcowym: zwykle 2.6–11.0 s, raz 26.0 s; licznik sekund jest na
  ekranie, limit 25 s. Jeśli sieć padnie, strona sama pokaże zapisaną odpowiedź z datą — powiedz to głośno.
  Zapas: nagranie `pitch/img/demo.gif`.
