"""Post-fix visual verification: base color, pure-black scan, font ladder."""
import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
ROUTES = [("/", "p1"), ("/p2/", "p2"), ("/p3/", "p3"), ("/p4/", "p4"), ("/p5/", "p5")]

JS = r"""
() => {
  const res = { pureBlack: [], bodyBg: '', maxFont: 0, maxFontText: '', fonts: {}, microFonts: [] };
  const px = v => parseFloat(v) || 0;
  res.bodyBg = getComputedStyle(document.body).backgroundColor;
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || px(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const m = cs.backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (m && +m[1]===0 && +m[2]===0 && +m[3]===0 && (+m[4]===undefined || +m[4] > 0.95)) {
      res.pureBlack.push({tag: el.tagName, cls: (el.className||'').toString().slice(0,60)});
    }
    if (el instanceof HTMLElement && el.childElementCount === 0 && el.textContent.trim()) {
      const fs = px(cs.fontSize);
      res.fonts[fs] = (res.fonts[fs]||0)+1;
      if (fs > res.maxFont) { res.maxFont = fs; res.maxFontText = el.textContent.trim().slice(0,24); }
      if (fs < 9) res.microFonts.push({fs, text: el.textContent.trim().slice(0,20)});
    }
  }
  return res;
}
"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    for route, name in ROUTES:
        page.goto(BASE + route, wait_until="networkidle")
        page.wait_for_timeout(2200)
        d = page.evaluate(JS)
        page.screenshot(path=f"/tmp/yyc3-audit/{name}_after.png", full_page=True)
        fonts = sorted(d["fonts"].items(), key=lambda kv: -int(kv[0]), reverse=True)
        top3 = sorted(d["fonts"].items(), key=lambda kv: -int(kv[0]))[:3]
        print(f"{name}: body={d['bodyBg']} | pureBlack={len(d['pureBlack'])} | maxFont={d['maxFont']}px('{d['maxFontText']}') | topFonts={top3} | micro<9px={len(d['microFonts'])} {d['microFonts'][:3]}")
    browser.close()
