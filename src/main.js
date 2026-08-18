import { BLOCKED_TILE, COLS, GAME_VERSION, PET_PROFILES, ROWS, TILE_NAMES } from './constants.js';
import { GameEngine } from './engine.js';
import {
  ENDLESS_START_LEVEL,
  LEVELS_PER_ISLAND,
  MOVEMENT_LABELS,
  STORY_LEVELS,
  getIslandDefinition,
  getIslandLevels,
  getIslandNumber,
  getLevelConfig
} from './levels.js';
import { placeTileInGrid } from './tile-layout.js';
import { createProgressStore } from './progress.js';
import { registerPWA } from './pwa.js';

const progressStore = createProgressStore();
const engine = new GameEngine();
engine.reset(progressStore.snapshot().currentLevel);
const elements = {
  board: document.querySelector('#board'),
  boardTitle: document.querySelector('#board-title'),
  pathLayer: document.querySelector('#path-layer'),
  score: document.querySelector('#score'),
  level: document.querySelector('#level'),
  timer: document.querySelector('#timer'),
  timerBar: document.querySelector('#timer-bar'),
  remaining: document.querySelector('#remaining'),
  status: document.querySelector('#status-text'),
  levelMode: document.querySelector('#level-mode'),
  levelRule: document.querySelector('#level-rule'),
  levelProgress: document.querySelector('#level-progress'),
  captainCard: document.querySelector('#captain-card'),
  captainAvatar: document.querySelector('#captain-avatar'),
  captainName: document.querySelector('#captain-name'),
  mapButton: document.querySelector('#map-button'),
  mapProgress: document.querySelector('#map-progress'),
  gameVersion: document.querySelector('#game-version'),
  missionClear: document.querySelector('#mission-clear'),
  missionTime: document.querySelector('#mission-time'),
  missionShuffle: document.querySelector('#mission-shuffle'),
  hintButton: document.querySelector('#hint-button'),
  hintCount: document.querySelector('#hint-count'),
  shuffleButton: document.querySelector('#shuffle-button'),
  shuffleCount: document.querySelector('#shuffle-count'),
  restartButton: document.querySelector('#restart-button'),
  pauseButton: document.querySelector('#pause-button'),
  pauseLabel: document.querySelector('#pause-label'),
  pauseHelp: document.querySelector('#pause-help'),
  pauseOverlay: document.querySelector('#pause-overlay'),
  overlayResumeButton: document.querySelector('#overlay-resume-button'),
  magicButton: document.querySelector('#magic-button'),
  magicCount: document.querySelector('#magic-count'),
  timeButton: document.querySelector('#time-button'),
  timeCount: document.querySelector('#time-count'),
  bombButton: document.querySelector('#bomb-button'),
  bombCount: document.querySelector('#bomb-count'),
  collectionButton: document.querySelector('#collection-button'),
  collectionCount: document.querySelector('#collection-count'),
  collectionDialog: document.querySelector('#collection-dialog'),
  collectionClose: document.querySelector('#collection-close'),
  collectionSummary: document.querySelector('#collection-summary'),
  collectionGrid: document.querySelector('#collection-grid'),
  mapDialog: document.querySelector('#map-dialog'),
  mapClose: document.querySelector('#map-close'),
  mapTitle: document.querySelector('#map-title'),
  mapSummary: document.querySelector('#map-summary'),
  mapPrevious: document.querySelector('#map-previous'),
  mapNext: document.querySelector('#map-next'),
  mapCaptainAvatar: document.querySelector('#map-captain-avatar'),
  mapCaptainName: document.querySelector('#map-captain-name'),
  mapThemeName: document.querySelector('#map-theme-name'),
  mapRewardName: document.querySelector('#map-reward-name'),
  mapRewardDescription: document.querySelector('#map-reward-description'),
  mapLevels: document.querySelector('#map-levels'),
  endlessButton: document.querySelector('#endless-button'),
  endlessStatus: document.querySelector('#endless-status'),
  toast: document.querySelector('#toast'),
  dialog: document.querySelector('#game-dialog'),
  dialogIcon: document.querySelector('#dialog-icon'),
  dialogTitle: document.querySelector('#dialog-title'),
  dialogMessage: document.querySelector('#dialog-message'),
  dialogStars: document.querySelector('#dialog-stars'),
  dialogScore: document.querySelector('#dialog-score'),
  dialogPrimary: document.querySelector('#dialog-primary'),
  dialogSecondary: document.querySelector('#dialog-secondary')
};

let locked = false;
let toastTimer;
let pathTimer;
let comboCount = 0;
let lastMatchAt = 0;
let activePowerup = null;
let collectionResumeOnClose = false;
let mapResumeOnClose = false;
let visibleMapIsland = getIslandNumber(Math.min(engine.level, STORY_LEVELS));
let appliedThemeIsland = 0;
let renderedLevel = 0;
const compactEffects = window.matchMedia('(max-width: 680px), (prefers-reduced-motion: reduce)').matches;

