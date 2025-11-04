import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '../lib/auth';
import { ThemeProvider } from './components/theme-provider';
import { DebugPanel } from './components/debug-panel';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['600', '700'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'ReyChemIQ - Chemical Management',
  description: 'Smart Chemistry. Intelligent Inventory. - A secure, modern, AI-driven chemical inventory and lab management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${poppins.variable}`}>
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