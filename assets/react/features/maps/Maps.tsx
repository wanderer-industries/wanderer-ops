import React from 'react';

import { useMaps, useShowSetup } from '@/react/state/useDashboard';

import { MapItem } from './MapItem';

export const Maps = () => {
  const maps = useMaps();
  const showSetup = useShowSetup();

  return (
    <header className="fixed bg-[#0000004d] w-full z-10">
      <div className="w-full px-2 flex justify-between items-center">
        <div className="grid grid-cols-6 gap-1">
          {maps.map(map => (
            <MapItem key={map.id} map={map} />
          ))}
          <a
            className="flex items-center justify-center bg-gray-800 border border-gray-700 p-1 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group relative overflow-hidden "
            href="/dashboard/create"
          >
            <span className="hero-plus-solid w-4 h-4" />
            <span className="text-[10px] font-medium px-1">Map</span>
          </a>
        </div>
        <div className="hero-cog-6-tooth-solid w-4 h-4" onClick={() => showSetup(true)} />
      </div>
    </header>
  );
};