function renderBoard() {
  const snapshot = engine.snapshot();
  progressStore.discover(snapshot.board.flat().filter((type) => type != null && type !== BLOCKED_TILE));
  renderCollectionSummary();
  const activeCells = new Set();
  snapshot.board.forEach((row, rowIndex) => row.forEach((type, colIndex) => {
    if (type == null) return;
    const cellKey = `${rowIndex}-${colIndex}`;
    activeCells.add(cellKey);
    let tile = elements.board.querySelector(`.tile[data-cell="${cellKey}"]`);
    if (type === BLOCKED_TILE) {
      if (!tile || tile.tagName !== 'DIV') {
        tile?.remove();
        tile = document.createElement('div');
        tile.innerHTML = '<span aria-hidden="true">◆</span>';
        elements.board.append(tile);
      }
      tile.className = 'tile obstacle-stone';
      tile.dataset.cell = cellKey;
      tile.dataset.row = rowIndex;
      tile.dataset.col = colIndex;
      placeTileInGrid(tile, rowIndex, colIndex);
      tile.setAttribute('role', 'gridcell');
      tile.setAttribute('aria-label', `岩障，第 ${rowIndex + 1} 行第 ${colIndex + 1} 列`);
      return;
    }
    if (!tile || tile.tagName !== 'BUTTON') {
      tile?.remove();
      tile = document.createElement('button');
      tile.type = 'button';
      elements.board.append(tile);
    }
    tile.className = 'tile';
    tile.dataset.cell = cellKey;
    tile.dataset.row = rowIndex;
    tile.dataset.col = colIndex;
    tile.style.setProperty('--row', rowIndex);
    tile.style.setProperty('--col', colIndex);
    placeTileInGrid(tile, rowIndex, colIndex);
    tile.style.setProperty('--sprite-x', type % 5);
    tile.style.setProperty('--sprite-y', Math.floor(type / 5));
    tile.dataset.type = type;
    tile.dataset.label = TILE_NAMES[type];
    const shiny = snapshot.shinyBoard[rowIndex][colIndex] === 1;
    const frozen = snapshot.iceBoard[rowIndex][colIndex] > 0;
    const captain = type === snapshot.levelConfig.captainType;
    tile.classList.toggle('shiny', shiny);
    tile.classList.toggle('ice-covered', frozen);
    tile.classList.toggle('captain-pet', captain);
    tile.dataset.shiny = String(shiny);
    tile.dataset.ice = String(frozen);
    tile.setAttribute('role', 'gridcell');
    tile.setAttribute('aria-label', `${frozen ? '霜晶覆盖的' : ''}${shiny ? '闪光' : ''}${captain ? '队长' : ''}${TILE_NAMES[type]}，第 ${rowIndex + 1} 行第 ${colIndex + 1} 列`);
    if (frozen) {
      let ice = tile.querySelector('.ice-layer');
      if (!ice) {
        ice = document.createElement('span');
        ice.className = 'ice-layer';
        ice.setAttribute('aria-hidden', 'true');
        ice.textContent = '❄';
        tile.append(ice);
      }
    } else {
      tile.querySelector('.ice-layer')?.remove();
    }
    if (snapshot.selected?.row === rowIndex && snapshot.selected?.col === colIndex) {
      tile.classList.add('selected');
      tile.setAttribute('aria-selected', 'true');
    }
  }));
  elements.board.querySelectorAll('.tile[data-cell]').forEach((tile) => {
    if (!activeCells.has(tile.dataset.cell)) tile.remove();
  });
}

function renderStats() {
  const snapshot = engine.snapshot();
  const progress = progressStore.snapshot();
  applyIslandTheme(snapshot.levelConfig);
  elements.gameVersion.textContent = `v${GAME_VERSION}`;
  elements.score.textContent = snapshot.score.toLocaleString('zh-CN');
  elements.level.textContent = snapshot.levelConfig.endless
    ? `∞ ${snapshot.level - STORY_LEVELS}`
    : `${snapshot.level} / ${STORY_LEVELS}`;
  elements.levelMode.textContent = snapshot.levelConfig.name;
  elements.levelRule.textContent = snapshot.levelConfig.movement === 'rotate'
    ? `${snapshot.activeTileTypes}种萌宠 · ${snapshot.levelConfig.rule} · 下一次：${snapshot.nextMovementLabel}`
    : `${snapshot.activeTileTypes}种萌宠 · ${snapshot.levelConfig.rule}`;
  if (renderedLevel !== snapshot.level) {
    renderLevelProgress(snapshot.level);
    renderCaptain(snapshot);
    renderedLevel = snapshot.level;
  }
  renderMissions(snapshot);
  elements.mapProgress.textContent = snapshot.levelConfig.endless
    ? `∞${snapshot.level - STORY_LEVELS}`
    : `${progress.unlockedLevel}/${STORY_LEVELS}`;
  elements.timer.textContent = formatTime(snapshot.timeLeft);
  elements.remaining.textContent = snapshot.remaining;
  elements.hintCount.textContent = `追光萤 · ${snapshot.hintsLeft} 次`;
  elements.shuffleCount.textContent = `岛风铃 · ${snapshot.shufflesLeft} 次`;
  elements.hintButton.disabled = snapshot.hintsLeft === 0 || snapshot.state !== 'playing';
  elements.shuffleButton.disabled = snapshot.shufflesLeft === 0 || snapshot.state !== 'playing';
  elements.magicCount.textContent = snapshot.powerups.magic;
  elements.timeCount.textContent = snapshot.powerups.time;
  elements.bombCount.textContent = snapshot.powerups.bomb;
  elements.magicButton.disabled = snapshot.powerups.magic === 0 || snapshot.state !== 'playing';
  elements.timeButton.disabled = snapshot.powerups.time === 0 || snapshot.state !== 'playing';
  elements.bombButton.disabled = snapshot.powerups.bomb === 0 || snapshot.state !== 'playing';
  elements.magicButton.classList.toggle('active', activePowerup === 'magic');
  elements.magicButton.setAttribute('aria-pressed', String(activePowerup === 'magic'));
  const paused = snapshot.state === 'paused';
  elements.pauseButton.disabled = !['playing', 'paused'].includes(snapshot.state);
  elements.pauseLabel.textContent = paused ? '继续游戏' : '暂停';
  elements.pauseHelp.textContent = paused ? '恢复本局计时' : '停止本局计时';
  elements.pauseOverlay.hidden = !paused;
  elements.board.classList.toggle('is-paused', paused);
  document.querySelector('.timer-stat').classList.toggle('time-frozen', snapshot.timerFrozenTicks > 0);
  const percentage = snapshot.timeLeft / snapshot.totalTime * 100;
  elements.timerBar.style.width = `${percentage}%`;
  elements.timerBar.classList.toggle('urgent', percentage <= 25);
}

