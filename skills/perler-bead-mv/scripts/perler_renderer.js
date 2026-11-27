// Reusable Glossy Plastic Perler-Bead & White Die-Cut Sticker Renderer (Browser Canvas2D)
// Drop directly into any Perler-bead MV or 4K sticker sheet project!

(function (global) {
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbStr(r, g, b) { return `rgb(${r},${g},${b})`; }
  function shadeHex(hex, factor) {
    const [r, g, b] = hexToRgb(hex);
    const c = v => Math.max(0, Math.min(255, Math.round(v)));
    return rgbStr(c(r * factor), c(g * factor), c(b * factor));
  }
  function tintHex(hex, amount) {
    const [r, g, b] = hexToRgb(hex);
    const c = v => Math.max(0, Math.min(255, Math.round(v)));
    return rgbStr(c(r + (255 - r) * amount), c(g + (255 - g) * amount), c(b + (255 - b) * amount));
  }

  // Draws one tactile plastic Perler bead: radial shine + center pinhole + upper-left specular dot
  function drawBead(ctx, cx, cy, size, hex, alpha = 1) {
    if (!hex) return;
    const r = size * 0.485;
    const [cr, cg, cb] = hexToRgb(hex);
    const lum = (cr * 0.299 + cg * 0.587 + cb * 0.114) / 255;

    ctx.save();
    if (alpha < 1) ctx.globalAlpha = alpha;

    const grad = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.28, r * 0.12, cx, cy, r);
    if (lum < 0.22) {
      grad.addColorStop(0, tintHex(hex, 0.30));
      grad.addColorStop(0.55, hex);
      grad.addColorStop(1, '#0C0A10');
    } else {
      grad.addColorStop(0, tintHex(hex, 0.38));
      grad.addColorStop(0.62, hex);
      grad.addColorStop(1, shadeHex(hex, 0.78));
    }
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();

    ctx.lineWidth = Math.max(0.5, size * 0.045);
    ctx.strokeStyle = lum < 0.22 ? 'rgba(255,255,255,0.14)' : 'rgba(60,40,60,0.16)';
    ctx.stroke();

    // Signature Perler center pinhole
    const holeR = r * 0.31;
    ctx.beginPath(); ctx.arc(cx, cy, holeR, 0, Math.PI * 2);
    if (lum < 0.22) ctx.fillStyle = 'rgba(225, 220, 240, 0.58)';
    else if (lum > 0.88) ctx.fillStyle = 'rgba(165, 170, 190, 0.62)';
    else ctx.fillStyle = shadeHex(hex, 0.52);
    ctx.fill();

    // Glossy plastic specular catchlight
    ctx.beginPath();
    ctx.arc(cx - r * 0.42, cy - r * 0.42, Math.max(0.7, r * 0.14), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();
    ctx.restore();
  }

  const STICKER_CACHE = new Map();

  // Pre-renders a 2D character grid + palette into a cached white die-cut Perler sticker canvas
  function getStickerCanvas(cacheKey, grid, palette, beadSize = 10, options = {}) {
    const { withBorder = true, borderPad = 0.65, shadow = true, dpr = 1.5 } = options;
    const fullKey = `${cacheKey}_${beadSize.toFixed(2)}_${withBorder}_${borderPad}_${shadow}_${dpr}`;
    if (STICKER_CACHE.has(fullKey)) return STICKER_CACHE.get(fullKey);

    const bs = beadSize * dpr;
    const rows = grid.length, cols = grid[0].length;
    const padPx = Math.ceil(bs * 2.2);
    const w = Math.ceil(cols * bs + padPx * 2);
    const h = Math.ceil(rows * bs + padPx * 2);

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');

    if (withBorder) {
      const borderCanvas = document.createElement('canvas');
      borderCanvas.width = w; borderCanvas.height = h;
      const bctx = borderCanvas.getContext('2d');
      bctx.fillStyle = '#FFFFFF';
      const bExpand = bs * borderPad;
      const rad = bs * 0.42;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (!palette[grid[r][c]]) continue;
          bctx.beginPath();
          bctx.roundRect(padPx + c * bs - bExpand, padPx + r * bs - bExpand, bs + bExpand * 2, bs + bExpand * 2, rad);
          bctx.fill();
        }
      }
      ctx.save();
      if (shadow) {
        ctx.shadowColor = 'rgba(75, 38, 90, 0.28)';
        ctx.shadowBlur = Math.max(10, bs * 1.15);
        ctx.shadowOffsetY = Math.max(5, bs * 0.55);
      }
      ctx.drawImage(borderCanvas, 0, 0);
      ctx.restore();
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hex = palette[grid[r][c]];
        if (!hex) continue;
        drawBead(ctx, padPx + (c + 0.5) * bs, padPx + (r + 0.5) * bs, bs, hex);
      }
    }

    const entry = { canvas, w: w / dpr, h: h / dpr, cols, rows, beadSize, padPx: padPx / dpr };
    STICKER_CACHE.set(fullKey, entry);
    return entry;
  }

  // Extracts per-bead local offsets for Boss KO bead-shatter physics bursts
  function extractBeadList(grid, palette, beadSize = 10) {
    const rows = grid.length, cols = grid[0].length;
    const list = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hex = palette[grid[r][c]];
        if (!hex) continue;
        list.push({
          r, c, hex,
          lx: (c - cols / 2 + 0.5) * beadSize,
          ly: (r - rows / 2 + 0.5) * beadSize,
        });
      }
    }
    return list;
  }

  global.PERLER_CORE = { drawBead, getStickerCanvas, extractBeadList };
})(typeof window !== 'undefined' ? window : globalThis);
