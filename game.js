'use strict';

/* ============================================================
   PAC-MAN: THE MAN EDITION
   HTML5 Canvas + čistý JavaScript + Web Audio API, bez knihoven.
   ============================================================ */

// ------------------------------------------------------------
// 1) KONFIGURACE – všechna čísla hry na jednom místě
// ------------------------------------------------------------
const CONFIG = {
  TILE: 24,                 // velikost políčka v px
  STEP: 1 / 120,            // pevný krok simulace (s) – pohyb nezávislý na FPS
  START_LIVES: 3,
  VOLUME: 0.35,

  // Pac-Man – základní rychlost v políčkách za sekundu a násobky podle skóre
  PAC_BASE_SPEED: 6.6,
  SPEED_TIERS: [
    { min: 0, mult: 1.0 },
    { min: 100, mult: 1.1 },
    { min: 250, mult: 1.2 },
    { min: 500, mult: 1.35 },
    { min: 1000, mult: 1.5 },
    { min: 2000, mult: 1.75 },
  ],

  // Duchové
  GHOST_BASE_SPEED: 6.0,
  GHOST_LEVEL_SPEEDUP: 0.05,   // +5 % za každou úroveň
  GHOST_MAX_LEVEL_MULT: 1.35,
  GHOST_FRIGHT_MULT: 0.55,
  GHOST_TUNNEL_MULT: 0.5,
  GHOST_LEAVE_MULT: 0.6,
  GHOST_EYES_SPEED: 13,
  GHOST_RELEASE: [0, 2.5, 6, 10],             // kdy duchové vyjdou z domečku (s)
  MODE_SCHEDULE: [7, 20, 7, 20, 5, 20, 5],    // rozptyl / honička / rozptyl … pak honička napořád
  FRIGHT_DURATION: 6,
  FRIGHT_LEVEL_DECAY: 0.5,
  FRIGHT_MIN: 2,

  // Bodování
  SCORE: {
    DOT: 10,
    ENERGIZER: 50,
    WALLPASS: 50,
    ATTACK: 50,
    GHOST: 200,        // 200, 400, 800, 1600 v jedné sérii
    LEVEL_CLEAR: 200,
    BOSS_HIT: 100,
    BOSS_DEFEAT: 500,
  },

  // Bonus: průchod zdmi
  WALLPASS_DURATION: 5,
  WALLPASS_MAX: 10,            // opakované sebrání prodlužuje, max. tolik sekund
  WALLPASS_WARN: 1.5,          // od kolika sekund do konce bliká
  WALLPASS_FIRST_SPAWN: 5,
  WALLPASS_SPAWN_INTERVAL: 12,
  WALLPASS_ITEM_LIFETIME: 10,

  // Boss THE MAN
  BOSS_SCORE: 1000,
  BOSS_RESPAWN_STEP: 3000,     // po porážce se vrátí o tolik bodů později
  BOSS_HP: 3,
  BOSS_SPEED: 7.6,
  BOSS_LEVEL_SPEEDUP: 0.3,
  BOSS_MAX_SPEED: 9.5,
  BOSS_FLEE_MULT: 0.8,
  BOSS_INVULN: 2.0,
  BOSS_INTRO_TIME: 2.8,
  BOSS_RADIUS: 1.0,            // v políčkách
  ATTACK_DURATION: 7,
  ATTACK_SPAWN_DELAY: 2.5,

  // Časování obrazovek a kolize
  READY_TIME: 2,
  DEATH_TIME: 1.6,
  LEVEL_CLEAR_TIME: 2.4,
  HIT_GHOST: 0.7,              // vzdálenost středů v políčkách
  HIT_BOSS: 1.2,
};

// Testovací přepínač: index.html?bossScore=0 → The Man přijde hned
(function applyUrlOverrides() {
  const params = new URLSearchParams(location.search);
  if (params.has('bossScore')) CONFIG.BOSS_SCORE = Math.max(0, Number(params.get('bossScore')) || 0);
})();

// ------------------------------------------------------------
// 2) MAPA
//    # zeď  _ prázdno mimo bludiště  . tečka  o energie
//    (mezera) chodba  - dveře domečku  H domeček duchů
// ------------------------------------------------------------
const MAP = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '_____#.##### ## #####.#_____',
  '_____#.##          ##.#_____',
  '_____#.## ###--### ##.#_____',
  '######.## #HHHHHH# ##.######',
  '      .   #HHHHHH#   .      ',
  '######.## #HHHHHH# ##.######',
  '_____#.## ######## ##.#_____',
  '_____#.##          ##.#_____',
  '_____#.## ######## ##.#_____',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

const COLS = MAP[0].length;
const ROWS = MAP.length;
const T = CONFIG.TILE;
const W = COLS * T;
const H = ROWS * T;
const TUNNEL_ROW = 14;
const PAC_START = { x: 13, y: 23 };
const GHOST_EXIT = { x: 13, y: 11 };
const GHOST_HOME = { x: 13, y: 14 };
const DIRS = [{ dx: 0, dy: -1 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 0 }];
const FONT = '"Press Start 2P", "Courier New", monospace';

const GHOST_DEFS = [
  { name: 'Lovec', color: '#6a5cff', personality: 'chase', start: { x: 13, y: 11 }, inHouse: false, scatter: { x: 25, y: -3 } },
  { name: 'Věštec', color: '#b07cff', personality: 'ambush', start: { x: 13, y: 14 }, inHouse: true, scatter: { x: 2, y: -3 } },
  { name: 'Stratég', color: '#3fa9ff', personality: 'combo', start: { x: 11, y: 14 }, inHouse: true, scatter: { x: 27, y: 31 } },
  { name: 'Bloudil', color: '#8f9cff', personality: 'random', start: { x: 16, y: 14 }, inHouse: true, scatter: { x: 0, y: 31 } },
];

const STATE = {
  MENU: 'menu',
  READY: 'ready',
  PLAYING: 'playing',
  BOSS_INTRO: 'bossIntro',
  BOSS: 'boss',
  PAUSED: 'paused',
  DYING: 'dying',
  LEVEL_CLEAR: 'levelClear',
  GAME_OVER: 'gameOver',
};

// ------------------------------------------------------------
// 3) POMOCNÉ FUNKCE MAPY A HLEDÁNÍ CESTY
// ------------------------------------------------------------
const wrapX = x => ((x % COLS) + COLS) % COLS;
const isOpenCh = c => c === '.' || c === 'o' || c === ' ';

// Znak políčka; mimo mapu je "prázdno", jen tunel se přetáčí na druhou stranu.
function cell(x, y) {
  if (y < 0 || y >= ROWS) return '_';
  if (x < 0 || x >= COLS) {
    if (y !== TUNNEL_ROW) return '_';
    x = wrapX(x);
  }
  return MAP[y][x];
}

function rawCell(x, y) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return '_';
  return MAP[y][x];
}

const isOpen = (x, y) => isOpenCh(cell(x, y));
const passGhostAll = (x, y) => { const c = MAP[y][x]; return c !== '#' && c !== '_'; };

// BFS od zadaného políčka; vrací vzdálenosti všech políček (−1 = nedosažitelné).
function bfs(sx, sy, pass) {
  const dist = new Int16Array(COLS * ROWS).fill(-1);
  if (sy < 0 || sy >= ROWS) return dist;
  sx = wrapX(sx);
  const queue = [sy * COLS + sx];
  dist[queue[0]] = 0;
  for (let qi = 0; qi < queue.length; qi++) {
    const idx = queue[qi];
    const x = idx % COLS;
    const y = (idx - x) / COLS;
    for (const d of DIRS) {
      let nx = x + d.dx;
      const ny = y + d.dy;
      if (ny < 0 || ny >= ROWS) continue;
      if (nx < 0 || nx >= COLS) {
        if (y !== TUNNEL_ROW) continue;
        nx = wrapX(nx);
      }
      const ni = ny * COLS + nx;
      if (dist[ni] !== -1 || !pass(nx, ny)) continue;
      dist[ni] = dist[idx] + 1;
      queue.push(ni);
    }
  }
  return dist;
}

