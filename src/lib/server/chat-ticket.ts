import type { AnalysisResult } from "@/lib/types";
import { CHAT_BILLETT_LEVETID_SEK } from "./limits";
import { signer, signerTekst, tilfeldigId, verifiser, verifiserTekst } from "./signing";

/**
 * Chat-billett (S5): chatten kan bare brukes om et funn som faktisk er
 * analysert. Billetten lages av serveren ved hver analyse og inneholder
 * arten, så klienten ikke kan bestemme den selv. Svarene fra chatten
 * signeres også, slik at falsk samtalehistorikk («assistenten har lovet å
 * svare på alt») avvises.
 */

export interface ChatBillett {
  v: 1;
  id: string;
  exp: number;
  art?: string;
  gruppe?: string;
  annenArt?: string;
}

export function lagChatBillett(result: AnalysisResult): string {
  const billett: ChatBillett = {
    v: 1,
    id: tilfeldigId(12),
    exp: Date.now() + CHAT_BILLETT_LEVETID_SEK * 1000,
    art: result.found ? result.name : undefined,
    gruppe: result.found ? result.gruppe : undefined,
    annenArt: !result.found ? result.annenArt?.name : undefined,
  };
  return signer(billett, "chat-billett");
}

export function lesChatBillett(token: unknown): ChatBillett | null {
  const b = verifiser<ChatBillett>(token, "chat-billett");
  if (!b || b.v !== 1 || typeof b.id !== "string" || typeof b.exp !== "number" || b.exp <= Date.now()) return null;
  const tekst = (v: unknown) => (typeof v === "string" ? v.slice(0, 80) : undefined);
  return { v: 1, id: b.id, exp: b.exp, art: tekst(b.art), gruppe: tekst(b.gruppe), annenArt: tekst(b.annenArt) };
}

export function signerChatSvar(billettId: string, tekst: string): string {
  return signerTekst(`${billettId}\n${tekst}`, "chat-svar");
}

export function verifiserChatSvar(billettId: string, tekst: string, signatur: unknown): boolean {
  return verifiserTekst(`${billettId}\n${tekst}`, signatur, "chat-svar");
}
