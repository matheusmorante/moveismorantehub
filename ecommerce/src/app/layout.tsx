import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { StoreDesignProvider, SiteChrome } from "@/components/layout";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Móveis Morante | Qualidade e Conforto para sua Casa",
  description: "Encontre os melhores móveis em Curitiba: Sofás, Colchões, Cozinhas e muito mais. Móveis Morante, tradição e confiança.",
  keywords: "móveis, móveis curitiba, sofás, colchões, cozinhas, quartos, móveis morante, catálogo de móveis",
  manifest: "/manifest.json",
  themeColor: "#0d1b2a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Móveis Morante",
  },
  openGraph: {
    title: "Móveis Morante | Catálogo Online",
    description: "Os melhores móveis com os melhores preços.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans overflow-x-hidden bg-background">
        <StoreDesignProvider />
        <SiteChrome>{children}</SiteChrome>
        <Toaster position="top-right" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
