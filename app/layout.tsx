import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Project Verde V3.0 — Autonomous Plant OS',
  description: 'Cyberpunk IoT Hydroponic & Botanist Dashboard with Gemini AI Pathology Scanner',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#090a0f] text-slate-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
