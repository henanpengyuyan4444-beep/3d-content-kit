#!/usr/bin/env python3
"""从页图目录生成一份 SKU 数据骨架。

用法:
    python new_sku.py <页图目录> <slug> [--out sku.json]

生成: 零件占位（两块侧板、顶底板、层板、背板）、页映射、空的步骤列表。
人只需要填尺寸和文案，然后跑 check_sku.py。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def main() -> int:
    if len(sys.argv) < 3:
        print("用法: python new_sku.py <页图目录> <slug> [--out sku.json]")
        return 2
    pages_dir = Path(sys.argv[1])
    slug = sys.argv[2]
    out = Path(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[3] == "--out" else Path(f"{slug}.json")

    if not pages_dir.is_dir():
        print(f"不是目录: {pages_dir}")
        return 2

    pages = sorted(p for p in pages_dir.iterdir() if p.suffix.lower() in EXTS)
    if not pages:
        print(f"{pages_dir} 里没有图片")
        return 2

    skeleton = {
        "slug": slug,
        "brand": "",
        "name": "",
        "size": {"w": 0, "h": 0, "d": 0},
        "minutes": 0,
        "people": 1,
        "difficulty": 2,
        "expected": {"verticalQty": 2},
        "parts": [
            {"id": "A", "name": "左侧板", "size": [18, 0, 0], "pos": [0, 0, 0], "material": "board"},
            {"id": "B", "name": "右侧板", "size": [18, 0, 0], "pos": [0, 0, 0], "material": "board"},
            {"id": "C", "name": "顶板", "size": [0, 18, 0], "pos": [0, 0, 0], "material": "board"},
            {"id": "D", "name": "底板", "size": [0, 18, 0], "pos": [0, 0, 0], "material": "board"},
            {"id": "E", "name": "层板", "size": [0, 18, 0], "pos": [0, 0, 0], "material": "board"},
            {"id": "F", "name": "背板", "size": [0, 0, 3.5], "pos": [0, 0, 0], "material": "fiber"},
        ],
        "steps": [],
        "stepPages": [
            {"page": i + 1, "src": f"/manual-pages/{slug}/p{i + 1:02d}{p.suffix.lower()}"} for i, p in enumerate(pages)
        ],
        "_todo": [
            "填 size 与 pos（毫米，成品姿态），相接的面必须贴合",
            "按手册顺序写 steps，每块板只在它第一次被装上的步骤里出现",
            "steps 数量要和 stepPages 对齐；不是每一步都有原页就把多的挪到 null",
            "跑 python check_sku.py 直到五条全过",
        ],
    }

    out.write_text(json.dumps(skeleton, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"已生成 {out} （{len(pages)} 页图，{len(skeleton['parts'])} 块占位板）")
    print("下一步: 填尺寸与步骤，然后 python check_sku.py " + str(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
