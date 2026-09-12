import {
  Direction,
  PLAYER_SPEED,
  TILE_SIZE,
} from './constants.js';
import { isWalkable } from './maze.js';
import { drawPlayerSprite } from './sprites.js?v=opt1';

function nearestTile(x, y) {
  return {
    col: Math.round((x - TILE_SIZE / 2) / TILE_SIZE),
    row: Math.round((y - TILE_SIZE / 2) / TILE_SIZE),
  };
}

export class Player {
  constructor(spawnCol, spawnRow) {
    this.spawnCol = spawnCol;
    this.spawnRow = spawnRow;
    this.reset();
  }

  reset() {
    this.x = this.spawnCol * TILE_SIZE + TILE_SIZE / 2;
    this.y = this.spawnRow * TILE_SIZE + TILE_SIZE / 2;
    this.direction = Direction.LEFT;
    this.nextDirection = Direction.LEFT;
    this.speed = this.speed || PLAYER_SPEED;
    this.sprite = this.sprite || 'classic';
    this.mouthOpen = true;
    this.mouthTimer = 0;
    this.alive = true;
    this.color = this.color || '#ffff00';
  }

  setDirection(dir) {
    this.nextDirection = dir;
  }

  update(grid, dt) {
    if (!this.alive) return;

    this.mouthTimer += dt;
    if (this.mouthTimer > 100) {
      this.mouthOpen = !this.mouthOpen;
      this.mouthTimer = 0;
    }

    this.tryChangeDirection(grid);
    this.move(grid);
    this.handleTunnel();
  }

  isReverse(dir) {
    return dir.x === -this.direction.x && dir.y === -this.direction.y && (dir.x !== 0 || dir.y !== 0);
  }

  tileCenter(col, row) {
    return {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };
  }

  alignedForTurn() {
    const { col, row } = nearestTile(this.x, this.y);
    const { x, y } = this.tileCenter(col, row);
    return Math.abs(this.x - x) <= this.speed && Math.abs(this.y - y) <= this.speed;
  }

  tryChangeDirection(grid) {
    if (this.nextDirection.x === 0 && this.nextDirection.y === 0) return;

    if (this.isReverse(this.nextDirection)) {
      this.direction = this.nextDirection;
      return;
    }

    if (this.nextDirection.x === this.direction.x && this.nextDirection.y === this.direction.y) {
      return;
    }

    if (!this.alignedForTurn()) return;

    const { col, row } = nearestTile(this.x, this.y);
    const nextCol = col + this.nextDirection.x;
    const nextRow = row + this.nextDirection.y;

    if (isWalkable(grid, nextCol, nextRow)) {
      this.direction = this.nextDirection;
      const center = this.tileCenter(col, row);
      this.x = center.x;
      this.y = center.y;
    }
  }

  move(grid) {
    if (this.direction.x === 0 && this.direction.y === 0) return;

    const { col, row } = nearestTile(this.x, this.y);
    const center = this.tileCenter(col, row);

    if (this.direction.x !== 0) {
      this.y = center.y;
    } else {
      this.x = center.x;
    }

    const crossingCenter =
      (this.direction.x < 0 && this.x > center.x && this.x - this.speed <= center.x) ||
      (this.direction.x > 0 && this.x < center.x && this.x + this.speed >= center.x) ||
      (this.direction.y < 0 && this.y > center.y && this.y - this.speed <= center.y) ||
      (this.direction.y > 0 && this.y < center.y && this.y + this.speed >= center.y);

    if (crossingCenter || this.alignedForTurn()) {
      if (!isWalkable(grid, col + this.direction.x, row + this.direction.y)) {
        this.x = center.x;
        this.y = center.y;
        return;
      }
    }

    this.x += this.direction.x * this.speed;
    this.y += this.direction.y * this.speed;
  }

  handleTunnel() {
    const width = 28 * TILE_SIZE;
    if (this.x < -TILE_SIZE / 2) {
      this.x = width - TILE_SIZE / 2;
    } else if (this.x > width + TILE_SIZE / 2) {
      this.x = TILE_SIZE / 2;
    }
  }

  getTilePosition() {
    return nearestTile(this.x, this.y);
  }

  draw(ctx) {
    if (!this.alive) return;

    drawPlayerSprite(
      ctx,
      this.x,
      this.y,
      this.direction,
      this.color || '#ffff00',
      this.mouthOpen,
      this.sprite || 'classic'
    );
  }

  die() {
    this.alive = false;
  }
}
