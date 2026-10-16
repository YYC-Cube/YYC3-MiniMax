"""
file: debug_contrast.py
description: 对比度违规定位（区分渐变 clip 误报 vs 真实低对比）——一次性调试脚本
"""
from playwright.sync_api import sync_playwright

PAGES = {"p1": "http://localhost:3002/", "p2": "http://localhost:3002/p2/", "p3": "http://localhost:3002/p3/", "p4": "http://localhost:3002/p4/", "p5": "http://localhost:3002/p5/"}

JS = """
() => {
  function parse(c) {
    const m = c.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/)
    if (!m) return null
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] }
  }
  function blend(fg, bg) {
    return { r: fg.r*fg.a + bg.r*(1-fg.a), g: fg.g*fg.a + bg.g*(1-fg.a), b: fg.b*fg.a + bg.b*(1-fg.a), a: 1 }
  }
  function lum(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b)
  }
  function ratio(a, b) {
    const l1 = lum(a), l2 = lum(b)
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
  }
  function opaqueUp(el) {
    let cur = el.parentElement
    while (cur && cur !== document.documentElement) {
      const c = parse(getComputedStyle(cur).backgroundColor)
      if (c && c.a >= 0.9) return c
      cur = cur.parentElement
    }
    return { r: 10, g: 22, b: 40, a: 1 }
  }
  function effBg(el) {
    let cur = el
    while (cur && cur !== document.documentElement) {
      const c = parse(getComputedStyle(cur).backgroundColor)
      if (c && c.a >= 0.9) return c
      if (c && c.a > 0 && cur !== el) return blend(c, opaqueUp(cur))
      cur = cur.parentElement
    }
    return { r: 10, g: 22, b: 40, a: 1 }
  }
  const out = []
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const text = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
    if (!text) continue
    const fg = parse(cs.color), bg = effBg(el)
    if (!fg || !bg) continue
    const effFg = fg.a < 1 ? blend(fg, bg) : fg
    const r = ratio(effFg, bg)
    const fs = parseFloat(cs.fontSize)
    const bold = +cs.fontWeight >= 700
    const large = fs >= 24 || (fs >= 18.66 && bold)
    const min = large ? 3.0 : 4.5
    if (r < min) {
      const isClip = cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text'
      out.push({ r: +r.toFixed(2), fs, fg: cs.color, clip: isClip, cls: (el.className||'').toString().slice(0,80), t: el.textContent.trim().slice(0,20) })
    }
  }
  return out
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    for name, url in PAGES.items():
        pg.goto(url, wait_until="networkidle")
        pg.wait_for_timeout(600)
        items = pg.evaluate(JS)
        print(f"== {name} ({len(items)}) ==")
        for i in items:
            tag = "CLIP-TEXT" if i["clip"] else "REAL"
            print(f"  [{tag}] r={i['r']} fs={i['fs']} | {i['t']} | fg={i['fg']} | {i['cls'][:70]}")
    b.close()
