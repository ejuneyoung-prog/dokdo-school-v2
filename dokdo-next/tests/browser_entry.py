"""Shared visitor entry for learning regressions after the two-area chooser."""
def enter_learning(page):
    entry=page.locator('#v3-entry')
    if entry.count() and entry.is_visible():
        page.locator('#v3-enter-learn').click()
        page.locator('#start-lesson').wait_for(state='visible')
