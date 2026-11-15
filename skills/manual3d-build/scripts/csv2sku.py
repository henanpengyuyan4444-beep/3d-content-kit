#!/usr/bin/env python3
"""把客户填的两张表（零件表 + 步骤表）合成一份 SKU JSON。

用法:
    python csv2sku.py parts.csv steps.csv --slug demo-bookcase --name "示例书柜" \
        --size 800x2020x280 [--out demo.json] [--pages 6,7,7,8]

零件表列名（中文或英文都认）:
    id, 名称/name, 宽mm/w, 高mm/h, 深mm/d, 中心x/x, 中心y/y, 中心z/z, 材质/material

步骤表列名:
    序号, 标题, 说明, 装的零件id, 五金类型, 五金数量, 工具, 备注

五金类型可写中文：木榫 / 偏心螺丝 / 偏心轮 / 钉子 / 搁板托 / 墙固定件 / 螺丝
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path


def norm(s: str) -> str:
    return (s or "").strip().lower().replace(" ", "")


PART_KEYS = {
    "id": ["id"],
    "name": ["名称", "name"],
    "w": ["宽mm", "宽", "w", "width"],
    "h": ["高mm", "高", "h", "height"],
    "d": ["深mm", "深", "d", "depth"],
    "x": ["中心x", "x", "posx"],
    "y": ["中心y", "y", "posy"],
    "z": ["中心z", "z", "posz"],
    "material": ["材质", "material"],
}

STEP_KEYS = {
    "n": ["序号", "n", "step"],
    "title": ["标题", "title"],
    "detail": ["说明", "detail"],
    "add": ["装的零件id", "装的零件", "add", "parts"],
    "hw": ["五金类型", "五金", "hardware"],
    "hwqty": ["五金数量", "数量", "qty"],
    "tools": ["工具", "tools"],
}

HW_MAP = {
    "木榫": "dowel",
    "偏心螺丝": "camScrew",
    "偏心轮": "cam",
    "钉子": "nail",
    "搁板托": "pin",
    "墙固定件": "bracket",
    "螺丝": "screw",
    "螺栓": "bolt",
}


def pick(row: dict, keys: list[str]) -> str:
    for k, v in row.items():
        if norm(k) in [norm(x) for x in keys]:
            return (v or "").strip()
    return ""


def num(v: str, field: str, where: str) -> float:
    try:
        return float(str(v).replace("mm", "").strip())
    except Exception:
        raise SystemExit(f"{where} 的 {field} 不是数字: {v!r}")


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    parts_csv, steps_csv = Path(sys.argv[1]), Path(sys.argv[2])
    args = sys.argv[3:]

    def flag(name: str, default: str | None = None) -> str | None:
        if name in args:
            i = args.index(name)
            return args[i + 1] if i + 1 < len(args) else default
        return default

    slug = flag("--slug") or "sku"
    name = flag("--name") or slug
    size = flag("--size") or ""
    out = flag("--out") or f"{slug}.json"
    pages = flag("--pages") or ""

    if "x" not in size:
        print("需要 --size 宽x高x深（毫米），例如 --size 800x2020x280")
        return 2
    try:
        sw, sh, sd = [float(x) for x in size.lower().replace("*", "x").split("x")]
    except Exception:
        print("--size 格式不对，应写成 800x2020x280")
        return 2

    # 零件
    parts = []
    with parts_csv.open(encoding="utf-8-sig", newline="") as f:
        for i, row in enumerate(csv.DictReader(f), start=2):
            pid = pick(row, PART_KEYS["id"])
            pname = pick(row, PART_KEYS["name"])
            if not pid and not pname:
                continue
            where = f"零件表第 {i} 行"
            parts.append(
                {
                    "id": pid or f"P{len(parts)+1}",
                    "name": pname or pid,
                    "size": [
                        num(pick(row, PART_KEYS["w"]), "宽", where),
                        num(pick(row, PART_KEYS["h"]), "高", where),
                        num(pick(row, PART_KEYS["d"]), "深", where),
                    ],
                    "pos": [
                        num(pick(row, PART_KEYS["x"]), "中心x", where),
                        num(pick(row, PART_KEYS["y"]), "中心y", where),
                        num(pick(row, PART_KEYS["z"]), "中心z", where),
                    ],
                    "material": pick(row, PART_KEYS["material"]) or "board",
                }
            )
    if not parts:
        print("零件表是空的")
        return 2

    # 步骤
    steps = []
    with steps_csv.open(encoding="utf-8-sig", newline="") as f:
        for i, row in enumerate(csv.DictReader(f), start=2):
            title = pick(row, STEP_KEYS["title"])
            if not title:
                continue
            add = [x.strip() for x in pick(row, STEP_KEYS["add"]).replace("，", ",").split(",") if x.strip()]
            hw_name = pick(row, STEP_KEYS["hw"])
            hw_qty = pick(row, STEP_KEYS["hwqty"])
            step = {"title": title}
            detail = pick(row, STEP_KEYS["detail"])
            if detail:
                step["detail"] = detail
            if add:
                step["add"] = add
            if hw_name:
                kind = HW_MAP.get(hw_name.strip(), hw_name.strip())
                fix = {"kind": kind, "count": int(float(hw_qty or 1))}
                if add:
                    fix["to"] = add
                step["fix"] = [fix]
            tools = [t.strip() for t in pick(row, STEP_KEYS["tools"]).replace("，", ",").split(",") if t.strip()]
            if tools:
                step["tools"] = tools
            steps.append(step)
    if not steps:
        print("步骤表是空的")
        return 2

    # 页映射（可选）：--pages 6,7,7,8 每步一个页码
    step_pages = []
    if pages:
        nums = [int(x) for x in pages.replace("，", ",").split(",") if x.strip()]
        for i in range(len(steps)):
            step_pages.append({"page": nums[i]} if i < len(nums) and nums[i] > 0 else None)

    sku = {
        "slug": slug,
        "brand": "",
        "name": name,
        "size": {"w": sw, "h": sh, "d": sd},
        "expected": {"verticalQty": 2},
        "parts": parts,
        "steps": steps,
    }
    if step_pages:
        sku["stepPages"] = step_pages

    Path(out).write_text(json.dumps(sku, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成 {out}：{len(parts)} 块零件，{len(steps)} 步")
    print("下一步: python check_sku.py " + out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
