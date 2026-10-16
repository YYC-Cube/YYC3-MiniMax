"""
file: audit_a11y.py
description: 可达性 AA 排查 · 五页（文本对比度 / 交互元素无障碍命名 / Tab 键盘遍历）
author: YanYuCloudCube Team
version: v1.0.0
created: 2026-10-16
status: active
notes: WCAG AA 文本对比度阈值——普通文本 ≥4.5、大文本(≥18.66px bold 或 ≥24px) ≥3.0；
      结果 JSON 入会话 attachments/
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

OUT = "docs/YYC3-MiniMax-MiniMax-20261016/attachments/a11y-aa-scan.json"

CONTRAST_JS = """
() => {
  function parse(c) {
    const m = c.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/)
    if (!m) return null
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] }
  }
  function blend(fg, bg) {
    return {
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1,
    }
  }
  function lum(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  function ratio(a, b) {
    const l1 = lum(a), l2 = lum(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }
  function effBg(el) {
    let cur = el
    while (cur && cur !== document.documentElement) {
      const c = parse(getComputedStyle(cur).backgroundColor)
      if (c && c.a >= 0.9) return c
      if (c && c.a > 0 && cur !== el) {
        // 半透明面板：向上一层继续找不透明底做混合基底
        const up = effBgUp(cur)
        if (up) return blend(c, up)
      }
      cur = cur.parentElement
    }
    return { r: 10, g: 22, b: 40, a: 1 }
  }
  function effBgUp(el) {
    let cur = el.parentElement
    while (cur && cur !== document.documentElement) {
      const c = parse(getComputedStyle(cur).backgroundColor)
      if (c && c.a >= 0.9) return c
      cur = cur.parentElement
    }
    return { r: 10, g: 22, b: 40, a: 1 }
  }

  const violations = []
  const unnamed = []
  const all = document.querySelectorAll('body *')
  for (const el of all) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const text = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
    if (text) {
      const fg = parse(cs.color)
      const bg = effBg(el)
      if (fg && bg) {
        const effFg = fg.a < 1 ? blend(fg, bg) : fg
        const r = ratio(effFg, bg)
        const fs = parseFloat(cs.fontSize)
        const bold = +cs.fontWeight >= 700
        const large = fs >= 24 || (fs >= 18.66 && bold)
        const min = large ? 3.0 : 4.5
        if (r < min) violations.push({ r: +r.toFixed(2), min, fs, t: el.textContent.trim().slice(0, 24) })
      }
    }
    // 交互元素无障碍命名
    const tag = el.tagName.toLowerCase()
    if ((tag === 'button' || tag === 'a') && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
      if (!el.textContent.trim() && !el.querySelector('[aria-label]')) {
        unnamed.push({ tag, cls: (el.className || '').toString().slice(0, 50) })
      }
    }
  }
  return { violations, unnamed }
}
"""

TAB_JS = """
async () => {
  const stops = []
  for (let i = 0; i < 60; i++) {
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
    document.activeElement && document.dispatchEvent  // noop keep env
    // 真实焦点推进由 playwarrow 键盘事件完成，此处仅记录当前
    break
  }
  return stops
}
"""

def main():
    out = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1920, "height": 1080})
        for name, url in PAGES.items():
            pg.goto(url, wait_until="networkidle")
            pg.wait_for_timeout(700)
            res = pg.evaluate(CONTRAST_JS)
            # 键盘遍历：连按 40 次 Tab，记录焦点轨迹（验证可循环推进、无挂死）
            pg.focus("body")
            stops = 0
            seen = set()
            for _ in range(40):
                pg.keyboard.press("Tab")
                pg.wait_for_timeout(30)
                handle = pg.evaluate_handle("() => document.activeElement && document.activeElement.tagName")
                tag = handle.as_element().text_content() if handle.as_element() else "?"
                key = pg.evaluate("() => { const a = document.activeElement; return a ? a.tagName + ':' + (a.textContent || '').trim().slice(0, 12) + ':' + (a.className || '').toString().slice(0, 30) : 'none' }")
                if key == seen and stops > 0:
                    pass
                seen_prev = len(seen)
                seen.add(key)
                if len(seen) == seen_prev:
                    stops += 1
                else:
                    stops = 0
                if stops >= 3:
                    break
            res["tabUniqueStops"] = len(seen)
            res["tabStalled"] = stops >= 3
            out[name] = res
            print(name, f"contrastViol={len(res['violations'])} unnamed={len(res['unnamed'])} tabStops={len(seen)} stalled={res['tabStalled']}")
            for v in res["violations"][:6]:
                print("   LOW:", v)
            for u in res["unnamed"][:4]:
                print("   UNNAMED:", u)
        b.close()
    with open(OUT, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("saved:", OUT)

if __name__ == "__main__":
    main()
