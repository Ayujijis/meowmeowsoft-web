import { Game } from './game.js?v=opt1';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
window.game = game;
game.start();
