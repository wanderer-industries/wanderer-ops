import React from 'react';

import { useMaps, useShowSetup } from '@/react/state/useDashboard';

import { MapItem } from './MapItem';

export const Maps = () => {
  const maps = useMaps();
  const showSetup = useShowSetup();

  return (
    <header className="fixed w-full z-10">
      {/* Cyber header background */}
      <div className="absolute inset-0 bg-cyber-dark-900/90 backdrop-blur-md border-b border-cyber-primary/20" />

      <div className="relative w-full px-2 py-1 flex justify-between items-center">
        {/* Maps grid */}
        <div className="flex items-center gap-1">
          {maps.map(map => (
            <MapItem key={map.id} map={map} />
          ))}

          {/* Add Map Button */}
          <a
            className="flex items-center justify-center gap-0.5 px-2 py-1
                       bg-cyber-dark-800/80 border border-cyber-primary/30 rounded
                       hover:border-cyber-primary hover:bg-cyber-primary/10
                       transition-all duration-200 group"
            href="/create"
          >
            <span className="hero-plus-solid w-3 h-3 text-cyber-primary" />
            <span className="text-[9px] font-mono font-medium uppercase text-cyber-primary/80 group-hover:text-cyber-primary">
              Map
            </span>
          </a>
        </div>

        {/* Settings button */}
        <button
          className="p-1.5 rounded border border-cyber-primary/20 bg-cyber-dark-800/50
                     hover:border-cyber-primary/50 hover:bg-cyber-primary/10 transition-all duration-200 group"
          onClick={() => showSetup(true)}
        >
          <span className="hero-cog-6-tooth-solid w-3.5 h-3.5 text-cyber-primary/70 group-hover:text-cyber-primary" />
        </button>
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-primary/30 to-transparent" />
    </header>
  );
};
