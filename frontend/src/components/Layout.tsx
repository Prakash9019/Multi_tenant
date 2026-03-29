// src/components/Layout.tsx
import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#f4f5f7] min-h-screen flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        {children}
      </main>
    </div>
  );
}