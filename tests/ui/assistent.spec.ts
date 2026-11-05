import { expect, test } from "@playwright/test";
import { fangFeil, slettFil, testbilde } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("chatboblen er synlig uten bilde, og åpnes ikke av seg selv", async ({ page }) => {
  await expect(page.getByRole("button", { name: "Spør Artsorakel" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Spør Artsorakel" })).toHaveCount(0);
});

test("samtale uten bilde: velkomst, forslag, oppfølgingsspørsmål og flere meldinger", async ({ page }) => {
  const feil = fangFeil(page);
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  await expect(chat.getByText(/Hei! Jeg er Artsorakels fagassistent/)).toBeVisible();
  await expect(chat.getByText(/Sendes til AI\. Ikke skriv personopplysninger/)).toBeVisible();
  await chat.getByRole("button", { name: "Jeg hører krafsing på loftet" }).click();
  await expect(chat.getByText(/Når på døgnet hører du det/)).toBeVisible();
  await chat.getByLabel("Skriv spørsmålet ditt til Artsorakel").fill("Om natten, og jeg har sett små ekskrementer");
  await chat.getByLabel("Skriv spørsmålet ditt til Artsorakel").press("Enter");
  await expect(chat.getByText(/tyder oftest på mus/)).toBeVisible();
  expect(feil).toEqual([]);
});

test("samtalen huskes i nettleseren og slettes med «Ny samtale»", async ({ page }) => {
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  let chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  await chat.getByRole("button", { name: "Hva er forskjellen på mus og rotte?" }).click();
  await expect(chat.getByText(/tyder oftest på mus/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  await expect(chat.getByText("Hva er forskjellen på mus og rotte?")).toBeVisible();
  await chat.getByRole("button", { name: "Ny samtale" }).click();
  await expect(chat.locator("p", { hasText: "Hva er forskjellen på mus og rotte?" })).toHaveCount(0);
  await expect(chat.getByRole("button", { name: "Jeg finner maur på badet" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("artsorakel-assistent"))).toBeNull();
});

test("kontaktkort ved behov, og «Kontakt Ocab» er alltid tilgjengelig", async ({ page }) => {
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  const alltid = chat.locator("footer").getByRole("link", { name: "Kontakt Ocab" });
  await expect(alltid).toHaveAttribute("href", "https://www.ocab.no/skade/skadedyr/");
  await chat.getByLabel("Skriv spørsmålet ditt til Artsorakel").fill("Det er sagflis ved vinduene");
  await chat.getByRole("button", { name: "Send spørsmål til Artsorakel" }).click();
  await expect(chat.getByText(/Ocab kan hjelpe deg med å kartlegge problemet/)).toBeVisible();
  await expect(chat.getByText("[[KONTAKT_OCAB]]")).toHaveCount(0);
  await expect(chat.getByRole("link", { name: "Kontakt Ocab" })).toHaveCount(2);
  // Samtalen fortsetter etter kontaktkortet
  await expect(chat.getByLabel("Skriv spørsmålet ditt til Artsorakel")).toBeEnabled();
});

test("kontaktkortet gjentas ikke i neste svar", async ({ page }) => {
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  const felt = chat.getByLabel("Skriv spørsmålet ditt til Artsorakel");
  await felt.fill("Det er sagflis ved vinduene");
  await felt.press("Enter");
  await expect(chat.getByText(/Ocab kan hjelpe deg med å kartlegge problemet/)).toHaveCount(1);
  await felt.fill("Det er fortsatt sagflis ved vinduene i dag");
  await felt.press("Enter");
  await expect(chat.getByText(/Sagflis ved vinduer kan tyde på stokkmaur/)).toHaveCount(2);
  await expect(chat.getByText(/Ocab kan hjelpe deg med å kartlegge problemet/)).toHaveCount(1);
});

test("«Analyser bilde» vises når et bilde hjelper, og fører til bildeopplastingen", async ({ page }) => {
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  // Generelt spørsmål: ingen bildeknapp
  await chat.getByRole("button", { name: "Hvordan sikrer jeg huset mot gnagere?" }).click();
  await expect(chat.getByText(/tyder oftest på mus/)).toBeVisible();
  await expect(chat.getByRole("button", { name: "Analyser bilde" })).toHaveCount(0);
  const felt = chat.getByLabel("Skriv spørsmålet ditt til Artsorakel");
  await felt.fill("Det er store maur ved vinduet");
  await felt.press("Enter");
  await expect(chat.getByText("[[ANALYSER_BILDE]]")).toHaveCount(0);
  await chat.getByRole("button", { name: "Analyser bilde" }).click();
  await expect(page.getByRole("dialog", { name: "Spør Artsorakel" })).toHaveCount(0);
  await expect(page.locator("#bildeopplasting")).toBeInViewport();
  await expect(page.locator("#bildeopplasting button").first()).toBeFocused();
  // Samtalen er tatt vare på
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  await expect(chat.getByRole("button", { name: "Analyser bilde" })).toBeVisible();
});

test("mobil: kompakt toppfelt, kort personverntekst og synlig skrivefelt", async ({ page }) => {
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  const topp = await chat.locator("header").boundingBox();
  expect(topp!.height).toBeLessThanOrEqual(56);
  await expect(chat.getByText("Sendes til AI. Ikke skriv personopplysninger.")).toBeVisible();
  await expect(chat.getByRole("link", { name: "Personvern" })).toBeVisible();
  // Lav skjerm (som med tastaturet oppe): skrivefeltet er fortsatt synlig
  await page.setViewportSize({ width: 412, height: 420 });
  await expect(chat.getByLabel("Skriv spørsmålet ditt til Artsorakel")).toBeInViewport();
  await expect(chat.getByRole("button", { name: "Lukk chatten" })).toBeInViewport();
});

test("irrelevante spørsmål avvises høflig", async ({ page }) => {
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const chat = page.getByRole("dialog", { name: "Spør Artsorakel" });
  await chat.getByLabel("Skriv spørsmålet ditt til Artsorakel").fill("Hvem er kong Harald?");
  await chat.getByLabel("Skriv spørsmålet ditt til Artsorakel").press("Enter");
  await expect(chat.getByText(/kan bare hjelpe med skadedyr/)).toBeVisible();
});

test("Esc lukker chatten og gir fokus tilbake til boblen", async ({ page }) => {
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  await expect(page.getByLabel("Skriv spørsmålet ditt til Artsorakel")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Spør Artsorakel" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Spør Artsorakel" })).toBeFocused();
});

test("mobil: chatten fyller skjermen, og bildeanalyse og funn-chat virker som før", async ({ page }) => {
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  const boks = await page.getByRole("dialog", { name: "Spør Artsorakel" }).boundingBox();
  const vindu = page.viewportSize()!;
  expect(Math.round(boks!.width)).toBe(vindu.width);
  await page.getByRole("button", { name: "Lukk chatten" }).click();

  const bilde = await testbilde(30);
  await page.locator('input[type="file"]').setInputFiles(bilde);
  await page.getByRole("button", { name: "Artsbestem bildet" }).click();
  await expect(page.getByRole("heading", { name: "Husmus", level: 2 })).toBeVisible();
  await page.getByRole("button", { name: "Er den farlig?" }).click();
  await expect(page.getByText("Testsvar fra falsk AI.")).toBeVisible();
  // Den generelle chatten er ikke blandet inn i funn-chatten.
  // Boblen trekker seg unna mens tastaturet er oppe og over knapper – lukk
  // tastaturet og gå til bunnen av siden, der det er ledig plass.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole("button", { name: "Spør Artsorakel" })).not.toHaveAttribute("data-modus", "skjult");
  await page.getByRole("button", { name: "Spør Artsorakel" }).click();
  await expect(page.getByRole("dialog", { name: "Spør Artsorakel" }).getByText("Testsvar fra falsk AI.")).toHaveCount(0);
  slettFil(bilde);
});
