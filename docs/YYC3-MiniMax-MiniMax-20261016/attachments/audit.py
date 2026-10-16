"""Programmatic visual audit: extract computed styles for hierarchy/spacing/dark-theme checks."""
import json
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
ROUTES = [("/", "p1"), ("/p2/", "p2"), ("/p3/", "p3"), ("/p4/", "p4"), ("/p5/", "p5")]

JS = r"""
() => {
  const res = {
    pureBlack: [], glows: [], textTiers: {}, bigTexts: [],
    paddings: [], tightGaps: [], containerGaps: [],
    svgFill: 0, svgStroke: 0, radii: {}, hues: {},
    pagePad: null, cardSamples: []
  };
  const px = v => parseFloat(v) || 0;
  const rgbToHsl = (r,g,b) => {
    r/=255; g/=255; b/=255;
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b); let h=0,s=0,l=(mx+mn)/2;
    if (mx!==mn){ const d=mx-mn; s=l>0.5?d/(2-mx-mn):d/(mx+mn);
      h = mx===r ? (g-b)/d+(g<b?6:0) : mx===g ? (b-r)/d+2 : (r-g)/d+4; h*=60; }
    return [Math.round(h), Math.round(s*100), Math.round(l*100)];
  };
  const els = document.querySelectorAll('body *');
  for (const el of els) {
    if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || px(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    const cls = (typeof el.className === 'string' ? el.className : (el.className && el.className.baseVal) || '').slice(0, 90);

    // 1. pure black fill (non-transparent, full black, visible area)
    const bg = cs.backgroundColor;
    const m = bg.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (m && +m[1]===0 && +m[2]===0 && +m[3]===0 && (+m[4]===undefined || +m[4] > 0.95) && r.width>8 && r.height>8) {
      res.pureBlack.push({tag: el.tagName, cls, w: Math.round(r.width), h: Math.round(r.height)});
    }

    // 2. neon glow: box/text-shadow blur>=30 alpha>=0.4
    for (const prop of ['boxShadow','textShadow']) {
      const v = cs[prop];
      if (!v || v === 'none') continue;
      for (const seg of v.split(/,(?![^(]*\))/)) {
        const nums = seg.match(/(-?[\d.]+)px/g) || [];
        const blur = nums.length >= 3 ? px(nums[2]) : 0;
        const am = seg.match(/,\s*([\d.]+)\)/);
        const a = am ? px(am[1]) : (seg.includes('rgb(') ? 1 : 0);
        if (blur >= 30 && a >= 0.4) res.glows.push({prop, blur, alpha: a, cls});
      }
    }

    // 3. text hierarchy tiers
    if (el instanceof HTMLElement && el.childElementCount === 0 && el.textContent.trim()) {
      const fs = px(cs.fontSize), fw = cs.fontWeight, col = cs.color;
      const key = `${fs}px/w${fw}`;
      res.textTiers[key] = (res.textTiers[key] || 0) + 1;
      const cm = col.match(/([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      if (cm) { const [h,s,l] = rgbToHsl(+cm[1],+cm[2],+cm[3]);
        if (l < 15 && s < 20) {} else {
          const hb = h<15||h>=345?'red':h<45?'orange':h<70?'yellow':h<170?'green':h<200?'cyan':h<255?'blue':h<300?'purple':'magenta';
          res.hues[hb] = (res.hues[hb]||0)+1;
        } }
      if (fs >= 40) res.bigTexts.push({fs, text: el.textContent.trim().slice(0,30), fw});
    }

    // 4. paddings of card-like elements
    if (el instanceof HTMLElement) {
      const hasBorder = px(cs.borderTopWidth) > 0 || px(cs.borderLeftWidth) > 0;
      const radius = px(cs.borderTopLeftRadius);
      if ((hasBorder || radius >= 12) && r.width > 120 && r.height > 60) {
        const p = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)];
        const key = `${cs.borderTopLeftRadius}|${Math.min(...p)}`;
        res.radii[cs.borderTopLeftRadius] = (res.radii[cs.borderTopLeftRadius]||0)+1;
        if (res.cardSamples.length < 400) res.paddings.push({radius: cs.borderTopLeftRadius, minPad: Math.min(...p), w: Math.round(r.width), h: Math.round(r.height), cls: cls.slice(0,60)});
      }
      // 5. flex/grid gaps
      if (px(cs.gap) > 0 && el.childElementCount >= 2) {
        res.containerGaps.push({gap: cs.gap, n: el.childElementCount, cls: cls.slice(0,60)});
      }
    }

    // 6. tight vertical gaps between visible siblings
    if (el instanceof HTMLElement && el.childElementCount >= 2) {
      const kids = [...el.children].filter(k => { const kr = k.getBoundingClientRect(); return kr.width>1 && kr.height>1; });
      for (let i=0;i<kids.length-1;i++){
        const a = kids[i].getBoundingClientRect(), b = kids[i+1].getBoundingClientRect();
        if (Math.abs(a.left-b.left) < a.width*0.6) { // roughly same column
          const vgap = Math.round(Math.min(b.top-(a.bottom), a.top-(b.bottom)));
          if (vgap >= 0 && vgap < 8) res.tightGaps.push({vgap, between: (kids[i].className||'').toString().slice(0,40)+' <-> '+(kids[i+1].className||'').toString().slice(0,40)});
        }
      }
    }

    // 7. svg icon style
    if (el instanceof SVGElement || el.tagName === 'svg') {}
  }
  document.querySelectorAll('svg').forEach(sv => {
    const hasFill = sv.querySelector('[fill]:not([fill="none"])') || (sv.getAttribute('fill') && sv.getAttribute('fill') !== 'none');
    const hasStroke = sv.querySelector('[stroke]:not([stroke="none"])') || (sv.getAttribute('stroke') && sv.getAttribute('stroke') !== 'none');
    if (hasFill) res.svgFill++;
    if (hasStroke) res.svgStroke++;
  });

  // page outer padding: walk deepest left-most chain from body
  let n = document.body;
  let pad = 0, depth = 0;
  while (n && depth < 12) {
    const cs = getComputedStyle(n);
    const pl = px(cs.paddingLeft);
    if (pl > 0) { pad = pl; break; }
    n = n.firstElementChild; depth++;
  }
  res.pagePad = pad;
  return res;
}
"""

summary = {}
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    for route, name in ROUTES:
        page.goto(BASE + route, wait_until="networkidle")
        page.wait_for_timeout(2500)
        data = page.evaluate(JS)
        with open(f"/tmp/yyc3-audit/{name}_audit.json", "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=1)
        tiers = sorted(data["textTiers"].items(), key=lambda kv: -kv[1])
        print(f"\n===== {name} ({route}) =====")
        print(f"pureBlack: {len(data['pureBlack'])} | glows: {len(data['glows'])} | tightGaps: {len(data['tightGaps'])}")
        print(f"textTiers(top8): {tiers[:8]}")
        print(f"bigTexts(>=40px): {data['bigTexts'][:6]}")
        print(f"radii: {sorted(data['radii'].items(), key=lambda kv:-kv[1])[:6]}")
        print(f"hues(text): {data['hues']}")
        print(f"svg fill/stroke: {data['svgFill']}/{data['svgStroke']} | pagePad: {data['pagePad']}")
        pads = [x['minPad'] for x in data['paddings']]
        print(f"card minPad<16: {sum(1 for v in pads if v<16)}/{len(pads)} | min={min(pads) if pads else '-'}")
    browser.close()
