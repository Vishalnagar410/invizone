'use client';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#2e0249] border-t border-[#f806cc]/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-center md:text-left mb-4 md:mb-0">
            <p className="text-white/80 text-sm">
              © {currentYear} ReyChemIQ. All rights reserved.
            </p>
            <p className="text-white/60 text-xs mt-1">
              Developed by Mann, Reyaan & Vishal
            </p>
          </div>
          <div className="text-white/60 text-sm">
            Smart Chemistry. Intelligent Inventory.
          </div>
        </div>
      </div>
    </footer>
  );
}