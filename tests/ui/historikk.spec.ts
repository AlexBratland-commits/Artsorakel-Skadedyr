import { expect, test } from "@playwright/test";

function oppforing(i: number) {
  return {
    id: `id-${i}`,
    tid: new Date(Date.UTC(2026, 10, 1 + i, 10)).toISOString(),
    thumb: "",
    sted: "kjeller",
    resultat: {
      found: true, name: `Testart ${i}`, latinName: "Testus", description: "x", severity: "lav", fhiSlug: "x",
      confidence: 85, tiltak: ["Tiltak"], alternativer: [], fhiUrl: "https://www.fhi.no/",
    },
  };
}

test("historikk: tre siste på forsiden, «Se alle» viser resten, og sletting virker", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((liste) => localStorage.setItem("ocab-skadedyr-historikk", JSON.stringify(liste)), [1, 2, 3, 4, 5].map(oppforing));
  await page.reload();
  const historikk = page.getByRole("region", { name: "Tidligere bilder på denne enheten" });
  await expect(historikk.getByRole("listitem")).toHaveCount(3);
  await historikk.getByRole("button", { name: "Se alle tidligere funn (5)" }).click();
  await expect(historikk.getByRole("listitem")).toHaveCount(5);
  await historikk.getByRole("button", { name: "Slett Testart 5 fra listen" }).click();
  await expect(historikk.getByRole("listitem")).toHaveCount(4);
  await historikk.getByRole("button", { name: "Testart 1", exact: false }).first().click();
  await expect(page.getByRole("heading", { name: "Testart 1", level: 2 })).toBeVisible();
});
