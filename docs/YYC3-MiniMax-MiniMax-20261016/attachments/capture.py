"""Capture full-page screenshots of P1-P5 routes for visual audit."""
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3002"
ROUTES = [("/", "p1"), ("/p2/", "p2"), ("/p3/", "p3"), ("/p4/", "p4"), ("/p5/", "p5")]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    for route, name in ROUTES:
        page.goto(BASE + route, wait_until="networkidle")
        page.wait_for_timeout(2500)  # let animations/clock render
        page.screenshot(path=f"/tmp/yyc3-audit/{name}.png", full_page=True)
        print(f"captured {name}: {route}")
    # extra: viewport-only hero shot of P1 for focal-point check
    page.goto(BASE + "/", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.screenshot(path="/tmp/yyc3-audit/p1_viewport.png", full_page=False)
    print("captured p1_viewport")
    browser.close()
