import {
  MATCH_TIME_BONUS,
  MAX_BOMBS,
  MAX_HINTS,
  MAX_SHUFFLES,
  MAX_TIME_BOOSTS,
  START_TIME
} from './constants.js';
import { createBoard, ensureSolvable, reshuffleBoard } from './board.js';
import { applyBoardMovement } from './board-movement.js';
import { MAX_LEVELS, getLevelConfig, getNextMovementLabel, resolveMovement } from './levels.js';
import { findAvailableMove, findPath } from './pathfinding.js';

export class GameEngine {
  constructor(options = {}) {
    this.random = options.random ?? Math.random;
    this.rows = options.rows;
    this.cols = options.cols;
    this.tileTypes = options.tileTypes;
    this.startTime = options.startTime ?? START_TIME;
    this.reset(1);
  }

  reset(level = 1) {
    this.levelConfig = getLevelConfig(level);
    this.level = this.levelConfig.id;
    this.movementStep = 0;
    this.score = 0;
    this.timeLeft = Math.max(60, this.startTime - (this.level - 1) * 15);
    this.totalTime = this.timeLeft;
    this.hintsLeft = MAX_HINTS;
    this.shufflesLeft = MAX_SHUFFLES;
    this.powerups = { magic: 2, time: MAX_TIME_BOOSTS, bomb: MAX_BOMBS };
    this.selected = null;
    this.state = 'playing';
    this.activeTileTypes = this.tileTypes ?? this.levelConfig.tileTypes;
    this.board = createBoard(this.rows, this.cols, this.activeTileTypes, this.random);
    return this.snapshot();
  }

  select(position) {
    if (this.state !== 'playing' || this.board[position.row]?.[position.col] == null) {
      return { type: 'ignored' };
    }
    if (!this.selected) {
      this.selected = position;
      return { type: 'selected', position };
    }
    if (this.selected.row === position.row && this.selected.col === position.col) {
      this.selected = null;
      return { type: 'deselected' };
    }

    const from = this.selected;
    const path = findPath(this.board, from, position);
    if (!path) {
      this.selected = position;
      return { type: 'invalid', from, to: position };
    }

    this.board[from.row][from.col] = null;
    this.board[position.row][position.col] = null;
    this.selected = null;
    const timeAdded = this.addMatchTime(1);
    const timeBonus = Math.min(8, Math.ceil(this.timeLeft / 45));
    this.score += 100 + timeBonus * 5;
    const remaining = this.remaining;
    if (remaining === 0) {
      this.state = 'won';
      this.score += this.timeLeft * 10;
      return { type: 'match', from, to: position, path, won: true, autoShuffled: false, timeAdded };
    }

    const settled = this.settleAfterRemoval();
    return {
      type: 'match',
      from,
      to: position,
      path,
      won: false,
      autoShuffled: settled.autoShuffled,
      movement: settled.movement,
      timeAdded
    };
  }

  hint() {
    if (this.state !== 'playing' || this.hintsLeft <= 0) return null;
    const move = findAvailableMove(this.board);
    if (!move) return null;
    this.hintsLeft -= 1;
    return move;
  }

  shuffle() {
    if (this.state !== 'playing' || this.shufflesLeft <= 0) return false;
    this.board = reshuffleBoard(this.board, this.random).board;
    this.selected = null;
    this.shufflesLeft -= 1;
    return true;
  }

  useMagicPair(position) {
    if (this.state !== 'playing' || this.powerups.magic <= 0) return null;
    const type = this.board[position.row]?.[position.col];
    if (type == null) return null;
    let partner = null;
    this.board.some((row, rowIndex) => row.some((tile, colIndex) => {
      if (tile !== type || (rowIndex === position.row && colIndex === position.col)) return false;
      partner = { row: rowIndex, col: colIndex };
      return true;
    }));
    if (!partner) return null;

    this.powerups.magic -= 1;
    this.selected = null;
    this.board[position.row][position.col] = null;
    this.board[partner.row][partner.col] = null;
    const timeAdded = this.addMatchTime(1);
    this.score += 180;
    const won = this.finishIfEmpty();
    if (won) return { type: 'magic', from: position, to: partner, won, autoShuffled: false, timeAdded };
    const settled = this.settleAfterRemoval();
    return {
      type: 'magic',
      from: position,
      to: partner,
      won,
      autoShuffled: settled.autoShuffled,
      movement: settled.movement,
      timeAdded
    };
  }

