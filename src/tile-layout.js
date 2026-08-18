export function placeTileInGrid(tile, row, col) {
  tile.style.gridRowStart = row + 1;
  tile.style.gridColumnStart = col + 1;
}
