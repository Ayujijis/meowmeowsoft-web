import {
  Direction,
  GHOST_SPEED,
  GHOST_FRIGHTENED_SPEED,
  GHOST_EATEN_SPEED,
  GHOST_COLORS,
  GHOST_SCARED_COLOR,
  GHOST_EATEN_COLOR,
  TILE_SIZE,
} from './constants.js';
import { isWalkable, pixelToTile, GHOST_EXIT } from './maze.js';
import { drawGhostSprite } from './sprites.js?v=opt1';

const OPPOSITE = {
  UP: Direction.DOWN,
  DOWN: Direction.UP,
  LEFT: Direction.RIGHT,
  RIGHT: Direction.LEFT,
};

export class Ghost {
  constructor(name, spawnCol, spawnRow, color) {
    this.name = name;
    this.spawnCol = spawnCol;
    this.spawnRow = spawnRow;
    this.color = color;
    this.reset();
  }

  reset() {
    this.x = this.spawnCol * TILE_SIZE + TILE_SIZE / 2;
    this.y = this.spawnRow * TILE_SIZE + TILE_SIZE / 2;
    this.direction = Direction.UP;
    this.baseSpeed = this.baseSpeed || GHOST_SPEED;
    this.speed = this.baseSpeed;
    this.sprite = this.sprite || 'classic';
    this.mode = 'house';
    this.scared = false;
    this.eaten = false;
    this.inHouse = true;
    this.houseTimer = this.name === 'blinky' ? 0 : 1500;
    if (this.name === 'inky') this.houseTimer = 3000;
    if (this.name === 'clyde') this.houseTimer = 4500;
    this.scatterTarget = this.getScatterTarget();
    this.spawnY = this.y;
    this.leaving = false;
    this.lastDecisionTile = '';
  }

  getScatterTarget() {
    const targets = {
      blinky: { col: 25, row: 0 },
      pinky: { col: 2, row: 0 },
      inky: { col: 27, row: 29 },
      clyde: { col: 0, row: 29 },
    };
    return targets[this.name];
  }

  release() {
    this.inHouse = false;
    this.leaving = this.name !== 'blinky';
    this.mode = this.leaving ? 'leaving' : 'scatter';
    this.y = this.spawnY;
    this.lastDecisionTile = '';
  }

  setScared(scared) {
    if (this.eaten) return;
    if (scared && !this.scared) {
      this.direction = OPPOSITE[this.getDirectionName()] || this.direction;
    }
    this.scared = scared;
    this.flashing = false;
    if (!scared && !this.eaten) {
      this.speed = this.baseSpeed || GHOST_SPEED;
    }
  }

  getEaten() {
    this.eaten = true;
    this.scared = false;
    this.speed = Math.max((this.baseSpeed || GHOST_SPEED) * 1.4, GHOST_EATEN_SPEED);
    this.mode = 'eaten';
  }

  getDirectionName() {
    for (const [name, dir] of Object.entries(Direction)) {
      if (name !== 'NONE' && dir.x === this.direction.x && dir.y === this.direction.y) {
        return name;
      }
    }
    return 'UP';
  }

  update(grid, player, blinky, dt) {
    if (this.inHouse) {
      this.houseTimer -= dt;
      this.y = this.spawnY + Math.sin(Date.now() / 200) * 3;
      if (this.houseTimer <= 0) {
        this.direction = Direction.UP;
        this.release();
      }
      return;
    }

    if (this.scared) {
      this.speed = (this.baseSpeed || GHOST_SPEED) * (GHOST_FRIGHTENED_SPEED / GHOST_SPEED);
    } else if (this.eaten) {
      this.speed = Math.max((this.baseSpeed || GHOST_SPEED) * 1.4, GHOST_EATEN_SPEED);
    } else {
      this.speed = this.baseSpeed || GHOST_SPEED;
    }

    const { col, row } = pixelToTile(this.x, this.y);
    const centerX = col * TILE_SIZE + TILE_SIZE / 2;
    const centerY = row * TILE_SIZE + TILE_SIZE / 2;
    const onCenter =
      Math.abs(this.x - centerX) <= this.speed &&
      Math.abs(this.y - centerY) <= this.speed;
    const tileKey = `${col},${row}`;
    const aheadWalkable = isWalkable(
      grid,
      col + this.direction.x,
      row + this.direction.y,
      true
    );

    if (onCenter && (tileKey !== this.lastDecisionTile || !aheadWalkable)) {
      this.lastDecisionTile = tileKey;
      this.x = centerX;
      this.y = centerY;

      if (this.eaten) {
        if (col === GHOST_EXIT.col && row === GHOST_EXIT.row) {
          this.eaten = false;
          this.leaving = false;
          this.inHouse = true;
          this.houseTimer = 2000;
          this.mode = 'house';
          this.x = this.spawnCol * TILE_SIZE + TILE_SIZE / 2;
          this.y = this.spawnRow * TILE_SIZE + TILE_SIZE / 2;
          this.spawnY = this.y;
          return;
        }
        this.direction = this.chooseDirection(grid, GHOST_EXIT.col, GHOST_EXIT.row);
      } else if (this.leaving) {
        if (col === GHOST_EXIT.col && row === GHOST_EXIT.row) {
          this.leaving = false;
          this.mode = 'scatter';
          const target = this.getTarget(player, blinky);
          this.direction = this.chooseDirection(grid, target.col, target.row);
        } else {
          this.direction = this.chooseDirection(grid, GHOST_EXIT.col, GHOST_EXIT.row);
        }
      } else {
        const target = this.getTarget(player, blinky);
        this.direction = this.chooseDirection(grid, target.col, target.row);
      }
    }

    const nextX = this.x + this.direction.x * this.speed;
    const nextY = this.y + this.direction.y * this.speed;
    const nextTile = pixelToTile(nextX, nextY);

    if (isWalkable(grid, nextTile.col, nextTile.row, true)) {
      this.x = nextX;
      this.y = nextY;
      if (this.direction.x !== 0) {
        this.y = pixelToTile(this.x, this.y).row * TILE_SIZE + TILE_SIZE / 2;
      } else if (this.direction.y !== 0) {
        this.x = pixelToTile(this.x, this.y).col * TILE_SIZE + TILE_SIZE / 2;
      }
    }

    this.handleTunnel();
  }

