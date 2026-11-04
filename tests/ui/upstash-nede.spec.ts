import { expect, test } from "@playwright/test";
import { slettFil, testbilde } from "./helpers";

test("Upstash satt opp men nede: brukeren får norsk melding, og ingen analyse gjøres", async ({ page }) => {
  const bilde = await testbilde(4);
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(
    page.getByText("Artsorakel er midlertidig utilgjengelig fordi kontrollen av bruksgrenser ikke svarer.", { exact: false })
  ).toBeVisible();
  // Ingen resultat vises, og knappen er klar for nytt forsøk
  await expect(page.getByRole("heading", { level: 2, name: "Husmus" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Artsbestem bildet" })).toBeEnabled();
  slettFil(bilde);
});