  useTimeBoost(seconds = 15) {
    if (this.state !== 'playing' || this.powerups.time <= 0) return null;
    this.powerups.time -= 1;
    this.timeLeft += seconds;
    this.totalTime = Math.max(this.totalTime, this.timeLeft);
    return { type: 'time', seconds };
  }

  useBomb(pairCount = 3) {
    if (this.state !== 'playing' || this.powerups.bomb <= 0) return null;
    const byType = new Map();
    this.board.forEach((row, rowIndex) => row.forEach((tile, colIndex) => {
      if (tile == null) return;
      if (!byType.has(tile)) byType.set(tile, []);
      byType.get(tile).push({ row: rowIndex, col: colIndex });
    }));
    const matches = [];
    for (const positions of byType.values()) {
      while (positions.length >= 2 && matches.length < pairCount) {
        matches.push([positions.shift(), positions.shift()]);
      }
      if (matches.length >= pairCount) break;
    }
    if (!matches.length) return null;

    this.powerups.bomb -= 1;
    this.selected = null;
    matches.flat().forEach((position) => {
      this.board[position.row][position.col] = null;
    });
    const timeAdded = this.addMatchTime(matches.length);
    this.score += matches.length * 140;
    const won = this.finishIfEmpty();
    if (won) return { type: 'bomb', matches, won, autoShuffled: false, timeAdded };
    const settled = this.settleAfterRemoval();
    return {
      type: 'bomb',
      matches,
      won,
      autoShuffled: settled.autoShuffled,
      movement: settled.movement,
      timeAdded
    };
  }

  addMatchTime(pairCount) {
    const seconds = pairCount * MATCH_TIME_BONUS;
    this.timeLeft += seconds;
    this.totalTime = Math.max(this.totalTime, this.timeLeft);
    return seconds;
  }

  settleAfterRemoval() {
    const movement = resolveMovement(this.levelConfig, this.movementStep);
    this.board = applyBoardMovement(this.board, movement);
    this.movementStep += 1;
    const solvable = ensureSolvable(this.board, this.random);
    this.board = solvable.board;
    return { movement, autoShuffled: solvable.reshuffled };
  }

  finishIfEmpty() {
    if (this.remaining !== 0) return false;
    this.state = 'won';
    this.score += this.timeLeft * 10;
    return true;
  }

  pause() {
    if (this.state !== 'playing') return false;
    this.state = 'paused';
    return true;
  }

  resume() {
    if (this.state !== 'paused') return false;
    this.state = 'playing';
    return true;
  }

  tick() {
    if (this.state !== 'playing') return this.state;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    if (this.timeLeft === 0) this.state = 'lost';
    return this.state;
  }

  get remaining() {
    return this.board.flat().filter((tile) => tile != null).length;
  }

  snapshot() {
    return {
      board: this.board.map((row) => [...row]),
      level: this.level,
      maxLevels: MAX_LEVELS,
      levelConfig: { ...this.levelConfig },
      activeTileTypes: this.activeTileTypes,
      movementStep: this.movementStep,
      nextMovementLabel: getNextMovementLabel(this.levelConfig, this.movementStep),
      score: this.score,
      timeLeft: this.timeLeft,
      totalTime: this.totalTime,
      hintsLeft: this.hintsLeft,
      shufflesLeft: this.shufflesLeft,
      powerups: { ...this.powerups },
      selected: this.selected,
      remaining: this.remaining,
      state: this.state
    };
  }
}
