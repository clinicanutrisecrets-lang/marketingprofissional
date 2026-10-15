// ---- Marca: ?primaria=%23HEX&secundaria=%23HEX&logo=URL (ou window.SCANNER_BRAND) ----
const hex2rgb = (h) => { h = String(h || '').replace('#', '').trim(); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); const n = parseInt(h, 16); return /^[0-9a-fA-F]{6}$/.test(h) ? [n >> 16 & 255, n >> 8 & 255, n & 255] : null; };
const rgb2hex = (r) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mixc = (a, b, t) => rgb2hex(hex2rgb(a).map((v, i) => v + (hex2rgb(b)[i] - v) * t));
const lum = (h) => { const c = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrastW = (h) => 1.05 / (lum(h) + 0.05);
const darkUntil = (h, target) => { let t = 0, c = h; while (contrastW(c) < target && t < 0.9) { t += 0.04; c = mixc(h, '#000000', t); } return c; };
const QS = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
const EXT = window.SCANNER_BRAND || {};
const BRAND_DEFAULT = { primaria: COL.tiff, secundaria: COL.purple, logo: (window.__resources && window.__resources.logo) || 'assets/logo-sem-fundo.png', nome: 'Scanner da Saúde' };
const BRAND = {
  primaria: hex2rgb(QS.get('primaria') || EXT.primaria) ? '#' + String(QS.get('primaria') || EXT.primaria).replace('#', '') : null,
  secundaria: hex2rgb(QS.get('secundaria') || EXT.secundaria) ? '#' + String(QS.get('secundaria') || EXT.secundaria).replace('#', '') : null,
  logo: QS.get('logo') || EXT.logo || null,
  nome: QS.get('nome') || EXT.nome || null,
};
function applyBrand(p, s2) {
  const P = hex2rgb(p) ? p : BRAND_DEFAULT.primaria, S = hex2rgb(s2) ? s2 : BRAND_DEFAULT.secundaria;
  Object.assign(COL, {
    tiff: P, tiffFill: darkUntil(P, 2.6), tiffD: darkUntil(P, 4.5), tiffL: mixc(P, '#FFFFFF', 0.5), tiff50: mixc(P, '#FFFFFF', 0.9),
    purple: S, purpleFill: darkUntil(S, 3.2), purpleD: darkUntil(mixc(S, '#000000', 0.25), 4.5), purpleL: mixc(S, '#FFFFFF', 0.5), purple50: mixc(S, '#FFFFFF', 0.92), purple100: mixc(S, '#FFFFFF', 0.8),
  });
  BASE.C = COL.tiff; BASE.G = COL.purple;
}