function distAt(map, x, y) {
  if (y < 0 || y >= ROWS) return -1;
  if (x < 0 || x >= COLS) {
    if (y !== TUNNEL_ROW) return -1;
    x = wrapX(x);
  }
  return map[y * COLS + x];
}

// Předpočítané cesty pro duchy: ven z domečku a zpět domů (oči).
const EXIT_MAP = bfs(GHOST_EXIT.x, GHOST_EXIT.y, passGhostAll);
const HOME_MAP = bfs(GHOST_HOME.x, GHOST_HOME.y, passGhostAll);

// ------------------------------------------------------------
// 4) ZVUK (Web Audio API, vše syntetizované)
// ------------------------------------------------------------
const Sound = {
  ctx: null,
  master: null,
  muted: false,
  noiseBuf: null,
  wakaFlip: false,

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applyVolume();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  applyVolume() {
    if (this.master) this.master.gain.value = this.muted ? 0 : CONFIG.VOLUME;
  },
  setMuted(m) {
    this.muted = m;
    this.applyVolume();
  },
  tone(freq, dur, { type = 'square', vol = 0.2, slide = null, delay = 0 } = {}) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },
  noise(dur, vol = 0.2, delay = 0) {
    if (!this.ctx || this.muted) return;
    if (!this.noiseBuf) {
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    src.buffer = this.noiseBuf;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur);
  },

  dot() {
    this.wakaFlip = !this.wakaFlip;
    this.tone(this.wakaFlip ? 480 : 640, 0.06, { type: 'triangle', vol: 0.14 });
  },
  energizer() { this.tone(260, 0.3, { type: 'sawtooth', vol: 0.12, slide: 900 }); },
  wallPass() { [660, 880, 1320, 1760].forEach((f, i) => this.tone(f, 0.08, { type: 'square', vol: 0.09, delay: i * 0.06 })); },
  wallEnd() { this.tone(900, 0.25, { type: 'triangle', vol: 0.15, slide: 220 }); },
  attack() { [330, 440, 660, 990].forEach((f, i) => this.tone(f, 0.1, { type: 'sawtooth', vol: 0.1, delay: i * 0.05 })); },
  ghostEaten() { this.tone(180, 0.25, { type: 'square', vol: 0.12, slide: 1400 }); },
  speedUp() { this.tone(500, 0.18, { type: 'triangle', vol: 0.14, slide: 1100 }); },
  death() {
    this.tone(760, 1.2, { type: 'square', vol: 0.13, slide: 60 });
    this.tone(380, 1.2, { type: 'triangle', vol: 0.1, slide: 40, delay: 0.1 });
  },
  bossComing() {
    for (let i = 0; i < 4; i++) {
      this.tone(220, 0.32, { type: 'sawtooth', vol: 0.15, slide: 470, delay: i * 0.5 });
      this.tone(110, 0.32, { type: 'square', vol: 0.1, slide: 90, delay: i * 0.5 + 0.18 });
    }
  },
  bossBeat() { this.tone(75, 0.2, { type: 'sine', vol: 0.3, slide: 40 }); },
  bossHit() {
    this.noise(0.3, 0.35);
    this.tone(160, 0.35, { type: 'square', vol: 0.18, slide: 40 });
  },
  victory() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.16, { type: 'square', vol: 0.11, delay: i * 0.11 })); },
  levelClear() { [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, { type: 'triangle', vol: 0.15, delay: i * 0.1 })); },
  gameOver() { [392, 330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.32, { type: 'triangle', vol: 0.18, delay: i * 0.28 })); },
  start() { [262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.12, { type: 'square', vol: 0.1, delay: i * 0.1 })); },
};

// ------------------------------------------------------------
// 5) STAV HRY
// ------------------------------------------------------------
const game = {
  state: STATE.MENU,
  prevState: STATE.PLAYING,
  stateTimer: 0,
  time: 0,
  score: 0,
  hiScore: 0,
  lives: CONFIG.START_LIVES,
  level: 1,
  dots: [],
  dotsLeft: 0,
  modeIndex: 0,
  modeTimer: 0,
  frightTimer: 0,
  frightTotal: 1,
  ghostCombo: 0,
  releaseClock: 0,
  wallPassTimer: 0,
  wallPassTotal: 1,
  attackTimer: 0,
  wallItem: null,
  wallItemTimer: 0,
  attackItem: null,
  attackItemTimer: 0,
  boss: null,
  nextBossScore: CONFIG.BOSS_SCORE,
  bossBeatTimer: 0,
  speedTier: 0,
  shake: 0,
  banner: null,
  toasts: [],
};

let pac = null;
let ghosts = [];
const particles = [];
const popups = [];
let pacDistCache = { key: '', map: null };

function loadHiScore() {
  try { return Number(localStorage.getItem('pacman-the-man-hi')) || 0; } catch { return 0; }
}
function saveHiScore() {
  try { localStorage.setItem('pacman-the-man-hi', String(game.hiScore)); } catch { /* bez úložiště */ }
}

// ------------------------------------------------------------
// 6) POHYB POSTAV
//    Postava stojí na políčku (tx, ty) a jede k sousednímu ve směru (dx, dy);
//    t ∈ <0, 1) je postup mezi nimi. Rozhoduje se jen ve středu políčka, takže
//    ani vysoká rychlost neprojede zdí.
// ------------------------------------------------------------
function makeEntity(x, y, dx = 0, dy = 0) {
  return { tx: x, ty: y, dx, dy, t: 0 };
}

function entityPos(e) {
  return { x: e.tx + e.dx * e.t, y: e.ty + e.dy * e.t };
}

function nearestTile(e) {
  if (e.t < 0.5) return { x: wrapX(e.tx), y: e.ty };
  return { x: wrapX(e.tx + e.dx), y: e.ty + e.dy };
}

function moveEntity(e, dist, decide, arrive) {
  let moved = 0;
  let guard = 0;
  while (dist > 1e-9 && guard++ < 32) {
    if (e.t === 0) {
      decide(e);
      if (!e.dx && !e.dy) break;
    }
    const rem = 1 - e.t;
    if (dist < rem) {
      e.t += dist;
      moved += dist;
      break;
    }
    dist -= rem;
    moved += rem;
    e.tx += e.dx;
    e.ty += e.dy;
    e.t = 0;
    e.tx = wrapX(e.tx);
    if (arrive) arrive(e);
  }
  return moved;
}

// Otočení uprostřed cesty mezi políčky.
function reverseEntity(e) {
  if (!e.dx && !e.dy) return;
  if (e.t > 0) {
    e.tx += e.dx;
    e.ty += e.dy;
    e.t = 1 - e.t;
  }
  e.dx = -e.dx;
  e.dy = -e.dy;
}

