'use client';

import { useState } from 'react';

interface GHSPictogramsProps {
  pictograms?: string[];
  size?: 'sm' | 'md' | 'lg';
}

const pictogramData = {
  GHS01: {
    name: 'Explosive',
    symbol: '💥',
    description: 'Explosive; mass explosion hazard',
    color: 'bg-orange-500'
  },
  GHS02: {
    name: 'Flammable',
    symbol: '🔥',
    description: 'Flammable gases, liquids, solids',
    color: 'bg-red-500'
  },
  GHS03: {
    name: 'Oxidizing',
    symbol: '⚡',
    description: 'Oxidizing; may cause or intensify fire',
    color: 'bg-yellow-500'
  },
  GHS04: {
    name: 'Compressed Gas',
    symbol: '💨',
    description: 'Gas under pressure; may explode if heated',
    color: 'bg-blue-500'
  },
  GHS05: {
    name: 'Corrosive',
    symbol: '⚠️',
    description: 'Corrosive to metals, skin, eyes',
    color: 'bg-black'
  },
  GHS06: {
    name: 'Toxic',
    symbol: '☠️',
    description: 'Acute toxicity; fatal or toxic',
    color: 'bg-purple-500'
  },
  GHS07: {
    name: 'Harmful',
    symbol: '❗',
    description: 'Harmful; skin/eye irritant',
    color: 'bg-orange-400'
  },
  GHS08: {
    name: 'Health Hazard',
    symbol: '🫁',
    description: 'Health hazard; carcinogen, mutagen',
    color: 'bg-pink-500'
  },
  GHS09: {
    name: 'Environmental Hazard',
    symbol: '🌊',
    description: 'Hazardous to aquatic environment',
    color: 'bg-green-500'
  }
};

export function GHSPictograms({ pictograms = [], size = 'md' }: GHSPictogramsProps) {
  const [selectedPictogram, setSelectedPictogram] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  if (!pictograms || pictograms.length === 0) {
    return null;
  }

  const validPictograms = pictograms.filter(pictogram => 
    pictogramData[pictogram as keyof typeof pictogramData]
  );

  if (validPictograms.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {validPictograms.map((pictogram) => {
        const data = pictogramData[pictogram as keyof typeof pictogramData];
        if (!data) return null;

        return (
          <button
            key={pictogram}
            onClick={() => setSelectedPictogram(
              selectedPictogram === pictogram ? null : pictogram
            )}
            className={`
              ${sizeClasses[size]} 
              ${data.color} 
              text-white 
              rounded 
              flex 
              items-center 
              justify-center 
              transition-all 
              hover:scale-110 
              active:scale-95
              ${selectedPictogram === pictogram ? 'ring-2 ring-offset-1 ring-primary-500' : ''}
            `}
            title={data.name}
          >
            <span className="leading-none">{data.symbol}</span>
          </button>
        );
      })}

      {/* Tooltip */}
      {selectedPictogram && (
        <div className="absolute z-50 mt-12 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
          <div className="font-semibold">
            {pictogramData[selectedPictogram as keyof typeof pictogramData].name}
          </div>
          <div className="mt-1">
            {pictogramData[selectedPictogram as keyof typeof pictogramData].description}
          </div>
        </div>
      )}
    </div>
  );
}