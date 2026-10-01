export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // det vi i det hele tatt tar imot
// Små insekter tar ofte liten plass på bildet, så vi beholder mer detalj enn
// før. 2,5 MB holder seg godt under grensen på 4,5 MB for forespørsler på Vercel.
export const TARGET_BYTES = 2.5 * 1024 * 1024; // det vi sikter mot å sende
const MAX_EDGE = 2048; // px på lengste side – samme som serveren sender videre
const FALLBACK_EDGE = 1600;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap håndterer EXIF-rotasjon og er raskest der den finnes.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // faller gjennom til <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
  } finally {
    // Revoker etter at bildet er dekodet; canvas-tegningen skjer synkront etterpå.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

function drawScaled(
  source: ImageBitmap | HTMLImageElement,
  maxEdge: number
): HTMLCanvasElement {
  const w = "width" in source ? source.width : 0;
  const h = "height" in source ? source.height : 0;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(source as CanvasImageSource, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

export interface CompressionOutcome {
  file: File;
  originalBytes: number;
  compressed: boolean;
}

/**
 * Skalerer og komprimerer bildet i nettleseren før opplasting.
 *
 * HEIC fra iPhone kan bare dekodes av Safari. Klarer ikke nettleseren å
 * dekode filen, sender vi originalen videre og lar serveren (sharp) prøve.
 * Vi feiler aldri opplastingen på grunn av komprimeringen alene.
 */
export async function compressImage(file: File): Promise<CompressionOutcome> {
  const originalBytes = file.size;

  try {
    const source = await decode(file);
    let quality = 0.9;
    let canvas = drawScaled(source, MAX_EDGE);
    let blob = await toBlob(canvas, quality);

    // Gå ikke under 0,7 – lavere kvalitet visker ut fine detaljer som
    // antenner, bein og hår, og det er nettopp de som skiller artene.
    while (blob && blob.size > TARGET_BYTES && quality > 0.75) {
      quality -= 0.1;
      blob = await toBlob(canvas, quality);
    }

    if (blob && blob.size > TARGET_BYTES) {
      canvas = drawScaled(source, FALLBACK_EDGE);
      blob = await toBlob(canvas, 0.8);
    }

    if ("close" in source && typeof source.close === "function") source.close();

    if (!blob || blob.size >= originalBytes) {
      return { file, originalBytes, compressed: false };
    }

    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return {
      file: new File([blob], name, { type: "image/jpeg", lastModified: Date.now() }),
      originalBytes,
      compressed: true,
    };
  } catch {
    return { file, originalBytes, compressed: false };
  }
}

/** Liten JPEG-thumbnail som data-URL, brukt i historikken. */
export async function makeThumbnail(file: File, edge = 160): Promise<string> {
  try {
    const source = await decode(file);
    const canvas = drawScaled(source, edge);
    if ("close" in source && typeof source.close === "function") source.close();
    return canvas.toDataURL("image/jpeg", 0.6);
  } catch {
    return "";
  }
}