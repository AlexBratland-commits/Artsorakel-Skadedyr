import { expect, test } from "@playwright/test";
import { slettFil, testbilde } from "./helpers";

test("bilde av skruer: «Ingen skadedyr på bildet», uten råd om å fotografere dyret på nytt", async ({ page }) => {
  const bilde = await testbilde(20);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByLabel("Notater om skadedyret").fill("SKRUE-TEST");
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Ingen skadedyr på bildet" })).toBeVisible();
  await expect(page.getByText("Bildet viser fire metallskruer.")).toBeVisible();
  await expect(page.getByText(/nærmere dyret, med god belysning/)).toHaveCount(0);
  await expect(page.getByText(/Ingen sikker match/)).toHaveCount(0);
  slettFil(bilde);
});

test("ekskrementer uten størrelse og beskrivelse viser tips, som forsvinner når beskrivelsen fylles ut", async ({ page }) => {
  const bilde = await testbilde(21);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Ekskrementer" }).click();
  const tips = page.getByText(/særlig for å skille mus fra flaggermus/);
  await expect(tips).toBeVisible();
  await page.getByLabel(/Beskriv det du ser/).fill("Harde, i skuffen");
  await expect(tips).toHaveCount(0);
  slettFil(bilde);
});

test("chat: «Hvem er kong Harald?» gir høflig fagavgrensning", async ({ page }) => {
  const bilde = await testbilde(22);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  // Tetteråd for mus vises i tiltakene
  await expect(page.getByText(/fra omtrent 4–6 mm/)).toBeVisible();
  await expect(page.getByText(/aktiv inngang bør ikke tettes/)).toBeVisible();
  await page.getByLabel("Skriv spørsmålet ditt").fill("Hvem er kong Harald?");
  await page.getByRole("button", { name: "Send spørsmål" }).click();
  await expect(page.getByText(/Jeg er Artsorakels fagassistent/)).toBeVisible();
  slettFil(bilde);
});
