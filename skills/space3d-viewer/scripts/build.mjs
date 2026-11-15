#!/usr/bin/env node
/**
 * 把一张全景图 + 一份热点表编译成"可点的 3D 看店"页面。
 *
 *   node scripts/build.mjs fixtures/cafe/space.json [--out dist]
 *
 * space.json: { slug, name, pano, yawOffset?, hotspots: [{ label, yaw, pitch, desc?, price? }] }
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.resolve(here, "..", "engine");

const args = process.argv.slice(2);
const jsonPath = args.find((a) => !a.startsWith("--"));
const outFlag = args.indexOf("--out");
const outRoot = outFlag >= 0 ? args[outFlag + 1] : path.join(process.cwd(), "dist");

if (!jsonPath) {
  console.error("用法: node scripts/build.mjs <space.json> [--out dist]");
  process.exit(2);
}

const base = path.dirname(path.resolve(jsonPath));
const raw = fs.readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, "");
let space;
try {
  space = JSON.parse(raw);
} catch (e) {
  console.error("space.json 解析失败: " + e.message);
  process.exit(2);
}

const problems = [];
if (!space.slug) problems.push("缺 slug");
if (!space.name) problems.push("缺 name");
if (!space.pano) problems.push("缺 pano（全景文件名）");
if (!Array.isArray(space.hotspots) || !space.hotspots.length) problems.push("hotspots 为空");
for (const h of space.hotspots || []) {
  if (!h.label) problems.push("有热点缺 label");
  if (typeof h.yaw !== "number" || typeof h.pitch !== "number") problems.push(`热点「${h.label}」缺 yaw/pitch`);
}
const panoPath = path.join(base, space.pano);
if (!fs.existsSync(panoPath)) problems.push("全景图不存在: " + space.pano);

if (problems.length) {
  console.error("还不能生成：");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

const outDir = path.join(outRoot, space.slug);
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, "data"), { recursive: true });
fs.cpSync(engineDir, outDir, { recursive: true });
fs.copyFileSync(panoPath, path.join(outDir, "pano.jpg"));

// 全景图以内联 data URL 的形式写进数据：file:// 下 WebGL 纹理不许读本地文件（CORS），
// 内联后双击就能看，不需要起服务器。
const b64 = fs.readFileSync(panoPath).toString("base64");
const mime = /\.png$/i.test(panoPath) ? "image/png" : "image/jpeg";
const panoUrl = `data:${mime};base64,${b64}`;
if (b64.length > 8_000_000) console.warn("全景图偏大（>6MB），内联后页面会很重，建议先压到 4096 宽以内");

const data = {
  name: space.name,
  pano: panoUrl,
  yawOffset: space.yawOffset || 0,
  hotspots: (space.hotspots || []).map((h) => ({
    label: h.label,
    yaw: h.yaw,
    pitch: h.pitch,
    ...(h.desc ? { desc: h.desc } : {}),
    ...(h.price ? { price: h.price } : {}),
  })),
};
fs.writeFileSync(
  path.join(outDir, "data", "space.js"),
  "window.SPACE = " + JSON.stringify(data, null, 2) + ";\n",
  "utf8",
);
fs.writeFileSync(
  path.join(outDir, "打开说明.txt"),
  [
    "双击 index.html 即可观看，无需联网、无需服务器。",
    "",
    "空间：" + space.name,
    "热点：" + data.hotspots.length + " 个",
    "",
    "拖动看四周，点亮点看详情。热点位置如需微调，改 data/space.js 里的 yaw / pitch。",
  ].join("\n"),
  "utf8",
);

console.log(`已生成: ${path.join(outDir, "index.html")}`);
console.log(`  ${space.name}，${data.hotspots.length} 个热点`);
console.log("双击 index.html 就能看。");
