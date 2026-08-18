import { COLS, ROWS, TILE_TYPES } from './constants.js';
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

export function reshuffleBoard(board, random = Math.random) {
  const values = board.flat().filter((value) => value != null);
  const next = board.map((row) => row.map(() => null));
  placeValues(next, shuffleArray(values, random), occupiedPositions(board));
  return ensureSolvable(next, random);
}

export function ensureSolvable(board, random = Math.random, maxAttempts = 120) {
  if (board.flat().filter((tile) => tile != null).length < 2) {
    return { board: board.map((row) => [...row]), reshuffled: false };
  }
  if (findAvailableMove(board)) {
    return { board: board.map((row) => [...row]), reshuffled: false };
  }

  const values = board.flat().filter((value) => value != null);
  const positions = occupiedPositions(board);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = board.map((row) => row.map(() => null));
    placeValues(candidate, shuffleArray(values, random), positions);
    if (findAvailableMove(candidate)) return { board: candidate, reshuffled: true };
  }

  return { board: forceOneMove(board, values, positions, random), reshuffled: true };
}

function forceOneMove(board, values, positions, random) {
  const geometry = board.map((row) => row.map((tile) => tile == null ? null : 0));
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
  if (!connectable) throw new Error('无法为当前棋盘生成可消除组合');

  const counts = new Map();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  const pairType = [...counts].find(([, count]) => count >= 2)?.[0];
  const remaining = [...values];
  remaining.splice(remaining.indexOf(pairType), 1);
  remaining.splice(remaining.indexOf(pairType), 1);
  const shuffled = shuffleArray(remaining, random);
  const result = board.map((row) => row.map(() => null));
  result[connectable[0].row][connectable[0].col] = pairType;
  result[connectable[1].row][connectable[1].col] = pairType;
  let index = 0;
  positions.forEach((position) => {
    if (connectable.some((item) => item.row === position.row && item.col === position.col)) return;
    result[position.row][position.col] = shuffled[index++];
  });
  return result;
}

function occupiedPositions(board) {
  const positions = [];
  board.forEach((row, rowIndex) => row.forEach((tile, colIndex) => {
    if (tile != null) positions.push({ row: rowIndex, col: colIndex });
  }));
  return positions;
}

function placeValues(board, values, positions = null) {
  const targets = positions ?? board.flatMap((row, rowIndex) => row.map((_, colIndex) => ({ row: rowIndex, col: colIndex })));
  targets.forEach((position, index) => {
    board[position.row][position.col] = values[index] ?? null;
  });
}