  getTarget(player, blinky) {
    const playerTile = pixelToTile(player.x, player.y);
    let targetCol = playerTile.col;
    let targetRow = playerTile.row;

    if (this.scared) {
      return {
        col: Math.floor(Math.random() * 28),
        row: Math.floor(Math.random() * 31),
      };
    }

    if (this.mode === 'scatter') {
      return this.scatterTarget;
    }

    const leadCol = playerTile.col + player.direction.x * 4;
    const leadRow = playerTile.row + player.direction.y * 4;

    switch (this.name) {
      case 'blinky':
        targetCol = playerTile.col;
        targetRow = playerTile.row;
        break;
      case 'pinky':
        targetCol = leadCol;
        targetRow = leadRow;
        break;
      case 'inky': {
        const blinkyTile = pixelToTile(blinky.x, blinky.y);
        const pivotCol = playerTile.col + player.direction.x * 2;
        const pivotRow = playerTile.row + player.direction.y * 2;
        targetCol = pivotCol + (pivotCol - blinkyTile.col);
        targetRow = pivotRow + (pivotRow - blinkyTile.row);
        break;
      }
      case 'clyde': {
        const dist = Math.hypot(
          playerTile.col - pixelToTile(this.x, this.y).col,
          playerTile.row - pixelToTile(this.x, this.y).row
        );
        if (dist > 8) {
          targetCol = playerTile.col;
          targetRow = playerTile.row;
        } else {
          return this.scatterTarget;
        }
        break;
      }
    }

    return { col: targetCol, row: targetRow };
  }

  chooseDirection(grid, targetCol, targetRow) {
    const { col, row } = pixelToTile(this.x, this.y);
    const directions = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const validDirs = directions.filter((dir) => {
      if (dir.x === -this.direction.x && dir.y === -this.direction.y) return false;
      return isWalkable(grid, col + dir.x, row + dir.y, true);
    });

    if (validDirs.length === 0) {
      return OPPOSITE[this.getDirectionName()] || this.direction;
    }

    if (this.scared) {
      return validDirs[Math.floor(Math.random() * validDirs.length)];
    }

    let bestDir = validDirs[0];
    let bestDist = Infinity;

    for (const dir of validDirs) {
      const nextCol = col + dir.x;
      const nextRow = row + dir.y;
      const dist = Math.hypot(nextCol - targetCol, nextRow - targetRow);
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  canMove(grid, x, y) {
    const { col, row } = pixelToTile(x, y);
    return isWalkable(grid, col, row, true);
  }

  handleTunnel() {
    if (this.x < -TILE_SIZE / 2) {
      this.x = 28 * TILE_SIZE - TILE_SIZE / 2;
    } else if (this.x > 28 * TILE_SIZE + TILE_SIZE / 2) {
      this.x = TILE_SIZE / 2;
    }
  }

  draw(ctx) {
    let color = this.color;
    if (this.eaten) {
      color = GHOST_EATEN_COLOR;
    } else if (this.scared) {
      const flashing = this.flashing && Math.floor(Date.now() / 200) % 2 === 0;
      color = flashing ? '#fff' : GHOST_SCARED_COLOR;
    }

    drawGhostSprite(ctx, this.x, this.y, this.direction, color, this.sprite || 'classic', {
      eaten: this.eaten,
    });
  }

  drawGhostBody(ctx, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y - 2, 9, Math.PI, 0);
    ctx.lineTo(this.x + 9, this.y + 7);

    for (let i = 0; i < 3; i++) {
      const waveX = this.x + 9 - i * 6;
      ctx.lineTo(waveX - 3, this.y + 4);
      ctx.lineTo(waveX - 6, this.y + 7);
    }

    ctx.lineTo(this.x - 9, this.y + 7);
    ctx.closePath();
    ctx.fill();
  }

  drawEyes(ctx) {
    const eyeOffsetX = this.direction.x * 2;
    const eyeOffsetY = this.direction.y * 2;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x - 4 + eyeOffsetX, this.y - 3 + eyeOffsetY, 3.5, 0, Math.PI * 2);
    ctx.arc(this.x + 4 + eyeOffsetX, this.y - 3 + eyeOffsetY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2121de';
    const pupilOffsetX = this.direction.x * 1.5;
    const pupilOffsetY = this.direction.y * 1.5;
    ctx.beginPath();
    ctx.arc(this.x - 4 + eyeOffsetX + pupilOffsetX, this.y - 3 + eyeOffsetY + pupilOffsetY, 1.5, 0, Math.PI * 2);
    ctx.arc(this.x + 4 + eyeOffsetX + pupilOffsetX, this.y - 3 + eyeOffsetY + pupilOffsetY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createGhosts() {
  return [
    new Ghost('blinky', 14, 11, GHOST_COLORS.blinky),
    new Ghost('pinky', 14, 14, GHOST_COLORS.pinky),
    new Ghost('inky', 12, 14, GHOST_COLORS.inky),
    new Ghost('clyde', 16, 14, GHOST_COLORS.clyde),
  ];
}
