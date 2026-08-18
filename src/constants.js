export const ROWS = 8;
export const COLS = 10;
export const GAME_VERSION = '3.0.0';
export const START_TIME = 180;
export const MAX_HINTS = 10;
export const MAX_SHUFFLES = 10;
export const MAX_TIME_BOOSTS = 10;
export const MAX_BOMBS = 3;
export const MATCH_TIME_BONUS = 1;
export const TILE_TYPES = 20;
export const BLOCKED_TILE = -1;
export const CAPTAIN_TIME_BONUS = 2;

export const PET_PROFILES = [
  { name: '焰耳狐', detail: '热情的小火苗，开心时尾巴会噼啪作响。' },
  { name: '泡泡獭', detail: '喜欢收集贝壳，尾巴能吹出透明泡泡。' },
  { name: '芽角鹿', detail: '温柔的森林伙伴，走过的地方会冒出嫩芽。' },
  { name: '云翅啾', detail: '轻得像一团云，总会顺着微风旅行。' },
  { name: '闪尾鼬', detail: '好奇又敏捷，金色尾巴像一道小闪电。' },
  { name: '苔甲龟', detail: '慢悠悠的园丁，背上的苔藓四季常青。' },
  { name: '星灯猫', detail: '夜间巡游的向导，尾灯会照亮回家的路。' },
  { name: '月绒兔', detail: '安静的倾听者，长耳朵收藏着月光。' },
  { name: '花冠狸', detail: '热爱花香，会把最漂亮的花送给朋友。' },
  { name: '雪团貂', detail: '冰凉柔软的小雪球，最害怕炎热天气。' },
  { name: '蜜罐熊', detail: '乐于分享的甜食家，肚皮总有蜂蜜香。' },
  { name: '墨翼蝠', detail: '看起来神秘，其实听到巨响就会躲起来。' },
  { name: '潮铃鲸', detail: '摆动铃铛形尾鳍，就能带来温柔潮声。' },
  { name: '砂尾鼠', detail: '尾巴卷起细沙，擅长在沙丘寻找宝物。' },
  { name: '晶角羊', detail: '水晶小角会映出伙伴此刻的心情。' },
  { name: '风筝犬', detail: '耳朵迎风展开，奔跑时像风筝一样轻快。' },
  { name: '荷叶蛙', detail: '把荷叶当雨伞，也把露珠当作早餐。' },
  { name: '极光雀', detail: '飞过夜空时，翅膀会留下一道彩色极光。' },
  { name: '岩角犀', detail: '外表坚硬、内心柔软，喜欢帮朋友挡风。' },
  { name: '梦云貘', detail: '鼻尖能收集好梦，再把它们织成彩云。' }
];

export const TILE_NAMES = PET_PROFILES.map((pet) => pet.name);