function renderLevelProgress(activeLevel) {
  const storedStars = progressStore.snapshot().stars;
  const islandLevels = activeLevel > STORY_LEVELS
    ? Array.from({ length: 5 }, (_, index) => activeLevel - 2 + index).filter((level) => level >= ENDLESS_START_LEVEL)
    : getIslandLevels(activeLevel);
  const localIndex = activeLevel > STORY_LEVELS ? 2 : (activeLevel - 1) % LEVELS_PER_ISLAND;
  const groupStart = activeLevel > STORY_LEVELS ? 0 : Math.floor(localIndex / 5) * 5;
  const visibleLevels = activeLevel > STORY_LEVELS ? islandLevels : islandLevels.slice(groupStart, groupStart + 5);
  elements.levelProgress.replaceChildren(...visibleLevels.map((level) => {
    const config = getLevelConfig(level);
    const dot = document.createElement('span');
    dot.textContent = config.endless ? `∞${level - STORY_LEVELS}` : config.islandLevel;
    dot.dataset.level = level;
    const stars = Number(storedStars[level] ?? 0);
    dot.classList.toggle('completed', level < activeLevel || stars > 0);
    dot.classList.toggle('active', level === activeLevel);
    dot.setAttribute('aria-current', level === activeLevel ? 'step' : 'false');
    dot.title = `${config.endless ? `无尽第 ${level - STORY_LEVELS} 关` : `第 ${level} 关`}：${config.name} · 历史最高 ${stars}/3 星`;
    return dot;
  }));
}

function renderCaptain(snapshot) {
  const type = snapshot.levelConfig.captainType;
  elements.captainAvatar.style.setProperty('--sprite-x', type % 5);
  elements.captainAvatar.style.setProperty('--sprite-y', Math.floor(type / 5));
  elements.captainName.textContent = `${TILE_NAMES[type]} · ${snapshot.levelConfig.captainSkill.name}`;
  elements.captainCard.title = `${snapshot.levelConfig.captainTitle}·${TILE_NAMES[type]}：${snapshot.levelConfig.captainSkill.description}`;
}

function applyIslandTheme(levelConfig) {
  if (appliedThemeIsland === levelConfig.island && !levelConfig.endless) return;
  const island = levelConfig.islandTheme;
  const palette = island.palette;
  const root = document.documentElement;
  root.style.setProperty('--page', palette.page);
  root.style.setProperty('--surface', palette.surface);
  root.style.setProperty('--board', palette.board);
  root.style.setProperty('--board-line', palette.boardLine);
  root.style.setProperty('--ink', palette.ink);
  root.style.setProperty('--muted', palette.muted);
  root.style.setProperty('--coral', palette.accent);
  root.style.setProperty('--coral-dark', palette.accentDark);
  root.style.setProperty('--mint', palette.mint);
  root.style.setProperty('--theme-glow', palette.glow);
  root.style.setProperty('--captain-hue', island.captainHue);
  document.body.dataset.islandTheme = palette.key;
  elements.boardTitle.textContent = levelConfig.endless ? '无尽星海' : island.name;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.page);
  appliedThemeIsland = levelConfig.endless ? -1 : levelConfig.island;
}

function renderMissions(snapshot) {
  const won = snapshot.state === 'won';
  const timeReady = snapshot.timeLeft >= snapshot.levelConfig.starTime;
  const shuffleReady = snapshot.shufflesUsed <= 2;
  const missions = [
    [elements.missionClear, '通关', won, false],
    [elements.missionTime, `≥${snapshot.levelConfig.starTime}秒`, won && timeReady, timeReady],
    [elements.missionShuffle, '洗牌≤2', won && shuffleReady, shuffleReady]
  ];
  missions.forEach(([element, label, earned, eligible]) => {
    element.textContent = `${earned ? '★' : '☆'} ${label}`;
    element.classList.toggle('earned', earned);
    element.classList.toggle('eligible', !earned && eligible);
  });
}

