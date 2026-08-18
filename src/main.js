import { COLS, ROWS, TILE_NAMES } from './constants.js';
import { GameEngine } from './engine.js';
import { LEVELS, MAX_LEVELS, MOVEMENT_LABELS, getLevelConfig } from './levels.js';
import { placeTileInGrid } from './tile-layout.js';
import { registerPWA } from './pwa.js';

const engine = new GameEngine();
const elements = {
  board: document.querySelector('#board'),
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
  toast: document.querySelector('#toast'),
  dialog: document.querySelector('#game-dialog'),
  dialogIcon: document.querySelector('#dialog-icon'),
  dialogTitle: document.querySelector('#dialog-title'),
  dialogMessage: document.querySelector('#dialog-message'),
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

function renderBoard() {
  const snapshot = engine.snapshot();
  elements.board.querySelectorAll('.tile').forEach((tile) => tile.remove());
  snapshot.board.forEach((row, rowIndex) => row.forEach((type, colIndex) => {
    if (type == null) return;
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'tile';
    tile.dataset.row = rowIndex;
    tile.dataset.col = colIndex;
    tile.style.setProperty('--row', rowIndex);
    tile.style.setProperty('--col', colIndex);
    placeTileInGrid(tile, rowIndex, colIndex);
    tile.style.setProperty('--sprite-x', type % 5);
    tile.style.setProperty('--sprite-y', Math.floor(type / 5));
    tile.dataset.type = type;
    tile.dataset.label = TILE_NAMES[type];
    tile.setAttribute('role', 'gridcell');
    tile.setAttribute('aria-label', `${TILE_NAMES[type]}，第 ${rowIndex + 1} 行第 ${colIndex + 1} 列`);
    if (snapshot.selected?.row === rowIndex && snapshot.selected?.col === colIndex) {
      tile.classList.add('selected');
      tile.setAttribute('aria-selected', 'true');
    }
    tile.addEventListener('click', handleTileClick);
    elements.board.append(tile);
  }));
}

function renderStats() {
  const snapshot = engine.snapshot();
  elements.score.textContent = snapshot.score.toLocaleString('zh-CN');
  elements.level.textContent = `${snapshot.level} / ${snapshot.maxLevels}`;
  elements.levelMode.textContent = snapshot.levelConfig.name;
  elements.levelRule.textContent = snapshot.levelConfig.movement === 'rotate'
    ? `${snapshot.activeTileTypes}种萌宠 · ${snapshot.levelConfig.rule} · 下一次：${snapshot.nextMovementLabel}`
    : `${snapshot.activeTileTypes}种萌宠 · ${snapshot.levelConfig.rule}`;
  renderLevelProgress(snapshot.level);
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
  const percentage = snapshot.timeLeft / snapshot.totalTime * 100;
  elements.timerBar.style.width = `${percentage}%`;
  elements.timerBar.classList.toggle('urgent', percentage <= 25);
}

function renderLevelProgress(activeLevel) {
  if (elements.levelProgress.children.length !== LEVELS.length) {
    elements.levelProgress.replaceChildren(...LEVELS.map((level) => {
      const dot = document.createElement('span');
      dot.textContent = level.id;
      dot.title = `第 ${level.id} 关：${level.name}`;
      dot.setAttribute('aria-label', `第 ${level.id} 关，${level.name}`);
      return dot;
    }));
  }
  [...elements.levelProgress.children].forEach((dot, index) => {
    dot.classList.toggle('completed', index + 1 < activeLevel);
    dot.classList.toggle('active', index + 1 === activeLevel);
    dot.setAttribute('aria-current', index + 1 === activeLevel ? 'step' : 'false');
  });
}

function render() {
  renderBoard();
  renderStats();
}

function handleTileClick(event) {
  if (locked) return;
  const tile = event.currentTarget;
  const position = { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
  if (activePowerup === 'magic') {
    useMagicPowerup(position);
    return;
  }
  const scoreBefore = engine.score;
  const result = engine.select(position);

  if (result.type === 'match') {
    const now = Date.now();
    comboCount = now - lastMatchAt <= 3500 ? comboCount + 1 : 1;
    lastMatchAt = now;
    locked = true;
    drawPath(result.path);
    markMatched(result.from, result.to);
    triggerMatchEffects(result, engine.score - scoreBefore, comboCount);
    flashTimerBonus(result.timeAdded);
    const movementText = result.movement === 'static' ? '' : MOVEMENT_LABELS[result.movement];
    elements.status.textContent = comboCount >= 2
      ? `${comboCount} 连击！时间 +${result.timeAdded} 秒${movementText ? ` · 萌宠${movementText}` : ''}`
      : `共鸣成功，时间 +${result.timeAdded} 秒${movementText ? ` · ${movementText}` : ''}`;
    renderStats();
    window.setTimeout(() => {
      clearPath();
      render();
      showMovementCue(result.movement);
      locked = false;
      if (result.won) showEndDialog(true);
      else if (result.autoShuffled) showToast('暂时无解，已为你自动重排');
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
elements.dialogSecondary.addEventListener('click', () => restart(engine.level));
elements.dialogPrimary.addEventListener('click', () => {
  const nextLevel = engine.state === 'won'
    ? (engine.level === MAX_LEVELS ? 1 : engine.level + 1)
    : engine.level;
  restart(nextLevel);
});

function restart(level) {
  engine.reset(level);
  locked = false;
  resetCombo();
  activePowerup = null;
  elements.dialog.hidden = true;
  elements.status.textContent = `第 ${engine.level} 关 · ${engine.levelConfig.name}：${engine.levelConfig.rule}`;
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
  elements.status.textContent = `心光结发动：萌宠重逢，时间 +${result.timeAdded} 秒`;
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
  showSpecialBanner('3', '对清除', 'bomb-banner');
  elements.board.classList.add('bomb-cast');
  elements.status.textContent = `绒星烟花发动：送回 ${result.matches.length} 对萌宠，时间 +${result.timeAdded} 秒`;
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
  for (let index = 0; index < 10; index += 1) {
    const angle = (Math.PI * 2 * index / 10) + offset * 0.18;
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
  for (let index = 0; index < 24; index += 1) {
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
  const completedAll = won && engine.level === MAX_LEVELS;
  const nextLevel = won && !completedAll ? getLevelConfig(engine.level + 1) : null;
  elements.dialogIcon.textContent = won ? (completedAll ? '🏆' : '✿') : '⌛';
  elements.dialogTitle.textContent = completedAll
    ? '十关全部通关！'
    : won ? `第 ${engine.level} 关完成！` : '时间到';
  elements.dialogMessage.textContent = completedAll
    ? '你让绒光群岛的全部萌宠都顺利重逢了。'
    : won
      ? `下一关：${nextLevel.name}。${nextLevel.rule}`
      : '差一点就成功了，再试一次吧。';
  elements.dialogScore.textContent = engine.score.toLocaleString('zh-CN');
  elements.dialogPrimary.textContent = completedAll
    ? '从第 1 关再玩'
    : won ? `进入第 ${engine.level + 1} 关` : '再试一次';
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
