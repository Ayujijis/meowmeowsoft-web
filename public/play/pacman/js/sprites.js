function facingScale(direction) {
  if (direction && direction.x < 0) return -1;
  return 1;
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawPacmanClassic(ctx, x, y, direction, color, mouthOpen) {
  const open = mouthOpen ? 0.2 : 0.05;
  const startAngle = (direction?.angle || 0) + open;
  const endAngle = (direction?.angle || 0) - open + Math.PI * 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, 8, startAngle, endAngle);
  ctx.closePath();
  ctx.fill();
}

export function drawDinosaur(ctx, x, y, direction, color, { eye = true, small = false } = {}) {
  const s = small ? 0.85 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facingScale(direction) * s, s);

  ctx.fillStyle = color;
  ellipse(ctx, -6, 1, 5, 3.5);
  ellipse(ctx, 2, 0, 7, 5);
  ellipse(ctx, 8, -5, 5, 4);
  ctx.beginPath();
  ctx.moveTo(11, -4);
  ctx.lineTo(16, -2);
  ctx.lineTo(11, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillRect(0, 3, 2.5, 6);
  ctx.fillRect(5, 3, 2.5, 6);
  ctx.fillRect(0, 8, 4, 1.5);
  ctx.fillRect(5, 8, 4, 1.5);
  ctx.fillRect(10, -1, 2, 2);

  if (eye) {
    ctx.fillStyle = '#fff';
    ellipse(ctx, 9, -6, 1.6, 1.6);
    ctx.fillStyle = '#2121de';
    ellipse(ctx, 9.5, -6, 0.8, 0.8);
  }

  ctx.restore();
}

export function drawChicken(ctx, x, y, direction, color, { eye = true, small = false } = {}) {
  const s = small ? 0.9 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facingScale(direction) * s, s);

  ctx.fillStyle = color;
  ellipse(ctx, 0, 2, 7, 6);
  ellipse(ctx, 4, -5, 4.5, 4);

  ctx.fillStyle = '#f5a623';
  ctx.beginPath();
  ctx.moveTo(8, -5);
  ctx.lineTo(13, -4);
  ctx.lineTo(8, -2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#e33';
  ctx.beginPath();
  ctx.moveTo(2, -8);
  ctx.lineTo(4, -12);
  ctx.lineTo(6, -8);
  ctx.lineTo(7, -11);
  ctx.lineTo(8, -7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = color;
  ellipse(ctx, -2, 1, 4, 3);
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(-11, -3);
  ctx.lineTo(-10, 2);
  ctx.lineTo(-7, 4);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#f5a623';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-2, 7);
  ctx.lineTo(-2, 11);
  ctx.moveTo(2, 7);
  ctx.lineTo(2, 11);
  ctx.stroke();

  if (eye) {
    ctx.fillStyle = '#fff';
    ellipse(ctx, 5, -6, 1.5, 1.5);
    ctx.fillStyle = '#2121de';
    ellipse(ctx, 5.5, -6, 0.7, 0.7);
  }

  ctx.restore();
}

export function drawPlayerSprite(ctx, x, y, direction, color, mouthOpen, sprite) {
  if (sprite === 'dinosaur') {
    drawDinosaur(ctx, x, y, direction, color);
    return;
  }
  if (sprite === 'chicken') {
    drawChicken(ctx, x, y, direction, color);
    return;
  }
  drawPacmanClassic(ctx, x, y, direction, color, mouthOpen);
}

export function drawGhostClassic(ctx, x, y, direction, color, { eaten = false } = {}) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - 2, 9, Math.PI, 0);
  ctx.lineTo(x + 9, y + 7);
  for (let i = 0; i < 3; i++) {
    const waveX = x + 9 - i * 6;
    ctx.lineTo(waveX - 3, y + 4);
    ctx.lineTo(waveX - 6, y + 7);
  }
  ctx.lineTo(x - 9, y + 7);
  ctx.closePath();
  ctx.fill();

  if (!eaten) {
    const eyeOffsetX = (direction?.x || 0) * 2;
    const eyeOffsetY = (direction?.y || 0) * 2;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 4 + eyeOffsetX, y - 3 + eyeOffsetY, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 4 + eyeOffsetX, y - 3 + eyeOffsetY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2121de';
    ctx.beginPath();
    ctx.arc(x - 4 + eyeOffsetX + (direction?.x || 0) * 1.5, y - 3 + eyeOffsetY + (direction?.y || 0) * 1.5, 1.5, 0, Math.PI * 2);
    ctx.arc(x + 4 + eyeOffsetX + (direction?.x || 0) * 1.5, y - 3 + eyeOffsetY + (direction?.y || 0) * 1.5, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawGhostSprite(ctx, x, y, direction, color, sprite, { eaten = false } = {}) {
  if (eaten) {
    drawGhostClassic(ctx, x, y, direction, color, { eaten: true });
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x - 3, y - 2, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (sprite === 'dinosaur') {
    drawDinosaur(ctx, x, y, direction, color);
    return;
  }
  if (sprite === 'chicken') {
    drawChicken(ctx, x, y, direction, color);
    return;
  }
  drawGhostClassic(ctx, x, y, direction, color, { eaten });
}

export function drawSpritePreview(canvas, kind, sprite, color, direction = { x: 1, y: 0, angle: 0 }) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const x = canvas.width / 2;
  const y = canvas.height / 2;
  if (kind === 'player') {
    drawPlayerSprite(ctx, x, y, direction, color, true, sprite);
  } else {
    drawGhostSprite(ctx, x, y, direction, color, sprite);
  }
}
