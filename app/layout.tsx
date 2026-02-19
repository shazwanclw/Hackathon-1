import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'StrayLink',
  description: 'Stray and urban wildlife reporting platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="container-shell py-6">{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