function render() {
  renderBoard();
  renderStats();
}

function handleTileClick(tile) {
  if (locked) return;
  const position = { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
  if (activePowerup === 'magic') {
    useMagicPowerup(position);
    return;
  }
  const scoreBefore = engine.score;
  const result = engine.select(position);

  if (result.type === 'ice-break') {
    locked = true;
    resetCombo();
    drawPath(result.path);
    markSpecialTiles(result.iceHits, 'ice-breaking');
    triggerMatchEffects(result, result.scoreAdded, 1);
    showSpecialBanner('❄', '霜晶破裂', 'freeze-banner');
    elements.status.textContent = `霜晶被击碎！再连接一次即可送回这对萌宠`;
    renderStats();
    window.setTimeout(() => {
      clearPath();
      render();
      locked = false;
    }, 380);
    return;
  }

  if (result.type === 'match') {
    const now = Date.now();
    comboCount = now - lastMatchAt <= 3500 ? comboCount + 1 : 1;
    lastMatchAt = now;
    locked = true;
    drawPath(result.path);
    markMatched(result.from, result.to);
    triggerMatchEffects(result, engine.score - scoreBefore, comboCount);
    const comboReward = applyComboReward(comboCount);
    flashTimerBonus(result.timeAdded + comboReward.timeAdded);
    if (result.shiny) showToast('闪光共鸣！本次得分翻倍');
    const movementText = result.movement === 'static' ? '' : MOVEMENT_LABELS[result.movement];
    let status = comboCount >= 2
      ? `${comboCount} 连击！时间 +${result.timeAdded} 秒${movementText ? ` · 萌宠${movementText}` : ''}`
      : `共鸣成功，时间 +${result.timeAdded} 秒${movementText ? ` · ${movementText}` : ''}`;
    if (result.shiny) status += ' · 闪光双倍得分';
    if (result.captainAssist) status += ` · ${result.captainSkill.name}：${result.captainSkill.description}`;
    if (comboReward.message) status += ` · ${comboReward.message}`;
    elements.status.textContent = status;
    renderStats();
    const shouldEcho = comboReward.echo;
    window.setTimeout(() => {
      clearPath();
      render();
      showMovementCue(result.movement);
      locked = false;
      if (result.won) showEndDialog(true);
      else {
        if (result.autoShuffled) showToast('暂时无解，已为你自动重排');
        if (shouldEcho) window.setTimeout(performComboEcho, 80);
      }
    }, 340);
    return;
  }

  if (result.type === 'invalid') {
    resetCombo();
    const fromType = engine.board[result.from.row][result.from.col];
    const toType = engine.board[result.to.row][result.to.col];
    elements.status.textContent = fromType !== toType
      ? `萌宠不同：${TILE_NAMES[fromType]}不能和${TILE_NAMES[toType]}共鸣`
      : '萌宠相同，但当前路径超过两次转弯或被其他萌宠挡住';
    tile.classList.add('shake');
    window.setTimeout(() => tile.classList.remove('shake'), 280);
  } else if (result.type === 'selected') {
    elements.status.textContent = `已选择${TILE_NAMES[engine.board[position.row][position.col]]}，再找一只相同萌宠`;
  } else if (result.type === 'deselected') {
    elements.status.textContent = '已取消选择';
  }
  renderBoard();
}

function markMatched(from, to) {
  [from, to].forEach((position) => {
    elements.board.querySelector(`[data-row="${position.row}"][data-col="${position.col}"]`)?.classList.add('matched');
  });
}

function drawPath(path) {
  clearTimeout(pathTimer);
  elements.pathLayer.setAttribute('viewBox', `0 0 ${COLS} ${ROWS}`);
  const points = path.map(({ row, col }) => {
    const x = Math.min(COLS - 0.05, Math.max(0.05, col + 0.5));
    const y = Math.min(ROWS - 0.05, Math.max(0.05, row + 0.5));
    return `${x},${y}`;
  }).join(' ');
  elements.pathLayer.innerHTML = `<polyline points="${points}" />`;
  elements.pathLayer.classList.add('visible');
  pathTimer = window.setTimeout(clearPath, 500);
}

function clearPath() {
  elements.pathLayer.classList.remove('visible');
  elements.pathLayer.innerHTML = '';
}

elements.board.addEventListener('click', (event) => {
  const tile = event.target.closest('button.tile');
  if (!tile || !elements.board.contains(tile)) return;
  handleTileClick(tile);
});

elements.hintButton.addEventListener('click', () => {
  const move = engine.hint();
  if (!move) {
    showToast(engine.hintsLeft === 0 ? '本局提示已用完' : '暂时没有可提示的组合');
    return;
  }
  renderStats();
  elements.status.textContent = '这两枚可以连在一起';
  const selectors = [move.from, move.to];
  selectors.forEach((position) => {
    elements.board.querySelector(`[data-row="${position.row}"][data-col="${position.col}"]`)?.classList.add('hinted');
  });
  window.setTimeout(() => {
    elements.board.querySelectorAll('.hinted').forEach((tile) => tile.classList.remove('hinted'));
  }, 1600);
});

elements.shuffleButton.addEventListener('click', () => {
  if (!engine.shuffle()) {
    showToast('本局洗牌机会已用完');
    return;
  }
  clearPath();
  resetCombo();
  render();
  elements.status.textContent = '岛风铃响起，萌宠位置已重新排列';
  showToast('洗牌完成');
});

elements.restartButton.addEventListener('click', () => restart(engine.level));
elements.pauseButton.addEventListener('click', togglePause);
elements.overlayResumeButton.addEventListener('click', togglePause);
elements.magicButton.addEventListener('click', () => {
  activePowerup = activePowerup === 'magic' ? null : 'magic';
  engine.selected = null;
  render();
  elements.status.textContent = activePowerup
    ? '心光结已就绪：选择任意一只萌宠，直接找到同伴'
    : '已取消使用心光结';
});
elements.timeButton.addEventListener('click', useTimePowerup);
elements.bombButton.addEventListener('click', useBombPowerup);
elements.collectionButton.addEventListener('click', openCollection);
elements.collectionClose.addEventListener('click', closeCollection);
elements.collectionDialog.addEventListener('click', (event) => {
  if (event.target === elements.collectionDialog) closeCollection();
});
elements.dialogSecondary.addEventListener('click', () => restart(engine.level));
elements.dialogPrimary.addEventListener('click', () => {
  const nextLevel = engine.state === 'won' ? engine.level + 1 : engine.level;
  restart(nextLevel);
});
elements.mapButton.addEventListener('click', openMap);
elements.mapClose.addEventListener('click', closeMap);
elements.mapDialog.addEventListener('click', (event) => {
  if (event.target === elements.mapDialog) closeMap();
});
elements.mapPrevious.addEventListener('click', () => {
  visibleMapIsland = Math.max(1, visibleMapIsland - 1);
  renderMap();
});
elements.mapNext.addEventListener('click', () => {
  visibleMapIsland = Math.min(Math.ceil(STORY_LEVELS / LEVELS_PER_ISLAND), visibleMapIsland + 1);
  renderMap();
});
elements.endlessButton.addEventListener('click', () => {
  const progress = progressStore.snapshot();
  if (!progress.storyCompleted) return;
  closeMap();
  restart(ENDLESS_START_LEVEL + progress.endlessBest);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !elements.collectionDialog.hidden) closeCollection();
  if (event.key === 'Escape' && !elements.mapDialog.hidden) closeMap();
});

