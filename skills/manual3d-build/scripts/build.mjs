#!/usr/bin/env node
/**
 * 把一份 SKU JSON 编译成一间能打开的 3D 说明书。
 *
 *   node scripts/build.mjs fixtures/demo-sku.json [--out dist]
 *
 * 单配置：{ slug, name, size, parts, steps, stepPages }
 * 多配置：{ slug, name, configs: [{ id, label, size, parts, steps, stepPages }] }
 *   多配置会为每个配置生成一个子目录，并在根目录生成选择页。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(here, "..");
const engineDir = path.join(skillRoot, "engine");

const args = process.argv.slice(2);
const jsonPath = args.find((a) => !a.startsWith("--"));
const outFlag = args.indexOf("--out");
const outRoot = outFlag >= 0 ? args[outFlag + 1] : path.join(process.cwd(), "dist");

if (!jsonPath) {
  console.error("用法: node scripts/build.mjs <sku.json> [--out dist]");
  process.exit(2);
}

const rawText = fs.readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, "");
let root;
try {
  root = JSON.parse(rawText);
} catch (e) {
  console.error("SKU JSON 解析失败: " + e.message);
  process.exit(2);
}

const HW = {
  dowel: "dowel",
  camScrew: "camscrew",
  cam: "cam",
  nail: "nail",
  pin: "support",
  screw: "screw",
  bolt: "screw",
  legScrew: "screw",
  bracket: "bracket",
};
const HW_NAME = {
  dowel: "木榫",
  camscrew: "偏心螺丝",
  cam: "偏心轮",
  support: "搁板托",
  nail: "钉子",
  screw: "螺丝",
  bracket: "墙固定件",
};

const mm = (v) => Math.round(v) / 1000;

function validate(sku, label) {
  const problems = [];
  const unit = sku.size || {};
  if (!sku.slug) problems.push(`${label}: 缺 slug`);
  if (!sku.name) problems.push(`${label}: 缺 name`);
  if (!(unit.w > 0 && unit.h > 0 && unit.d > 0)) problems.push(`${label}: size 需要 w/h/d（毫米）`);
  if (!Array.isArray(sku.parts) || !sku.parts.length) problems.push(`${label}: parts 为空`);
  if (!Array.isArray(sku.steps) || !sku.steps.length) problems.push(`${label}: steps 为空`);
  const ids = new Set((sku.parts || []).map((p) => p.id));
  for (const p of sku.parts || []) {
    if ((p.size || []).length !== 3 || p.size.some((n) => !(n > 0))) problems.push(`${label}: 零件 ${p.id} 尺寸不合法`);
    if (!Array.isArray(p.pos) || p.pos.length !== 3) problems.push(`${label}: 零件 ${p.id} 缺 pos`);
  }
  for (const s of sku.steps || []) {
    for (const id of s.add || []) if (!ids.has(id)) problems.push(`${label}: 步骤「${s.title}」引用了不存在的零件 ${id}`);
  }
  return problems;
}

function buildOne(sku, outDir) {
  const unit = sku.size || {};
  const center = [0, unit.h / 2, 0];

  const parts = sku.parts.map((p) => {
    const pos = p.pos;
    let dx = pos[0] - center[0];
    let dy = pos[1] - center[1];
    let dz = pos[2] - center[2];
    const len = Math.hypot(dx, dy, dz);
    if (len < 1) {
      dx = 0;
      dy = 0;
      dz = 1;
    } else {
      dx /= len;
      dy /= len;
      dz /= len;
    }
    const spread = 0.1 + Math.min(0.06, (p.size[0] + p.size[1]) / 30000);
    return {
      id: p.id,
      name: p.name,
      dims: [mm(p.size[0]), mm(p.size[1]), mm(p.size[2])],
      at: [mm(pos[0]), mm(pos[1]), mm(pos[2])],
      explode: [dx * spread, dy * spread, dz * spread],
      ...(p.material === "fiber" ? { back: true, color: 0xdfd9cd } : {}),
    };
  });

  const ids = new Set(parts.map((p) => p.id));
  const steps = sku.steps.map((s, i) => {
    const hardware = [];
    for (const f of s.fix || []) {
      const type = HW[f.kind];
      if (!type) {
        console.warn(`未识别的五金类型「${f.kind}」，已跳过（可加进 build.mjs 的 HW 映射）`);
        continue;
      }
      const hosts = (f.to && f.to.length ? f.to : (s.add || []).slice(0, 1)).filter((id) => ids.has(id));
      if (!hosts.length) continue;
      const per = Math.max(1, Math.round((f.count || 1) / hosts.length));
      for (const host of hosts) hardware.push({ type, host, count: per });
    }
    const page = (sku.stepPages || [])[i];
    const ref = page && page.file ? `manual-pages/${path.basename(page.file)}` : page && page.src ? page.src : undefined;
    const refPage = page && page.page ? page.page : undefined;
    return {
      n: i + 1,
      title: s.title,
      text: s.detail || "",
      hardware,
      added: s.add || [],
      ...(ref ? { ref, ...(refPage ? { refPage } : {}) } : {}),
      ...((s.warnings || []).some((w) => w === "wall" || w === "tip") ? { warn: true } : {}),
    };
  });

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(outDir, "data"), { recursive: true });
  fs.cpSync(engineDir, outDir, { recursive: true });

  const pages = (sku.stepPages || []).filter((p) => p && p.file);
  if (pages.length) {
    fs.mkdirSync(path.join(outDir, "manual-pages"), { recursive: true });
    for (const p of pages) {
      const from = path.resolve(path.dirname(jsonPath), p.file);
      if (!fs.existsSync(from)) {
        console.warn("页图不存在，跳过: " + p.file);
        continue;
      }
      fs.copyFileSync(from, path.join(outDir, "manual-pages", path.basename(p.file)));
    }
  }

  const usedHw = new Set(steps.flatMap((s) => s.hardware.map((h) => h.type)));
  const hardwareCatalog = Object.fromEntries(
    [...usedHw].map((t) => [
      t,
      { name: HW_NAME[t], no: "", qty: steps.reduce((n, s) => n + s.hardware.filter((h) => h.type === t).length, 0) },
    ]),
  );

  const data = {
    id: sku.slug,
    sku: sku.name,
    brand: sku.brand || "",
    title: sku.name,
    subtitle: [sku.brand, unit.w + "×" + unit.h + "×" + unit.d + " 毫米"].filter(Boolean).join(" · "),
    source: { name: sku.source || "客户提供的手册", url: "" },
    product: { w: mm(unit.w), d: mm(unit.d), h: mm(unit.h) },
    camera: { pos: [1.45, 1.62, 1.95], target: [0, unit.h / 2000, 0] },
    parts,
    hardwareCatalog,
    tools: sku.tools || ["十字螺丝刀", "锤子"],
    steps,
  };

  fs.writeFileSync(
    path.join(outDir, "data", "sku.js"),
    'window.MANUALS = window.MANUALS || {};\nwindow.MANUALS["main"] = ' + JSON.stringify(data, null, 2) + ";\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(outDir, "打开说明.txt"),
    [
      "双击 index.html 即可观看，无需联网、无需服务器。",
      "",
      "产品：" + sku.name,
      "步骤：" + steps.length + " 步",
      "零件：" + parts.length + " 块",
      "",
      "快捷键：← → 切换步骤，空格自动播放，拖动旋转。",
      "改文案：编辑 data/sku.js 里对应步骤的 title / text，刷新即可。",
    ].join("\n"),
    "utf8",
  );

  return { parts: parts.length, steps: steps.length, pages: pages.length };
}

/* ---------- 调度 ---------- */
const slug = root.slug;
if (!slug) {
  console.error("缺 slug");
  process.exit(2);
}
const outDir = path.join(outRoot, slug);
const configs = Array.isArray(root.configs) && root.configs.length ? root.configs : null;

