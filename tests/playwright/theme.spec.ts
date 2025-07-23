import { test, expect, setupPage } from './port-helper';

test.describe('Theme Toggle', () => {
  test('should toggle between light and dark mode', async ({ page, navigateTo }) => {
    // 1. Navigiere zur Startseite mit automatischer Port-Erkennung
    const { url } = await setupPage(page, '/');
    console.log('Startseite geladen:', url);
    
    // 2. Warten, bis die Seite vollständig geladen ist
    await page.waitForLoadState('networkidle');
    
    // 3. Theme-Toggle finden
    const themeToggle = page.locator('button[aria-label*="theme"], [data-testid*="theme-toggle"]').first();
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    
    // 4. Aktuelles Theme überprüfen
    const getTheme = async () => {
      return await page.evaluate(() => {
        const html = document.documentElement;
        return html.getAttribute('data-theme') || 
               (html.classList.contains('dark') ? 'dark' : 'light');
      });
    };
    
    const initialTheme = await getTheme();
    console.log('Aktuelles Theme:', initialTheme);
    
    // 5. Theme wechseln
    console.log('Wechsle Theme...');
    await themeToggle.click();
    await page.waitForTimeout(1000);
    
    // 6. Neues Theme überprüfen
    let newTheme = await getTheme();
    console.log('Neues Theme nach Wechsel:', newTheme);
    
    // 7. Wenn das Theme gleich geblieben ist, versuchen wir es erneut
    if (newTheme === initialTheme) {
      console.log('Theme hat sich nicht geändert, versuche erneut...');
      await themeToggle.click();
      await page.waitForTimeout(1000);
      newTheme = await getTheme();
      console.log('Theme nach zweitem Versuch:', newTheme);
    }
    
    // 8. Sicherstellen, dass sich das Theme geändert hat
    expect(newTheme).not.toBe(initialTheme);
    
    // 9. Zurück zum ursprünglichen Theme wechseln
    console.log('Wechsle zurück zum ursprünglichen Theme');
    await themeToggle.click();
    await page.waitForTimeout(1000);
    
    // 10. Theme nach dem Zurückschalten überprüfen
    const finalTheme = await getTheme();
    console.log('Theme nach dem Zurückschalten:', finalTheme);
    expect(finalTheme).toBe(initialTheme);
    
    // 11. Seite neu laden und prüfen, ob Theme beibehalten wurde
    console.log('Lade Seite neu...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const reloadedTheme = await getTheme();
    console.log('Theme nach Neuladen:', reloadedTheme);
    
    // 12. Überprüfen, ob das Theme beibehalten wurde
    expect(reloadedTheme).toBe(initialTheme);
  });
  
  test('should respect system preference', async ({ browser, navigateTo }) => {
    // Test mit dunklem System-Theme
    const darkContext = await browser.newContext({
      colorScheme: 'dark',
      viewport: { width: 1280, height: 800 }
    });
    
    const darkPage = await darkContext.newPage();
    await navigateTo(darkPage, '/');
    
    const darkTheme = await darkPage.evaluate(() => 
      document.documentElement.getAttribute('data-theme') ||
      (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    );
    
    // Test mit hellem System-Theme
    const lightContext = await browser.newContext({
      colorScheme: 'light'
    });
    const lightPage = await lightContext.newPage();
    await lightPage.goto('http://localhost:4323');
    
    const lightTheme = await lightPage.evaluate(() => 
      document.documentElement.getAttribute('data-theme')
    );
    
    // Die Themes sollten unterschiedlich sein
    expect(darkTheme).not.toBe(lightTheme);
    
    // Aufräumen
    await darkContext.close();
    await lightContext.close();
  });
});
