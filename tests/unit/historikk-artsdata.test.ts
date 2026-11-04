import { afterEach, describe, expect, it, vi } from "vitest";
import { addToHistory, ARTSDATA_VERSJON, harEldreArtsdata } from "@/lib/history";
import type { AnalysisResult } from "@/lib/types";

describe("artsdataversjon i historikken", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("funn uten versjon regnes som eldre artsdata, nye funn får dagens versjon", () => {
    expect(ARTSDATA_VERSJON).toBe(2);
    expect(harEldreArtsdata({})).toBe(true);
    expect(harEldreArtsdata({ artsdata: 1 })).toBe(true);
    expect(harEldreArtsdata({ artsdata: ARTSDATA_VERSJON })).toBe(false);

    const lager = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: { getItem: (k: string) => lager.get(k) ?? null, setItem: (k: string, v: string) => void lager.set(k, v), removeItem: (k: string) => void lager.delete(k) },
    });
    const [ny] = addToHistory({ found: true, name: "Stokkmaur" } as AnalysisResult, "", "kjeller");
    expect(ny.artsdata).toBe(ARTSDATA_VERSJON);
    expect(ny.resultat.name).toBe("Stokkmaur");
  });
});
