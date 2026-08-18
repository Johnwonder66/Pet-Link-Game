import { BLOCKED_TILE, COLS, ROWS, TILE_TYPES } from './constants.js';
import { findAvailableMove, findPath } from './pathfinding.js';

export function shuffleArray(values, random = Math.random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createBoard(rows = ROWS, cols = COLS, tileTypes = TILE_TYPES, random = Math.random) {
  const total = rows * cols;
  if (total % 2 !== 0) throw new Error('棋盘格数必须为偶数');
  const tiles = [];
  for (let pair = 0; pair < total / 2; pair += 1) {
    const type = pair % tileTypes;
    tiles.push(type, type);
  }
  const board = Array.from({ length: rows }, () => Array(cols).fill(null));
  placeValues(board, shuffleArray(tiles, random));
  return ensureSolvable(board, random).board;
}

export function createBoardWithObstacles(
  rows = ROWS,
  cols = COLS,
  tileTypes = TILE_TYPES,
  blockedPositions = [],
  random = Math.random
) {
  const blockedKeys = new Set(blockedPositions.map(({ row, col }) => `${row},${col}`));
  const targets = [];
  const board = Array.from({ length: rows }, (_, row) => Array.from({ length: cols }, (_, col) => {
    if (blockedKeys.has(`${row},${col}`)) return BLOCKED_TILE;
    targets.push({ row, col });
    return null;
  }));
  if (targets.length % 2 !== 0) throw new Error('可用棋盘格数必须为偶数');
  const tiles = [];
  for (let pair = 0; pair < targets.length / 2; pair += 1) {
    const type = pair % tileTypes;
    tiles.push(type, type);
  }
  placeValues(board, shuffleArray(tiles, random), targets);
  return ensureSolvable(board, random).board;
}

export function reshuffleBoard(board, random = Math.random, requiredPositions = []) {
  const values = board.flat().filter(isPlayableTile);
  const next = board.map((row) => row.map((value) => value === BLOCKED_TILE ? BLOCKED_TILE : null));
  placeValues(next, shuffleArray(values, random), occupiedPositions(board));
  return ensureSolvable(next, random, 120, requiredPositions);
}

export function ensureSolvable(board, random = Math.random, maxAttempts = 120, requiredPositions = []) {
  if (board.flat().filter(isPlayableTile).length < 2) {
    return { board: board.map((row) => [...row]), reshuffled: false, geometryRecovered: false };
  }
  const positions = occupiedPositions(board);
  const occupiedKeys = new Set(positions.map(positionKey));
  const missingRequiredPosition = requiredPositions.some((position) => !occupiedKeys.has(positionKey(position)));
  if (!missingRequiredPosition && findAvailableMove(board)) {
    return { board: board.map((row) => [...row]), reshuffled: false, geometryRecovered: false };
  }

  const values = board.flat().filter(isPlayableTile);
  if (!missingRequiredPosition) {
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = board.map((row) => row.map((value) => value === BLOCKED_TILE ? BLOCKED_TILE : null));
      placeValues(candidate, shuffleArray(values, random), positions);
      if (findAvailableMove(candidate)) {
        return { board: candidate, reshuffled: true, geometryRecovered: false };
      }
    }

    const forced = forceOneMove(board, values, positions, random);
    if (forced) return { board: forced, reshuffled: true, geometryRecovered: false };
  }

  return {
    board: recoverGeometry(board, values, random, requiredPositions),
    reshuffled: true,
    geometryRecovered: true
  };
}

function forceOneMove(board, values, positions, random) {
  const geometry = board.map((row) => row.map((tile) => tile == null ? null : tile === BLOCKED_TILE ? BLOCKED_TILE : 0));
  let connectable = null;
  outer: for (let first = 0; first < positions.length; first += 1) {
    for (let second = first + 1; second < positions.length; second += 1) {
      const a = positions[first];
      const b = positions[second];
      if (findPath(geometry, a, b)) {
        connectable = [a, b];
        break outer;
      }
    }
  }
  if (!connectable) return null;

  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const pairType = [...counts].find(([, count]) => count >= 2)?.[0];
  const remaining = [...values];
  remaining.splice(remaining.indexOf(pairType), 1);
  remaining.splice(remaining.indexOf(pairType), 1);
  const shuffled = shuffleArray(remaining, random);
  const result = board.map((row) => row.map((value) => value === BLOCKED_TILE ? BLOCKED_TILE : null));
  result[connectable[0].row][connectable[0].col] = pairType;
  result[connectable[1].row][connectable[1].col] = pairType;
  let index = 0;
  positions.forEach((position) => {
    if (connectable.some((item) => item.row === position.row && item.col === position.col)) return;
    result[position.row][position.col] = shuffled[index++];
  });
  return result;
}

