# IGNIS — 3-minute talk

Local round format: **3 min presentation + 2 min Q&A.** The script below is in English so it matches
the slides; deliver it in Polish if the room prefers — the beats and the numbers are the same.
Numbers in **bold** are the ones to say slowly.

Every figure here is computed by `scripts/build_dataset.py` from the NASA PSI tables. If a number in
this script and a number in the app ever disagree, the app is right and this file is a bug.

---

## The script

About 440 spoken words — just under three minutes at a calm pace. Slide 5 is the one to cut if the clock runs.

### Slide 1 — findings first (0:00–0:35)

> Three things NASA's microgravity fire data tells a habitat designer to do differently.
> **Cut the ventilation.** The BASS operators tried to put burning samples out with nitrogen **18** times;
> **16** stayed lit — and in **10** of those the flame went out when the air flow was turned off.
> **Don't expect a fire to die on its own.** Near the 10.2 psi design pressure, at 30 to 34 percent oxygen,
> **0 of 17** FLEX droplets self-extinguished — against **14 of 29** at cabin air.
> **Detect finer smoke, later.** The SAME report: much of the smoke is below **500 nanometres**, and
> detection takes longer than on the ground.
> And where it stops: every solid-material test in the archive stops at **22.7 percent** oxygen. The
> challenge says lunar oxygen will be **30 percent or greater**. So all three are analogues, not answers.

### Slide 2 — three questions, three views (0:35–0:55)

> Which investigations matter for a rover, a lunar base, a transit cabin? The Atlas — ranked by a stated
> rule, or by the SI for the mission you describe, with a checked reason on every row.
> What supports modelling? The coverage map and an export that says where a model would extrapolate.

### Slide 3 — the funnel (0:55–1:15)

> **2,870 published rows** in **22 tables**. Specified by hand — three pressure units, two oxygen conventions —
> they become **1,936** test points. **264** are solid materials. **Zero** are at 30 percent.

### Slide 4 — the map (1:15–1:40)

> Oxygen across, pressure up. The band is the challenge's envelope. **83** points sit inside it — 66 gas,
> 17 droplet, **none solid**. Above 22.7 percent the only materials study is the BRE emulator — **194
> flames**, a gas burner, and no pressure recorded.

### Slide 5 — the second variable (1:40–1:55)

> The challenge says air flow matters too. **242** solid points record both oxygen and flow. Of **18**
> with an outcome, **15** extinguished — but **12** of those by turning the flow down. That is finding one again.

### Slide 6 — the SI layer (1:55–2:35)

> **107** sentences lifted verbatim from NASA documents; a script fails if one word differs. And **Ask
> IGNIS**: a language model that queries the same points itself — every citation is checked before it shows.
> *(Demo: click "Gap" — about four seconds. Then "Pressurized rover" above the Atlas.)*
> Offline, the page shows a real saved answer, with its date — never passed off as live.

### Slide 7 — what would close it (2:35–3:00)

> Suppression across diluents agrees with finding one: at 18 percent or less, **39 of 43** droplets went
> out in nitrogen, **24 of 27** with CO₂, **15 of 19** with helium — the gas does not change the outcome.
> **No solid-material test in this archive is above 22.7 percent or below 0.98 bar.** A microgravity
> campaign at the atmosphere in use would fill it. We measured the gap so somebody can.

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
- Najpierw wnioski, potem luka. Najważniejsze zdanie: *„So all three are analogues, not answers."* —
  powiedz je wolno, po pauzie.
- Jeśli zegar ucieka, pomiń slajd 5. Nie skracaj slajdów 1 ani 7.
- Na pytanie „a co jeśli dane są złe?" — odpowiedź 5 jest gotowa.
- Nie mów „model", jeśli nie chcesz pytania 4. Mów „zbiór gotowy do modelowania".
- Demo SI: kliknij gotowe pytanie, nie wpisuj na żywo. Zmierzone 14.11: 3–8 s; licznik sekund jest na
  ekranie, limit 25 s. Jeśli sieć padnie, strona sama pokaże zapisaną odpowiedź z datą — powiedz to głośno.
