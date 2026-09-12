import {
  Tile,
  Direction,
  DOT_SCORE,
  POWER_SCORE,
  GHOST_SCORE,
  POWER_DURATION,
  STARTING_LIVES,
  READY_DELAY,
  DEATH_DELAY,
  LEVEL_CLEAR_DELAY,
} from './constants.js';
import { createMaze, drawMaze, SPAWN_POINTS, pixelToTile } from './maze.js';
import { Player } from './player.js?v=opt1';
import { createGhosts } from './ghost.js?v=opt1';
import { Menu, loadPacmanColor, savePacmanColor } from './menu.js?v=opt1';
import { loadOptions, saveOptions } from './settings.js?v=opt1';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'menu';
    this.exited = false;
    this.playerColor = loadPacmanColor();
    const options = loadOptions();
    this.playerSprite = options.playerSprite;
    this.ghostSprite = options.ghostSprite;
    this.playerSpeed = options.playerSpeed;
    this.ghostSpeed = options.ghostSpeed;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('pacman-high-score') || '0', 10);
    this.lives = STARTING_LIVES;
    this.level = 1;
    this.dotsRemaining = 0;
    this.powerTimer = 0;
    this.stateTimer = 0;
    this.lastTime = 0;
    this.mode = 'scatter';
    this.modeTimer = 7000;
    this.deathAnimTimer = 0;

    this.initLevel();
    this.setupInput();
    this.updateHUD();
  }

  initLevel() {
    const { grid, dots, totalDots } = createMaze();
    this.grid = grid;
    this.dotsRemaining = totalDots;
    this.player = new Player(SPAWN_POINTS.player.col, SPAWN_POINTS.player.row);
    this.ghosts = createGhosts();
    this.applyAppearance();

    if (this.level > 1) {
      this.ghosts.forEach((ghost, i) => {
        ghost.houseTimer = i * 1000;
      });
    }
  }

  setupInput() {
    this.keys = {};
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        if (this.state === 'playing' || this.state === 'ready') e.preventDefault();
      }

      if (e.code === 'Space') {
        if (this.state === 'gameover' || this.state === 'win') {
          this.startGame();
        }
      }
      if (e.code === 'Escape' && (this.state === 'gameover' || this.state === 'win' || this.state === 'ready' || this.state === 'playing')) {
        this.showMainMenu();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  applyAppearance() {
    if (this.player) {
      this.player.color = this.playerColor;
      this.player.sprite = this.playerSprite;
      this.player.speed = this.playerSpeed;
    }
    if (this.ghosts) {
      this.ghosts.forEach((ghost) => {
        ghost.sprite = this.ghostSprite;
        ghost.baseSpeed = this.ghostSpeed;
        if (!ghost.scared && !ghost.eaten) ghost.speed = this.ghostSpeed;
      });
    }
    this.updateHUD();
  }

  setPlayerSprite(sprite) {
    this.playerSprite = saveOptions({ playerSprite: sprite }).playerSprite;
    this.applyAppearance();
  }

  setGhostSprite(sprite) {
    this.ghostSprite = saveOptions({ ghostSprite: sprite }).ghostSprite;
    this.applyAppearance();
  }

  setPlayerSpeed(speed) {
    this.playerSpeed = saveOptions({ playerSpeed: speed }).playerSpeed;
    this.applyAppearance();
  }

  setGhostSpeed(speed) {
    this.ghostSpeed = saveOptions({ ghostSpeed: speed }).ghostSpeed;
    this.applyAppearance();
  }

  setPacmanColor(hex) {
    this.playerColor = savePacmanColor(hex);
    this.applyAppearance();
  }

  showMainMenu() {
    this.state = 'menu';
    this.hideOverlay();
    this.menu.showMain();
    this.updateHUD();
  }

  startGame() {
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.level = 1;
    this.initLevel();
    this.state = 'ready';
    this.stateTimer = READY_DELAY;
    this.menu.hide();
    this.hideOverlay();
    this.updateHUD();
  }

  handleInput() {
    if (this.state !== 'playing' && this.state !== 'ready') return;

    if (this.keys['ArrowUp'] || this.keys['KeyW']) {
      this.player.setDirection(Direction.UP);
    } else if (this.keys['ArrowDown'] || this.keys['KeyS']) {
      this.player.setDirection(Direction.DOWN);
    } else if (this.keys['ArrowLeft'] || this.keys['KeyA']) {
      this.player.setDirection(Direction.LEFT);
    } else if (this.keys['ArrowRight'] || this.keys['KeyD']) {
      this.player.setDirection(Direction.RIGHT);
    }
  }

  update(dt) {
    this.handleInput();

    switch (this.state) {
      case 'menu':
      case 'customize':
      case 'options':
        break;
      case 'title':
        break;
      case 'ready':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = 'playing';
        }
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'dying':
        this.deathAnimTimer -= dt;
        if (this.deathAnimTimer <= 0) {
          this.lives--;
          this.updateHUD();
          if (this.lives <= 0) {
            this.state = 'gameover';
            this.showOverlay('GAME OVER', 'Press SPACE to play again', true);
          } else {
            this.player.reset();
            this.ghosts.forEach((g) => g.reset());
            this.applyAppearance();
            this.state = 'ready';
            this.stateTimer = READY_DELAY;
          }
        }
        break;
      case 'levelclear':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.hideOverlay();
          this.level++;
          this.initLevel();
          this.state = 'ready';
          this.stateTimer = READY_DELAY;
          this.updateHUD();
        }
        break;
      case 'gameover':
      case 'win':
        break;
    }
  }

  updatePlaying(dt) {
    this.player.update(this.grid, dt);

    this.modeTimer -= dt;
    if (this.modeTimer <= 0) {
      this.mode = this.mode === 'scatter' ? 'chase' : 'scatter';
      this.modeTimer = this.mode === 'scatter' ? 7000 : 20000;
      this.ghosts.forEach((g) => {
        g.mode = this.mode;
      });
    }

    const blinky = this.ghosts[0];
    this.ghosts.forEach((ghost) => {
      ghost.update(this.grid, this.player, blinky, dt);
    });

    this.checkDotCollision();
    this.checkGhostCollision();

    if (this.powerTimer > 0) {
      this.powerTimer -= dt;
      const flashing = this.powerTimer < 2000;
      this.ghosts.forEach((g) => {
        g.flashing = flashing;
      });
      if (this.powerTimer <= 0) {
        this.ghosts.forEach((g) => g.setScared(false));
      }
    }
  }

  checkDotCollision() {
    const { col, row } = pixelToTile(this.player.x, this.player.y);
    const tile = this.grid[row]?.[col];

    if (tile === Tile.DOT) {
      this.grid[row][col] = Tile.EMPTY;
      this.score += DOT_SCORE;
      this.dotsRemaining--;
      this.updateHUD();
      this.checkLevelClear();
    } else if (tile === Tile.POWER) {
      this.grid[row][col] = Tile.EMPTY;
      this.score += POWER_SCORE;
      this.dotsRemaining--;
      this.powerTimer = POWER_DURATION;
      this.ghosts.forEach((g) => g.setScared(true));
      this.updateHUD();
      this.checkLevelClear();
    }
  }

  checkLevelClear() {
    if (this.dotsRemaining > 0) return;
    this.state = 'levelclear';
    this.stateTimer = LEVEL_CLEAR_DELAY;
    this.showOverlay(`LEVEL ${this.level} CLEAR!`, '');
  }

  checkGhostCollision() {
    for (const ghost of this.ghosts) {
      if (ghost.inHouse) continue;

      const dist = Math.hypot(this.player.x - ghost.x, this.player.y - ghost.y);
      if (dist < 14) {
        if (ghost.scared && !ghost.eaten) {
          ghost.getEaten();
          this.score += GHOST_SCORE;
          this.updateHUD();
        } else if (!ghost.eaten && this.player.alive) {
          this.player.die();
          this.state = 'dying';
          this.deathAnimTimer = DEATH_DELAY;
        }
      }
    }
  }

  draw() {
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    drawMaze(this.ctx, this.grid);

    if (this.state !== 'menu' && this.state !== 'customize' && this.state !== 'options' && this.state !== 'exited') {
      this.ghosts.forEach((g) => g.draw(this.ctx));
      this.player.draw(this.ctx);
    }

    if (this.state === 'ready') {
      this.drawReadyText();
    }
  }

  drawReadyText() {
    this.ctx.fillStyle = this.playerColor;
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('READY!', this.canvas.width / 2, this.canvas.height / 2 + 40);
  }

  updateHUD() {
    document.getElementById('score').textContent = this.score;
    document.getElementById('level').textContent = this.level;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('pacman-high-score', this.highScore.toString());
    }
    document.getElementById('high-score').textContent = this.highScore;

    const livesEl = document.getElementById('lives');
    livesEl.innerHTML = '';
    for (let i = 0; i < this.lives; i++) {
      const span = document.createElement('span');
      span.textContent = '●';
      span.style.color = this.playerColor;
      livesEl.appendChild(span);
    }
  }

  showOverlay(title, message, showActions = false) {
    const overlay = document.getElementById('overlay');
    document.getElementById('overlay-title').textContent = title;
    document.getElementById('overlay-message').textContent = message;
    document.getElementById('overlay-actions').classList.toggle('hidden', !showActions);
    overlay.classList.remove('hidden');
  }

  hideOverlay() {
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('overlay-actions').classList.add('hidden');
  }

  exit() {
    this.exited = true;
    this.state = 'exited';
    document.getElementById('game-root').classList.add('hidden');
    document.getElementById('exit-screen').classList.remove('hidden');
    window.close();
  }

  loop(timestamp) {
    if (this.exited) return;
    requestAnimationFrame((t) => this.loop(t));

    const dt = this.lastTime === 0 ? 16 : Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    try {
      this.update(dt);
      this.draw();
    } catch (err) {
      console.error(err);
    }
  }

  start() {
    this.menu = new Menu(this);
    this.menu.showMain();
    requestAnimationFrame((t) => this.loop(t));
  }
}
