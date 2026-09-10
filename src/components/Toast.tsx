"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

type ToastKind = "ok" | "feil" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  melding: string;
}

interface ToastApi {
  vis: (melding: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast må brukes inne i <ToastProvider>");
  return ctx;
}

const ICONS = {
  ok: CheckCircle2,
  feil: TriangleAlert,
  info: Info,
} as const;

const TONES: Record<ToastKind, string> = {
  ok: "text-grad-lav",
  feil: "text-grad-hoy",
  info: "text-ocab-700 dark:text-ocab-200",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const fjern = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const vis = useCallback(
    (melding: string, kind: ToastKind = "info") => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, kind, melding }]);
      window.setTimeout(() => fjern(id), kind === "feil" ? 7000 : 4000);
    },
    [fjern]
  );

  const api = useMemo(() => ({ vis }), [vis]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card surface px-4 py-3 shadow-lifted"
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${TONES[t.kind]}`} aria-hidden />
              <p className="flex-1 text-sm leading-snug">{t.melding}</p>
              <button
                type="button"
                onClick={() => fjern(t.id)}
                className="-m-1 rounded p-1 text-muted transition hover:text-[color:var(--ink)]"
                aria-label="Lukk melding"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}