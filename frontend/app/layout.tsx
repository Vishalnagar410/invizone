import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth';
import { ThemeProvider } from './components/theme-provider';
import { DebugPanel } from './components/debug-panel';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SmartChemView - Chemical Management',
  description: 'WebApp for Chemical Search, Structure Editing, and Stock Monitoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {children}
            {/* Add debug panel for development - positioned outside main content flow */}
            <DebugPanel />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}