function tileDist2(a, b) {
  let dx = Math.abs(a.x - b.x);
  if (dx > COLS / 2) dx = COLS - dx;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

// ---------- Pac-Man ----------
function speedTierIndex(score) {
  let idx = 0;
  CONFIG.SPEED_TIERS.forEach((tier, i) => { if (score >= tier.min) idx = i; });
  return idx;
}
const speedMult = () => CONFIG.SPEED_TIERS[speedTierIndex(game.score)].mult;

// Při průchodu zdmi smí Pac-Man do zdí, ale ne za okraj mapy ani do domečku duchů.
function pacCanEnter(x, y) {
  if (game.wallPassTimer <= 0) return isOpen(x, y);
  if (y < 0 || y >= ROWS) return false;
  if (x < 0 || x >= COLS) return y === TUNNEL_ROW;
  const c = MAP[y][x];
  if (c === 'H' || c === '-') return false;
  if (x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1) return isOpenCh(c);
  return true;
}

function pacDecide(p) {
  const nd = p.nextDir;
  if (nd && pacCanEnter(p.tx + nd.dx, p.ty + nd.dy)) {
    p.dx = nd.dx;
    p.dy = nd.dy;
  } else if ((p.dx || p.dy) && !pacCanEnter(p.tx + p.dx, p.ty + p.dy)) {
    p.dx = 0;
    p.dy = 0;
  }
  if (p.dx || p.dy) {
    p.fx = p.dx;
    p.fy = p.dy;
  }
}

function pacArrive(p) {
  eatAt(p.tx, p.ty);
}

function movePac(dt) {
  const p = pac;
  const nd = p.nextDir;
  if (nd && p.t > 0 && nd.dx === -p.dx && nd.dy === -p.dy) {
    reverseEntity(p);
    p.fx = p.dx;
    p.fy = p.dy;
  }
  const moved = moveEntity(p, CONFIG.PAC_BASE_SPEED * speedMult() * dt, pacDecide, pacArrive);
  p.anim += moved;
}

function eatAt(x, y) {
  if (y < 0 || y >= ROWS) return;
  x = wrapX(x);
  const v = game.dots[y][x];
  if (!v) return;
  game.dots[y][x] = 0;
  game.dotsLeft--;
  if (v === 1) {
    addScore(CONFIG.SCORE.DOT);
    Sound.dot();
  } else {
    addScore(CONFIG.SCORE.ENERGIZER, x, y);
    frightenGhosts();
    Sound.energizer();
  }
}

function addScore(points, x, y) {
  game.score += points;
  if (x !== undefined) popups.push({ x, y, text: String(points), life: 1, color: '#eaf6ff' });
  if (game.score > game.hiScore) game.hiScore = game.score;
  const tier = speedTierIndex(game.score);
  if (tier > game.speedTier) {
    game.speedTier = tier;
    toast(`RYCHLOST ${Math.round(CONFIG.SPEED_TIERS[tier].mult * 100)} %`, '#8fd3ff');
    Sound.speedUp();
  }
}

// ---------- Duchové ----------
function ghostCanEnter(g, x, y) {
  const c = cell(x, y);
  if (c === '#' || c === '_') return false;
  if (c === '-' || c === 'H') return g.mode === 'leaving' || g.mode === 'eaten';
  return true;
}

const isScatter = () => game.modeIndex < CONFIG.MODE_SCHEDULE.length && game.modeIndex % 2 === 0;

function ghostTarget(g) {
  if (isScatter()) return g.scatter;
  const pt = nearestTile(pac);
  switch (g.personality) {
    case 'chase':
      return pt;
    case 'ambush':
      return { x: pt.x + pac.fx * 4, y: pt.y + pac.fy * 4 };
    case 'combo': {
      const b = nearestTile(ghosts[0]);
      const ax = pt.x + pac.fx * 2;
      const ay = pt.y + pac.fy * 2;
      return { x: ax * 2 - b.x, y: ay * 2 - b.y };
    }
    default:
      return null; // náhodný pohyb
  }
}

function stepToward(g, map) {
  let best = null;
  let bestD = Infinity;
  for (const d of DIRS) {
    const nx = g.tx + d.dx;
    const ny = g.ty + d.dy;
    if (!ghostCanEnter(g, nx, ny)) continue;
    const dd = distAt(map, nx, ny);
    if (dd >= 0 && dd < bestD) {
      bestD = dd;
      best = d;
    }
  }
  if (best) {
    g.dx = best.dx;
    g.dy = best.dy;
  }
}

function ghostDecide(g) {
  if (g.mode === 'eaten') {
    if (g.tx === GHOST_HOME.x && g.ty === GHOST_HOME.y) {
      g.mode = 'leaving';
    } else {
      stepToward(g, HOME_MAP);
      return;
    }
  }
  if (g.mode === 'leaving') {
    if (g.tx === GHOST_EXIT.x && g.ty === GHOST_EXIT.y) {
      g.mode = 'active';
      g.dx = 0;
      g.dy = -1;
    } else {
      stepToward(g, EXIT_MAP);
      return;
    }
  }

  const options = DIRS.filter(d =>
    !(d.dx === -g.dx && d.dy === -g.dy) && ghostCanEnter(g, g.tx + d.dx, g.ty + d.dy));
  if (!options.length) {
    g.dx = -g.dx;
    g.dy = -g.dy;
    return;
  }
  const target = g.frightened ? null : ghostTarget(g);
  let pick;
  if (!target) {
    pick = options[Math.floor(Math.random() * options.length)];
  } else {
    let bestD = Infinity;
    for (const d of options) {
      const dd = tileDist2({ x: g.tx + d.dx, y: g.ty + d.dy }, target);
      if (dd < bestD) {
        bestD = dd;
        pick = d;
      }
    }
  }
  g.dx = pick.dx;
  g.dy = pick.dy;
}

function ghostSpeed(g) {
  if (g.mode === 'eaten') return CONFIG.GHOST_EYES_SPEED;
  let s = CONFIG.GHOST_BASE_SPEED *
    Math.min(1 + (game.level - 1) * CONFIG.GHOST_LEVEL_SPEEDUP, CONFIG.GHOST_MAX_LEVEL_MULT);
  if (g.mode === 'leaving') s *= CONFIG.GHOST_LEAVE_MULT;
  if (g.frightened) s *= CONFIG.GHOST_FRIGHT_MULT;
  const p = nearestTile(g);
  if (p.y === TUNNEL_ROW && (p.x <= 5 || p.x >= COLS - 6)) s *= CONFIG.GHOST_TUNNEL_MULT;
  return s;
}

function frightenGhosts() {
  game.frightTotal = Math.max(CONFIG.FRIGHT_MIN,
    CONFIG.FRIGHT_DURATION - (game.level - 1) * CONFIG.FRIGHT_LEVEL_DECAY);
  game.frightTimer = game.frightTotal;
  game.ghostCombo = 0;
  for (const g of ghosts) {
    if (g.mode === 'eaten') continue;
    g.frightened = true;
    if (g.mode === 'active') reverseEntity(g);
  }
}

function eatGhost(g) {
  const pts = CONFIG.SCORE.GHOST * Math.pow(2, game.ghostCombo);
  game.ghostCombo = Math.min(game.ghostCombo + 1, 3);
  g.mode = 'eaten';
  g.frightened = false;
  const p = entityPos(g);
  addScore(pts, p.x, p.y);
  burst(p.x, p.y, ['#b07cff', '#8fd3ff'], 14);
  Sound.ghostEaten();
}

// ---------- Boss THE MAN ----------
function getPacDistMap() {
  const pt = nearestTile(pac);
  const key = pt.x + ',' + pt.y;
  if (pacDistCache.key !== key) pacDistCache = { key, map: bfs(pt.x, pt.y, isOpen) };
  return pacDistCache.map;
}

function bossSpeed() {
  return Math.min(CONFIG.BOSS_SPEED + (game.level - 1) * CONFIG.BOSS_LEVEL_SPEEDUP, CONFIG.BOSS_MAX_SPEED);
}

const bossFleeing = () => game.attackTimer > 0 || (game.boss && game.boss.invuln > 0);

function bossDecide(b) {
  const flee = bossFleeing();
  const map = getPacDistMap();
  const pp = entityPos(pac);
  let best = null;
  let bestScore = Infinity;
  for (const d of DIRS) {
    const nx = b.tx + d.dx;
    const ny = b.ty + d.dy;
    if (!isOpen(nx, ny)) continue;
    let dd = distAt(map, nx, ny);
    // Pac-Man uvnitř zdi → BFS ho nenajde, náhradou je vzdušná vzdálenost
    if (dd < 0) dd = 60 + Math.sqrt(tileDist2({ x: nx, y: ny }, pp));
    let score = flee ? -dd : dd;
    if (d.dx === -b.dx && d.dy === -b.dy) score += 0.75;
    score += Math.random() * 0.1;
    if (score < bestScore) {
      bestScore = score;
      best = d;
    }
  }
  b.dx = best ? best.dx : 0;
  b.dy = best ? best.dy : 0;
}

function placeBoss() {
  const b = game.boss;
  const pt = nearestTile(pac);
  const map = bfs(pt.x, pt.y, isOpen);
  let bestIdx = -1;
  let bestD = -1;
  for (let i = 0; i < map.length; i++) {
    const x = i % COLS;
    const y = (i - x) / COLS;
    if (y === TUNNEL_ROW && (x <= 5 || x >= COLS - 6)) continue;
    if (map[i] > bestD) {
      bestD = map[i];
      bestIdx = i;
    }
  }
  b.tx = bestIdx % COLS;
  b.ty = (bestIdx - b.tx) / COLS;
  b.t = 0;
  b.dx = 0;
  b.dy = 0;
}

function startBossIntro() {
  game.boss = Object.assign(makeEntity(0, 0), { hp: CONFIG.BOSS_HP, maxHp: CONFIG.BOSS_HP, invuln: 0 });
  placeBoss();
  game.attackItem = null;
  game.attackItemTimer = 0.5;
  game.bossBeatTimer = 0;
  game.shake = 0.6;
  setState(STATE.BOSS_INTRO, CONFIG.BOSS_INTRO_TIME);
  Sound.bossComing();
  haptic([80, 60, 80, 60, 200]);
}

function updateBoss(dt) {
  const b = game.boss;
  if (b.invuln > 0) b.invuln = Math.max(0, b.invuln - dt);
  const speed = bossSpeed() * (bossFleeing() ? CONFIG.BOSS_FLEE_MULT : 1);
  moveEntity(b, speed * dt, bossDecide, null);

  game.bossBeatTimer -= dt;
  if (game.bossBeatTimer <= 0) {
    Sound.bossBeat();
    game.bossBeatTimer = game.attackTimer > 0 ? 0.45 : 0.9;
  }
}

function hitBoss() {
  const b = game.boss;
  const bp = entityPos(b);
  b.hp--;
  b.invuln = CONFIG.BOSS_INVULN;
  game.attackTimer = 0;
  game.attackItemTimer = CONFIG.ATTACK_SPAWN_DELAY;
  game.shake = 0.5;
  burst(bp.x, bp.y, ['#ff2d55', '#2d7bff', '#ffffff'], 40);
  Sound.bossHit();
  haptic(120);
  addScore(CONFIG.SCORE.BOSS_HIT, bp.x, bp.y - 1);
  if (b.hp <= 0) defeatBoss();
  else showBanner('ZÁSAH!', `THE MAN: ještě ${b.hp}×`, '#ff2d55', 1.4);
}

function defeatBoss() {
  const bp = entityPos(game.boss);
  burst(bp.x, bp.y, ['#ff2d55', '#2d7bff', '#ffffff', '#00ffe1'], 90);
  addScore(CONFIG.SCORE.BOSS_DEFEAT, bp.x, bp.y);
  game.boss = null;
  game.attackItem = null;
  game.attackTimer = 0;
  game.nextBossScore = game.score + CONFIG.BOSS_RESPAWN_STEP;
  game.shake = 0.9;
  setState(STATE.PLAYING);
  showBanner('THE MAN PORAŽEN!', `+${CONFIG.SCORE.BOSS_DEFEAT} bodů`, '#00ffe1', 2.2);
  Sound.victory();
}

// ------------------------------------------------------------
// 7) BONUSY NA MAPĚ
// ------------------------------------------------------------
function randomSpawnTile(filter) {
  const candidates = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isOpenCh(MAP[y][x])) continue;
      if (y === TUNNEL_ROW && (x <= 5 || x >= COLS - 6)) continue;
      if (game.wallItem && game.wallItem.x === x && game.wallItem.y === y) continue;
      if (game.attackItem && game.attackItem.x === x && game.attackItem.y === y) continue;
      if (filter && !filter(x, y)) continue;
      candidates.push({ x, y });
    }
  }
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
}

