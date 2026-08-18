function compact(values, align = 'start') {
  const tiles = values.filter((value) => value != null);
  const empty = Array(values.length - tiles.length).fill(null);
  return align === 'end' ? [...empty, ...tiles] : [...tiles, ...empty];
}

function moveRows(board, align) {
  return board.map((row) => compact(row, align));
}

function moveColumns(board, align) {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const result = board.map((row) => row.map(() => null));
  for (let col = 0; col < cols; col += 1) {
    const column = board.map((row) => row[col]);
    compact(column, align).forEach((value, row) => {
      result[row][col] = value;
    });
  }
  return result;
}

function moveHorizontalHalves(board, inward) {
  return board.map((row) => {
    const split = Math.ceil(row.length / 2);
    const left = compact(row.slice(0, split), inward ? 'end' : 'start');
    const right = compact(row.slice(split), inward ? 'start' : 'end');
    return [...left, ...right];
  });
}

function moveVerticalHalves(board, inward) {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const split = Math.ceil(rows / 2);
  const result = board.map((row) => row.map(() => null));
  for (let col = 0; col < cols; col += 1) {
    const top = compact(board.slice(0, split).map((row) => row[col]), inward ? 'end' : 'start');
    const bottom = compact(board.slice(split).map((row) => row[col]), inward ? 'start' : 'end');
    [...top, ...bottom].forEach((value, row) => {
      result[row][col] = value;
    });
  }
  return result;
}

export function applyBoardMovement(board, movement = 'static') {
  const source = board.map((row) => [...row]);
  switch (movement) {
    case 'down':
      return moveColumns(source, 'end');
    case 'up':
      return moveColumns(source, 'start');
    case 'left':
      return moveRows(source, 'start');
    case 'right':
      return moveRows(source, 'end');
    case 'horizontal-in':
      return moveHorizontalHalves(source, true);
    case 'horizontal-out':
      return moveHorizontalHalves(source, false);
    case 'vertical-in':
      return moveVerticalHalves(source, true);
    case 'vertical-out':
      return moveVerticalHalves(source, false);
    default:
      return source;
  }
}
