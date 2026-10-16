"""P4/P5 hierarchy compliance deep audit: focal uniqueness, ladder, spacing, dark, consistency."""
import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
ROUTES = [("/p4/", "p4"), ("/p5/", "p5")]

JS = r"""
() => {
  const px = v => parseFloat(v) || 0;
  const res = {
    // 1. hierarchy: text tiers with actual rendered size
    anchors: [],          // >= 24px text elements
    tierLadder: {},       // font-size -> count
    // 2. breathing: root pad, gaps, card pads
    rootPad: null, gridGaps: new Set(), cardPads: [], tightGaps: 0,
    // 3. dark: pure black, strong glows, warm/cool hue balance
    pureBlack: 0, strongGlows: [], warmCool: {warm: 0, cool: 0},
    // 4. consistency
    cardRadii: new Set(), borderStyles: new Set()
  };
  const rgbToHsl = (r,g,b) => {
    r/=255; g/=255; b/=255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b); let h=0,s=0,l=(mx+mn)/2;
    if (mx!==mn){ const d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn);
      h = mx===r ? (g-b)/d+(g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; h*=60; }
    return [h, s, l];
  };

  // root container padding (first sized child of shell)
  const shell = document.querySelector('.command-bg') || document.body;
  // find main view root: first div with grid/flex full sizing inside shell
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;

    if (el instanceof HTMLElement && el.childElementCount === 0 && el.textContent.trim()) {
      const fs = px(cs.fontSize);
      res.tierLadder[fs] = (res.tierLadder[fs] || 0) + 1;
      if (fs >= 24) res.anchors.push({fs, text: el.textContent.trim().slice(0, 16)});
      const cm = cs.color.match(/([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      if (cm) { const [h,,l] = rgbToHsl(+cm[1],+cm[2],+cm[3]);
        if (l > 15 && l < 92 && (h<60||h>=330)) res.warmCool.warm++; else if (l>15) res.warmCool.cool++; }
    }

    const bg = cs.backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (bg && +bg[1]===0 && +bg[2]===0 && +bg[3]===0 && (+bg[4]===undefined || +bg[4]>0.95)) res.pureBlack++;

    for (const prop of ['boxShadow','textShadow']) {
      const v = cs[prop]; if (!v || v==='none') continue;
      for (const seg of v.split(/,(?![^(]*\))/)) {
        const nums = seg.match(/(-?[\d.]+)px/g) || [];
        const blur = nums.length>=3 ? px(nums[2]) : 0;
        const am = seg.match(/,\s*([\d.]+)\)/);
        const a = am ? px(am[1]) : (seg.includes('rgb(') ? 1 : 0);
        if (blur>=30 && a>=0.4 && !seg.includes('rgba(0, 0, 0')) res.strongGlows.push({blur, a});
      }
    }

    if (el instanceof HTMLElement) {
      const radius = cs.borderTopLeftRadius;
      const hasBorder = px(cs.borderTopWidth)>0 || px(cs.borderLeftWidth)>0;
      if ((hasBorder || px(radius)>=12) && r.width>140 && r.height>56) {
        res.cardRadii.add(radius);
        res.cardPads.push(Math.min(px(cs.paddingTop), px(cs.paddingBottom), px(cs.paddingLeft), px(cs.paddingRight)));
      }
      if (px(cs.gap) > 0 && el.childElementCount >= 2 && (cs.display.includes('grid') || cs.display.includes('flex'))) {
        res.gridGaps.add(px(cs.gap));
      }
      // tight sibling vertical gaps
      if (el.childElementCount >= 2) {
        const kids = [...el.children].filter(k => {const kr=k.getBoundingClientRect(); return kr.width>1&&kr.height>1;});
        for (let i=0;i<kids.length-1;i++){
          const a=kids[i].getBoundingClientRect(), b=kids[i+1].getBoundingClientRect();
          if (Math.abs(a.left-b.left) < a.width*0.6) {
            const vg = Math.min(b.top-a.bottom, a.top-b.bottom);
            if (vg>=0 && vg<8) res.tightGaps++;
          }
        }
      }
    }
  }
  // root pad: deepest padding on the p-6 view container (find via class)
  const view = document.querySelector('[class*="p-6"]');
  res.rootPad = view ? px(getComputedStyle(view).paddingLeft) : null;
  res.gridGaps = [...res.gridGaps];
  res.cardRadii = [...res.cardRadii];
  return res;
}
"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    for route, name in ROUTES:
        page.goto(BASE + route, wait_until="networkidle")
        page.wait_for_timeout(2500)
        d = page.evaluate(JS)
        with open(f"/tmp/yyc3-audit/{name}_final.json", "w") as f:
            json.dump(d, f, ensure_ascii=False, indent=1, default=list)
        ladder = sorted(d["tierLadder"].items(), key=lambda kv: -float(kv[0]))
        pads = d["cardPads"]
        print(f"\n===== {name} =====")
        print(f"锚点(>=24px): {d['anchors']}")
        print(f"字号台阶(降序): {[k for k,_ in ladder]}")
        print(f"rootPad={d['rootPad']} | gridGaps={sorted(set(d['gridGaps']))} | cardPads min={min(pads) if pads else '-'} <16: {sum(1 for v in pads if v<16)}/{len(pads)} | tightGaps={d['tightGaps']}")
        print(f"pureBlack={d['pureBlack']} | strongNeonGlows={len(d['strongGlows'])} | warm/cool={d['warmCool']['warm']}/{d['warmCool']['cool']}")
        print(f"cardRadii={d['cardRadii']}")
    browser.close()