function renderCollectionSummary() {
  const progress = progressStore.snapshot();
  const totalStars = Object.values(progress.stars).reduce((total, stars) => total + Number(stars), 0);
  elements.collectionCount.textContent = `${progress.discovered.length}/${PET_PROFILES.length}`;
  elements.collectionSummary.textContent = `已发现 ${progress.discovered.length} / ${PET_PROFILES.length} · 获得 ${totalStars} / ${STORY_LEVELS * 3} 星 · v${GAME_VERSION}`;
}

function renderCollection() {
  const progress = progressStore.snapshot();
  const discovered = new Set(progress.discovered);
  elements.collectionGrid.replaceChildren(...PET_PROFILES.map((pet, type) => {
    const unlocked = discovered.has(type);
    const entry = document.createElement('article');
    entry.className = `pet-entry${unlocked ? '' : ' locked'}`;
    const portrait = document.createElement('span');
    portrait.className = 'pet-portrait';
    portrait.style.setProperty('--sprite-x', type % 5);
    portrait.style.setProperty('--sprite-y', Math.floor(type / 5));
    portrait.setAttribute('aria-hidden', 'true');
    const name = document.createElement('strong');
    name.textContent = unlocked ? pet.name : '？？？';
    const detail = document.createElement('small');
    detail.textContent = unlocked ? pet.detail : '在后续关卡等待相遇';
    entry.append(portrait, name, detail);
    return entry;
  }));
  renderCollectionSummary();
}

function openCollection() {
  collectionResumeOnClose = engine.state === 'playing';
  if (collectionResumeOnClose) engine.pause();
  renderCollection();
  renderStats();
  elements.collectionDialog.hidden = false;
  elements.collectionClose.focus();
}

function closeCollection() {
  elements.collectionDialog.hidden = true;
  if (collectionResumeOnClose && engine.state === 'paused') engine.resume();
  collectionResumeOnClose = false;
  renderStats();
  elements.collectionButton.focus();
}

