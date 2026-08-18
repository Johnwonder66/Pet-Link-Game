export const STORY_LEVELS = 1000;
export const ENDLESS_START_LEVEL = STORY_LEVELS + 1;
export const MAX_LEVELS = STORY_LEVELS;
export const LEVELS_PER_ISLAND = 20;

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

export const ISLAND_NAMES = [
  '晨露岛', '云芽岛', '月绒岛', '花冠岛', '潮铃岛',
  '星灯岛', '风筝岛', '极光岛', '晶角岛', '梦云岛'
];

const MOVEMENTS = [
  'static', 'down', 'up', 'left', 'right',
  'horizontal-in', 'horizontal-out', 'vertical-in', 'vertical-out', 'rotate'
];
const ROTATION = ['down', 'left', 'up', 'right'];

const TUTORIAL_RULES = [
  ['经典静止', '消除后，其余棋子保持原位'],
  ['向下掉落', '每次消除后，各列棋子向下补位'],
  ['向上漂浮', '每次消除后，各列棋子向上补位'],
  ['向左收拢', '每次消除后，各行棋子向左补位'],
  ['向右收拢', '每次消除后，各行棋子向右补位'],
  ['横向聚拢', '左右两侧的棋子向棋盘中央聚拢'],
  ['横向扩散', '左右两侧的棋子向棋盘边缘分开'],
  ['纵向聚拢', '上下两侧的棋子向棋盘中央聚拢'],
  ['纵向扩散', '上下两侧的棋子向棋盘边缘分开'],
  ['四向轮转', '每次消除依次向下、向左、向上、向右移动']
];

export const LEVELS = TUTORIAL_RULES.map(([name, rule], index) => ({
  id: index + 1,
  name,
  movement: MOVEMENTS[index],
  tileTypes: [12, 12, 14, 14, 16, 16, 18, 20, 20, 20][index],
  starTime: 120,
  rule,
  island: 1,
  islandLevel: index + 1,
  islandName: ISLAND_NAMES[0],
  captainType: 0,
  iceCount: 0,
  stoneCount: 0,
  isReward: false,
  isBoss: false,
  endless: false
}));

function generatedRule(movement) {
  if (movement === 'rotate') return '消除后依次向下、向左、向上、向右移动';
  return `消除后，萌宠${MOVEMENT_LABELS[movement]}`;
}

function obstaclePlan(level, isBoss, isReward) {
  if (level <= 10 || isReward) return { iceCount: 0, stoneCount: 0 };
  if (isBoss) return { iceCount: 12, stoneCount: 8 };
  const iceCount = level % 3 === 0 ? Math.min(12, 4 + 2 * Math.floor(level / 200)) : 0;
  const stoneCount = level % 7 === 0 ? 4 : 0;
  return { iceCount, stoneCount };
}

export function getIslandNumber(level) {
  const safe = Math.max(1, Number(level) || 1);
  return Math.floor((Math.min(safe, STORY_LEVELS) - 1) / LEVELS_PER_ISLAND) + 1;
}

export function getIslandName(island) {
  const cycle = ISLAND_NAMES[(Math.max(1, island) - 1) % ISLAND_NAMES.length];
  const voyage = Math.floor((Math.max(1, island) - 1) / ISLAND_NAMES.length) + 1;
  return voyage === 1 ? cycle : `${cycle}·第${voyage}航程`;
}

export function getIslandLevels(level) {
  const island = getIslandNumber(level);
  const start = (island - 1) * LEVELS_PER_ISLAND + 1;
  return Array.from({ length: LEVELS_PER_ISLAND }, (_, index) => start + index)
    .filter((item) => item <= STORY_LEVELS);
}

export function getLevelConfig(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  if (safeLevel <= LEVELS.length) return { ...LEVELS[safeLevel - 1] };

  const endless = safeLevel > STORY_LEVELS;
  const storySeed = endless ? STORY_LEVELS + ((safeLevel - STORY_LEVELS - 1) % 200) + 1 : safeLevel;
  const island = endless
    ? 51 + Math.floor((safeLevel - ENDLESS_START_LEVEL) / LEVELS_PER_ISLAND)
    : getIslandNumber(storySeed);
  const islandLevel = ((storySeed - 1) % LEVELS_PER_ISLAND) + 1;
  const isBoss = !endless && islandLevel === LEVELS_PER_ISLAND;
  const isReward = !isBoss && islandLevel === 10;
  const intendedMovement = MOVEMENTS[(storySeed - 1) % MOVEMENTS.length];
  const obstacles = obstaclePlan(storySeed, isBoss, isReward);
  const movement = obstacles.stoneCount > 0 ? 'static' : intendedMovement;
  const captainType = (island - 1) % 20;
  const name = isBoss
    ? '萌宠队长试炼'
    : isReward
      ? '星光奖励关'
      : obstacles.stoneCount
        ? '岩障迷阵'
        : obstacles.iceCount
          ? '霜晶棋盘'
          : intendedMovement === 'rotate' ? '四向轮转' : MOVEMENT_LABELS[intendedMovement];
  const obstacleText = [
    obstacles.iceCount ? `${obstacles.iceCount}枚霜晶` : '',
    obstacles.stoneCount ? `${obstacles.stoneCount}块岩障` : ''
  ].filter(Boolean).join('与');
  const rule = isReward
    ? '闪光萌宠增加，完成即可领取岛屿补给'
    : `${generatedRule(movement)}${obstacleText ? `，并穿越${obstacleText}` : ''}`;

  return {
    id: safeLevel,
    name,
    movement,
    intendedMovement,
    tileTypes: 20,
    starTime: 120,
    rule,
    island,
    islandLevel,
    islandName: endless ? '无尽星海' : getIslandName(island),
    captainType,
    iceCount: obstacles.iceCount,
    stoneCount: obstacles.stoneCount,
    isReward,
    isBoss,
    endless
  };
}

export function resolveMovement(levelConfig, movementStep = 0) {
  if (levelConfig.movement !== 'rotate') return levelConfig.movement;
  return ROTATION[movementStep % ROTATION.length];
}

export function getNextMovementLabel(levelConfig, movementStep = 0) {
  return MOVEMENT_LABELS[resolveMovement(levelConfig, movementStep)];
}
