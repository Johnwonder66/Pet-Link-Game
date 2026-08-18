import { GAME_VERSION, TILE_TYPES } from './constants.js';

const STORAGE_KEY = `rongguang-link-progress-v${GAME_VERSION.split('.')[0]}`;

function sanitizeProgress(value) {
  const discovered = Array.isArray(value?.discovered)
    ? [...new Set(value.discovered.filter((type) => Number.isInteger(type) && type >= 0 && type < TILE_TYPES))]
    : [];
  const stars = Object.fromEntries(
    Object.entries(value?.stars ?? {})
      .filter(([level, count]) => Number(level) >= 1 && Number(level) <= 10 && Number(count) >= 0)
      .map(([level, count]) => [level, Math.min(3, Number(count))])
  );
  return { discovered, stars };
}

export function createProgressStore(storage = globalThis.localStorage) {
  let memory = { discovered: [], stars: {} };

  function load() {
    try {
      const saved = storage?.getItem(STORAGE_KEY);
      memory = saved ? sanitizeProgress(JSON.parse(saved)) : memory;
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
    return { discovered: [...memory.discovered], stars: { ...memory.stars } };
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
    const previous = Number(memory.stars[level] ?? 0);
    const next = Math.max(previous, Math.min(3, Math.max(0, Number(count) || 0)));
    if (next !== previous) {
      memory.stars[level] = next;
      save();
    }
    return next;
  }

  load();
  return { discover, recordStars, snapshot };
}