function renderMap() {
  const progress = progressStore.snapshot();
  const start = (visibleMapIsland - 1) * LEVELS_PER_ISLAND + 1;
  const end = Math.min(STORY_LEVELS, start + LEVELS_PER_ISLAND - 1);
  const island = getIslandDefinition(visibleMapIsland);
  const captainType = island.captainType;
  elements.mapDialog.dataset.theme = island.palette.key;
  elements.mapDialog.style.setProperty('--map-page', island.palette.page);
  elements.mapDialog.style.setProperty('--map-board', island.palette.board);
  elements.mapDialog.style.setProperty('--map-line', island.palette.boardLine);
  elements.mapDialog.style.setProperty('--map-ink', island.palette.ink);
  elements.mapDialog.style.setProperty('--map-muted', island.palette.muted);
  elements.mapDialog.style.setProperty('--map-accent', island.palette.accent);
  elements.mapDialog.style.setProperty('--map-mint', island.palette.mint);
  elements.mapTitle.textContent = island.name;
  elements.mapSummary.textContent = `第 ${start}—${end} 关 · 已解锁第 ${progress.unlockedLevel} 关`;
  elements.mapCaptainAvatar.style.setProperty('--sprite-x', captainType % 5);
  elements.mapCaptainAvatar.style.setProperty('--sprite-y', Math.floor(captainType / 5));
  elements.mapCaptainAvatar.style.setProperty('--captain-hue', island.captainHue);
  elements.mapCaptainName.textContent = `${island.captainTitle}·${TILE_NAMES[captainType]}`;
  elements.mapCaptainName.title = `${island.captainSkill.name}：${island.captainSkill.description}`;
  elements.mapThemeName.textContent = island.themeName;
  elements.mapRewardName.textContent = island.reward.name;
  elements.mapRewardDescription.textContent = `第10关完成后：${island.reward.description}`;
  elements.mapPrevious.disabled = visibleMapIsland === 1;
  elements.mapNext.disabled = visibleMapIsland >= Math.ceil(STORY_LEVELS / LEVELS_PER_ISLAND);
  elements.mapLevels.replaceChildren(...Array.from({ length: end - start + 1 }, (_, index) => {
    const level = start + index;
    const config = getLevelConfig(level);
    const stars = Number(progress.stars[level] ?? 0);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'island-level';
    button.classList.toggle('current', level === engine.level);
    button.classList.toggle('completed', stars > 0);
    button.classList.toggle('reward', config.isReward);
    button.classList.toggle('boss', config.isBoss);
    button.disabled = !progressStore.canPlay(level);
    button.innerHTML = `<strong>${config.isBoss ? '★' : config.isReward ? '✦' : config.islandLevel}</strong><small>${stars ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : config.isBoss ? '队长试炼' : config.isReward ? '奖励关' : config.name}</small>`;
    button.setAttribute('aria-label', `第 ${level} 关，${config.name}${button.disabled ? '，尚未解锁' : ''}`);
    button.addEventListener('click', () => {
      if (!progressStore.canPlay(level)) return;
      closeMap();
      restart(level);
    });
    return button;
  }));
  elements.endlessButton.disabled = !progress.storyCompleted;
  elements.endlessStatus.textContent = progress.storyCompleted
    ? `最高到达无尽第 ${progress.endlessBest} 关 · 点击继续`
    : '通关第1000关后解锁';
}

function openMap() {
  visibleMapIsland = getIslandNumber(Math.min(engine.level, STORY_LEVELS));
  mapResumeOnClose = engine.state === 'playing';
  if (mapResumeOnClose) engine.pause();
  renderMap();
  renderStats();
  elements.mapDialog.hidden = false;
  elements.mapClose.focus();
}

function closeMap() {
  elements.mapDialog.hidden = true;
  if (mapResumeOnClose && engine.state === 'paused') engine.resume();
  mapResumeOnClose = false;
  renderStats();
  elements.mapButton.focus();
}

function restart(level) {
  if (!progressStore.canPlay(level) && level !== engine.level) {
    showToast('先完成前面的关卡才能前往这里');
    return;
  }
  progressStore.setCurrentLevel(level);
  engine.reset(level);
  locked = false;
  resetCombo();
  activePowerup = null;
  elements.dialog.hidden = true;
  const label = engine.levelConfig.endless ? `无尽第 ${engine.level - STORY_LEVELS} 关` : `第 ${engine.level} 关`;
  elements.status.textContent = `${label} · ${engine.levelConfig.islandName} · ${engine.levelConfig.name}：${engine.levelConfig.rule}`;
  clearPath();
  render();
}

function togglePause() {
  if (locked) {
    showToast('当前动画结束后即可暂停');
    return;
  }
  const changed = engine.state === 'paused' ? engine.resume() : engine.pause();
  if (!changed) return;
  activePowerup = null;
  resetCombo();
  render();
  elements.status.textContent = engine.state === 'paused' ? '游戏已暂停，倒计时停止' : '继续游戏，倒计时已恢复';
}

function useMagicPowerup(position) {
  const scoreBefore = engine.score;
  const result = engine.useMagicPair(position);
  activePowerup = null;
  if (!result) {
    renderStats();
    showToast('这枚棋子暂时没有同伴');
    return;
  }
  locked = true;
  resetCombo();
  markSpecialTiles([result.from, result.to], 'magic-hit');
  triggerMatchEffects(result, engine.score - scoreBefore, 1);
  flashTimerBonus(result.timeAdded);
  showSpecialBanner('✦', '心光结', 'magic-banner');
  elements.board.classList.add('magic-cast');
  elements.status.textContent = `心光结发动：萌宠重逢，时间 +${result.timeAdded} 秒${result.shiny ? ' · 闪光双倍得分' : ''}`;
  if (result.shiny) showToast('闪光共鸣！本次得分翻倍');
  renderStats();
  window.setTimeout(() => finishPowerup(result, 'magic-cast'), 680);
}

function useTimePowerup() {
  const result = engine.useTimeBoost(15);
  if (!result) return;
  resetCombo();
  renderStats();
  document.querySelector('.timer-stat').classList.add('time-boosted');
  showSpecialBanner('+15', '秒', 'time-banner');
  elements.status.textContent = '时砂露生效：剩余时间增加 15 秒';
  showToast('时砂露 +15 秒');
  window.setTimeout(() => document.querySelector('.timer-stat').classList.remove('time-boosted'), 900);
}

