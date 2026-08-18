import { GAME_VERSION, TILE_TYPES } from './constants.js';
import { ENDLESS_START_LEVEL, STORY_LEVELS } from './levels.js';

const STORAGE_KEY = `rongguang-link-progress-v${GAME_VERSION.split('.')[0]}`;
const LEGACY_STORAGE_KEY = 'rongguang-link-progress-v2';

function sanitizeProgress(value) {
  const discovered = Array.isArray(value?.discovered)
    ? [...new Set(value.discovered.filter((type) => Number.isInteger(type) && type >= 0 && type < TILE_TYPES))]
    : [];
  const stars = Object.fromEntries(
    Object.entries(value?.stars ?? {})
      .filter(([level, count]) => Number(level) >= 1 && Number(level) <= STORY_LEVELS && Number(count) >= 0)
      .map(([level, count]) => [level, Math.min(3, Number(count))])
  );
  const highestCompleted = Math.max(0, ...Object.keys(stars).map(Number));
  const unlockedLevel = Math.min(
    STORY_LEVELS,
    Math.max(1, Number(value?.unlockedLevel) || highestCompleted + 1)
  );
  const storyCompleted = Boolean(value?.storyCompleted) || Number(stars[STORY_LEVELS] ?? 0) > 0;
  const endlessBest = Math.max(0, Math.floor(Number(value?.endlessBest) || 0));
  const requestedCurrent = Math.max(1, Math.floor(Number(value?.currentLevel) || unlockedLevel));
  const currentLevel = requestedCurrent > STORY_LEVELS
    ? (storyCompleted ? requestedCurrent : unlockedLevel)
    : Math.min(requestedCurrent, unlockedLevel);
  return { discovered, stars, currentLevel, unlockedLevel, storyCompleted, endlessBest };
}

export function createProgressStore(storage = globalThis.localStorage) {
  let memory = sanitizeProgress({});

  function load() {
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      const legacy = !saved ? storage?.getItem(LEGACY_STORAGE_KEY) : null;
      memory = saved || legacy ? sanitizeProgress(JSON.parse(saved || legacy)) : memory;
      if (!saved && legacy) save();
    } catch {
      memory = sanitizeProgress(memory);
    }
    return snapshot();
  }

  function save() {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      // Private browsing or a full storage quota should not block the game.
    }
  }

  function snapshot() {
    return {
      discovered: [...memory.discovered],
      stars: { ...memory.stars },
      currentLevel: memory.currentLevel,
      unlockedLevel: memory.unlockedLevel,
      storyCompleted: memory.storyCompleted,
      endlessBest: memory.endlessBest
    };
  }

  function discover(types) {
    const next = new Set(memory.discovered);
    types.forEach((type) => {
      if (Number.isInteger(type) && type >= 0 && type < TILE_TYPES) next.add(type);
    });
    const changed = next.size !== memory.discovered.length;
    memory.discovered = [...next].sort((a, b) => a - b);
    if (changed) save();
    return changed;
  }

  function recordStars(level, count) {
    if (level > STORY_LEVELS) return 0;
    const previous = Number(memory.stars[level] ?? 0);
    const next = Math.max(previous, Math.min(3, Math.max(0, Number(count) || 0)));
    if (next !== previous) {
      memory.stars[level] = next;
      save();
    }
    return next;
  }

  function recordCompletion(level, count = 0) {
    if (level <= STORY_LEVELS) {
      recordStars(level, count);
      if (level === STORY_LEVELS) {
        memory.storyCompleted = true;
        memory.currentLevel = ENDLESS_START_LEVEL;
      } else {
        memory.unlockedLevel = Math.max(memory.unlockedLevel, level + 1);
        memory.currentLevel = level + 1;
      }
    } else {
      const endlessIndex = level - STORY_LEVELS;
      memory.storyCompleted = true;
      memory.endlessBest = Math.max(memory.endlessBest, endlessIndex);
      memory.currentLevel = level + 1;
    }
    save();
    return snapshot();
  }

  function canPlay(level) {
    const safe = Math.max(1, Math.floor(Number(level) || 1));
    return safe <= STORY_LEVELS ? safe <= memory.unlockedLevel : memory.storyCompleted;
  }

  function setCurrentLevel(level) {
    const safe = Math.max(1, Math.floor(Number(level) || 1));
    if (!canPlay(safe)) return false;
    memory.currentLevel = safe;
    save();
    return true;
  }

  load();
  return { discover, recordStars, recordCompletion, canPlay, setCurrentLevel, snapshot };
}
