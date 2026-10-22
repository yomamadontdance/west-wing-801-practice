/**
 * Original medieval-fantasy avatars (self-drawn inline SVG; no real people,
 * no characters, no official artwork). Shared by browser and server (ids only).
 */
const G = "#d9b36a", S = "#cfd6dc", D = "#1b1b1b";
const A = [
  ["wolf", "Wolf", "#4b5a66", `<path d="M10 30 L12 12 L17 18 L23 18 L28 12 L30 30 L20 34 Z" fill="${S}"/><circle cx="16" cy="23" r="1.6" fill="${D}"/><circle cx="24" cy="23" r="1.6" fill="${D}"/><path d="M18 29 L22 29 L20 31 Z" fill="${D}"/>`],
  ["winterwolf", "Winter Wolf", "#2d5d7a", `<path d="M10 30 L12 12 L17 18 L23 18 L28 12 L30 30 L20 34 Z" fill="#f4f8fb"/><circle cx="16" cy="23" r="1.6" fill="#3aa0e0"/><circle cx="24" cy="23" r="1.6" fill="#3aa0e0"/><path d="M18 29 L22 29 L20 31 Z" fill="${D}"/>`],
  ["lion", "Lion", "#8a2a2a", `<circle cx="20" cy="21" r="12" fill="#c4782a"/><circle cx="20" cy="22" r="7.5" fill="${G}"/><circle cx="17.5" cy="20.5" r="1.2" fill="${D}"/><circle cx="22.5" cy="20.5" r="1.2" fill="${D}"/><path d="M18.5 25 L21.5 25 L20 26.6 Z" fill="${D}"/>`],
  ["dragon", "Dragon", "#3a1d1d", `<path d="M8 28 C10 16 18 10 30 10 L26 15 L32 16 L25 19 C28 22 27 28 22 30 C18 32 12 31 8 28 Z" fill="#c0392b"/><circle cx="24" cy="15.5" r="1.3" fill="#ffd34d"/><path d="M14 25 L10 18 L17 22 Z" fill="#7d1f16"/>`],
  ["stag", "Stag", "#5a4a1e", `<path d="M15 14 L12 6 M12 9 L9 7 M15 14 L14 8 M25 14 L28 6 M28 9 L31 7 M25 14 L26 8" stroke="${G}" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M14 15 L26 15 L23 31 L17 31 Z" fill="#a8743a"/><circle cx="17.5" cy="20" r="1.2" fill="${D}"/><circle cx="22.5" cy="20" r="1.2" fill="${D}"/>`],
  ["kraken", "Kraken", "#1f3b4a", `<ellipse cx="20" cy="15" rx="8" ry="7" fill="#7e5aa8"/><path d="M13 19 C10 26 14 30 11 33 M17 21 C16 28 19 30 17 34 M23 21 C24 28 21 30 23 34 M27 19 C30 26 26 30 29 33" stroke="#7e5aa8" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="17" cy="15" r="1.3" fill="#ffd34d"/><circle cx="23" cy="15" r="1.3" fill="#ffd34d"/>`],
  ["raven", "Raven", "#3b3f4a", `<path d="M9 24 C12 14 22 11 28 15 L33 16 L28 19 C27 26 20 30 12 29 Z" fill="${D}"/><circle cx="26" cy="16" r="1.1" fill="#e8e8e8"/><path d="M14 29 L12 33 M18 29 L18 33" stroke="${D}" stroke-width="1.6"/>`],
  ["crown", "Crown", "#3d2a5c", `<path d="M9 27 L10 14 L15 20 L20 11 L25 20 L30 14 L31 27 Z" fill="${G}"/><rect x="9" y="27" width="22" height="4" rx="1" fill="#b38b3a"/><circle cx="20" cy="22" r="1.8" fill="#c0392b"/><circle cx="14" cy="24" r="1.3" fill="#2e86de"/><circle cx="26" cy="24" r="1.3" fill="#27ae60"/>`],
  ["throne", "Throne", "#2b2b30", `<path d="M12 8 L14 12 L16 7 L18 12 L20 6 L22 12 L24 7 L26 12 L28 8 L28 24 L12 24 Z" fill="#8f979e"/><rect x="11" y="23" width="18" height="4" fill="#6c737a"/><path d="M12 27 L12 33 M28 27 L28 33" stroke="#6c737a" stroke-width="2.5"/><rect x="16" y="14" width="8" height="9" fill="#5a2a2a"/>`],
  ["knight", "Hooded Knight", "#2f3a2f", `<path d="M10 33 C10 20 13 9 20 9 C27 9 30 20 30 33 Z" fill="#3c4a3c"/><ellipse cx="20" cy="21" rx="6" ry="7" fill="${D}"/><circle cx="17.8" cy="20" r="1" fill="#e6e6e6"/><circle cx="22.2" cy="20" r="1" fill="#e6e6e6"/>`],
  ["castle", "Castle", "#2a4058", `<path d="M8 32 L8 15 L11 15 L11 18 L14 18 L14 15 L17 15 L17 12 L20 9 L23 12 L23 15 L26 15 L26 18 L29 18 L29 15 L32 15 L32 32 Z" fill="#9aa4ad"/><path d="M17 32 L17 25 C17 21 23 21 23 25 L23 32 Z" fill="#3b2a1a"/>`],
  ["sword", "Sword", "#402828", `<path d="M20 5 L22.5 9 L22.5 25 L17.5 25 L17.5 9 Z" fill="${S}"/><rect x="12" y="25" width="16" height="3" rx="1.2" fill="${G}"/><rect x="18.5" y="28" width="3" height="6" fill="#6b3a1e"/><circle cx="20" cy="35" r="1.8" fill="${G}"/>`],
  ["helm", "Helm", "#3a3a3a", `<path d="M10 30 L10 19 C10 11 30 11 30 19 L30 30 Z" fill="#9aa4ad"/><rect x="12" y="20" width="16" height="3" fill="${D}"/><rect x="19" y="23" width="2" height="7" fill="${D}"/><path d="M20 6 L22 12 L18 12 Z" fill="#c0392b"/>`],
  ["fire", "Fire", "#3a1a0a", `<path d="M20 5 C26 13 30 17 29 24 C28 31 23 34 20 34 C16 34 11 31 11 24 C11 19 15 16 16 11 C18 15 19 16 20 17 C21 13 21 9 20 5 Z" fill="#e8591c"/><path d="M20 18 C24 23 25 26 24 29 C23 32 17 32 16 29 C15 26 18 23 20 18 Z" fill="#ffd34d"/>`],
  ["ice", "Ice", "#173a4f", `<path d="M20 5 L27 14 L24 34 L16 34 L13 14 Z" fill="#9fdcf5"/><path d="M20 5 L20 34 M13 14 L27 14" stroke="#e8f7fd" stroke-width="1.2"/><path d="M16 34 L20 14 L24 34" stroke="#5fb6dc" stroke-width="1" fill="none"/>`],
  ["shield", "Shield", "#24404a", `<path d="M10 9 L30 9 L30 20 C30 27 25 31 20 34 C15 31 10 27 10 20 Z" fill="#7a2a2a" stroke="${G}" stroke-width="2"/><path d="M20 12 L20 31 M12 19 L28 19" stroke="${G}" stroke-width="2"/>`],
  ["goblet", "Goblet", "#3a2f1a", `<path d="M12 8 L28 8 C28 18 24 21 20 21 C16 21 12 18 12 8 Z" fill="${G}"/><path d="M13 10 L27 10 C27 14 25 16 20 16 C15 16 13 14 13 10 Z" fill="#7d1f2f"/><rect x="19" y="21" width="2" height="8" fill="${G}"/><rect x="14" y="29" width="12" height="3" rx="1" fill="${G}"/>`],
];
export const AVATARS = A.map(([id, label, bg, art]) => ({ id, label, bg, art }));
export const AVATAR_IDS = AVATARS.map((a) => a.id);
export const isAvatarId = (id) => AVATAR_IDS.includes(id);
const PALETTE = ["#8a2a2a", "#2a5c8a", "#2a7a4a", "#6a3a8a", "#8a6a1a", "#1a6a6a", "#7a3a5a", "#4a5a2a"];
export function initials(name) {
  const w = String(name || "?").trim().split(/[\s_.-]+/).filter(Boolean);
  return ((w[0]?.[0] || "?") + (w.length > 1 ? w[1][0] : (w[0]?.[1] || ""))).toUpperCase();
}
function hue(name) { let h = 0; for (const c of String(name || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
/** Inline SVG for an avatar id, or initials in a coloured circle when none/unknown. */
export function avatarSvg(id, name, size = 22) {
  const a = AVATARS.find((x) => x.id === id);
  const open = `<svg class="av" width="${size}" height="${size}" viewBox="0 0 40 40" aria-hidden="true">`;
  if (a) return `${open}<circle cx="20" cy="20" r="20" fill="${a.bg}"/>${a.art}</svg>`;
  return `${open}<circle cx="20" cy="20" r="20" fill="${hue(name)}"/><text x="20" y="25.5" text-anchor="middle" font-size="15" font-weight="700" font-family="system-ui,sans-serif" fill="#fff">${esc(initials(name))}</text></svg>`;
}
export function avatarLabel(id) { return AVATARS.find((x) => x.id === id)?.label || "Initials"; }

/**
 * Browser only: square-crop, resize to 128x128 and re-encode a picked image.
 * Re-encoding through a canvas drops all EXIF/GPS metadata. Returns a data URL <= ~50 KB.
 */
export async function pictureToAvatar(file, maxBytes = 50 * 1024) {
  if (!file || !/^image\//.test(file.type)) throw new Error("Pick an image file.");
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bmp) throw new Error("Could not read that picture.");
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 128, 128);
  bmp.close?.();
  const bytes = (u) => Math.floor((u.length - u.indexOf(",") - 1) * 3 / 4);
  for (const type of ["image/webp", "image/jpeg"]) {
    for (let q = 0.85; q >= 0.35; q -= 0.1) {
      const u = c.toDataURL(type, q);
      if (!u.startsWith(`data:${type}`)) break; // browser can't encode this type
      if (bytes(u) <= maxBytes) return u;
    }
  }
  throw new Error("Picture too large after compression.");
}
/** HTML for any avatar value: emblem id, uploaded picture (data URL or /pic URL), or initials. */
export function avatarHTML(value, name, size = 22, picUrl = null) {
  const v = String(value || "");
  const src = v.startsWith("data:image/") ? v : (v.startsWith("pic:") && picUrl ? picUrl(v.slice(4)) : "");
  if (src) return `<img class="av av-pic" src="${esc(src)}" width="${size}" height="${size}" alt="">`;
  return avatarSvg(v, name, size);
}
