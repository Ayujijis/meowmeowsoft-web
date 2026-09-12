export const TILE_SIZE = 20;
export const COLS = 28;
export const ROWS = 31;

export const Tile = {
  EMPTY: 0,
  WALL: 1,
  DOT: 2,
  POWER: 3,
  GHOST_HOUSE: 4,
  TUNNEL: 5,
  VOID: 6,
};

export const Direction = {
  NONE: { x: 0, y: 0, angle: 0 },
  UP: { x: 0, y: -1, angle: -Math.PI / 2 },
  DOWN: { x: 0, y: 1, angle: Math.PI / 2 },
  LEFT: { x: -1, y: 0, angle: Math.PI },
  RIGHT: { x: 1, y: 0, angle: 0 },
};

export const GHOST_COLORS = {
  blinky: '#ff0000',
  pinky: '#ffb8ff',
  inky: '#00ffff',
  clyde: '#ffb852',
};

export const GHOST_SCARED_COLOR = '#2121de';
export const GHOST_EATEN_COLOR = '#fff';

export const DOT_SCORE = 10;
export const POWER_SCORE = 50;
export const GHOST_SCORE = 200;

export const POWER_DURATION = 6000;
export const GHOST_FRIGHTENED_SPEED = 0.6;
export const GHOST_EATEN_SPEED = 1.5;
export const PLAYER_SPEED = 2;
export const GHOST_SPEED = 1.75;

export const STARTING_LIVES = 3;
export const READY_DELAY = 2000;
export const DEATH_DELAY = 2000;
export const LEVEL_CLEAR_DELAY = 3000;

export const COLORS = {
  wall: '#2121de',
  wallBorder: '#0000ff',
  dot: '#ffb897',
  background: '#000',
};
