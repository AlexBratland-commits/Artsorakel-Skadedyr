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

test("eldre lagrede funn får et diskret varsel – funnet og artsnavnet endres ikke", async ({ page }) => {
  const gammelt = { ...oppforing(1), resultat: { ...oppforing(1).resultat, name: "Brun tremaur", latinName: "Camponotus ligniperda" } };
  const nytt = { ...oppforing(2), artsdata: 4 };
  await page.goto("/");
  await page.evaluate((liste) => localStorage.setItem("ocab-skadedyr-historikk", JSON.stringify(liste)), [nytt, gammelt]);
  await page.reload();
  const historikk = page.getByRole("region", { name: "Tidligere bilder på denne enheten" });
  const varsel = page.getByText("Artsopplysninger kan ha blitt oppdatert siden denne analysen ble utført.");

  await historikk.getByRole("button", { name: /Brun tremaur/ }).first().click();
  await expect(page.getByRole("heading", { name: "Brun tremaur", level: 2 })).toBeVisible();
  // Det lagrede funnet vises slik det var
  await expect(page.getByText("Camponotus ligniperda")).toBeVisible();
  await expect(varsel).toBeVisible();

  await historikk.getByRole("button", { name: /Testart 2/ }).first().click();
  await expect(page.getByRole("heading", { name: "Testart 2", level: 2 })).toBeVisible();
  await expect(varsel).toHaveCount(0);
});
