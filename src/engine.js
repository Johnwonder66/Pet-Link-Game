import {
  BLOCKED_TILE,
  MATCH_TIME_BONUS,
  START_TIME
} from './constants.js';
import { createBoard, createBoardWithObstacles, ensureSolvable, reshuffleBoard, shuffleArray } from './board.js';
import { applyBoardMovement } from './board-movement.js';
import { MAX_LEVELS, getLevelConfig, getNextMovementLabel, resolveMovement } from './levels.js';
import { isGoalComplete, isStarConditionMet } from './objectives.js';
import { findAvailableMove, findPath } from './pathfinding.js';
import { createSeededRandom } from './random.js';

export class GameEngine {
  constructor(options = {}) {
    this.randomOverride = options.random ?? null;
    this.rowsOverride = options.rows;
    this.colsOverride = options.cols;
    this.tileTypesOverride = options.tileTypes;
    this.startTimeOverride = options.startTime;
    this.reset(1);
  }

  reset(level = 1) {
    this.levelConfig = getLevelConfig(level);
    this.random = this.randomOverride ?? createSeededRandom(this.levelConfig.seed);
    this.level = this.levelConfig.id;
    this.rows = this.rowsOverride ?? this.levelConfig.board.rows;
    this.cols = this.colsOverride ?? this.levelConfig.board.cols;
    this.movementStep = 0;
    this.score = 0;
    this.timeLeft = this.startTimeOverride ?? this.levelConfig.timeLimit ?? START_TIME;
    this.totalTime = this.timeLeft;
    this.hintsLeft = this.levelConfig.limits.hints;
    this.hintsUsed = 0;
    this.shufflesLeft = this.levelConfig.limits.shuffles;
    this.shufflesUsed = 0;
    this.powerupsUsed = 0;
    this.lastShuffleGeometryRecovered = false;
    this.timerFrozenTicks = 0;
    this.captainPairsCleared = 0;
    this.shinyPairsCleared = 0;
    this.iceBrokenCount = 0;
    this.powerups = {
      magic: this.levelConfig.limits.magic,
      time: this.levelConfig.limits.timeBoosts,
      bomb: this.levelConfig.limits.bombs
    };
    this.selected = null;
    this.state = 'playing';
    this.activeTileTypes = this.tileTypesOverride ?? this.levelConfig.tileTypes;
    this.blockedPositions = [
      ...(this.levelConfig.board.mask ?? []),
      ...this.levelConfig.obstacles.stones
    ].map((position) => ({ ...position }));
    this.board = this.blockedPositions.length
      ? createBoardWithObstacles(this.rows, this.cols, this.activeTileTypes, this.blockedPositions, this.random)
      : createBoard(this.rows, this.cols, this.activeTileTypes, this.random);
    this.iceBoard = this.createIceBoard();
    this.assignIce(this.levelConfig.obstacles.ice);
    this.shinyBoard = this.createShinyBoard();
    this.shinyNeedsRefresh = false;
    this.assignShinyPairs(this.levelConfig.shinyPairs ?? 1);
    return this.snapshot();
  }

  clearSelection() {
    this.selected = null;
    return true;
  }

