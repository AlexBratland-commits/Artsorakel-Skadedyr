import { expect, test } from "@playwright/test";

test("HEIC som nettleseren ikke kan lese gir tydelig melding før opplasting (F9)", async ({ page }) => {
  let sendt = false;
  await page.route("**/api/analyze", (r) => {
    sendt = true;
    return r.continue();
  });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "IMG_0001.HEIC",
    mimeType: "image/heic",
    buffer: Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(64)]),
  });
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByText(/Dette HEIC-bildet kan ikke leses i denne nettleseren/)).toBeVisible();
  expect(sendt).toBe(false);
});
