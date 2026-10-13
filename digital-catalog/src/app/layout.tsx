import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono, Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { StoreDesignProvider, SiteChrome } from '@/components/layout';
import { ReactQueryProvider } from '@/lib/react-query-provider';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Móveis Morante | Qualidade e Conforto para sua Casa',
  description:
    'Encontre os melhores móveis em Curitiba: Sofás, Colchões, Cozinhas e muito mais. Móveis Morante, tradição e confiança.',
  keywords:
    'móveis, móveis curitiba, sofás, colchões, cozinhas, quartos, móveis morante, catálogo de móveis',
  manifest: '/manifest.json',
  themeColor: '#0d1b2a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Móveis Morante',
  },
  openGraph: {
    title: 'Móveis Morante | Catálogo Online',
    description: 'Os melhores móveis com os melhores preços.',
    images: ['/og-image.jpg'],
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
        <ReactQueryProvider>
          <Suspense fallback={null}>
            <SiteChrome>{children}</SiteChrome>
          </Suspense>
        </ReactQueryProvider>
        <Toaster position="top-right" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('caches' in window) {
                caches.keys().then(function(names) {
                  names.forEach(function(name) {
                    if (name.startsWith('morante-cache-')) {
                      caches.delete(name);
                    }
                  });
                });
              }
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      registration.update();
                    },
                    function(err) {
                      console.warn('ServiceWorker registration failed: ', err);
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
