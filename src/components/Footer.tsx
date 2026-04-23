import React from 'react';
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full px-4 md:px-12 py-10 bg-black border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] text-gray-500 uppercase tracking-[0.2em] font-medium mt-20">
      <div className="order-2 md:order-1">
        © 2024 GiantessTimeFlix — Immersive Perspective Streaming
      </div>
      
      <div className="flex flex-wrap justify-center gap-6 md:gap-10 order-1 md:order-2">
        <span className="hover:text-white cursor-pointer transition-colors underline-offset-4 hover:underline">Terms of Use</span>
        <span className="hover:text-white cursor-pointer transition-colors underline-offset-4 hover:underline">Privacy Policy</span>
        <span className="hover:text-white cursor-pointer transition-colors underline-offset-4 hover:underline">Help Center</span>
        <span className="hover:text-white cursor-pointer transition-colors underline-offset-4 hover:underline">Corporate</span>
      </div>
    </footer>
  );
}