const all = configs ? configs.map((c) => ({ ...root, ...c, configs: undefined })) : [root];
const problems = all.flatMap((s) => validate(s, configs ? (s.label || s.id) : "sku"));
if (problems.length) {
  console.error("还不能生成：");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}

if (!configs) {
  const r = buildOne(root, outDir);
  console.log(`已生成: ${path.join(outDir, "index.html")}`);
  console.log(`  产品 ${root.name}，${r.parts} 块零件，${r.steps} 步，页图 ${r.pages} 张`);
  console.log("双击 index.html 就能看。");
  process.exit(0);
}

fs.rmSync(outDir, { recursive: true, force: true });
const results = [];
for (const c of all) {
  const dir = path.join(outDir, c.slug);
  const r = buildOne(c, dir);
  results.push({ ...r, id: c.slug, label: c.label || c.slug });
  console.log(`  配置 ${c.label || c.slug} -> ${c.slug}/ （${r.parts} 块 / ${r.steps} 步）`);
}

const cards = results
  .map(
    (r) =>
      `<a class="card" href="${r.id}/index.html"><b>${r.label}</b><span>${r.parts} 块零件 · ${r.steps} 步</span></a>`,
  )
  .join("\n");
fs.writeFileSync(
  path.join(outDir, "index.html"),
  `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${root.name} · 选择配置</title>
<style>body{font-family:system-ui,"Microsoft YaHei";background:#f4f0e9;color:#241f19;margin:0;padding:40px 20px}
h1{font-size:22px;margin:0 0 6px}p{color:#6b6459;margin:0 0 24px}
.grid{display:grid;gap:12px;max-width:720px}.card{display:block;padding:18px 20px;border:1px solid #e4dcce;border-radius:14px;background:#fff;text-decoration:none;color:inherit;box-shadow:0 6px 18px rgb(0 0 0/6%)}
.card b{display:block;font-size:16px;margin-bottom:4px}.card span{font-size:12px;color:#8b8272}</style></head>
<body><h1>${root.name}</h1><p>选一个配置查看 3D 装配演示</p><div class="grid">${cards}</div></body></html>`,
  "utf8",
);
console.log(`多配置: ${results.length} 个，选择页 ${path.join(outDir, "index.html")}`);