const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function spawnAttackItem() {
  const bt = nearestTile(game.boss);
  const bossMap = bfs(bt.x, bt.y, isOpen);
  const pt = nearestTile(pac);
  const ok = (x, y) => distAt(bossMap, x, y) >= 8 && manhattan({ x, y }, pt) >= 4;
  const tile = randomSpawnTile(ok) || randomSpawnTile(null);
  if (tile) game.attackItem = tile;
}

function updateItems(dt) {
  if (game.wallItem) {
    game.wallItem.life -= dt;
    if (game.wallItem.life <= 0) {
      game.wallItem = null;
      game.wallItemTimer = CONFIG.WALLPASS_SPAWN_INTERVAL;
    }
  } else {
    game.wallItemTimer -= dt;
    if (game.wallItemTimer <= 0) {
      const pt = nearestTile(pac);
      const tile = randomSpawnTile((x, y) => manhattan({ x, y }, pt) >= 6);
      if (tile) game.wallItem = { x: tile.x, y: tile.y, life: CONFIG.WALLPASS_ITEM_LIFETIME };
      else game.wallItemTimer = 1;
    }
  }

  if (game.boss && !game.attackItem && game.attackTimer <= 0) {
    game.attackItemTimer -= dt;
    if (game.attackItemTimer <= 0) spawnAttackItem();
  }
}

function collectItems() {
  const pt = nearestTile(pac);
  const wi = game.wallItem;
  if (wi && wi.x === pt.x && wi.y === pt.y) {
    game.wallItem = null;
    game.wallItemTimer = CONFIG.WALLPASS_SPAWN_INTERVAL;
    game.wallPassTimer = Math.min(CONFIG.WALLPASS_MAX, Math.max(0, game.wallPassTimer) + CONFIG.WALLPASS_DURATION);
    game.wallPassTotal = game.wallPassTimer;
    addScore(CONFIG.SCORE.WALLPASS, pt.x, pt.y);
    burst(pt.x, pt.y, ['#00ffe1', '#eafffb'], 18);
    toast('PRŮCHOD ZDMI!', '#00ffe1');
    Sound.wallPass();
  }
  const ai = game.attackItem;
  if (ai && ai.x === pt.x && ai.y === pt.y) {
    game.attackItem = null;
    game.attackTimer = CONFIG.ATTACK_DURATION;
    game.attackItemTimer = CONFIG.ATTACK_SPAWN_DELAY;
    addScore(CONFIG.SCORE.ATTACK, pt.x, pt.y);
    burst(pt.x, pt.y, ['#ff2d55', '#2d7bff'], 18);
    toast('ÚTOK! DOTKNI SE THE MANA', '#ff2d55');
    Sound.attack();
  }
}

// Konec průchodu zdmi: pokud Pac-Man zůstal ve zdi, přesune se na nejbližší chodbu.
function endWallPass() {
  game.wallPassTimer = 0;
  const p = pac;
  const fromOk = isOpen(p.tx, p.ty);
  const moving = (p.dx || p.dy) && p.t > 0;
  const toOk = moving && isOpen(p.tx + p.dx, p.ty + p.dy);
  if (fromOk && (!moving || toOk)) return;
  if (moving && toOk) return;            // právě vyjíždí ze zdi do chodby
  if (moving && fromOk) {                // právě vjíždí do zdi → vrátí se
    reverseEntity(p);
    p.fx = p.dx;
    p.fy = p.dy;
    return;
  }
  const pos = entityPos(p);
  const start = nearestTile(p);
  const map = bfs(start.x, start.y, () => true);
  let best = null;
  let bestScore = Infinity;
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!isOpenCh(MAP[y][x])) continue;
      const d = map[y * COLS + x];
      if (d < 0) continue;
      const score = d * 10 + tileDist2({ x, y }, pos);
      if (score < bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  if (best) {
    p.tx = best.x;
    p.ty = best.y;
    p.t = 0;
    burst(best.x, best.y, ['#00ffe1'], 16);
  }
  Sound.wallEnd();
}

// ------------------------------------------------------------
// 8) PRŮBĚH HRY A STAVY
// ------------------------------------------------------------
function setState(s, timer = 0) {
  game.state = s;
  game.stateTimer = timer;
  ui.menu.classList.toggle('hidden', s !== STATE.MENU);
  ui.pause.classList.toggle('hidden', s !== STATE.PAUSED);
  ui.gameover.classList.toggle('hidden', s !== STATE.GAME_OVER);
}

const resumeState = () => (game.boss ? STATE.BOSS : STATE.PLAYING);

function startGame() {
  Sound.init();
  game.score = 0;
  game.lives = CONFIG.START_LIVES;
  game.level = 1;
  game.boss = null;
  game.nextBossScore = CONFIG.BOSS_SCORE;
  game.speedTier = 0;
  game.banner = null;
  game.toasts = [];
  particles.length = 0;
  popups.length = 0;
  loadLevel();
  setState(STATE.READY, CONFIG.READY_TIME);
  Sound.start();
}

