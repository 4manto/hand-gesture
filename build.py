"""index.html と ./*.js を1枚の MotionCapture.html にまとめる(サーバー不要でダブルクリック起動できる)

    python build.py
"""
import re
from pathlib import Path

here = Path(__file__).parent
src = (here / "index.html").read_text(encoding="utf-8")


def inline(m):
    names, path = m.group(1), m.group(2)
    body = (here / path).read_text(encoding="utf-8")
    body = re.sub(r"^export\s+", "", body, flags=re.M)
    # モジュールごとに関数スコープへ閉じ込め、import していた名前だけ取り出す
    return f"const {{{names}}} = (() => {{\n{body}\nreturn {{{names}}};\n}})();"


out, n = re.subn(r'^import\s*\{([^}]*)\}\s*from\s*"\./([\w.]+\.js)";', inline, src, flags=re.M)
assert n == 2, f"expected 2 local imports, got {n}"
(here / "MotionCapture.html").write_text(out, encoding="utf-8")
print(f"MotionCapture.html ({len(out) // 1024} KB)")
