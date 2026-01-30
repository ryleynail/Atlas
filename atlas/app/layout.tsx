import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Atlas',
  description: 'Map‑first real estate intelligence platform built on Supabase and Mapbox',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body>{children}</body>
    </html>
  );
}