  select(position) {
    if (this.state !== 'playing'
      || this.board[position.row]?.[position.col] == null
      || this.board[position.row][position.col] === BLOCKED_TILE) {
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

    return this.completePair(from, position, path);
  }

  completePair(from, to, path, source = 'manual') {
    const pairType = this.board[from.row][from.col];
    const iceHits = [from, to].filter((position) => this.iceBoard[position.row]?.[position.col] > 0);
    if (iceHits.length) {
      iceHits.forEach((position) => {
        this.iceBoard[position.row][position.col] -= 1;
      });
      this.iceBrokenCount += iceHits.length;
      this.selected = null;
      const scoreAdded = iceHits.length * 40;
      this.score += scoreAdded;
      const won = this.finishIfGoalsComplete();
      return {
        type: 'ice-break', source, from, to, path,
        iceHits, scoreAdded, timeAdded: 0, won,
        movement: 'static', autoShuffled: false
      };
    }
    const shiny = this.isShinyPair(from, to);
    const shinyTouched = this.countShinyPositions([from, to]);
    this.board[from.row][from.col] = null;
    this.board[to.row][to.col] = null;
    this.clearShinyPositions([from, to]);
    if (shiny) {
      this.shinyPairsRemaining = Math.max(0, this.shinyPairsRemaining - 1);
      this.shinyPairsCleared += 1;
    }
    else if (shinyTouched > 0) this.shinyNeedsRefresh = true;
    this.selected = null;
    const captainAssist = pairType === this.levelConfig.captainType;
    const captainSkill = captainAssist ? this.applyCaptainSkill() : null;
    const timeAdded = this.addMatchTime(1) + (captainSkill?.timeAdded ?? 0);
    const timeBonus = Math.min(8, Math.ceil(this.timeLeft / 45));
    const baseScore = 100 + timeBonus * 5;
    const scoreAdded = baseScore * (shiny ? 2 : 1) + (captainSkill?.scoreAdded ?? 0);
    this.score += scoreAdded;
    if (captainAssist) this.captainPairsCleared += 1;
    const common = { type: 'match', source, from, to, path, shiny, captainAssist, captainSkill, scoreAdded, timeAdded };
    if (this.finishIfGoalsComplete()) {
      return { ...common, won: true, autoShuffled: false };
    }

    const settled = this.settleAfterRemoval();
    return {
      ...common,
      won: false,
      autoShuffled: settled.autoShuffled,
      geometryRecovered: settled.geometryRecovered,
      movement: settled.movement
    };
  }

  autoMatch() {
    if (this.state !== 'playing') return null;
    const move = findAvailableMove(this.board);
    if (!move) return null;
    return this.completePair(move.from, move.to, move.path, 'combo');
  }

  hint() {
    if (this.state !== 'playing' || this.hintsLeft <= 0) return null;
    const move = findAvailableMove(this.board);
    if (!move) return null;
    this.hintsLeft -= 1;
    this.hintsUsed += 1;
    return move;
  }

  shuffle() {
    if (this.state !== 'playing' || this.shufflesLeft <= 0) return false;
    const shuffled = reshuffleBoard(this.board, this.random, this.activeIcePositions());
    this.board = shuffled.board;
    this.lastShuffleGeometryRecovered = shuffled.geometryRecovered;
    this.assignShinyPairs(this.shinyPairsRemaining);
    this.selected = null;
    this.shufflesLeft -= 1;
    this.shufflesUsed += 1;
    return true;
  }

  useMagicPair(position) {
    if (this.state !== 'playing' || this.powerups.magic <= 0) return null;
    const type = this.board[position.row]?.[position.col];
    if (type == null || type === BLOCKED_TILE) return null;
    let partner = null;
    this.board.some((row, rowIndex) => row.some((tile, colIndex) => {
      if (tile !== type || (rowIndex === position.row && colIndex === position.col)) return false;
      partner = { row: rowIndex, col: colIndex };
      return true;
    }));
    if (!partner) return null;

    this.powerups.magic -= 1;
    this.powerupsUsed += 1;
    this.selected = null;
    const shiny = this.isShinyPair(position, partner);
    const shinyTouched = this.countShinyPositions([position, partner]);
    this.iceBrokenCount += (this.iceBoard[position.row][position.col] ?? 0)
      + (this.iceBoard[partner.row][partner.col] ?? 0);
    this.board[position.row][position.col] = null;
    this.board[partner.row][partner.col] = null;
    this.iceBoard[position.row][position.col] = null;
    this.iceBoard[partner.row][partner.col] = null;
    this.clearShinyPositions([position, partner]);
    if (shiny) {
      this.shinyPairsRemaining = Math.max(0, this.shinyPairsRemaining - 1);
      this.shinyPairsCleared += 1;
    }
    else if (shinyTouched > 0) this.shinyNeedsRefresh = true;
    if (type === this.levelConfig.captainType) this.captainPairsCleared += 1;
    const timeAdded = this.addMatchTime(1);
    const scoreAdded = 180 * (shiny ? 2 : 1);
    this.score += scoreAdded;
    const won = this.finishIfGoalsComplete();
    if (won) return { type: 'magic', from: position, to: partner, won, autoShuffled: false, timeAdded, shiny, scoreAdded };
    const settled = this.settleAfterRemoval();
    return {
      type: 'magic',
      from: position,
      to: partner,
      won,
      autoShuffled: settled.autoShuffled,
      geometryRecovered: settled.geometryRecovered,
      movement: settled.movement,
      timeAdded,
      shiny,
      scoreAdded
    };
  }

  useTimeBoost(seconds = 15) {
    if (this.state !== 'playing' || this.powerups.time <= 0) return null;
    this.powerups.time -= 1;
    this.powerupsUsed += 1;
    this.timeLeft += seconds;
    this.totalTime = Math.max(this.totalTime, this.timeLeft);
    return { type: 'time', seconds };
  }

  useBomb(pairCount = 3) {
    if (this.state !== 'playing' || this.powerups.bomb <= 0) return null;
    const byType = new Map();
    this.board.forEach((row, rowIndex) => row.forEach((tile, colIndex) => {
      if (tile == null || tile === BLOCKED_TILE) return;
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
    this.powerupsUsed += 1;
    this.selected = null;
    const pairTypes = matches.map(([from]) => this.board[from.row][from.col]);
    const shinyMatches = matches.filter(([from, to]) => this.isShinyPair(from, to)).length;
    const shinyTouched = this.countShinyPositions(matches.flat());
    this.iceBrokenCount += matches.flat().reduce(
      (total, position) => total + (this.iceBoard[position.row][position.col] ?? 0),
      0
    );
    matches.flat().forEach((position) => {
      this.board[position.row][position.col] = null;
      this.iceBoard[position.row][position.col] = null;
    });
    this.clearShinyPositions(matches.flat());
    this.shinyPairsRemaining = Math.max(0, this.shinyPairsRemaining - shinyMatches);
    this.shinyPairsCleared += shinyMatches;
    this.captainPairsCleared += pairTypes.filter((type) => type === this.levelConfig.captainType).length;
    if (shinyTouched !== shinyMatches * 2) this.shinyNeedsRefresh = true;
    const timeAdded = this.addMatchTime(matches.length);
    const scoreAdded = matches.length * 140 + shinyMatches * 140;
    this.score += scoreAdded;
    const won = this.finishIfGoalsComplete();
    if (won) return { type: 'bomb', matches, won, autoShuffled: false, timeAdded, shinyMatches, scoreAdded };
    const settled = this.settleAfterRemoval();
    return {
      type: 'bomb',
      matches,
      won,
      autoShuffled: settled.autoShuffled,
      geometryRecovered: settled.geometryRecovered,
      movement: settled.movement,
      timeAdded,
      shinyMatches,
      scoreAdded
    };
  }

  addMatchTime(pairCount) {
    const seconds = pairCount * MATCH_TIME_BONUS;
    this.timeLeft += seconds;
    this.totalTime = Math.max(this.totalTime, this.timeLeft);
    return seconds;
  }

  grantTime(seconds) {
    this.timeLeft += seconds;
    this.totalTime = Math.max(this.totalTime, this.timeLeft);
    return seconds;
  }

  freezeTimer(seconds = 3) {
    if (this.state !== 'playing') return false;
    this.timerFrozenTicks = Math.max(this.timerFrozenTicks, seconds);
    return true;
  }

  applyCaptainSkill() {
    const skill = this.levelConfig.captainSkill;
    const result = {
      name: skill.name,
      description: skill.description,
      kind: skill.kind,
      timeAdded: 0,
      scoreAdded: 80,
      hintsAdded: 0,
      shufflesAdded: 0,
      frozenTicks: 0
    };
    if (skill.kind === 'time') result.timeAdded = this.grantTime(skill.value);
    if (skill.kind === 'score') result.scoreAdded += skill.value;
    if (skill.kind === 'freeze') {
      this.freezeTimer(skill.value);
      result.frozenTicks = skill.value;
    }
    if (skill.kind === 'hint') {
      this.hintsLeft += skill.value;
      result.hintsAdded = skill.value;
    }
    if (skill.kind === 'shuffle') {
      this.shufflesLeft += skill.value;
      result.shufflesAdded = skill.value;
    }
    return result;
  }

  createShinyBoard() {
    return this.board.map((row) => row.map((tile) => tile == null || tile === BLOCKED_TILE ? null : 0));
  }

  createIceBoard() {
    return this.board.map((row) => row.map((tile) => tile == null || tile === BLOCKED_TILE ? null : 0));
  }

  assignIce(specs) {
    specs.forEach(({ row, col, layers }) => {
      if (this.iceBoard[row]?.[col] != null) this.iceBoard[row][col] = layers;
    });
  }

  activeIcePositions() {
    const positions = [];
    this.iceBoard.forEach((row, rowIndex) => row.forEach((layers, colIndex) => {
      if (layers > 0) positions.push({ row: rowIndex, col: colIndex });
    }));
    return positions;
  }

  assignShinyPairs(pairCount) {
    this.shinyBoard = this.createShinyBoard();
    const byType = new Map();
    this.board.forEach((row, rowIndex) => row.forEach((tile, colIndex) => {
      if (tile == null || tile === BLOCKED_TILE) return;
      if (!byType.has(tile)) byType.set(tile, []);
      byType.get(tile).push({ row: rowIndex, col: colIndex });
    }));
    const candidates = shuffleArray(
      [...byType.entries()].filter(([, positions]) => positions.length >= 2),
      this.random
    );
    let assigned = 0;
    for (const [, positions] of candidates) {
      if (assigned >= pairCount) break;
      const [from, to] = shuffleArray(positions, this.random);
      this.shinyBoard[from.row][from.col] = 1;
      this.shinyBoard[to.row][to.col] = 1;
      assigned += 1;
    }
    this.shinyPairsRemaining = assigned;
    this.shinyNeedsRefresh = false;
  }

  isShinyPair(from, to) {
    return this.shinyBoard[from.row]?.[from.col] === 1
      && this.shinyBoard[to.row]?.[to.col] === 1;
  }

  clearShinyPositions(positions) {
    positions.forEach((position) => {
      if (this.shinyBoard[position.row]) this.shinyBoard[position.row][position.col] = null;
    });
  }

  countShinyPositions(positions) {
    return positions.filter((position) => this.shinyBoard[position.row]?.[position.col] === 1).length;
  }

  settleAfterRemoval() {
    const movement = resolveMovement(this.levelConfig, this.movementStep);
    this.board = applyBoardMovement(this.board, movement);
    this.shinyBoard = applyBoardMovement(this.shinyBoard, movement);
    this.movementStep += 1;
    const solvable = ensureSolvable(this.board, this.random, 120, this.activeIcePositions());
    this.board = solvable.board;
    if (solvable.reshuffled || this.shinyNeedsRefresh) this.assignShinyPairs(this.shinyPairsRemaining);
    return {
      movement,
      autoShuffled: solvable.reshuffled,
      geometryRecovered: solvable.geometryRecovered
    };
  }

  finishIfGoalsComplete() {
    if (!this.levelConfig.goals.every((goal) => isGoalComplete(goal, this))) return false;
    if (this.state === 'won') return true;
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
    if (this.timerFrozenTicks > 0) {
      this.timerFrozenTicks -= 1;
      return this.state;
    }
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    if (this.timeLeft === 0) this.state = 'lost';
    return this.state;
  }

  get remaining() {
    return this.board.flat().filter((tile) => tile != null && tile !== BLOCKED_TILE).length;
  }

  get starsEarned() {
    return this.levelConfig.stars.filter((condition) => isStarConditionMet(condition, this)).length;
  }

  get starResults() {
    return this.levelConfig.stars.map((condition) => ({
      condition: { ...condition },
      earned: isStarConditionMet(condition, this)
    }));
  }

  get goalResults() {
    return this.levelConfig.goals.map((goal) => ({
      goal: { ...goal },
      complete: isGoalComplete(goal, this)
    }));
  }

  snapshot() {
    return {
      board: this.board.map((row) => [...row]),
      shinyBoard: this.shinyBoard.map((row) => [...row]),
      iceBoard: this.iceBoard.map((row) => [...row]),
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
      shufflesUsed: this.shufflesUsed,
      hintsUsed: this.hintsUsed,
      powerupsUsed: this.powerupsUsed,
      lastShuffleGeometryRecovered: this.lastShuffleGeometryRecovered,
      timerFrozenTicks: this.timerFrozenTicks,
      shinyPairsRemaining: this.shinyPairsRemaining,
      shinyPairsCleared: this.shinyPairsCleared,
      iceBrokenCount: this.iceBrokenCount,
      captainPairsCleared: this.captainPairsCleared,
      obstaclesRemaining: this.iceBoard.flat().reduce((total, value) => total + Math.max(0, value ?? 0), 0)
        + this.blockedPositions.length,
      starsEarned: this.starsEarned,
      starResults: this.starResults,
      goalResults: this.goalResults,
      powerups: { ...this.powerups },
      selected: this.selected,
      remaining: this.remaining,
      state: this.state
    };
  }
}
