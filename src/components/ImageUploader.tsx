"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { useToast } from "./Toast";
import { formatBytes, MAX_UPLOAD_BYTES } from "@/lib/image-tools";

interface ImageUploaderProps {
  onImageSelect: (file: File | null) => void;
  imagePreview: string | null;
  fileName?: string;
  fileSize?: number;
  disabled?: boolean;
}

const OK_TYPES = /^image\//i;

export default function ImageUploader({
  onImageSelect,
  imagePreview,
  fileName,
  fileSize,
  disabled = false,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { vis } = useToast();

  const validerOgVelg = (file: File | null) => {
    if (!file) return onImageSelect(null);

    if (!OK_TYPES.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      vis("Filen er ikke et bilde. Bruk JPG, PNG, WebP eller HEIC.", "feil");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      vis(`Bildet er ${formatBytes(file.size)}. Grensen er 15 MB.`, "feil");
      return;
    }
    onImageSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validerOgVelg(e.target.files?.[0] ?? null);
    e.target.value = "";
  };

  const åpneGalleri = () => {
    const input = fileInputRef.current;
    if (!input) return;
    // Viktig: fjern capture, ellers åpner denne knappen kamera etter at
    // «Ta bilde» har vært brukt én gang.
    input.removeAttribute("capture");
    input.click();
  };

  const åpneKamera = () => {
    const input = fileInputRef.current;
    if (!input) return;
    input.setAttribute("capture", "environment");
    input.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    validerOgVelg(e.dataTransfer.files?.[0] ?? null);
  };

  if (imagePreview) {
    return (
      <figure className="overflow-hidden rounded-card surface shadow-raised">
        <div className="relative bg-[color:var(--surface-sunken)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Bildet du har valgt"
            className="mx-auto max-h-[22rem] w-full object-contain"
          />
          <button
            type="button"
            onClick={() => onImageSelect(null)}
            disabled={disabled}
            className="no-print absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-[color:var(--surface)]/90 text-ocab-900 shadow-raised backdrop-blur transition hover:bg-[color:var(--surface)] disabled:opacity-40 dark:text-ocab-200"
            aria-label="Fjern bildet"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {fileName && (
          <figcaption className="flex items-center justify-between gap-3 border-t hairline px-4 py-2.5 text-xs">
            <span className="truncate font-medium" title={fileName}>
              {fileName}
            </span>
            {typeof fileSize === "number" && (
              <span className="shrink-0 tabular-nums text-muted">
                {formatBytes(fileSize)}
              </span>
            )}
          </figcaption>
        )}

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </figure>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-card border-2 border-dashed p-6 text-center transition sm:p-10 ${
        dragging
          ? "border-signal-500 bg-signal-100/60 dark:bg-signal-600/10"
          : "hairline bg-[color:var(--surface)]/70"
      }`}
    >
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <ImageUp className="mx-auto size-9 text-ocab-500" aria-hidden />

      <p className="mt-4 text-lg font-semibold">Legg inn et bilde av dyret</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        Gå så nær du tør, hold kameraet i ro, og få med hele dyret. Jo skarpere
        bilde, jo sikrere svar.
      </p>

      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={åpneKamera}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-ocab-900 px-6 py-3 font-semibold text-white shadow-raised transition hover:bg-ocab-950 active:scale-[0.98] disabled:opacity-50"
        >
          <Camera className="size-5" aria-hidden />
          Ta bilde
        </button>
        <button
          type="button"
          onClick={åpneGalleri}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-ocab-900/25 px-6 py-3 font-semibold text-ocab-900 transition hover:bg-ocab-50 disabled:opacity-50 dark:border-ocab-200/30 dark:text-ocab-200 dark:hover:bg-white/5"
        >
          Velg fra bilder
        </button>
      </div>

      <p className="mt-5 text-xs text-muted">
        JPG, PNG, WebP eller HEIC. Du kan også dra en fil hit.
      </p>
    </div>
  );
}