function useBombPowerup() {
  const result = engine.useBomb(3);
  if (!result) return;
  locked = true;
  activePowerup = null;
  resetCombo();
  const positions = result.matches.flat();
  markSpecialTiles(positions, 'bomb-hit');
  flashTimerBonus(result.timeAdded);
  showSpecialBanner(String(result.matches.length), '对送回', 'bomb-banner');
  elements.board.classList.add('bomb-cast');
  elements.status.textContent = `绒星烟花发动：送回 ${result.matches.length} 对萌宠，时间 +${result.timeAdded} 秒${result.shinyMatches ? ` · 命中${result.shinyMatches}对闪光` : ''}`;
  renderStats();
  window.setTimeout(() => finishPowerup(result, 'bomb-cast'), 720);
}

function finishPowerup(result, boardClass) {
  elements.board.classList.remove(boardClass);
  render();
  showMovementCue(result.movement);
  locked = false;
  if (result.won) showEndDialog(true);
  else if (result.autoShuffled) showToast('道具使用后已自动整理棋盘');
}

function showMovementCue(movement) {
  if (!movement || movement === 'static') return;
  elements.board.dataset.movement = movement;
  elements.board.classList.remove('is-settling');
  void elements.board.offsetWidth;
  elements.board.classList.add('is-settling');
  window.setTimeout(() => elements.board.classList.remove('is-settling'), 360);
}

function flashTimerBonus(seconds) {
  if (!seconds) return;
  const timerStat = document.querySelector('.timer-stat');
  timerStat.classList.remove('time-boosted');
  void timerStat.offsetWidth;
  timerStat.classList.add('time-boosted');
  window.setTimeout(() => timerStat.classList.remove('time-boosted'), 900);
}

function markSpecialTiles(positions, className) {
  positions.forEach((position) => {
    elements.board.querySelector(`[data-row="${position.row}"][data-col="${position.col}"]`)?.classList.add(className);
  });
}

function showSpecialBanner(value, label, className) {
  elements.board.querySelector('.special-banner')?.remove();
  const banner = document.createElement('div');
  banner.className = `special-banner ${className}`;
  banner.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
  elements.board.append(banner);
  window.setTimeout(() => banner.remove(), 1000);
}

function resetCombo() {
  comboCount = 0;
  lastMatchAt = 0;
}

function applyComboReward(combo) {
  if (combo === 3) {
    engine.grantTime(2);
    showSpecialBanner('+2', '秒连击奖励', 'time-banner');
    return { timeAdded: 2, message: '3连击奖励 +2秒', echo: false };
  }
  if (combo === 5) {
    engine.freezeTimer(3);
    showSpecialBanner('❄', '计时冻结3秒', 'freeze-banner');
    return { timeAdded: 0, message: '5连击冻结计时3秒', echo: false };
  }
  if (combo === 8) {
    showSpecialBanner('♥', '心光回响', 'echo-banner');
    return { timeAdded: 0, message: '8连击自动送回一对', echo: true };
  }
  return { timeAdded: 0, message: '', echo: false };
}

function performComboEcho() {
  if (locked || engine.state !== 'playing') return;
  const scoreBefore = engine.score;
  const result = engine.autoMatch();
  if (!result) return;
  locked = true;
  drawPath(result.path);
  if (result.type === 'ice-break') markSpecialTiles(result.iceHits, 'ice-breaking');
  else markMatched(result.from, result.to);
  triggerMatchEffects(result, engine.score - scoreBefore, comboCount);
  flashTimerBonus(result.timeAdded);
  showSpecialBanner(result.type === 'ice-break' ? '❄' : '♥', result.type === 'ice-break' ? '击碎霜晶' : '自动重逢', 'echo-banner');
  elements.status.textContent = result.type === 'ice-break'
    ? '心光回响击碎了霜晶，再连接一次即可消除'
    : `心光回响送回一对萌宠，时间 +${result.timeAdded} 秒${result.shiny ? ' · 闪光双倍得分' : ''}`;
  renderStats();
  window.setTimeout(() => {
    clearPath();
    render();
    showMovementCue(result.movement);
    locked = false;
    if (result.won) showEndDialog(true);
    else if (result.autoShuffled) showToast('心光回响后已自动整理棋盘');
  }, 380);
}

function triggerMatchEffects(result, scoreDelta, combo) {
  const boardRect = elements.board.getBoundingClientRect();
  const centers = [result.from, result.to].map((position) => {
    const tile = elements.board.querySelector(`[data-row="${position.row}"][data-col="${position.col}"]`);
    const rect = tile?.getBoundingClientRect();
    return rect
      ? { x: rect.left - boardRect.left + rect.width / 2, y: rect.top - boardRect.top + rect.height / 2 }
      : { x: boardRect.width / 2, y: boardRect.height / 2 };
  });

  centers.forEach((center, index) => createSparkBurst(center, index));
  showScorePop(centers, scoreDelta, combo);
  if (combo >= 2) showComboFlare(combo);
  if (combo >= 3 && combo % 3 === 0) createPetalRain();
}

