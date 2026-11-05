import { expect, test } from "@playwright/test";

test("PC: chatten er et vindu nederst til høyre, ikke hele skjermen", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const boks = (await page.getByRole("dialog", { name: "Spør Artsorakel" }).boundingBox())!;
  const vindu = page.viewportSize()!;
  expect(Math.round(boks.width)).toBe(400);
  expect(boks.x + boks.width).toBeGreaterThan(vindu.width - 40);
  expect(boks.height).toBeLessThan(vindu.height);
});

test("PC: full personverntekst og undertittel i chatten", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  await expect(chat.getByText(/Meldinger sendes til en AI-tjeneste/)).toBeVisible();
  await expect(chat.getByText("Fagassistent for skadedyr")).toBeVisible();
});

test("PC: boblen er fortsatt knappen med teksten «Spør Artsorakel»", async ({ page }) => {
  await page.goto("/");
  await page.waitForTimeout(400);
  const boble = page.getByRole("button", { name: "Spør Artsorakel" });
  await expect(boble).toHaveAttribute("data-modus", "full");
  await expect(boble.getByText("Spør Artsorakel")).toBeVisible();
  expect((await boble.boundingBox())!.width).toBeGreaterThan(100);
});
