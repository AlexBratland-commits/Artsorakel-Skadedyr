import { describe, expect, it } from "vitest";
import { LUA_OKN, LUA_RESERVER } from "@/lib/server/store";
import * as skript from "../../scripts/sjekk-upstash.mjs";

describe("scripts/sjekk-upstash.mjs", () => {
  it("bruker nøyaktig de samme Lua-skriptene som appen", () => {
    expect(skript.LUA_OKN).toBe(LUA_OKN);
    expect(skript.LUA_RESERVER).toBe(LUA_RESERVER);
  });
});
