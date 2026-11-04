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
