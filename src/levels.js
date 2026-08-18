export const LEVELS = [
  {
    id: 1,
    name: '经典静止',
    movement: 'static',
    tileTypes: 12,
    starTime: 120,
    rule: '消除后，其余棋子保持原位'
  },
  {
    id: 2,
    name: '向下掉落',
    movement: 'down',
    tileTypes: 12,
    starTime: 105,
    rule: '每次消除后，各列棋子向下补位'
  },
  {
    id: 3,
    name: '向上漂浮',
    movement: 'up',
    tileTypes: 14,
    starTime: 90,
    rule: '每次消除后，各列棋子向上补位'
  },
  {
    id: 4,
    name: '向左收拢',
    movement: 'left',
    tileTypes: 14,
    starTime: 80,
    rule: '每次消除后，各行棋子向左补位'
  },
  {
    id: 5,
    name: '向右收拢',
    movement: 'right',
    tileTypes: 16,
    starTime: 70,
    rule: '每次消除后，各行棋子向右补位'
  },
  {
    id: 6,
    name: '横向聚拢',
    movement: 'horizontal-in',
    tileTypes: 16,
    starTime: 60,
    rule: '左右两侧的棋子向棋盘中央聚拢'
  },
  {
    id: 7,
    name: '横向扩散',
    movement: 'horizontal-out',
    tileTypes: 18,
    starTime: 50,
    rule: '左右两侧的棋子向棋盘边缘分开'
  },
  {
    id: 8,
    name: '纵向聚拢',
    movement: 'vertical-in',
    tileTypes: 20,
    starTime: 40,
    rule: '上下两侧的棋子向棋盘中央聚拢'
  },
  {
    id: 9,
    name: '纵向扩散',
    movement: 'vertical-out',
    tileTypes: 20,
    starTime: 30,
    rule: '上下两侧的棋子向棋盘边缘分开'
  },
  {
    id: 10,
    name: '四向轮转',
    movement: 'rotate',
    tileTypes: 20,
    starTime: 30,
    rule: '每次消除依次向下、向左、向上、向右移动'
  }
];

export const MAX_LEVELS = LEVELS.length;

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

const ROTATION = ['down', 'left', 'up', 'right'];

export function getLevelConfig(level) {
  const safeLevel = Math.min(MAX_LEVELS, Math.max(1, Number(level) || 1));
  return LEVELS[safeLevel - 1];
}

export function resolveMovement(levelConfig, movementStep = 0) {
  if (levelConfig.movement !== 'rotate') return levelConfig.movement;
  return ROTATION[movementStep % ROTATION.length];
}

export function getNextMovementLabel(levelConfig, movementStep = 0) {
  return MOVEMENT_LABELS[resolveMovement(levelConfig, movementStep)];
}
