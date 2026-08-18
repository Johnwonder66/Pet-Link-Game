import { TILE_TYPES } from './constants.js';
import { createBoardWithObstacles } from './board.js';
import { findAvailableMove } from './pathfinding.js';
import { createSeededRandom } from './random.js';

const MOVEMENTS = new Set([
  'static', 'down', 'up', 'left', 'right',
  'horizontal-in', 'horizontal-out', 'vertical-in', 'vertical-out'
]);
const GOALS = new Set(['clearAll', 'clearCaptain', 'breakIce', 'score']);
const STAR_TYPES = new Set([
  'complete', 'timeLeft', 'noHint', 'noPowerup', 'maxShuffles',
  'clearShiny', 'clearIce', 'clearCaptain', 'score'
]);
const LIMIT_KEYS = ['hints', 'shuffles', 'magic', 'timeBoosts', 'bombs'];

export function validateLevelConfiguration(config, captainType = 0) {
  const errors = [];
  const rows = Number(config?.board?.rows);
  const cols = Number(config?.board?.cols);
  const mask = Array.isArray(config?.board?.mask) ? config.board.mask : [];
  const stones = Array.isArray(config?.obstacles?.stones) ? config.obstacles.stones : [];
  const ice = Array.isArray(config?.obstacles?.ice) ? config.obstacles.ice : [];
  const movements = Array.isArray(config?.movement) ? config.movement : [];
  const goals = Array.isArray(config?.goals) ? config.goals : [];
  const stars = Array.isArray(config?.stars) ? config.stars : [];

  if (!Number.isInteger(config?.id) || config.id < 1) errors.push('关卡 id 必须是正整数');
  if (typeof config?.seed !== 'string' || !config.seed.trim()) errors.push('必须提供非空 seed');
  if (!Number.isInteger(rows) || rows < 2 || !Number.isInteger(cols) || cols < 2) {
    errors.push('棋盘行列必须是不小于2的整数');
  }

  const maskKeys = validatePositions(mask, rows, cols, '棋盘遮罩', errors);
  const stoneKeys = validatePositions(stones, rows, cols, '岩障', errors);
  stoneKeys.forEach((key) => {
    if (maskKeys.has(key)) errors.push(`岩障 ${key} 不能与棋盘遮罩重叠`);
  });

  const blockedKeys = new Set([...maskKeys, ...stoneKeys]);
  const playableCount = Number.isFinite(rows * cols) ? rows * cols - blockedKeys.size : 0;
  if (playableCount < 2 || playableCount % 2 !== 0) errors.push('可用棋盘格数必须为不小于2的偶数');
  if (!Number.isInteger(config?.tileTypes) || config.tileTypes < 1 || config.tileTypes > TILE_TYPES) {
    errors.push(`tileTypes 必须在1到${TILE_TYPES}之间`);
  } else if (config.tileTypes > playableCount / 2) {
    errors.push('tileTypes 不能超过可用配对数');
  }
  if (!Number.isInteger(config?.timeLimit) || config.timeLimit <= 0) errors.push('timeLimit 必须是正整数');
  if (!movements.length || movements.some((movement) => !MOVEMENTS.has(movement))) errors.push('移动规则不受支持');

  const iceKeys = new Set();
  ice.forEach((item) => {
    const key = positionKey(item);
    if (!inside(item, rows, cols)) errors.push(`霜晶 ${key} 超出棋盘`);
    if (iceKeys.has(key)) errors.push(`霜晶 ${key} 重复`);
    if (blockedKeys.has(key)) errors.push(`霜晶 ${key} 不能放在岩障或遮罩格`);
    if (![1, 2].includes(item?.layers)) errors.push(`霜晶 ${key} 层数只能是1或2`);
    iceKeys.add(key);
  });

  if (!goals.length || goals.some((goal) => !GOALS.has(goal?.type))) errors.push('至少需要一个受支持的关卡目标');
  goals.forEach((goal) => {
    if (goal.type !== 'clearAll' && (!Number.isInteger(goal.count ?? goal.value) || Number(goal.count ?? goal.value) <= 0)) {
      errors.push(`目标 ${goal.type} 需要正整数数量`);
    }
  });
  const captainGoal = goals.find((goal) => goal.type === 'clearCaptain');
  if (captainGoal && captainGoal.count > captainPairCapacity(playableCount, config.tileTypes, captainType)) {
    errors.push('队长萌宠目标超过棋盘可生成数量');
  }

  LIMIT_KEYS.forEach((key) => {
    if (!Number.isInteger(config?.limits?.[key]) || config.limits[key] < 0) errors.push(`道具限制 ${key} 必须是非负整数`);
  });
  if (stars.length !== 3 || stars.some((condition) => !STAR_TYPES.has(condition?.type))) {
    errors.push('三星条件必须恰好包含3个受支持的条件');
  }
  stars.forEach((condition) => {
    if (!['complete', 'noHint', 'noPowerup'].includes(condition.type)
      && (!Number.isInteger(condition.value) || condition.value < 0)) {
      errors.push(`星级条件 ${condition.type} 需要非负整数 value`);
    }
  });
  if (config?.isBoss && !goals.some((goal) => goal.type === 'clearCaptain')) {
    errors.push('Boss关必须包含队长萌宠目标');
  }

  if (!errors.length) {
    try {
      const blocked = [...mask, ...stones];
      const board = createBoardWithObstacles(rows, cols, config.tileTypes, blocked, createSeededRandom(config.seed));
      if (!findAvailableMove(board)) errors.push('初始棋盘没有可消除组合');
      const counts = new Map();
      board.flat().filter((tile) => tile != null && tile >= 0)
        .forEach((tile) => counts.set(tile, (counts.get(tile) ?? 0) + 1));
      if ([...counts.values()].some((count) => count % 2 !== 0)) errors.push('初始棋盘存在未成对萌宠');
    } catch (error) {
      errors.push(`棋盘生成失败：${error.message}`);
    }
  }

  return errors;
}

export function validateAllLevels(levels, getCaptainType = () => 0) {
  const errors = [];
  const ids = new Set();
  const seeds = new Set();
  levels.forEach((config, index) => {
    if (config.id !== index + 1) errors.push(`关卡序号不连续：期望 ${index + 1}，实际 ${config.id}`);
    if (ids.has(config.id)) errors.push(`关卡 id ${config.id} 重复`);
    if (seeds.has(config.seed)) errors.push(`关卡 seed ${config.seed} 重复`);
    ids.add(config.id);
    seeds.add(config.seed);
    validateLevelConfiguration(config, getCaptainType(config)).forEach((error) => {
      errors.push(`第${config.id}关：${error}`);
    });
  });
  return errors;
}

function validatePositions(positions, rows, cols, label, errors) {
  const keys = new Set();
  positions.forEach((position) => {
    const key = positionKey(position);
    if (!inside(position, rows, cols)) errors.push(`${label} ${key} 超出棋盘`);
    if (keys.has(key)) errors.push(`${label} ${key} 重复`);
    keys.add(key);
  });
  return keys;
}

function inside(position, rows, cols) {
  return Number.isInteger(position?.row) && position.row >= 0 && position.row < rows
    && Number.isInteger(position?.col) && position.col >= 0 && position.col < cols;
}

function positionKey(position) {
  return `${position?.row},${position?.col}`;
}

function captainPairCapacity(playableCount, tileTypes, captainType) {
  const pairs = playableCount / 2;
  if (!Number.isInteger(tileTypes) || captainType >= tileTypes || captainType >= pairs) return 0;
  return Math.floor((pairs - 1 - captainType) / tileTypes) + 1;
}
