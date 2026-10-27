# PAC-MAN: THE MAN EDITION

## Zadání pro programovacího AI agenta

Vytvoř kompletní, funkční webovou arkádovou hru inspirovanou klasickým Pac-Manem. Použij **HTML5, CSS3 a čistý JavaScript** bez backendu, databáze a povinných externích knihoven. Hra se musí spustit otevřením `index.html` v moderním prohlížeči. Výsledkem má být skutečně hratelná hra, nikoli vizuální prototyp.

## 1. Základ hry

- Klasické bludiště se zdmi, chodbami a tečkami ke sbírání.
- Hráč ovládá Pac-Mana šipkami nebo klávesami WASD; pohyb je plynulý, s automatickým pokračováním zvoleným směrem.
- Na mapě se pohybují čtyři duchové s různým chováním (náhodný pohyb, pronásledování, předvídání směru a kombinace).
- Sbírání teček zvyšuje skóre. Po sesbírání všech teček následuje další úroveň.
- Hráč začíná se třemi životy; kontakt s nebezpečným nepřítelem odebere život a obnoví pozice postav.
- Úvodní obrazovka, pauza (P/Escape), konec hry, restart a přehledné zobrazení skóre, životů, úrovně a bonusů.

## 2. Studentské požadavky – povinné funkce

### A. Pac-Man zrychluje podle skóre

Čím více bodů hráč získá, tím rychleji se Pac-Man pohybuje. Orientační nastavení (snadno změnitelné konstanty):

| Skóre | Rychlost |
|---|---:|
| 0–99 | 100 % |
| 100–249 | 110 % |
| 250–499 | 120 % |
| 500–999 | 135 % |
| 1 000–1 999 | 150 % |
| 2 000+ | 175 % |

Zrychlování nesmí rozbít kolize, ovládání ani průchod zatáčkami.

### B. Bonus pro překonávání zdí

Na mapě se objevuje speciální sběratelný předmět. Po sebrání umožní Pac-Manovi **na omezenou dobu procházet zdmi** (navržená délka 5 sekund). Během účinku má Pac-Man tyrkysovou auru, viditelný časový odpočet a před koncem bliká. Bonus lze získat opakovaně. Nelze opustit hranice mapy. Pokud účinek skončí uvnitř zdi, přesuň Pac-Mana na nejbližší bezpečné průchozí políčko.

### C. Modro-černý vizuální styl

Černé pozadí, neonově modré stěny, světle modrý Pac-Man, bílé či světle modré tečky, modrofialoví duchové, tyrkysový bonus. Moderní neonové efekty kombinuj s přehledností retro arkády. Boss může mít výrazné modro-červené akcenty.

### D. Boss „The Man“

Po dosažení stanoveného skóre (navrženo **1 000 bodů**) se objeví boss **THE MAN**. Zobraz upozornění „THE MAN IS COMING!“. Boss je větší, výrazně animovaný, rychlejší a aktivně pronásleduje hráče. K hledání cesty bludištěm použij např. BFS. Nesmí se zasekávat ve zdech.

**Návrh doplňujícího souboje** (studenti jeho přesnou podobu neurčili): boss má 3 životy; speciální útočný bonus umožní Pac-Manovi krátkodobě bosse poškodit dotykem. Po třech zásazích boss zmizí, hráč získá body a hra pokračuje. Souboj nesmí být nevyhratelný.

## 3. Navržené bodování

| Akce | Body |
|---|---:|
| Běžná tečka | 10 |
| Speciální předmět | 50 |
| Dokončení úrovně | 200 |
| Poražení The Mana | 500 |

Všechny bodové hodnoty, hranice a délky efektů musí být snadno upravitelné.

## 4. Uživatelské rozhraní a zvuky

- Úvodní menu s názvem **PAC-MAN: THE MAN EDITION**, tlačítkem Hrát a nápovědou ovládání.
- Herní HUD: skóre, životy, úroveň, aktuální rychlost, aktivní bonusy a jejich časovače.
- Pauza a obrazovka GAME OVER s výsledným skóre a tlačítkem Hrát znovu.
- Zvuky pro sběr teček, bonusy, ztrátu života, příchod bosse, zásahy, vítězství a konec hry. Použij Web Audio API; zvuk lze vypnout.

## 5. Technické požadavky

- Použij HTML Canvas pro vykreslování hry a `requestAnimationFrame()` pro herní smyčku.
- Odděl aktualizaci stavu od vykreslování; pohyb musí být nezávislý na FPS.
- Spolehlivé kolize při vysoké rychlosti: hráč–zeď, hráč–tečka, hráč–bonus, hráč–duch a hráč–boss.
- Jasně oddělené stavy hry (menu, hraní, pauza, boss, konec hry).
- Udržuj přehledný kód a konfigurovatelné konstanty.
- Projekt minimálně obsahuje:

```text
pacman/
├── index.html
├── style.css
├── game.js
└── README.md
```

## 6. Postup implementace

1. Funkční mapa, Pac-Man, pohyb, tečky, kolize a skóre.
2. Duchové, životy, úrovně a základní herní obrazovky.
3. Dynamické zrychlování a časově omezené procházení zdmi.
4. Spawn bosse The Man, jeho inteligence a souboj.
5. Neonová grafika, animace, zvuky a vyladění ovládání.
6. Testování a opravy všech chyb.

## 7. Akceptační kritéria

- Pac-Man se ovládá šipkami i WASD a správně reaguje na zdi.
- Tečky mizí po sebrání a správně přičítají body.
- Rychlost se mění podle skóre a nezpůsobuje průniky zdmi.
- Bonus dočasně umožní průchod zdmi, ukazuje zbývající čas a bezpečně skončí.
- Duchové se pohybují a kontakt s nimi správně ubírá životy.
- Po dosažení hranice skóre se skutečně objeví The Man.
- The Man umí hráče pronásledovat a lze ho porazit.
- Po dokončení mapy následuje další úroveň.
- Fungují pauza, restart, zvukové nastavení a GAME OVER.
- V konzoli prohlížeče nejsou neodstraněné chyby.

## 8. Priorita zadání

**Čtyři skutečné studentské nápady jsou závazné:** (1) zrychlování podle skóre, (2) bonus pro překonávání zdí, (3) modro-černé ladění, (4) boss The Man po dosažení skóre. Ostatní konkrétní čísla a návrhy mechanik jsou výchozí doporučení, která lze při implementaci rozumně upravit.

**Finální instrukce:** Dodej kompletní, spustitelnou a zábavnou hru se všemi uvedenými funkcemi. Nezůstávej u pseudokódu ani prototypu. Vytvoř všechny soubory projektu a stručný návod ke spuštění.