function createSparkBurst(center, offset) {
  const colors = ['#f4715d', '#f8bf4f', '#60b79c', '#ffffff'];
  const sparkCount = compactEffects ? 6 : 10;
  for (let index = 0; index < sparkCount; index += 1) {
    const angle = (Math.PI * 2 * index / sparkCount) + offset * 0.18;
    const distance = 32 + (index % 3) * 9;
    const spark = document.createElement('span');
    spark.className = 'match-spark';
    spark.style.left = `${center.x}px`;
    spark.style.top = `${center.y}px`;
    spark.style.setProperty('--spark-x', `${Math.cos(angle) * distance}px`);
    spark.style.setProperty('--spark-y', `${Math.sin(angle) * distance}px`);
    spark.style.setProperty('--spark-color', colors[index % colors.length]);
    elements.board.append(spark);
    window.setTimeout(() => spark.remove(), 760);
  }
}

function showScorePop(centers, scoreDelta, combo) {
  const scorePop = document.createElement('span');
  scorePop.className = 'score-pop';
  scorePop.style.left = `${(centers[0].x + centers[1].x) / 2}px`;
  scorePop.style.top = `${(centers[0].y + centers[1].y) / 2}px`;
  scorePop.textContent = `+${scoreDelta}${combo >= 2 ? ` · ${combo}连击` : ''}`;
  elements.board.append(scorePop);
  window.setTimeout(() => scorePop.remove(), 900);
}

function showComboFlare(combo) {
  elements.board.querySelector('.combo-flare')?.remove();
  const flare = document.createElement('div');
  flare.className = `combo-flare${combo >= 3 ? ' is-hot' : ''}`;
  flare.innerHTML = `<strong>${combo}</strong><span>连击</span>`;
  elements.board.append(flare);
  window.setTimeout(() => flare.remove(), 900);
}

function createPetalRain() {
  const rain = document.createElement('div');
  rain.className = 'petal-rain';
  rain.setAttribute('aria-hidden', 'true');
  const petalCount = compactEffects ? 12 : 24;
  for (let index = 0; index < petalCount; index += 1) {
    const petal = document.createElement('i');
    petal.style.setProperty('--petal-left', `${3 + Math.random() * 94}%`);
    petal.style.setProperty('--petal-delay', `${Math.random() * 0.45}s`);
    petal.style.setProperty('--petal-duration', `${1.1 + Math.random() * 0.8}s`);
    petal.style.setProperty('--petal-drift', `${-45 + Math.random() * 90}px`);
    rain.append(petal);
  }
  elements.board.append(rain);
  window.setTimeout(() => rain.remove(), 2400);
}

function showEndDialog(won) {
  const completedStory = won && engine.level === STORY_LEVELS;
  const endless = engine.levelConfig.endless;
  const rewardUnlocked = won && engine.levelConfig.isReward;
  const nextLevel = won ? getLevelConfig(engine.level + 1) : null;
  const stars = won ? engine.starsEarned : 0;
  if (won) progressStore.recordCompletion(engine.level, stars);
  elements.dialogStars.replaceChildren(...Array.from({ length: 3 }, (_, index) => {
    const star = document.createElement('span');
    star.textContent = '★';
    star.classList.toggle('earned', index < stars);
    return star;
  }));
  elements.dialogStars.hidden = !won;
  renderCollectionSummary();
  renderLevelProgress(engine.level);
  elements.dialogIcon.textContent = won ? (completedStory ? '🏆' : rewardUnlocked ? '✦' : engine.levelConfig.isBoss ? '★' : '✿') : '⌛';
  elements.dialogTitle.textContent = completedStory
    ? '千关远航完成！'
    : won
      ? endless ? `无尽第 ${engine.level - STORY_LEVELS} 关完成！` : `第 ${engine.level} 关完成！`
      : '时间到';
  elements.dialogMessage.textContent = completedStory
    ? `你完成了1000关岛屿旅程，无尽星海已经解锁！本关获得 ${stars}/3 星。`
    : rewardUnlocked
      ? `获得“${engine.levelConfig.islandReward.name}”！${engine.levelConfig.islandReward.description}。下一关开始生效。`
    : won
      ? `${endless ? '继续驶向无尽星海。' : `本关获得 ${stars}/3 星。`}下一关：${nextLevel.name}。${nextLevel.rule}`
      : '差一点就成功了，再试一次吧。每关都会从03:00重新开始。';
  elements.dialogScore.textContent = engine.score.toLocaleString('zh-CN');
  elements.dialogPrimary.textContent = completedStory
    ? '进入无尽星海'
    : won
      ? endless ? `继续无尽第 ${engine.level - STORY_LEVELS + 1} 关` : `进入第 ${engine.level + 1} 关`
      : '再试一次';
  elements.dialogSecondary.textContent = '重玩本关';
  elements.dialogSecondary.hidden = !won;
  elements.dialog.hidden = false;
  elements.dialogPrimary.focus();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  toastTimer = window.setTimeout(() => elements.toast.classList.remove('show'), 2200);
}

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

window.setInterval(() => {
  const state = engine.tick();
  renderStats();
  if (state === 'lost' && elements.dialog.hidden) showEndDialog(false);
}, 1000);

render();
registerPWA();
