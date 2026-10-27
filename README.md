# PAC-MAN: THE MAN EDITION

Arkádová hra inspirovaná Pac-Manem v modro-černém neonovém stylu. Čisté HTML5 + CSS3 + JavaScript
(Canvas, `requestAnimationFrame`, Web Audio API), bez backendu a bez knihoven.

**Hrát online:** https://adamferencz.github.io/pacman-zeman-claude/

## Spuštění

Otevři `index.html` v moderním prohlížeči (Chrome, Edge, Firefox, Safari). Nic se neinstaluje.

Případně přes lokální server:

```bash
python -m http.server 8745
```

a pak `http://localhost:8745`.

## Ovládání

| Klávesa | Akce |
|---|---|
| šipky / WASD | pohyb (směr se dá zadat dopředu, Pac-Man zatočí v nejbližší možné odbočce) |
| P / Esc | pauza |
| M | zvuk zapnout / vypnout |
| Enter / mezerník | start, hrát znovu |
| R | restart (v pauze nebo po konci hry) |

### Telefon a tablet

Na dotykovém zařízení se pod bludištěm (na šířku vedle něj) objeví neonový křížový ovladač. Směr se
řídí polohou palce, takže stačí palec po křížku posouvat. Funguje i swipe přímo po bludišti.
Pauza a zvuk jsou tlačítka v horní liště. Telefon při ztrátě života, zásahu a příchodu bosse
krátce zavibruje (kde to prohlížeč podporuje).

## Co hra umí

- **Zrychlování podle skóre** – 100 % → 110 % (100 b.) → 120 % (250) → 135 % (500) → 150 % (1 000) → 175 % (2 000).
  Pohyb je po políčkách s rozhodováním ve středu políčka, takže ani vysoká rychlost neprojede zdí.
- **Průchod zdmi** – tyrkysový diamant se objevuje na mapě; po sebrání 5 s průchodu zdmi (opakované sebrání
  prodlužuje, max. 10 s). Tyrkysová aura, odpočet nad Pac-Manem i v HUD, poslední 1,5 s bliká.
  Okraj mapy ani domeček duchů projít nejde. Když účinek skončí ve zdi, Pac-Man se přesune na nejbližší chodbu.
- **Modro-černý styl** – neonové modré zdi, světle modrý Pac-Man, modrofialoví duchové, tyrkysový bonus,
  boss s modro-červenými akcenty.
- **Boss THE MAN** – při 1 000 bodech zazní „THE MAN IS COMING!“. Boss je větší, animovaný, rychlejší než
  duchové a hledá cestu k hráči přes BFS. Souboj: na mapě se objeví červeno-modrý blesk (útok na 7 s);
  dotkni se bosse → zásah. Po 3 zásazích je poražen (+500 b.) a vrátí se o 3 000 bodů později.
  Bez útoku dotek s bossem bere život.
- **Duchové** se čtyřmi povahami: Lovec (pronásleduje), Věštec (předvídá směr), Stratég (kombinace),
  Bloudil (náhodný pohyb). Střídají rozptyl a honičku; po energii (velká tečka) se bojí a dají se sníst.
- Tři životy, úrovně (po vysbírání teček +200 b. a další úroveň s rychlejšími duchy), pauza, GAME OVER,
  rekord uložený v prohlížeči, zvuky přes Web Audio API.

## Bodování

| Akce | Body |
|---|---:|
| tečka | 10 |
| energie / průchod zdmi / útok | 50 |
| duch (série) | 200 / 400 / 800 / 1 600 |
| zásah The Mana | 100 |
| dokončení úrovně | 200 |
| poražení The Mana | 500 |

## Úpravy

Všechna čísla (rychlosti, prahy zrychlení, body, délky bonusů, skóre pro bosse, životy bosse…) jsou
v objektu `CONFIG` na začátku `game.js`. Mapa je pole řetězců `MAP` hned pod ním.

Pro testování bosse: `index.html?bossScore=0` – The Man přijde hned po startu.

## Struktura

```text
index.html   – stránka, HUD a překryvné obrazovky
style.css    – neonový vzhled
game.js      – herní logika, vykreslování, zvuky, ovládání
zeman.png    – obličej bosse
```
