#!/usr/bin/env python3
"""校验一份装配 SKU 数据，对应 Skill 里的 G1 到 G5。

用法:
    python check_sku.py sku.json

单配置直接校验；多配置（带 configs 数组）逐个校验并汇总。
只用标准库，不联网、不依赖项目代码。退出码 0 全过，1 有硬性不通过。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

VERTICAL_RE = ("侧板", "竖板", "旁板", "立板")
SHELF_RE = ("层板", "搁板", "隔板", "横板", "活动板")


def kind_of(part: dict) -> str:
    name = str(part.get("name", ""))
    size = part.get("size") or [0, 0, 0]
    height = float(size[1]) if len(size) == 3 else 0
    if "背板" in name or "后背" in name:
        return "back"
    if "踢脚" in name:
        return "plinth"
    if "顶板" in name or "台面" in name:
        return "top"
    if "底板" in name or "下板" in name:
        return "bottom"
    if any(k in name for k in VERTICAL_RE):
        return "vertical"
    if height > 800 and any(k in name for k in SHELF_RE):
        return "vertical"
    if any(k in name for k in SHELF_RE):
        return "shelf"
    return "other"


def is_number(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def run_one(data: dict, label: str) -> int:
    parts = data.get("parts") or []
    steps = data.get("steps") or []
    pages = data.get("stepPages") or []
    unit = data.get("size") or {}
    w = float(unit.get("w") or 0)
    h = float(unit.get("h") or 0)
    expected = data.get("expected") or {}
    expected_verticals = expected.get("verticalQty")

    print(f"文件: {label}")
    print(f"产品: {data.get('name') or '(未命名)'}  整机 {unit.get('w')}×{unit.get('h')}×{unit.get('d')} mm")
    checks: list[tuple[str, str, bool, str]] = []

    # G1
    problems = []
    for p in parts:
        pid = p.get("id", "?")
        size = p.get("size") or []
        pos = p.get("pos") or []
        if not str(p.get("name", "")).strip():
            problems.append(f"{pid} 没名字")
        if len(size) != 3 or not all(is_number(x) and x > 0 for x in size):
            problems.append(f"{pid} 尺寸不合法 {size}")
            continue
        if len(pos) != 3 or not all(is_number(x) for x in pos):
            problems.append(f"{pid} 位置不合法 {pos}")
        if w and size[0] > w + 1:
            problems.append(f"{pid} 宽 {size[0]} 超过整机 {w}")
        if h and size[1] > h + 1:
            problems.append(f"{pid} 高 {size[1]} 超过整机 {h}")
    checks.append(("G1", "零件完整、尺寸合法", not problems, "; ".join(problems) or f"{len(parts)} 块板"))

    # G2
    verticals = [p for p in parts if kind_of(p) == "vertical"]
    want = expected_verticals if isinstance(expected_verticals, int) else 2
    checks.append(("G2", "竖板数量", len(verticals) == want, f"计划 {len(verticals)} 块，期望 {want}"))

    # G3
    shelves = [p for p in parts if kind_of(p) == "shelf" and float(p["size"][1]) < 100]
    narrow = [p for p in shelves if w and float(p["size"][0]) < w * 0.8]
    ok3 = (not w) or (not narrow)
    detail3 = "缺少整机宽度，跳过" if not w else f"{len(shelves)} 块层板，窄于整机 80% 的 {len(narrow)} 块"
    checks.append(("G3", "层板没有被劈成两半", ok3, detail3))

    # G4
    ids = {p.get("id") for p in parts}
    used: set[str] = set()
    bad_ids: set[str] = set()
    for s in steps:
        for pid in s.get("add") or []:
            used.add(pid)
            if pid not in ids:
                bad_ids.add(pid)
    unused = sorted(ids - used)
    detail4 = []
    if bad_ids:
        detail4.append("引用了不存在的 id: " + ",".join(sorted(bad_ids)))
    if unused:
        detail4.append("没被任何步骤用到的板: " + ",".join(unused))
    checks.append(("G4", "引用闭合", not bad_ids and not unused, "; ".join(detail4) or "全部对得上"))

    # G5
    require_pages = bool(data.get("requirePages"))
    if not pages and not require_pages:
        checks.append(("G5", "页映射与步数一致", True, "没有提供原页，跳过（不输出对照面板）"))
    else:
        missing_pages = len(steps) - len(pages)
        nulls = sum(1 for x in pages if x is None)
        ok5 = missing_pages <= 0 and (not steps or nulls <= max(1, len(steps) // 3))
        checks.append(("G5", "页映射与步数一致", ok5, f"{len(steps)} 步 / {len(pages)} 条映射，空映射 {nulls} 条"))

    failed = 0
    for cid, title, ok, detail in checks:
        if not ok:
            failed += 1
        print(f"  {'PASS' if ok else 'FAIL'}  {cid}  {title} — {detail}")
    print("  结论: " + ("通过" if failed == 0 else f"{failed} 条不通过"))
    return 0 if failed == 0 else 1


def main() -> int:
    if len(sys.argv) < 2:
        print("用法: python check_sku.py sku.json")
        return 2
    path = Path(sys.argv[1])
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception as e:  # noqa: BLE001
        print(f"读不了 {path}: {e}")
        return 2

    configs = data.get("configs") if isinstance(data.get("configs"), list) else None
    if configs:
        failed = 0
        for c in configs:
            merged = {**data, **c}
            merged.pop("configs", None)
            name = f"{path} :: {c.get('label') or c.get('id') or c.get('slug')}"
            if run_one(merged, name) != 0:
                failed += 1
            print()
        print(f"多配置结论: {len(configs) - failed}/{len(configs)} 通过")
        return 0 if failed == 0 else 1

    code = run_one(data, str(path))
    print()
    print("结论: " + ("全部通过，可以做预览" if code == 0 else "有硬性不通过，先改数据"))
    return code


if __name__ == "__main__":
    sys.exit(main())