function loadLevel() {
  game.dots = MAP.map(row => [...row].map(c => (c === '.' ? 1 : c === 'o' ? 2 : 0)));
  game.dotsLeft = game.dots.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
  game.modeIndex = 0;
  game.modeTimer = CONFIG.MODE_SCHEDULE[0];
  game.wallItem = null;
  game.attackItem = null;
  resetActors();
}

function resetActors() {
  pac = makeEntity(PAC_START.x, PAC_START.y, -1, 0);
  Object.assign(pac, { fx: -1, fy: 0, nextDir: { dx: -1, dy: 0 }, anim: 0 });
  ghosts = GHOST_DEFS.map((def, i) => Object.assign(
    makeEntity(def.start.x, def.start.y, def.inHouse ? 0 : -1, 0),
    {
      index: i,
      name: def.name,
      color: def.color,
      personality: def.personality,
      scatter: def.scatter,
      mode: def.inHouse ? 'house' : 'active',
      frightened: false,
      releaseAt: CONFIG.GHOST_RELEASE[i],
    }));
  game.releaseClock = 0;
  game.frightTimer = 0;
  game.wallPassTimer = 0;
  game.attackTimer = 0;
  game.wallItemTimer = CONFIG.WALLPASS_FIRST_SPAWN;
  game.attackItemTimer = 1;
  pacDistCache = { key: '', map: null };
  if (game.boss) {
    placeBoss();
    game.boss.invuln = 0;
  }
}

function killPac() {
  game.wallPassTimer = 0;
  game.attackTimer = 0;
  setState(STATE.DYING, CONFIG.DEATH_TIME);
  Sound.death();
  haptic(250);
}

function afterDeath() {
  game.lives--;
  if (game.lives <= 0) {
    gameOver();
    return;
  }
  resetActors();
  setState(STATE.READY, CONFIG.READY_TIME);
}

function levelComplete() {
  addScore(CONFIG.SCORE.LEVEL_CLEAR);
  game.wallPassTimer = 0;
  game.attackTimer = 0;
  setState(STATE.LEVEL_CLEAR, CONFIG.LEVEL_CLEAR_TIME);
  Sound.levelClear();
}

function nextLevel() {
  game.level++;
  loadLevel();
  setState(STATE.READY, CONFIG.READY_TIME);
  showBanner(`ÚROVEŇ ${game.level}`, 'duchové zrychlují', '#8fd3ff', CONFIG.READY_TIME);
}

function gameOver() {
  const isRecord = game.score > 0 && game.score >= game.hiScore;
  saveHiScore();
  ui.finalScore.textContent = game.score;
  ui.finalLevel.textContent = game.level;
  ui.finalHi.textContent = game.hiScore;
  ui.newRecord.classList.toggle('hidden', !isRecord);
  setState(STATE.GAME_OVER);
  Sound.gameOver();
  setTimeout(() => ui.again.focus(), 50);
}

function togglePause() {
  const pausable = [STATE.READY, STATE.PLAYING, STATE.BOSS, STATE.BOSS_INTRO];
  if (pausable.includes(game.state)) {
    game.prevState = game.state;
    setState(STATE.PAUSED, game.stateTimer);
  } else if (game.state === STATE.PAUSED) {
    setState(game.prevState, game.stateTimer);
  }
}

// ------------------------------------------------------------
// 9) AKTUALIZACE (pevný krok)
// ------------------------------------------------------------
function update(dt) {
  if (game.state === STATE.PAUSED) return;
  game.time += dt;
  updateEffects(dt);

  switch (game.state) {
    case STATE.READY:
      game.stateTimer -= dt;
      if (game.stateTimer <= 0) setState(resumeState());
      break;
    case STATE.PLAYING:
    case STATE.BOSS:
      updatePlay(dt);
      break;
    case STATE.BOSS_INTRO:
      game.stateTimer -= dt;
      game.shake = Math.max(game.shake, 0.15);
      if (game.stateTimer <= 0) setState(STATE.BOSS);
      break;
    case STATE.DYING:
      game.stateTimer -= dt;
      if (game.stateTimer <= 0) afterDeath();
      break;
    case STATE.LEVEL_CLEAR:
      game.stateTimer -= dt;
      if (game.stateTimer <= 0) nextLevel();
      break;
    default:
      break;
  }
}

function updatePlay(dt) {
  // Časovače bonusů a režimů duchů
  if (game.wallPassTimer > 0) {
    game.wallPassTimer -= dt;
    if (game.wallPassTimer <= 0) endWallPass();
  }
  if (game.attackTimer > 0) game.attackTimer = Math.max(0, game.attackTimer - dt);
  if (game.frightTimer > 0) {
    game.frightTimer -= dt;
    if (game.frightTimer <= 0) {
      game.frightTimer = 0;
      ghosts.forEach(g => { g.frightened = false; });
    }
  } else if (game.modeIndex < CONFIG.MODE_SCHEDULE.length) {
    game.modeTimer -= dt;
    if (game.modeTimer <= 0) {
      game.modeIndex++;
      game.modeTimer = CONFIG.MODE_SCHEDULE[game.modeIndex] ?? Infinity;
      ghosts.forEach(g => { if (g.mode === 'active') reverseEntity(g); });
    }
  }

  game.releaseClock += dt;
  for (const g of ghosts) {
    if (g.mode === 'house' && game.releaseClock >= g.releaseAt) g.mode = 'leaving';
  }

  updateItems(dt);

  // Pohyb
  movePac(dt);
  collectItems();
  for (const g of ghosts) {
    if (g.mode !== 'house') moveEntity(g, ghostSpeed(g) * dt, ghostDecide, null);
  }
  if (game.boss) updateBoss(dt);

  // Kolize
  const pp = entityPos(pac);
  for (const g of ghosts) {
    if (g.mode === 'eaten' || g.mode === 'house') continue;
    if (tileDist2(pp, entityPos(g)) < CONFIG.HIT_GHOST * CONFIG.HIT_GHOST) {
      if (g.frightened) {
        eatGhost(g);
      } else {
        killPac();
        return;
      }
    }
  }
  if (game.boss && tileDist2(pp, entityPos(game.boss)) < CONFIG.HIT_BOSS * CONFIG.HIT_BOSS) {
    if (game.boss.invuln <= 0) {
      if (game.attackTimer > 0) {
        hitBoss();
      } else {
        killPac();
        return;
      }
    }
  }

  if (game.dotsLeft <= 0) {
    levelComplete();
    return;
  }
  if (game.state === STATE.PLAYING && !game.boss && game.score >= game.nextBossScore) startBossIntro();
}

// ------------------------------------------------------------
// 10) EFEKTY (částice, plovoucí body, nápisy)
// ------------------------------------------------------------
function burst(x, y, colors, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 2 + Math.random() * 7;
    particles.push({
      x: x + 0.5, y: y + 0.5,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.6,
      color: colors[i % colors.length],
    });
  }
}

function toast(text, color) {
  game.toasts.push({ text, color, life: 1.6 });
  if (game.toasts.length > 3) game.toasts.shift();
}

function showBanner(text, sub, color, life) {
  game.banner = { text, sub, color, life, total: life };
}

function updateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = popups.length - 1; i >= 0; i--) {
    popups[i].life -= dt;
    popups[i].y -= dt * 1.2;
    if (popups[i].life <= 0) popups.splice(i, 1);
  }
  for (let i = game.toasts.length - 1; i >= 0; i--) {
    game.toasts[i].life -= dt;
    if (game.toasts[i].life <= 0) game.toasts.splice(i, 1);
  }
  if (game.banner) {
    game.banner.life -= dt;
    if (game.banner.life <= 0) game.banner = null;
  }
  game.shake = Math.max(0, game.shake - dt);
}

// ------------------------------------------------------------
// 11) VYKRESLOVÁNÍ
// ------------------------------------------------------------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = W * DPR;
canvas.height = H * DPR;

const bossImg = new Image();
let bossImgReady = false;
bossImg.onload = () => { bossImgReady = true; };
bossImg.src = 'zeman.png';

