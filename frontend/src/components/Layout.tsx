// src/components/Layout.tsx
import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  );
}