function recoverGeometry(board, values, random, requiredPositions = []) {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const available = allOpenPositions(board);
  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const pairType = [...counts].find(([, count]) => count >= 2)?.[0];
  if (pairType == null || available.length < values.length) {
    throw new Error('棋盘障碍布局无法容纳剩余萌宠');
  }

  const remaining = [...values];
  remaining.splice(remaining.indexOf(pairType), 1);
  remaining.splice(remaining.indexOf(pairType), 1);
  const candidates = shuffleArray(available, random);

  for (let first = 0; first < candidates.length; first += 1) {
    for (let second = first + 1; second < candidates.length; second += 1) {
      const from = candidates[first];
      const to = candidates[second];
      const geometry = emptyBoardWithBlockers(board);
      geometry[from.row][from.col] = pairType;
      geometry[to.row][to.col] = pairType;
      const path = findPath(geometry, from, to);
      if (!path) continue;

      const reserved = pathInteriorKeys(path, rows, cols);
      const fromKey = positionKey(from);
      const toKey = positionKey(to);
      reserved.delete(fromKey);
      reserved.delete(toKey);
      if (requiredPositions.some((position) => reserved.has(positionKey(position)))) continue;
      const requiredTargets = requiredPositions.filter((position) => {
        const key = positionKey(position);
        return key !== fromKey && key !== toKey;
      });
      const requiredKeys = new Set(requiredTargets.map(positionKey));
      const optionalTargets = candidates.filter((position) => {
        const key = positionKey(position);
        return key !== fromKey && key !== toKey && !reserved.has(key) && !requiredKeys.has(key);
      });
      const targets = [...requiredTargets, ...optionalTargets];
      if (targets.length < remaining.length) continue;

      const result = emptyBoardWithBlockers(board);
      result[from.row][from.col] = pairType;
      result[to.row][to.col] = pairType;
      placeValues(result, shuffleArray(remaining, random), targets.slice(0, remaining.length));
      if (findAvailableMove(result)) return result;
    }
  }

  throw new Error('棋盘障碍布局已无可恢复路径');
}

function allOpenPositions(board) {
  const positions = [];
  board.forEach((row, rowIndex) => row.forEach((tile, colIndex) => {
    if (tile !== BLOCKED_TILE) positions.push({ row: rowIndex, col: colIndex });
  }));
  return positions;
}

function emptyBoardWithBlockers(board) {
  return board.map((row) => row.map((value) => value === BLOCKED_TILE ? BLOCKED_TILE : null));
}

function pathInteriorKeys(path, rows, cols) {
  const keys = new Set();
  for (let index = 1; index < path.length; index += 1) {
    const from = path[index - 1];
    const to = path[index];
    const rowStep = Math.sign(to.row - from.row);
    const colStep = Math.sign(to.col - from.col);
    let row = from.row;
    let col = from.col;
    while (row !== to.row || col !== to.col) {
      if (row >= 0 && row < rows && col >= 0 && col < cols) keys.add(`${row},${col}`);
      row += rowStep;
      col += colStep;
    }
    if (to.row >= 0 && to.row < rows && to.col >= 0 && to.col < cols) {
      keys.add(`${to.row},${to.col}`);
    }
  }
  return keys;
}

function positionKey(position) {
  return `${position.row},${position.col}`;
}

function occupiedPositions(board) {
  const positions = [];
  board.forEach((row, rowIndex) => row.forEach((tile, colIndex) => {
    if (isPlayableTile(tile)) positions.push({ row: rowIndex, col: colIndex });
  }));
  return positions;
}

function placeValues(board, values, positions = null) {
  const targets = positions ?? board.flatMap((row, rowIndex) => row.map((_, colIndex) => ({ row: rowIndex, col: colIndex })));
  targets.forEach((position, index) => {
    board[position.row][position.col] = values[index] ?? null;
  });
}

function isPlayableTile(value) {
  return value != null && value !== BLOCKED_TILE;
}