// Bludiště se předkreslí jednou (neonové obrysy zdí).
function buildMaze(color, glow) {
  const c = document.createElement('canvas');
  c.width = W * DPR;
  c.height = H * DPR;
  const g = c.getContext('2d');
  g.scale(DPR, DPR);
  const ins = T * 0.3;
  const rad = T * 0.22;
  const open = (x, y) => { const ch = rawCell(x, y); return ch !== '#' && ch !== '_'; };
  const path = new Path2D();

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (MAP[y][x] !== '#') continue;
      const px = x * T;
      const py = y * T;
      const up = open(x, y - 1);
      const dn = open(x, y + 1);
      const lf = open(x - 1, y);
      const rt = open(x + 1, y);
      const L = px + ins, R = px + T - ins, U = py + ins, D = py + T - ins;

      if (up) { path.moveTo(lf ? L + rad : px, U); path.lineTo(rt ? R - rad : px + T, U); }
      if (dn) { path.moveTo(lf ? L + rad : px, D); path.lineTo(rt ? R - rad : px + T, D); }
      if (lf) { path.moveTo(L, up ? U + rad : py); path.lineTo(L, dn ? D - rad : py + T); }
      if (rt) { path.moveTo(R, up ? U + rad : py); path.lineTo(R, dn ? D - rad : py + T); }

      // vnější zaoblené rohy
      if (up && lf) { path.moveTo(L, U + rad); path.quadraticCurveTo(L, U, L + rad, U); }
      if (up && rt) { path.moveTo(R - rad, U); path.quadraticCurveTo(R, U, R, U + rad); }
      if (dn && lf) { path.moveTo(L, D - rad); path.quadraticCurveTo(L, D, L + rad, D); }
      if (dn && rt) { path.moveTo(R - rad, D); path.quadraticCurveTo(R, D, R, D - rad); }

      // vnitřní rohy
      if (!up && !lf && open(x - 1, y - 1)) { path.moveTo(L, py); path.quadraticCurveTo(L, U, px, U); }
      if (!up && !rt && open(x + 1, y - 1)) { path.moveTo(R, py); path.quadraticCurveTo(R, U, px + T, U); }
      if (!dn && !lf && open(x - 1, y + 1)) { path.moveTo(L, py + T); path.quadraticCurveTo(L, D, px, D); }
      if (!dn && !rt && open(x + 1, y + 1)) { path.moveTo(R, py + T); path.quadraticCurveTo(R, D, px + T, D); }
    }
  }

  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = glow;
  g.shadowBlur = 14;
  g.strokeStyle = glow;
  g.lineWidth = 4;
  g.globalAlpha = 0.55;
  g.stroke(path);
  g.globalAlpha = 1;
  g.shadowBlur = 6;
  g.strokeStyle = color;
  g.lineWidth = 2;
  g.stroke(path);

  // dveře domečku
  g.shadowBlur = 8;
  g.shadowColor = '#b07cff';
  g.strokeStyle = '#c9b6ff';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(13 * T, 12.5 * T);
  g.lineTo(15 * T, 12.5 * T);
  g.stroke();
  return c;
}

const mazeNormal = buildMaze('#6fb6ff', '#1f5bff');
const mazeFlash = buildMaze('#ffffff', '#8fd3ff');

function drawText(text, x, y, size, color, glow) {
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Postava v tunelu se kreslí i na druhé straně, aby plynule přejela.
function drawWrapped(x, fn) {
  fn(x);
  if (x < 0.5) fn(x + COLS);
  else if (x > COLS - 1.5) fn(x - COLS);
}

function drawDots() {
  ctx.fillStyle = '#cfe8ff';
  ctx.beginPath();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (game.dots[y]?.[x] !== 1) continue;
      const cx = (x + 0.5) * T;
      const cy = (y + 0.5) * T;
      ctx.moveTo(cx + 2.6, cy);
      ctx.arc(cx, cy, 2.6, 0, Math.PI * 2);
    }
  }
  ctx.fill();

  const r = T * 0.3 * (0.8 + 0.2 * Math.sin(game.time * 7));
  ctx.save();
  ctx.shadowColor = '#7fc4ff';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#eaf6ff';
  ctx.beginPath();
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (game.dots[y]?.[x] !== 2) continue;
      const cx = (x + 0.5) * T;
      const cy = (y + 0.5) * T;
      ctx.moveTo(cx + r, cy);
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
  }
  ctx.fill();
  ctx.restore();
}

function drawWallItem(it) {
  if (it.life < 3 && Math.floor(game.time * 8) % 2 === 0) return;
  const cx = (it.x + 0.5) * T;
  const cy = (it.y + 0.5) * T;
  const s = T * 0.42 * (0.9 + 0.1 * Math.sin(game.time * 8));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(game.time * 1.6);
  ctx.shadowColor = '#00ffe1';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = '#00ffe1';
  ctx.fillStyle = 'rgba(0, 255, 225, 0.25)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.rotate(-game.time * 1.6);
  // malá "cihla" se šipkou skrz
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eafffb';
  ctx.fillRect(-1.5, -s * 0.45, 3, s * 0.9);
  ctx.restore();
}

function drawAttackItem(it) {
  const cx = (it.x + 0.5) * T;
  const cy = (it.y + 0.5) * T;
  const s = T * 0.5 * (0.9 + 0.12 * Math.sin(game.time * 10));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowBlur = 20;
  ctx.shadowColor = Math.floor(game.time * 6) % 2 ? '#ff2d55' : '#2d7bff';
  ctx.beginPath();
  ctx.moveTo(0.15 * s, -s);
  ctx.lineTo(-0.55 * s, 0.1 * s);
  ctx.lineTo(-0.05 * s, 0.1 * s);
  ctx.lineTo(-0.2 * s, s);
  ctx.lineTo(0.55 * s, -0.15 * s);
  ctx.lineTo(0.05 * s, -0.15 * s);
  ctx.closePath();
  const grad = ctx.createLinearGradient(-s, 0, s, 0);
  grad.addColorStop(0, '#ff2d55');
  grad.addColorStop(1, '#2d7bff');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.restore();
}

function drawPac() {
  const pos = entityPos(pac);
  drawWrapped(pos.x, x => drawPacAt(x, pos.y));
}

