import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { gjenkjennBildeformat } from "@/lib/server/image-format";
import { SVG } from "../helpers/requests";

const lag = (format: "jpeg" | "png" | "webp" | "gif" | "tiff" | "avif") =>
  sharp({ create: { width: 16, height: 16, channels: 3, background: "#888" } })[format]().toBuffer();

describe("gjenkjenning av bildeformat ut fra innholdet (S3)", () => {
  it.each(["jpeg", "png", "webp", "gif", "tiff"] as const)("kjenner igjen %s", async (f) => {
    expect(gjenkjennBildeformat(await lag(f))).toBe(f);
  });

  it("kjenner igjen AVIF/HEIF-familien", async () => {
    expect(gjenkjennBildeformat(await lag("avif"))).toBe("heif");
  });

  it("avviser SVG, PDF, HTML og tomme filer", () => {
    expect(gjenkjennBildeformat(SVG)).toBeNull();
    expect(gjenkjennBildeformat(Buffer.from("%PDF-1.7\n%âãÏÓ\n1 0 obj"))).toBeNull();
    expect(gjenkjennBildeformat(Buffer.from("<!doctype html><html></html>"))).toBeNull();
    expect(gjenkjennBildeformat(Buffer.alloc(0))).toBeNull();
  });
});
