import { expect, test } from "@playwright/test";
import { fangFeil, slettFil, testbilde } from "./helpers";

test("med tilgangskode: skjema først, feil kode avvises, riktig kode gir full app", async ({ page }) => {
  const feil = fangFeil(page);
  await page.goto("/");

  const kodefelt = page.getByLabel("Tilgangskode");
  await expect(kodefelt).toBeVisible();
  await expect(page.getByRole("button", { name: "Ta bilde" })).toHaveCount(0);

  await kodefelt.fill("feil-kode");
  await page.getByRole("button", { name: "Logg inn" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Feil tilgangskode." })).toBeVisible();

  await kodefelt.fill("ansatt-kode-2026");
  await page.getByRole("button", { name: "Logg inn" }).click();
  await expect(page.getByRole("button", { name: "Ta bilde" })).toBeVisible();

  // Innloggingen huskes etter ny innlasting
  await page.reload();
  await expect(page.getByRole("button", { name: "Ta bilde" })).toBeVisible();

  const bilde = await testbilde(3);
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  // Feilen som forventes er 401-svaret fra den feile koden.
  expect(feil.filter((f) => !/401/.test(f))).toEqual([]);
  slettFil(bilde);
});

test("API-et avviser analyse uten innlogging, selv om skjemaet omgås", async ({ request }) => {
  const res = await request.post("/api/analyze", { multipart: { type: "dyr" } });
  expect(res.status()).toBe(401);
  expect((await res.json()).kode).toBe("tilgang_kreves");
});
