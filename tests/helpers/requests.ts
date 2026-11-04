import { NextRequest } from "next/server";
import sharp from "sharp";

export const BASE = "http://localhost:3000";

/** Et lite, ekte JPEG-bilde. `seed` gir unike bytes, så cachen ikke slår inn. */
export async function jpeg(seed = 0, opts: { width?: number; height?: number; gps?: boolean } = {}) {
  const { width = 320, height = 240, gps = false } = opts;
  let img = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 100 + (seed % 100), g: 80, b: (seed * 7) % 255 },
    },
  });
  if (gps) {
    img = img.withExif({
      IFD0: { Make: "TestKamera", Model: "Mobil X" },
      IFD3: {
        GPSLatitudeRef: "N",
        GPSLatitude: "59/1 54/1 0/1",
        GPSLongitudeRef: "E",
        GPSLongitude: "10/1 45/1 0/1",
      },
    });
  }
  return img.jpeg().toBuffer();
}

export const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#753"/></svg>'
);

export interface AnalyzeInput {
  image?: Buffer;
  imageType?: string;
  fileName?: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
}

export function analyzeRequest({
  image,
  imageType = "image/jpeg",
  fileName = "bilde.jpg",
  fields = {},
  headers = {},
}: AnalyzeInput): NextRequest {
  const fd = new FormData();
  if (image) fd.append("image", new Blob([new Uint8Array(image)], { type: imageType }), fileName);
  for (const [k, v] of Object.entries({ type: "dyr", ...fields })) fd.append(k, v);
  return new NextRequest(`${BASE}/api/analyze`, {
    method: "POST",
    body: fd,
    headers: { "x-forwarded-for": "203.0.113.10", ...headers },
  });
}

export function jsonRequest(
  path: string,
  body: unknown,
  { headers = {}, method = "POST" }: { headers?: Record<string, string>; method?: string } = {}
): NextRequest {
  return new NextRequest(`${BASE}${path}`, {
    method,
    body: method === "GET" ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.20", ...headers },
  });
}
