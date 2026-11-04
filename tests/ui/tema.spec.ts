import { expect, test } from "@playwright/test";
import { fangFeil } from "./helpers";

for (const tema of ["light", "dark"] as const) {
  test(`${tema === "light" ? "lys" : "mørk"} modus: logo, chatboble og chat fungerer`, async ({ page }) => {
    const feil = fangFeil(page);
    await page.emulateMedia({ colorScheme: tema });
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("ocab-tema"));
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(tema === "dark");
    // Begge logoene er lastet og skarpe (bildet er minst dobbelt så stort som visningen)
    for (const img of await page.getByRole("img", { name: "Ocab" }).all()) {
      const { naturlig, vist } = await img.evaluate((el: HTMLImageElement) => ({ naturlig: el.naturalWidth, vist: el.clientWidth }));
      expect(naturlig).toBeGreaterThanOrEqual(vist * 2);
    }
    await page.getByRole("button", { name: "Spør Artsorakel" }).click();
    await expect(page.getByRole("dialog", { name: "Spør Artsorakel" }).getByText(/Hei! Jeg er/)).toBeVisible();
    await page.screenshot({ path: `test-results/tema-${tema}-${test.info().project.name}.png` });
    expect(feil).toEqual([]);
  });
}
