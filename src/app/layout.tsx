import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

// Bytt til Ocabs egen webfont her hvis dere har lisensfilene:
// import localFont from "next/font/local";
// const ocabSans = localFont({ src: "./fonts/…", variable: "--font-ocab-sans" });
const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ocab-sans",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Artsbestemmer – Ocab",
    template: "%s – Ocab",
  },
  description:
    "Ta bilde av insektet eller dyret, så foreslår vi hvilken art det er og hva du bør gjøre videre. Fra Ocab, med over 40 års erfaring med skadedyr.",
  applicationName: "Ocab Artsbestemmer",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/ocab-logo.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Artsbestemmer",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Artsbestemmer – Ocab",
    description: "Ta bilde av skadedyret. Få forslag til art og tiltak.",
    locale: "nb_NO",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8f0f8" },
    { media: "(prefers-color-scheme: dark)", color: "#071220" },
  ],
};

// Settes før første maling, så mørk modus ikke blinker hvitt.
const themeBootstrap = `
try {
  var stored = localStorage.getItem("ocab-tema");
  var dark = stored ? stored === "dark"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (dark) document.documentElement.classList.add("dark");
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nb" className={sans.variable} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <a
          href="#innhold"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ocab-900 focus:px-4 focus:py-2 focus:text-white"
        >
          Hopp til innholdet
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}