function drawPacAt(x, y) {
  const cx = (x + 0.5) * T;
  const cy = (y + 0.5) * T;
  let r = T * 0.46;
  const ang = Math.atan2(pac.fy, pac.fx);
  let mouth = 0.04 + 0.2 * (0.5 + 0.5 * Math.sin(pac.anim * Math.PI * 2.2));

  if (game.state === STATE.DYING) {
    const p = 1 - game.stateTimer / CONFIG.DEATH_TIME;
    mouth = Math.min(1, 0.05 + p * 1.1);
    if (p > 0.85) r *= Math.max(0, (1 - p) / 0.15);
    if (mouth >= 1) return;
  }

  ctx.save();
  // aura průchodu zdmi + odpočet
  if (game.wallPassTimer > 0) {
    const blinkOff = game.wallPassTimer < CONFIG.WALLPASS_WARN && Math.floor(game.time * 12) % 2 === 0;
    if (!blinkOff) {
      ctx.shadowColor = '#00ffe1';
      ctx.shadowBlur = 22;
      ctx.strokeStyle = 'rgba(0, 255, 225, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#eafffb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (game.wallPassTimer / game.wallPassTotal));
    ctx.stroke();
    ctx.font = `8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#00ffe1';
    ctx.fillText(game.wallPassTimer.toFixed(1), cx, cy - r - 14);
  }
  // aura útoku na bosse
  if (game.attackTimer > 0) {
    const flick = Math.floor(game.time * 10) % 2;
    ctx.shadowBlur = 24;
    ctx.shadowColor = flick ? '#ff2d55' : '#2d7bff';
    ctx.strokeStyle = flick ? '#ff2d55' : '#2d7bff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6 + Math.sin(game.time * 20) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  const inWall = game.wallPassTimer > 0 && !isOpen(Math.round(x), Math.round(y));
  ctx.globalAlpha = inWall ? 0.6 : 1;
  ctx.shadowColor = game.attackTimer > 0 ? '#ff2d55' : '#8fd3ff';
  ctx.shadowBlur = 16;
  ctx.fillStyle = game.attackTimer > 0 ? '#c8e6ff' : '#8fd3ff';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, ang + mouth * Math.PI, ang + Math.PI * 2 - mouth * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGhost(g) {
  const pos = entityPos(g);
  drawWrapped(pos.x, x => drawGhostAt(g, x, pos.y));
}

function drawGhostAt(g, x, y) {
  const cx = (x + 0.5) * T;
  let cy = (y + 0.5) * T;
  const r = T * 0.46;
  if (g.mode === 'house') cy += Math.sin(game.time * 6 + g.index * 1.7) * T * 0.15;
  const eyesOnly = g.mode === 'eaten';

  if (!eyesOnly) {
    let body = g.color;
    let glow = g.color;
    if (g.frightened) {
      const flash = game.frightTimer < 2 && Math.floor(game.time * 6) % 2 === 0;
      body = flash ? '#e8f0ff' : '#1b2a8f';
      glow = '#3a5cff';
    }
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.1, r, Math.PI, 0);
    const bottom = cy + r * 0.88;
    ctx.lineTo(cx + r, bottom);
    const n = 6;
    const w = (2 * r) / n;
    const phase = Math.floor(game.time * 8) % 2;
    for (let i = 1; i <= n; i++) {
      ctx.lineTo(cx + r - i * w, (i + phase) % 2 ? bottom - r * 0.28 : bottom);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (g.frightened && !eyesOnly) {
    ctx.fillStyle = '#ffd6e8';
    ctx.fillRect(cx - r * 0.38, cy - r * 0.3, 3, 3);
    ctx.fillRect(cx + r * 0.22, cy - r * 0.3, 3, 3);
    ctx.strokeStyle = '#ffd6e8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const px = cx - r * 0.5 + i * r * 0.25;
      const py = cy + r * 0.3 + (i % 2 ? -2 : 2);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    return;
  }

  const lx = g.dx;
  const ly = g.dy;
  for (const s of [-1, 1]) {
    const ox = cx + s * r * 0.36;
    const oy = cy - r * 0.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ox, oy, r * 0.26, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a1a6b';
    ctx.beginPath();
    ctx.arc(ox + lx * r * 0.12, oy + ly * r * 0.14, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBoss() {
  const pos = entityPos(game.boss);
  drawWrapped(pos.x, x => drawBossAt(x, pos.y));
}

function drawBossAt(x, y) {
  const b = game.boss;
  const cx = (x + 0.5) * T;
  const cy = (y + 0.5) * T;
  const scared = bossFleeing();
  const pulse = 1 + Math.sin(game.time * (scared ? 16 : 7)) * 0.07;
  const R = T * CONFIG.BOSS_RADIUS * pulse;

  ctx.save();
  if (b.invuln > 0 && Math.floor(game.time * 14) % 2 === 0) ctx.globalAlpha = 0.35;

  // aura
  const aura = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, R * 2);
  aura.addColorStop(0, 'rgba(255, 45, 85, 0.45)');
  aura.addColorStop(0.5, 'rgba(45, 123, 255, 0.25)');
  aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 2, 0, Math.PI * 2);
  ctx.fill();

  // rotující červeno-modrý prstenec
  const rot = game.time * 4;
  ctx.lineWidth = 4;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = '#ff2d55';
  ctx.shadowColor = '#ff2d55';
  ctx.beginPath();
  ctx.arc(cx, cy, R + 4, rot, rot + Math.PI);
  ctx.stroke();
  ctx.strokeStyle = '#2d7bff';
  ctx.shadowColor = '#2d7bff';
  ctx.beginPath();
  ctx.arc(cx, cy, R + 4, rot + Math.PI, rot + Math.PI * 2);
  ctx.stroke();

  // obličej
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(game.time * 5) * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.clip();
  if (bossImgReady) {
    const iw = bossImg.naturalWidth;
    const ih = bossImg.naturalHeight;
    const s = Math.min(iw, ih);
    ctx.drawImage(bossImg, (iw - s) / 2, Math.max(0, (ih - s) * 0.4), s, s, -R, -R, 2 * R, 2 * R);
  } else {
    ctx.fillStyle = '#ff2d55';
    ctx.fillRect(-R, -R, R, 2 * R);
    ctx.fillStyle = '#2d7bff';
    ctx.fillRect(0, -R, R, 2 * R);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-R * 0.5, -R * 0.3, R * 0.3, R * 0.2);
    ctx.fillRect(R * 0.2, -R * 0.3, R * 0.3, R * 0.2);
  }
  if (scared) {
    ctx.fillStyle = 'rgba(45, 123, 255, 0.35)';
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
  }
  ctx.restore();

  // životy bosse
  for (let i = 0; i < b.maxHp; i++) {
    const hx = cx + (i - (b.maxHp - 1) / 2) * 12;
    ctx.fillStyle = i < b.hp ? '#ff2d55' : '#2a2f45';
    ctx.shadowColor = '#ff2d55';
    ctx.shadowBlur = i < b.hp ? 8 : 0;
    ctx.beginPath();
    ctx.arc(hx, cy - R - 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.font = `7px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('THE MAN', cx, cy - R - 20);
  ctx.restore();
}

function drawEffects() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x * T - 2, p.y * T - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
  for (const p of popups) {
    ctx.globalAlpha = Math.min(1, p.life * 2);
    drawText(p.text, (p.x + 0.5) * T, (p.y + 0.5) * T, 9, p.color, '#2d7bff');
  }
  ctx.globalAlpha = 1;
}

function drawOverlayTexts() {
  const st = game.state;
  if (st === STATE.READY) {
    drawText('READY!', W / 2, 17.5 * T, 16, '#8fd3ff', '#2d7bff');
  }
  if (st === STATE.BOSS_INTRO) {
    const flick = Math.floor(game.time * 7) % 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, H / 2 - 60, W, 120);
    ctx.fillStyle = flick ? '#ff2d55' : '#2d7bff';
    ctx.fillRect(0, H / 2 - 62, W, 3);
    ctx.fillRect(0, H / 2 + 59, W, 3);
    drawText('THE MAN', W / 2, H / 2 - 22, 30, flick ? '#ff2d55' : '#ffffff', '#ff2d55');
    drawText('IS COMING!', W / 2, H / 2 + 22, 20, flick ? '#ffffff' : '#2d7bff', '#2d7bff');
  }
  if (st === STATE.LEVEL_CLEAR) {
    drawText(`ÚROVEŇ ${game.level} HOTOVÁ!`, W / 2, 17.5 * T, 14, '#ffffff', '#8fd3ff');
  }
  if (game.banner && st !== STATE.BOSS_INTRO) {
    const b = game.banner;
    ctx.globalAlpha = Math.min(1, b.life * 2, (b.total - b.life) * 4 + 0.2);
    drawText(b.text, W / 2, 11.5 * T - 6, 16, b.color, b.color);
    if (b.sub) drawText(b.sub, W / 2, 11.5 * T + 16, 8, '#ffffff');
    ctx.globalAlpha = 1;
  }
  game.toasts.forEach((t, i) => {
    ctx.globalAlpha = Math.min(1, t.life * 2);
    drawText(t.text, W / 2, 20.5 * T + i * 16 - (1.6 - t.life) * 10, 9, t.color, t.color);
  });
  ctx.globalAlpha = 1;
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (game.shake > 0 && game.state !== STATE.PAUSED) {
    const m = game.shake * 10;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }

  const flash = game.state === STATE.LEVEL_CLEAR && Math.floor(game.time * 5) % 2 === 0;
  ctx.drawImage(flash ? mazeFlash : mazeNormal, 0, 0, W, H);

  if (game.state === STATE.MENU) return;

  drawDots();
  if (game.wallItem) drawWallItem(game.wallItem);
  if (game.attackItem) drawAttackItem(game.attackItem);

  const dyingLong = game.state === STATE.DYING && game.stateTimer < CONFIG.DEATH_TIME * 0.75;
  const hideEnemies = dyingLong || game.state === STATE.LEVEL_CLEAR;
  if (!hideEnemies) {
    ghosts.forEach(drawGhost);
    if (game.boss) drawBoss();
  }
  drawPac();
  drawEffects();
  drawOverlayTexts();
}

