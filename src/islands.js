const ISLAND_NAMES = [
  '晨露岛', '云芽岛', '月绒岛', '花冠岛', '潮铃岛',
  '星灯岛', '风筝岛', '极光岛', '晶角岛', '梦云岛',
  '珊瑚岛', '萤森岛', '琥珀岛', '雪羽岛', '蜜泉岛',
  '苍穹岛', '银沙岛', '翠岚岛', '赤枫岛', '星砂岛',
  '雾鲸岛', '蘑星岛', '雨铃岛', '霞谷岛', '糖云岛',
  '风车岛', '镜湖岛', '浮光岛', '火绒岛', '月桂岛',
  '天穗岛', '海盐岛', '紫藤岛', '霜芽岛', '金雀岛',
  '流萤岛', '蓝莓岛', '晴虹岛', '黑曜岛', '白茶岛',
  '星眠岛', '晚樱岛', '雷羽岛', '珍珠岛', '苍兰岛',
  '蜜桃岛', '绿洲岛', '云鲸岛', '黎明岛', '心光岛'
];

const THEME_NAMES = [
  '露珠花园', '云上苗圃', '月光绒原', '百花王冠', '潮汐铃湾',
  '星灯长夜', '风筝草坡', '极光雪境', '水晶鹿谷', '梦云秘境',
  '珊瑚浅海', '萤火森林', '琥珀古径', '雪羽高原', '蜂蜜泉乡',
  '苍穹浮台', '银沙月湾', '翠岚竹境', '赤枫山野', '星砂荒原',
  '雾鲸海港', '蘑菇星野', '雨铃湿地', '霞光峡谷', '糖霜云城',
  '风车麦丘', '镜湖水庭', '浮光花海', '火绒熔谷', '月桂神殿',
  '天穗牧场', '海盐礁岸', '紫藤幽径', '霜芽冻土', '金雀晨林',
  '流萤夜谷', '蓝莓果园', '晴虹天桥', '黑曜岩城', '白茶竹院',
  '星眠旷野', '晚樱町庭', '雷羽云巅', '珍珠海沟', '苍兰雨林',
  '蜜桃溪谷', '绿洲沙庭', '云鲸天空', '黎明山脊', '心光圣境'
];

const HUES = [
  154, 185, 258, 338, 198, 230, 92, 211, 176, 276,
  14, 126, 38, 204, 47, 218, 36, 162, 5, 52,
  193, 112, 201, 326, 294, 73, 187, 166, 8, 103,
  64, 196, 286, 213, 45, 149, 222, 318, 244, 84,
  237, 346, 267, 181, 132, 21, 159, 207, 28, 312
];

function captainSkill(index) {
  const tier = Math.floor(index / 5);
  const theme = THEME_NAMES[index];
  switch (index % 5) {
    case 0: {
      const value = 2 + (tier % 2);
      return { name: `${theme}回响`, kind: 'time', value, description: `队长配对额外增加${value}秒` };
    }
    case 1: {
      const value = 160 + tier * 20;
      return { name: `${theme}鼓舞`, kind: 'score', value, description: `队长配对额外获得${value}分` };
    }
    case 2: {
      const value = 2 + (tier % 2);
      return { name: `${theme}守时`, kind: 'freeze', value, description: `队长配对冻结计时${value}秒` };
    }
    case 3:
      return { name: `${theme}指引`, kind: 'hint', value: 1, description: '队长配对返还1次提示' };
    default:
      return { name: `${theme}风行`, kind: 'shuffle', value: 1, description: '队长配对返还1次洗牌' };
  }
}

function islandReward(index) {
  const tier = Math.floor(index / 10);
  const value = 1 + (tier % 2);
  const theme = THEME_NAMES[index];
  const rewards = [
    { kind: 'hint', value: value + 1, description: `后半岛每关提示 +${value + 1}` },
    { kind: 'shuffle', value: value + 1, description: `后半岛每关洗牌 +${value + 1}` },
    { kind: 'magic', value, description: `后半岛每关心光结 +${value}` },
    { kind: 'time', value, description: `后半岛每关时砂露 +${value}` },
    { kind: 'bomb', value, description: `后半岛每关绒星烟花 +${value}` }
  ];
  return { name: `${theme}祝福`, ...rewards[index % rewards.length] };
}

function palette(index) {
  const hue = HUES[index];
  const companion = (hue + 38 + (index % 3) * 12) % 360;
  return {
    key: `island-${index + 1}`,
    page: `hsl(${hue} 38% 94%)`,
    surface: `hsl(${hue} 42% 99%)`,
    board: `hsl(${hue} 42% 88%)`,
    boardLine: `hsl(${hue} 34% 61%)`,
    ink: `hsl(${hue} 36% 22%)`,
    muted: `hsl(${hue} 17% 48%)`,
    accent: `hsl(${companion} 68% 57%)`,
    accentDark: `hsl(${companion} 62% 47%)`,
    mint: `hsl(${hue} 42% 51%)`,
    glow: `hsl(${companion} 70% 70% / .18)`
  };
}

export const ISLANDS = ISLAND_NAMES.map((name, index) => ({
  id: index + 1,
  name,
  themeName: THEME_NAMES[index],
  captainType: (index * 7) % 20,
  captainTitle: `${name.slice(0, -1)}守护`,
  captainHue: index === 0 ? '0deg' : `${(index * 37) % 360}deg`,
  captainSkill: captainSkill(index),
  reward: islandReward(index),
  palette: palette(index)
}));

export { ISLAND_NAMES };

export function getIslandDefinition(island) {
  const safe = Math.max(1, Math.floor(Number(island) || 1));
  return ISLANDS[(safe - 1) % ISLANDS.length];
}
