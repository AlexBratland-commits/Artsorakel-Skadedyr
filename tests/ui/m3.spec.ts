/**
 * M3 (revisjon): et alternativ som er minst like sannsynlig, vises som
 * usikkerhet ved selve sikkerhetsnivået og i historikken – ikke bare nede i
 * alternativlisten. Nivået vises fortsatt som Høy/Middels/Lav, uten prosenter,
 * og arten byttes ikke. Falsk analyse-svar. Feilet på main 11c1442.
 */
import { expect, test } from "@playwright/test";
import { slettFil, testbilde } from "./helpers";

test("alternativ minst like sannsynlig: tydelig ved sikkerheten og i historikken", async ({ page }) => {
  await page.route("**/api/analyze", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        found: true, name: "Husmus", latinName: "Mus musculus", description: "x", severity: "middels", fhiSlug: "mus", confidence: 85, gruppe: "Gnagere",
        tiltak: ["t"], fhiUrl: "https://www.fhi.no/",
        alternativer: [{ name: "Brunrotte", latinName: "Rattus norvegicus", confidence: 90, hvorfor: "Kraftig hale" }],
      }),
    })
  );
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const bilde = await testbilde(131);
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  slettFil(bilde);

  const meter = page.getByRole("meter");
  await expect(meter).toHaveAttribute("aria-valuetext", "Høy sikkerhet");
  const blokk = meter.locator("xpath=..");
  await expect(blokk).toContainText("bør bestemmelsen bekreftes av en fagperson");
  await expect(blokk).toContainText("Et alternativ ble vurdert som minst like sannsynlig");
  await expect(page.getByText(/minst like sannsynlig/)).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText(/\d+ ?%/);

  await page.getByRole("button", { name: "Last opp nytt bilde" }).click();
  const historikk = page.getByRole("region", { name: "Tidligere bilder på denne enheten" });
  await expect(historikk.getByRole("button", { name: /^Husmus/ })).toContainText("Høy sikkerhet · Alternativ like sannsynlig");
});
