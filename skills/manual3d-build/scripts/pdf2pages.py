#!/usr/bin/env python3
"""把 PDF 说明书拆成逐页图片，目录名按页码排好。

用法:
    python pdf2pages.py manual.pdf out/pages [--dpi 150]

需要 PyMuPDF: py -3 -m pip install pymupdf
没有 PyMuPDF 也能做：用阅读器截图，或用手机拍照，命名 p01.png、p02.png…
"""
from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    pdf = Path(sys.argv[1])
    out = Path(sys.argv[2])
    dpi = 150
    if "--dpi" in sys.argv:
        dpi = int(sys.argv[sys.argv.index("--dpi") + 1])

    try:
        import pymupdf  # noqa: PLC0415
    except ImportError:
        print("缺少 PyMuPDF。先装：py -3 -m pip install pymupdf")
        print("或者直接截图/拍照，按 p01.png 这样命名放进目录也能用。")
        return 2

    if not pdf.exists():
        print(f"找不到 {pdf}")
        return 2
    out.mkdir(parents=True, exist_ok=True)

    doc = pymupdf.open(pdf)
    scale = dpi / 72
    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale))
        pix.save(out / f"p{i:02d}.png")
    print(f"已导出 {doc.page_count} 页到 {out}")
    print("下一步: python new_sku.py " + str(out) + " <slug>")
    return 0


if __name__ == "__main__":
    sys.exit(main())
