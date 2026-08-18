import { CURATED_LEVELS } from './level-data.js';
import { ISLANDS, ISLAND_NAMES, getIslandDefinition } from './islands.js';

export const STORY_LEVELS = CURATED_LEVELS.length;
export const ENDLESS_START_LEVEL = STORY_LEVELS + 1;
export const MAX_LEVELS = STORY_LEVELS;
export const LEVELS_PER_ISLAND = 20;

export { ISLANDS, ISLAND_NAMES, getIslandDefinition };

export const MOVEMENT_LABELS = {
  static: '保持原位',
  down: '向下掉落',
  up: '向上漂浮',
  left: '向左收拢',
  right: '向右收拢',
  'horizontal-in': '横向聚拢',
  'horizontal-out': '横向扩散',
  'vertical-in': '纵向聚拢',
  'vertical-out': '纵向扩散'
};

export const LEVELS = Object.freeze(CURATED_LEVELS.map((level) => buildStoryConfig(level)));

export function getIslandNumber(level) {
  const safe = Math.max(1, Number(level) || 1);
  return Math.floor((Math.min(safe, STORY_LEVELS) - 1) / LEVELS_PER_ISLAND) + 1;
}

export function getIslandName(island) {
  return getIslandDefinition(island).name;
}

export function getIslandLevels(level) {
  const island = getIslandNumber(level);
  const start = (island - 1) * LEVELS_PER_ISLAND + 1;
  return Array.from({ length: LEVELS_PER_ISLAND }, (_, index) => start + index)
    .filter((item) => item <= STORY_LEVELS);
}

export function getLevelConfig(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  if (safeLevel <= STORY_LEVELS) return clone(LEVELS[safeLevel - 1]);

  const source = CURATED_LEVELS[(safeLevel - ENDLESS_START_LEVEL) % CURATED_LEVELS.length];
  const endlessIsland = 51 + Math.floor((safeLevel - ENDLESS_START_LEVEL) / LEVELS_PER_ISLAND);
  const islandTheme = getIslandDefinition(endlessIsland);
  return normalizeLevel({
    ...clone(source),
    id: safeLevel,
    seed: `endless-${safeLevel}-${source.seed}`,
    name: `无尽·${source.name}`,
    island: endlessIsland,
    islandLevel: ((safeLevel - ENDLESS_START_LEVEL) % LEVELS_PER_ISLAND) + 1,
    islandName: '无尽星海',
    islandTheme,
    captainType: islandTheme.captainType,
    captainTitle: islandTheme.captainTitle,
    captainSkill: islandTheme.captainSkill,
    islandReward: islandTheme.reward,
    rewardActive: false,
    isReward: false,
    isBoss: false,
    endless: true
  });
}

export function resolveMovement(levelConfig, movementStep = 0) {
  const plan = levelConfig.movementPlan ?? [levelConfig.movement ?? 'static'];
  return plan[movementStep % plan.length] ?? 'static';
}

export function getNextMovementLabel(levelConfig, movementStep = 0) {
  return MOVEMENT_LABELS[resolveMovement(levelConfig, movementStep)];
}

function buildStoryConfig(source) {
  const island = Math.floor((source.id - 1) / LEVELS_PER_ISLAND) + 1;
  const islandTheme = getIslandDefinition(island);
  return normalizeLevel({
    ...clone(source),
    island,
    islandLevel: ((source.id - 1) % LEVELS_PER_ISLAND) + 1,
    islandName: islandTheme.name,
    islandTheme,
    captainType: islandTheme.captainType,
    captainTitle: islandTheme.captainTitle,
    captainSkill: islandTheme.captainSkill,
    islandReward: islandTheme.reward,
    rewardActive: false,
    isReward: Boolean(source.isReward),
    isBoss: Boolean(source.isBoss),
    endless: false
  });
}

function normalizeLevel(config) {
  const movementPlan = [...(config.movementPlan ?? config.movement ?? ['static'])];
  const movement = movementPlan.length === 1 ? movementPlan[0] : 'rotate';
  return {
    ...config,
    movement,
    movementPlan,
    starTime: config.stars.find((condition) => condition.type === 'timeLeft')?.value ?? 0,
    iceCount: config.obstacles.ice.reduce((total, item) => total + item.layers, 0),
    stoneCount: config.obstacles.stones.length
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
