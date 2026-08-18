const DIRECTIONS = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1]
];

const keyOf = (row, col, direction) => `${row},${col},${direction}`;

export function findPath(board, from, to) {
  if (!board.length || !board[0].length) return null;
  if (from.row === to.row && from.col === to.col) return null;
  if (board[from.row]?.[from.col] == null || board[to.row]?.[to.col] == null) return null;
  if (board[from.row][from.col] !== board[to.row][to.col]) return null;

  const rows = board.length;
  const cols = board[0].length;
  const paddedRows = rows + 2;
  const paddedCols = cols + 2;
  const start = { row: from.row + 1, col: from.col + 1 };
  const target = { row: to.row + 1, col: to.col + 1 };

  const isOpen = (row, col) => {
    if (row < 0 || col < 0 || row >= paddedRows || col >= paddedCols) return false;
    if (row === target.row && col === target.col) return true;
    if (row === 0 || col === 0 || row === paddedRows - 1 || col === paddedCols - 1) return true;
    return board[row - 1][col - 1] == null;
  };

  const queue = [];
  const bestTurns = new Map();
  const parents = new Map();

  for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
    const [dr, dc] = DIRECTIONS[direction];
    const row = start.row + dr;
    const col = start.col + dc;
    if (!isOpen(row, col)) continue;
    const state = { row, col, direction, turns: 0 };
    const stateKey = keyOf(row, col, direction);
    queue.push(state);
    bestTurns.set(stateKey, 0);
    parents.set(stateKey, { row: start.row, col: start.col, direction: -1 });
  }

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.row === target.row && current.col === target.col) {
      return reconstructPath(current, parents);
    }

    for (let direction = 0; direction < DIRECTIONS.length; direction += 1) {
      const turns = current.turns + (direction === current.direction ? 0 : 1);
      if (turns > 2) continue;
      const [dr, dc] = DIRECTIONS[direction];
      const row = current.row + dr;
      const col = current.col + dc;
      if (!isOpen(row, col)) continue;

      const nextKey = keyOf(row, col, direction);
      if ((bestTurns.get(nextKey) ?? Infinity) <= turns) continue;
      bestTurns.set(nextKey, turns);
      parents.set(nextKey, current);
      queue.push({ row, col, direction, turns });
    }
  }

  return null;
}

function reconstructPath(end, parents) {
  const raw = [];
  let current = end;
  while (current) {
    raw.push({ row: current.row - 1, col: current.col - 1 });
    const parent = parents.get(keyOf(current.row, current.col, current.direction));
    if (!parent) break;
    if (parent.direction === -1) {
      raw.push({ row: parent.row - 1, col: parent.col - 1 });
      break;
    }
    current = parent;
  }
  raw.reverse();

  return raw.filter((point, index, points) => {
    if (index === 0 || index === points.length - 1) return true;
    const previous = points[index - 1];
    const next = points[index + 1];
    return (previous.row - point.row) !== (point.row - next.row)
      || (previous.col - point.col) !== (point.col - next.col);
  });
}

export function findAvailableMove(board) {
  const byType = new Map();
  board.forEach((row, rowIndex) => row.forEach((tile, colIndex) => {
    if (tile == null) return;
    if (!byType.has(tile)) byType.set(tile, []);
    byType.get(tile).push({ row: rowIndex, col: colIndex });
  }));

  for (const positions of byType.values()) {
    for (let first = 0; first < positions.length; first += 1) {
      for (let second = first + 1; second < positions.length; second += 1) {
        const path = findPath(board, positions[first], positions[second]);
        if (path) return { from: positions[first], to: positions[second], path };
      }
    }
  }
  return null;
}

export function countTurns(path) {
  return Math.max(0, path.length - 2);
}
