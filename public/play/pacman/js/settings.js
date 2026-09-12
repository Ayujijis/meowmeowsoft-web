import { PLAYER_SPEED, GHOST_SPEED } from './constants.js';

const SETTINGS_KEY = 'pacman-options';
export const SPRITES = ['classic', 'dinosaur', 'chicken'];

const DEFAULTS = {
  playerSprite: 'classic',
  ghostSprite: 'classic',
  playerSpeed: PLAYER_SPEED,
  ghostSpeed: GHOST_SPEED,
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

export function loadOptions() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const playerSprite = SPRITES.includes(raw.playerSprite) ? raw.playerSprite : DEFAULTS.playerSprite;
    const ghostSprite = SPRITES.includes(raw.ghostSprite) ? raw.ghostSprite : DEFAULTS.ghostSprite;
    return {
      playerSprite,
      ghostSprite,
      playerSpeed: clamp(Number(raw.playerSpeed) || DEFAULTS.playerSpeed, 1, 4),
      ghostSpeed: clamp(Number(raw.ghostSpeed) || DEFAULTS.ghostSpeed, 0.5, 3.5),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveOptions(partial) {
  const next = { ...loadOptions(), ...partial };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}
