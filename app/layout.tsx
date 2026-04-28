import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'eSewa KYC Fraud Detection',
  description:
    'AI-powered KYC fraud detection system for eSewa — detects forged documents, duplicate identities, liveness spoofing, and device anomalies in real-time.',
  keywords: ['KYC', 'fraud detection', 'eSewa', 'Nepal', 'identity verification', 'e-KYC'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <style>{`
          *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          html {
            scroll-behavior: smooth;
          }

          body {
            font-family: 'Sora', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #070d1a;
            color: #f1f5f9;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          a {
            color: inherit;
            text-decoration: none;
          }

          button {
            font-family: inherit;
            cursor: pointer;
            border: none;
            outline: none;
          }

          input, select, textarea {
            font-family: inherit;
          }

          ::-webkit-scrollbar {
            width: 6px;
          }

          ::-webkit-scrollbar-track {
            background: #0a0f1e;
          }

          ::-webkit-scrollbar-thumb {
            background: #1e2d4a;
            border-radius: 3px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: #2d4a6a;
          }
        `}</style>
      </body>
    </html>
  );
}
