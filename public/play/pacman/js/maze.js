import { Tile, COLS, TILE_SIZE } from './constants.js';

// # wall  . pellet  o power  G ghost house  = empty path  T tunnel  space = void
const MAZE_CHARS = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.#####=##=#####.######',
  '     #.#####=##=#####.#     ',
  '     #.##==========##.#     ',
  '     #.##.###==###.##.#     ',
  '######.##.#GGGGGG#.##.######',
  'TTTTTT.===#GGGGGG#===.TTTTTT',
  '######.##.#GGGGGG#.##.######',
  '     #.##.########.##.#     ',
  '     #.##==========##.#     ',
  '     #.##.########.##.#     ',
  '######.##.########.##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......==.......##..o#',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

export function createMaze() {
  const grid = [];
  const dots = [];

  for (let row = 0; row < MAZE_CHARS.length; row++) {
    const line = MAZE_CHARS[row];
    if (line.length !== COLS) {
      throw new Error(`Maze row ${row} has ${line.length} cols, expected ${COLS}`);
    }
    grid[row] = [];
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      switch (char) {
        case '#':
          grid[row][col] = Tile.WALL;
          break;
        case '.':
          grid[row][col] = Tile.DOT;
          dots.push({ col, row });
          break;
        case 'o':
          grid[row][col] = Tile.POWER;
          dots.push({ col, row, power: true });
          break;
        case 'G':
          grid[row][col] = Tile.GHOST_HOUSE;
          break;
        case 'T':
          grid[row][col] = Tile.TUNNEL;
          break;
        case '=':
          grid[row][col] = Tile.EMPTY;
          break;
        default:
          grid[row][col] = Tile.VOID;
      }
    }
  }

  return { grid, dots, totalDots: dots.length };
}

export function isWalkable(grid, col, row, forGhost = false) {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) {
    return false;
  }
  const tile = grid[row][col];
  if (tile === Tile.WALL || tile === Tile.VOID) {
    return false;
  }
  if (tile === Tile.GHOST_HOUSE) {
    return forGhost;
  }
  return true;
}

export function getTileCenter(col, row) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

export function pixelToTile(x, y) {
  return {
    col: Math.floor(x / TILE_SIZE),
    row: Math.floor(y / TILE_SIZE),
  };
}

export function drawMaze(ctx, grid) {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const tile = grid[row][col];
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;

      if (tile === Tile.WALL) {
        ctx.fillStyle = '#2121de';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
      } else if (tile === Tile.DOT) {
        ctx.fillStyle = '#ffb897';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (tile === Tile.POWER) {
        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        ctx.fillStyle = '#ffb897';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10, 6 * pulse, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export const SPAWN_POINTS = {
  player: { col: 13, row: 23 },
  blinky: { col: 14, row: 11 },
  pinky: { col: 14, row: 14 },
  inky: { col: 12, row: 14 },
  clyde: { col: 16, row: 14 },
};

export const GHOST_EXIT = { col: 14, row: 11 };
