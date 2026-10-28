// Renders public/icons/icon.svg into the PNG sizes iOS and Android need.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // preinstalled globally or via npx
import { readFileSync } from "node:fs";

const svg = readFileSync(new URL("../public/icons/icon.svg", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
const out = [
  ["apple-touch-icon.png", 180, 0], ["icon-192.png", 192, 0], ["icon-512.png", 512, 0], ["icon-512-maskable.png", 512, 0.1],
];
for (const [name, size, pad] of out) {
  await page.setViewportSize({ width: size, height: size });
  const inset = Math.round(size * pad);
  await page.setContent(`<body style="margin:0;background:#0f172a"><div style="padding:${inset}px">${svg.replace("<svg", `<svg width="${size - 2 * inset}" height="${size - 2 * inset}"`)}</div></body>`);
  await page.screenshot({ path: new URL(`../public/icons/${name}`, import.meta.url).pathname, omitBackground: false });
}
await browser.close();
