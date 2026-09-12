import { ColorPicker, loadPacmanColor, savePacmanColor } from './color.js?v=opt1';
import { GHOST_COLORS, Direction } from './constants.js';
import { loadOptions, saveOptions } from './settings.js?v=opt1';
import { drawSpritePreview } from './sprites.js?v=opt1';

export class Menu {
  constructor(game) {
    this.game = game;
    this.main = document.getElementById('main-menu');
    this.colorMenu = document.getElementById('color-menu');
    this.optionsMenu = document.getElementById('options-menu');
    this.buttons = [...this.main.querySelectorAll('.menu-btn')];
    this.index = 0;
    this.active = true;

    this.picker = new ColorPicker({
      wheel: document.getElementById('color-wheel'),
      valueSlider: document.getElementById('color-value'),
      hexInput: document.getElementById('color-hex'),
      preview: document.getElementById('color-preview'),
      errorEl: document.getElementById('hex-error'),
      onChange: (hex) => game.setPacmanColor(hex),
    });

    this.buttons.forEach((btn, i) => {
      btn.addEventListener('mouseenter', () => this.setIndex(i));
      btn.addEventListener('click', () => this.activate(btn.dataset.action));
    });

    document.getElementById('btn-color-back').addEventListener('click', () => this.showMain());
    document.getElementById('btn-options-back').addEventListener('click', () => this.showMain());
    document.getElementById('btn-play-again').addEventListener('click', () => game.startGame());
    document.getElementById('btn-overlay-menu').addEventListener('click', () => game.showMainMenu());

    this.optionsMenu.querySelectorAll('.sprite-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.kind === 'player') game.setPlayerSprite(btn.dataset.sprite);
        if (btn.dataset.kind === 'ghost') game.setGhostSprite(btn.dataset.sprite);
        this.refreshOptions();
      });
    });

    const playerSpeed = document.getElementById('player-speed');
    const ghostSpeed = document.getElementById('ghost-speed');
    playerSpeed.addEventListener('input', () => {
      game.setPlayerSpeed(Number(playerSpeed.value));
      this.refreshOptions();
    });
    ghostSpeed.addEventListener('input', () => {
      game.setGhostSpeed(Number(ghostSpeed.value));
      this.refreshOptions();
    });

    window.addEventListener('keydown', (e) => this.onKey(e));
    this.setIndex(0);
  }

  onKey(e) {
    if (!this.colorMenu.classList.contains('hidden') || !this.optionsMenu.classList.contains('hidden')) {
      if (e.code === 'Escape') {
        e.preventDefault();
        this.showMain();
      }
      return;
    }

    if (!this.active) return;

    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      this.setIndex(this.index + 1);
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      this.setIndex(this.index - 1);
    } else if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      this.activate(this.buttons[this.index].dataset.action);
    }
  }

  setIndex(next) {
    const total = this.buttons.length;
    this.index = ((next % total) + total) % total;
    this.buttons.forEach((btn, i) => {
      if (i === this.index) btn.setAttribute('aria-current', 'true');
      else btn.removeAttribute('aria-current');
    });
  }

  activate(action) {
    if (action === 'play') this.game.startGame();
    if (action === 'options') this.showOptions();
    if (action === 'customize') this.showColor();
    if (action === 'exit') this.game.exit();
  }

  showMain() {
    this.active = true;
    this.game.state = 'menu';
    this.main.classList.remove('hidden');
    this.colorMenu.classList.add('hidden');
    this.optionsMenu.classList.add('hidden');
    this.setIndex(this.index);
  }

  showColor() {
    this.active = false;
    this.game.state = 'customize';
    this.picker.setHex(loadPacmanColor());
    this.main.classList.add('hidden');
    this.optionsMenu.classList.add('hidden');
    this.colorMenu.classList.remove('hidden');
  }

  showOptions() {
    this.active = false;
    this.game.state = 'options';
    this.main.classList.add('hidden');
    this.colorMenu.classList.add('hidden');
    this.optionsMenu.classList.remove('hidden');
    this.refreshOptions();
  }

  refreshOptions() {
    const opts = loadOptions();
    const playerColor = loadPacmanColor();
    const face = Direction.RIGHT;

    this.optionsMenu.querySelectorAll('.sprite-btn').forEach((btn) => {
      const selected = btn.dataset.kind === 'player'
        ? opts.playerSprite === btn.dataset.sprite
        : opts.ghostSprite === btn.dataset.sprite;
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      const canvas = btn.querySelector('canvas');
      const color = btn.dataset.kind === 'player' ? playerColor : GHOST_COLORS.blinky;
      drawSpritePreview(canvas, btn.dataset.kind, btn.dataset.sprite, color, face);
    });

    document.getElementById('player-speed').value = String(opts.playerSpeed);
    document.getElementById('ghost-speed').value = String(opts.ghostSpeed);
    document.getElementById('player-speed-value').textContent = opts.playerSpeed.toFixed(2);
    document.getElementById('ghost-speed-value').textContent = opts.ghostSpeed.toFixed(2);
  }

  hide() {
    this.active = false;
    this.main.classList.add('hidden');
    this.colorMenu.classList.add('hidden');
    this.optionsMenu.classList.add('hidden');
  }
}

export { loadPacmanColor, savePacmanColor, loadOptions, saveOptions };