// ------------------------------------------------------------
// 12) HUD (HTML nad plátnem)
// ------------------------------------------------------------
const ui = {
  score: document.getElementById('score'),
  hiscore: document.getElementById('hiscore'),
  level: document.getElementById('level'),
  speed: document.getElementById('speed'),
  lives: document.getElementById('lives'),
  bonuses: document.getElementById('bonuses'),
  bossinfo: document.getElementById('bossinfo'),
  mute: document.getElementById('mute'),
  pausebtn: document.getElementById('pausebtn'),
  menu: document.getElementById('menu'),
  pause: document.getElementById('pause'),
  gameover: document.getElementById('gameover'),
  finalScore: document.getElementById('final-score'),
  finalLevel: document.getElementById('final-level'),
  finalHi: document.getElementById('final-hi'),
  newRecord: document.getElementById('new-record'),
  play: document.getElementById('play'),
  again: document.getElementById('again'),
  resume: document.getElementById('resume'),
  restart: document.getElementById('restart'),
  menuBossScore: document.getElementById('menu-boss-score'),
};

const hudCache = {};
function setHud(key, el, value, asHtml = false) {
  if (hudCache[key] === value) return;
  hudCache[key] = value;
  if (asHtml) el.innerHTML = value;
  else el.textContent = value;
}

function chip(label, time, total, cls) {
  const pct = Math.max(0, Math.min(100, (time / total) * 100));
  return `<div class="chip chip-${cls}"><span>${label}</span><b>${time.toFixed(1)} s</b><i style="width:${pct.toFixed(0)}%"></i></div>`;
}

function updateHud() {
  setHud('score', ui.score, String(game.score));
  setHud('hi', ui.hiscore, String(game.hiScore));
  setHud('level', ui.level, String(game.level));
  setHud('speed', ui.speed, `${Math.round(speedMult() * 100)} %`);
  setHud('lives', ui.lives, '<span class="life"></span>'.repeat(Math.max(0, game.lives)), true);

  const parts = [];
  if (game.wallPassTimer > 0) parts.push(chip('PRŮCHOD ZDMI', game.wallPassTimer, game.wallPassTotal, 'cyan'));
  if (game.attackTimer > 0) parts.push(chip('ÚTOK', game.attackTimer, CONFIG.ATTACK_DURATION, 'red'));
  if (game.frightTimer > 0) parts.push(chip('STRACH DUCHŮ', game.frightTimer, game.frightTotal, 'blue'));
  setHud('bonuses', ui.bonuses, parts.join('') || '<span class="muted">Žádný aktivní bonus</span>', true);

  let boss;
  if (game.boss) boss = `THE MAN ${'♥'.repeat(game.boss.hp)}${'♡'.repeat(game.boss.maxHp - game.boss.hp)}`;
  else boss = `THE MAN při ${game.nextBossScore} b.`;
  setHud('boss', ui.bossinfo, boss);
  ui.bossinfo.classList.toggle('active', !!game.boss);
}

function toggleMute() {
  Sound.setMuted(!Sound.muted);
  ui.mute.textContent = Sound.muted ? '🔇' : '🔊';
  try { localStorage.setItem('pacman-the-man-muted', Sound.muted ? '1' : '0'); } catch { /* bez úložiště */ }
}

// ------------------------------------------------------------
// 13) OVLÁDÁNÍ
// ------------------------------------------------------------
const KEYMAP = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

function setDirection(dx, dy) {
  if (pac) pac.nextDir = { dx, dy };
}

window.addEventListener('keydown', e => {
  Sound.init();
  const dir = KEYMAP[e.code];
  if (dir) {
    e.preventDefault();
    setDirection(dir[0], dir[1]);
    return;
  }
  switch (e.code) {
    case 'KeyP':
    case 'Escape':
      e.preventDefault();
      togglePause();
      break;
    case 'KeyM':
      toggleMute();
      break;
    case 'Enter':
    case 'Space':
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
      e.preventDefault();
      if (game.state === STATE.MENU || game.state === STATE.GAME_OVER) startGame();
      else if (game.state === STATE.PAUSED) togglePause();
      break;
    case 'KeyR':
      if (game.state === STATE.PAUSED || game.state === STATE.GAME_OVER) startGame();
      break;
    default:
      break;
  }
});

// Swipe na dotykových zařízeních
let touchStart = null;
const stage = document.getElementById('stage');
stage.addEventListener('touchstart', e => {
  Sound.init();
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });
stage.addEventListener('touchmove', e => {
  if (!touchStart) return;
  const t = e.touches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) setDirection(Math.sign(dx), 0);
  else setDirection(0, Math.sign(dy));
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

// Dotykový křížek: směr podle polohy palce vůči středu, palec lze po křížku posouvat.
const dpad = document.getElementById('dpad');
const dpadArrows = {
  up: dpad.querySelector('.arrow-up'),
  down: dpad.querySelector('.arrow-down'),
  left: dpad.querySelector('.arrow-left'),
  right: dpad.querySelector('.arrow-right'),
};
let dpadPointer = null;

function dpadInput(e) {
  const r = dpad.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  if (Math.hypot(dx, dy) < r.width * 0.08) return;
  let name;
  if (Math.abs(dx) > Math.abs(dy)) name = dx > 0 ? 'right' : 'left';
  else name = dy > 0 ? 'down' : 'up';
  const [mx, my] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[name];
  if (!pac || pac.nextDir?.dx !== mx || pac.nextDir?.dy !== my) haptic(8);
  setDirection(mx, my);
  for (const k in dpadArrows) dpadArrows[k].classList.toggle('on', k === name);
}

function dpadRelease(e) {
  if (e.pointerId !== dpadPointer) return;
  dpadPointer = null;
  for (const k in dpadArrows) dpadArrows[k].classList.remove('on');
}

dpad.addEventListener('pointerdown', e => {
  e.preventDefault();
  Sound.init();
  dpadPointer = e.pointerId;
  dpad.setPointerCapture(e.pointerId);
  dpadInput(e);
});
dpad.addEventListener('pointermove', e => { if (e.pointerId === dpadPointer) dpadInput(e); });
dpad.addEventListener('pointerup', dpadRelease);
dpad.addEventListener('pointercancel', dpadRelease);
dpad.addEventListener('contextmenu', e => e.preventDefault());

function haptic(ms) {
  if (document.documentElement.classList.contains('touch') && navigator.vibrate) {
    try { navigator.vibrate(ms); } catch { /* nepodporováno */ }
  }
}

function enableTouchUi() {
  document.documentElement.classList.add('touch');
}
if (window.matchMedia('(pointer: coarse)').matches) enableTouchUi();
window.addEventListener('touchstart', enableTouchUi, { once: true, passive: true });

ui.pausebtn.addEventListener('click', () => {
  Sound.init();
  if (game.state === STATE.MENU || game.state === STATE.GAME_OVER) return;
  togglePause();
  ui.pausebtn.blur();
});

ui.play.addEventListener('click', startGame);
ui.again.addEventListener('click', startGame);
ui.restart.addEventListener('click', startGame);
ui.resume.addEventListener('click', togglePause);
ui.mute.addEventListener('click', () => { Sound.init(); toggleMute(); ui.mute.blur(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden && [STATE.PLAYING, STATE.BOSS, STATE.READY, STATE.BOSS_INTRO].includes(game.state)) togglePause();
});
window.addEventListener('beforeunload', saveHiScore);

// ------------------------------------------------------------
// 14) HERNÍ SMYČKA
// ------------------------------------------------------------
let lastTime = performance.now();
let accumulator = 0;

function frame(now) {
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.25) dt = 0.25;
  accumulator += dt;
  while (accumulator >= CONFIG.STEP) {
    update(CONFIG.STEP);
    accumulator -= CONFIG.STEP;
  }
  render();
  updateHud();
  requestAnimationFrame(frame);
}

function init() {
  game.hiScore = loadHiScore();
  try { Sound.muted = localStorage.getItem('pacman-the-man-muted') === '1'; } catch { /* bez úložiště */ }
  ui.mute.textContent = Sound.muted ? '🔇' : '🔊';
  ui.menuBossScore.textContent = CONFIG.BOSS_SCORE;
  loadLevel();
  setState(STATE.MENU);
  ui.play.focus();
  requestAnimationFrame(frame);
}

init();
