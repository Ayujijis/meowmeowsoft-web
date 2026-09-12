const COLOR_KEY = 'pacman-color';
export const DEFAULT_PACMAN_COLOR = '#ffff00';

export function normalizeHex(value) {
  if (typeof value !== 'string') return null;
  const hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toLowerCase()}`;
}

export function loadPacmanColor() {
  return normalizeHex(localStorage.getItem(COLOR_KEY)) || DEFAULT_PACMAN_COLOR;
}

export function savePacmanColor(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return loadPacmanColor();
  localStorage.setItem(COLOR_KEY, normalized);
  return normalized;
}

export function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return { r: 255, g: 255, b: 0 };
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

export function rgbToHex(r, g, b) {
  const toHex = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
}

export function hsvToHex(h, s, v) {
  const { r, g, b } = hsvToRgb(h, s, v);
  return rgbToHex(r, g, b);
}

export class ColorPicker {
  constructor({ wheel, valueSlider, hexInput, preview, errorEl, onChange }) {
    this.wheel = wheel;
    this.valueSlider = valueSlider;
    this.hexInput = hexInput;
    this.preview = preview;
    this.errorEl = errorEl;
    this.onChange = onChange;
    this.ctx = wheel.getContext('2d');
    this.previewCtx = preview.getContext('2d');
    this.radius = wheel.width / 2 - 8;
    this.cx = wheel.width / 2;
    this.cy = wheel.height / 2;
    this.h = 60;
    this.s = 1;
    this.v = 1;
    this.dragging = false;

    this.drawWheel();
    this.bind();
  }

  bind() {
    const pick = (event) => {
      const rect = this.wheel.getBoundingClientRect();
      const scaleX = this.wheel.width / rect.width;
      const scaleY = this.wheel.height / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;
      const dx = x - this.cx;
      const dy = y - this.cy;
      const dist = Math.hypot(dx, dy);
      if (dist > this.radius) return;
      let h = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (h < 0) h += 360;
      this.h = h;
      this.s = dist / this.radius;
      this.commit();
    };

    this.wheel.addEventListener('pointerdown', (event) => {
      this.dragging = true;
      this.wheel.setPointerCapture(event.pointerId);
      pick(event);
    });
    this.wheel.addEventListener('pointermove', (event) => {
      if (this.dragging) pick(event);
    });
    this.wheel.addEventListener('pointerup', () => {
      this.dragging = false;
    });

    this.valueSlider.addEventListener('input', () => {
      this.v = Number(this.valueSlider.value) / 100;
      this.commit();
    });

    this.hexInput.addEventListener('input', () => {
      const hex = normalizeHex(this.hexInput.value);
      if (!hex) {
        this.errorEl.classList.remove('hidden');
        return;
      }
      this.errorEl.classList.add('hidden');
      this.setHex(hex, { skipInput: true });
      this.onChange(hex);
    });
  }

  setHex(hex, { skipInput = false } = {}) {
    const normalized = normalizeHex(hex) || DEFAULT_PACMAN_COLOR;
    const { r, g, b } = hexToRgb(normalized);
    const hsv = rgbToHsv(r, g, b);
    this.h = hsv.h;
    this.s = hsv.s;
    this.v = hsv.v;
    this.valueSlider.value = String(Math.round(this.v * 100));
    if (!skipInput) this.hexInput.value = normalized.toUpperCase();
    this.drawWheel();
    this.drawPreview(normalized);
  }

  commit() {
    const hex = hsvToHex(this.h, this.s, this.v);
    this.hexInput.value = hex.toUpperCase();
    this.errorEl.classList.add('hidden');
    this.drawWheel();
    this.drawPreview(hex);
    this.onChange(hex);
  }

  drawWheel() {
    const { ctx, cx, cy, radius } = this;
    ctx.clearRect(0, 0, this.wheel.width, this.wheel.height);

    const image = ctx.createImageData(this.wheel.width, this.wheel.height);
    const data = image.data;
    for (let y = 0; y < this.wheel.height; y++) {
      for (let x = 0; x < this.wheel.width; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);
        const i = (y * this.wheel.width + x) * 4;
        if (dist > radius) {
          data[i + 3] = 0;
          continue;
        }
        let h = (Math.atan2(dy, dx) * 180) / Math.PI;
        if (h < 0) h += 360;
        const s = dist / radius;
        const { r, g, b } = hsvToRgb(h, s, this.v);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);

    const markerDist = this.s * radius;
    const rad = (this.h * Math.PI) / 180;
    const mx = cx + Math.cos(rad) * markerDist;
    const my = cy + Math.sin(rad) * markerDist;
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(mx, my, 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawPreview(hex) {
    const ctx = this.previewCtx;
    const w = this.preview.width;
    const h = this.preview.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.arc(w / 2, h / 2, 32, 0.25, Math.PI * 2 - 0.25);
    ctx.closePath();
    ctx.fill();
  }
}
