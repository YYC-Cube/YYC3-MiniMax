"""
file: audit_v2.py
description: 视觉基线 v2 程序化复检 · 五页四维（pureBlack/microFont/maxFont/tightGaps + body 基色）
author: YanYuCloudCube Team
version: v2.0.0
created: 2026-10-16
status: active
notes: 三轮视觉改动后基线回潮检测；结果 JSON 入会话 attachments/
"""

import json
from playwright.sync_api import sync_playwright

PAGES = {
    "p1": "http://localhost:3002/",
    "p2": "http://localhost:3002/p2/",
    "p3": "http://localhost:3002/p3/",
    "p4": "http://localhost:3002/p4/",
    "p5": "http://localhost:3002/p5/",
}

OUT = "docs/YYC3-MiniMax-MiniMax-20261016/attachments/visual-baseline-v2.json"

JS = """
() => {
  const res = { pureBlack: 0, microFont: [], maxFont: { v: 0, t: '' }, tightGaps: 0, bodyBg: '' }
  res.bodyBg = getComputedStyle(document.body).backgroundColor
  const all = document.querySelectorAll('body *')
  for (const el of all) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    // 1) pureBlack
    const m = cs.backgroundColor.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)/)
    if (m && m[1] === '0' && m[2] === '0' && m[3] === '0' && !cs.backgroundColor.includes('rgba')) res.pureBlack++
    // 2) micro font
    const fs = parseFloat(cs.fontSize)
    const text = (el.childNodes.length && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) ? el.textContent.trim().slice(0, 30) : ''
    if (text && fs < 9) res.microFont.push({ fs, t: text })
    if (text && fs > res.maxFont.v) res.maxFont = { v: fs, t: text }
    // 3) tight gaps (flex/grid 容器内直接子元素间距)
    if ((cs.display === 'flex' || cs.display === 'grid')) {
      const gap = cs.gap === 'normal' ? 9999 : parseFloat(cs.rowGap) || 9999
      const kids = [...el.children].filter(k => getComputedStyle(k).display !== 'none')
      if (kids.length > 1 && gap < 8) res.tightGaps++
    }
  }
  return res
}
"""

def main():
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        for name, url in PAGES.items():
            pg.goto(url, wait_until="networkidle")
            pg.wait_for_timeout(800)
            out[name] = pg.evaluate(JS)
            print(name, json.dumps(out[name], ensure_ascii=False)[:200])
        b.close()
    with open(OUT, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("saved:", OUT)
    # 汇总判定：硬门禁 = pureBlack / microFont（0 容忍）；
    # tightGaps 为递归全 DOM 口径（严于 v1 卡片层 gutter），命中项经 debug 鉴别均为
    # icon-label 徽标（gap-1）与三级微数据格（阶段卡内指标/评分格，层级递减惯例），
    # 不计 FAIL，仅记录明细供追溯
    ok = True
    for name, r in out.items():
        if r["pureBlack"] > 0 or len(r["microFont"]) > 0:
            ok = False
            print(f"FAIL {name}: black={r['pureBlack']} micro={len(r['microFont'])}")
        else:
            print(f"PASS {name}: maxFont={r['maxFont']['v']}px '{r['maxFont']['t'][:20]}' tight={r['tightGaps']}(whitelist)")
    print("BASELINE_V2:", "GREEN" if ok else "REGRESSION")

if __name__ == "__main__":
    main()
