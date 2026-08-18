const clearAll = () => ({ type: 'clearAll' });
const clearCaptain = (count) => ({ type: 'clearCaptain', count });
const star = (type, value = undefined) => value == null ? { type } : { type, value };
const ice = (positions, layers = 1) => positions.map(([row, col]) => ({ row, col, layers }));
const cells = (positions) => positions.map(([row, col]) => ({ row, col }));
const stones = cells;

const DEFAULT_LIMITS = Object.freeze({
  hints: 2,
  shuffles: 1,
  magic: 0,
  timeBoosts: 1,
  bombs: 0
});

function defineLevel(config) {
  return {
    board: { rows: 8, cols: 10, mask: [] },
    timeLimit: 150,
    movement: ['static'],
    obstacles: { stones: [], ice: [] },
    goals: [clearAll()],
    limits: { ...DEFAULT_LIMITS },
    stars: [star('complete'), star('timeLeft', 35), star('noHint')],
    shinyPairs: 1,
    ...config,
    board: { rows: 8, cols: 10, mask: [], ...config.board },
    obstacles: {
      stones: config.obstacles?.stones ?? [],
      ice: config.obstacles?.ice ?? []
    },
    limits: { ...DEFAULT_LIMITS, ...config.limits }
  };
}

export const CURATED_LEVELS = Object.freeze([
  defineLevel({
    id: 1,
    seed: 'island-1-level-01',
    name: '露珠初遇',
    rule: '经典静止棋盘，先熟悉两次转弯的连线规则',
    board: { rows: 8, cols: 10 },
    tileTypes: 10,
    limits: { hints: 3, shuffles: 2, magic: 1 },
    stars: [star('complete'), star('timeLeft', 45), star('noHint')]
  }),
  defineLevel({
    id: 2,
    seed: 'island-1-level-02',
    name: '露珠下坠',
    rule: '每次消除后，各列萌宠向下补位',
    board: { rows: 8, cols: 10 },
    movement: ['down'],
    tileTypes: 10,
    stars: [star('complete'), star('timeLeft', 40), star('maxShuffles', 1)]
  }),
  defineLevel({
    id: 3,
    seed: 'island-1-level-03',
    name: '晨风上浮',
    rule: '每次消除后，各列萌宠向上补位',
    board: { rows: 8, cols: 10 },
    movement: ['up'],
    tileTypes: 11,
    stars: [star('complete'), star('noPowerup'), star('noHint')]
  }),
  defineLevel({
    id: 4,
    seed: 'island-1-level-04',
    name: '叶径左行',
    rule: '每次消除后，萌宠向左侧收拢',
    board: { rows: 8, cols: 10 },
    movement: ['left'],
    tileTypes: 12,
    stars: [star('complete'), star('timeLeft', 35), star('noPowerup')]
  }),
  defineLevel({
    id: 5,
    seed: 'island-1-level-05',
    name: '露林小挑战',
    rule: '上下两侧的萌宠向棋盘边缘扩散，在变化中找到高效路线',
    board: { rows: 8, cols: 10 },
    movement: ['vertical-out'],
    tileTypes: 14,
    limits: { hints: 2, shuffles: 1, magic: 0, timeBoosts: 0 },
    stars: [star('complete'), star('maxShuffles', 0), star('noPowerup')]
  }),
  defineLevel({
    id: 6,
    seed: 'island-1-level-06',
    name: '花径右行',
    rule: '每次消除后，萌宠向右侧收拢',
    board: { rows: 8, cols: 10 },
    movement: ['right'],
    tileTypes: 12,
    stars: [star('complete'), star('timeLeft', 35), star('noHint')]
  }),
  defineLevel({
    id: 7,
    seed: 'island-1-level-07',
    name: '花心聚拢',
    rule: '左右两侧的萌宠向棋盘中央聚拢',
    board: { rows: 8, cols: 10 },
    movement: ['horizontal-in'],
    tileTypes: 13,
    stars: [star('complete'), star('maxShuffles', 1), star('noPowerup')]
  }),
  defineLevel({
    id: 8,
    seed: 'island-1-level-08',
    name: '露光扩散',
    rule: '左右两侧的萌宠向棋盘边缘扩散',
    movement: ['horizontal-out'],
    tileTypes: 14,
    stars: [star('complete'), star('timeLeft', 30), star('clearShiny', 1)]
  }),
  defineLevel({
    id: 9,
    seed: 'island-1-level-09',
    name: '四风轮转',
    rule: '每次消除后依次向下、向左、向上、向右移动',
    movement: ['down', 'left', 'up', 'right'],
    tileTypes: 15,
    stars: [star('complete'), star('maxShuffles', 1), star('noHint')]
  }),
  defineLevel({
    id: 10,
    seed: 'island-1-level-10',
    name: '星光补给',
    rule: '奖励关：更多闪光萌宠会出现，完成闪光共鸣',
    movement: ['vertical-in'],
    tileTypes: 12,
    shinyPairs: 3,
    isReward: true,
    reward: { type: 'islandBadge', id: 'morning-dew', name: '晨露徽章' },
    limits: { hints: 3, shuffles: 2, magic: 1, timeBoosts: 1, bombs: 1 },
    stars: [star('complete'), star('clearShiny', 2), star('noPowerup')]
  }),
  defineLevel({
    id: 11,
    seed: 'island-1-level-11',
    name: '初霜花径',
    rule: '花瓣形缺口改变可通行区域；先破霜晶，再次连线才能消除',
    board: {
      rows: 8,
      cols: 10,
      mask: cells([[0, 0], [0, 9], [7, 0], [7, 9]])
    },
    tileTypes: 13,
    obstacles: { ice: ice([[2, 3], [2, 6], [5, 3], [5, 6]]) },
    stars: [star('complete'), star('clearIce', 4), star('noHint')]
  }),
  defineLevel({
    id: 12,
    seed: 'island-1-level-12',
    name: '双层霜心',
    rule: '双层霜晶需要两次有效连线才能完全击碎',
    board: { rows: 8, cols: 10 },
    tileTypes: 13,
    obstacles: { ice: ice([[2, 4], [2, 5], [5, 4], [5, 5]], 2) },
    stars: [star('complete'), star('clearIce', 8), star('noPowerup')]
  }),
  defineLevel({
    id: 13,
    seed: 'island-1-level-13',
    name: '岩门初现',
    rule: '固定岩障会截断路径，利用棋盘外沿绕行',
    board: { rows: 8, cols: 10 },
    tileTypes: 14,
    obstacles: { stones: stones([[2, 4], [2, 5], [5, 4], [5, 5]]) },
    stars: [star('complete'), star('maxShuffles', 1), star('noHint')]
  }),
  defineLevel({
    id: 14,
    seed: 'island-1-level-14',
    name: '对称岩廊',
    rule: '对称岩障形成狭长通道，先清理外围萌宠',
    board: { rows: 8, cols: 10 },
    tileTypes: 15,
    obstacles: { stones: stones([[2, 3], [2, 6], [3, 3], [3, 6], [4, 3], [4, 6]]) },
    stars: [star('complete'), star('timeLeft', 30), star('maxShuffles', 0)]
  }),
  defineLevel({
    id: 15,
    seed: 'island-1-level-15',
    name: '霜露花阵',
    rule: '六处霜晶留在固定格子上，规划破冰顺序',
    tileTypes: 15,
    obstacles: { ice: ice([[1, 2], [1, 7], [3, 4], [3, 5], [6, 2], [6, 7]]) },
    stars: [star('complete'), star('clearIce', 6), star('noPowerup')]
  }),
  defineLevel({
    id: 16,
    seed: 'island-1-level-16',
    name: '霜晶花环',
    rule: '霜晶环绕中心区域，完成全部破冰目标',
    tileTypes: 16,
    obstacles: { ice: ice([[2, 3], [2, 4], [2, 5], [2, 6], [5, 3], [5, 4], [5, 5], [5, 6]]) },
    stars: [star('complete'), star('clearIce', 8), star('maxShuffles', 1)]
  }),
  defineLevel({
    id: 17,
    seed: 'island-1-level-17',
    name: '冰岩交界',
    rule: '岩障固定不动，霜晶覆盖关键通道的萌宠',
    tileTypes: 16,
    obstacles: {
      stones: stones([[2, 4], [2, 5], [5, 4], [5, 5]]),
      ice: ice([[1, 3], [1, 6], [6, 3], [6, 6]])
    },
    stars: [star('complete'), star('clearIce', 4), star('noHint')]
  }),
  defineLevel({
    id: 18,
    seed: 'island-1-level-18',
    name: '霜晶回廊',
    rule: '双层霜晶与岩障同时出现，规划消除顺序',
    tileTypes: 17,
    obstacles: {
      stones: stones([[2, 3], [2, 6], [3, 3], [3, 6], [4, 3], [4, 6]]),
      ice: ice([[1, 4], [1, 5], [6, 4], [6, 5]], 2)
    },
    stars: [star('complete'), star('clearIce', 8), star('noPowerup')]
  }),
  defineLevel({
    id: 19,
    seed: 'island-1-level-19',
    name: '守护者前哨',
    rule: '在冰岩阵中送回至少两对队长萌宠',
    tileTypes: 18,
    obstacles: {
      stones: stones([[2, 4], [2, 5], [3, 3], [3, 6], [4, 3], [4, 6], [5, 4], [5, 5]]),
      ice: ice([[1, 2], [1, 7], [3, 4], [3, 5], [4, 4], [4, 5], [6, 2], [6, 7]])
    },
    goals: [clearAll(), clearCaptain(2)],
    limits: { hints: 2, shuffles: 1, magic: 0, timeBoosts: 1, bombs: 0 },
    stars: [star('complete'), star('clearCaptain', 2), star('maxShuffles', 0)]
  }),
  defineLevel({
    id: 20,
    seed: 'island-1-level-20',
    name: '晨露守护试炼',
    rule: '首岛Boss关：穿越岩障，击碎双层霜晶，完成队长目标',
    tileTypes: 18,
    isBoss: true,
    obstacles: {
      stones: stones([[2, 4], [2, 5], [3, 3], [3, 6], [4, 3], [4, 6], [5, 4], [5, 5]]),
      ice: [
        ...ice([[1, 3], [1, 6], [6, 3], [6, 6]], 2),
        ...ice([[2, 2], [2, 7], [5, 2], [5, 7]])
      ]
    },
    goals: [clearAll(), clearCaptain(2)],
    limits: { hints: 2, shuffles: 1, magic: 0, timeBoosts: 1, bombs: 0 },
    stars: [star('complete'), star('clearIce', 12), star('clearCaptain', 2)]
  })
]);
