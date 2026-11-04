import { expect, test } from "@playwright/test";
import { slettFil, testbilde } from "./helpers";

async function analyserEkskrementer(page: import("@playwright/test").Page, beskrivelse: string, seed: number) {
  const bilde = await testbilde(seed);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Ekskrementer" }).click();
  await page.getByLabel(/Beskriv det du ser/).fill(beskrivelse);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  return bilde;
}

test("ukjent ekskrementfunn: godkjent overskrift og forklaring, ingen oppdiktet art", async ({ page }) => {
  const bilde = await analyserEkskrementer(page, "Runde, på loftet UKJENT-TEST", 10);
  await expect(page.getByRole("heading", { level: 2, name: "Kunne ikke identifisere funnet sikkert" })).toBeVisible();
  await expect(
    page.getByText("Bildet eller opplysningene gir ikke tilstrekkelig grunnlag for å bestemme hvilket dyr sporene stammer fra. Prøv et tydeligere bilde med målestokk.")
  ).toBeVisible();
  await expect(page.getByText("Ekorn")).toHaveCount(0);
  await expect(page.getByText("Forslaget bygger på: Runde, 6 mm")).toBeVisible();
  slettFil(bilde);
});

test("«rotte» på ekskrementer: brunrotte med forbehold, ikke høy sikkerhet", async ({ page }) => {
  const bilde = await analyserEkskrementer(page, "Store, i kjelleren ROTTE-TEST", 11);
  await expect(page.getByRole("heading", { level: 2, name: "Brunrotte" })).toBeVisible();
  await expect(page.getByText("Middels sikkerhet").first()).toBeVisible();
  await expect(page.getByText(/skille brunrotte fra svartrotte/)).toBeVisible();
  slettFil(bilde);
});
