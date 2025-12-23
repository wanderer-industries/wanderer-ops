import React, { useCallback, useState } from 'react';

import { useMaps, usePushEvent, useShowSetup } from '@/react/state/useDashboard';
import { ShareLinksModal } from '@/react/features/share/ShareLinksModal';

import { MapItem } from './MapItem';

export const Maps = () => {
  const maps = useMaps();
  const showSetup = useShowSetup();
  const pushEvent = usePushEvent();

  const [shareModalOpen, setShareModalOpen] = useState(false);

  const handleOpenShare = useCallback(() => {
    setShareModalOpen(true);
  }, []);

  const handleCloseShare = useCallback(() => {
    setShareModalOpen(false);
  }, []);

  return (
    <>
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

          {/* Right side buttons */}
          <div className="flex items-center gap-1">
            {/* Share button */}
            <button
              className="p-1.5 rounded border border-orange-500/20 bg-cyber-dark-800/50
                         hover:border-orange-500/50 hover:bg-orange-500/10 transition-all duration-200 group"
              onClick={handleOpenShare}
              title="Share Dashboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-3.5 h-3.5 text-orange-400/70 group-hover:text-orange-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                />
              </svg>
            </button>

            {/* Settings button */}
            <button
              className="p-1.5 rounded border border-cyber-primary/20 bg-cyber-dark-800/50
                         hover:border-cyber-primary/50 hover:bg-cyber-primary/10 transition-all duration-200 group"
              onClick={() => showSetup(true)}
            >
              <span className="hero-cog-6-tooth-solid w-3.5 h-3.5 text-cyber-primary/70 group-hover:text-cyber-primary" />
            </button>
          </div>
        </div>

        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-primary/30 to-transparent" />
      </header>

      {/* Share Links Modal */}
      <ShareLinksModal isOpen={shareModalOpen} onClose={handleCloseShare} pushEvent={pushEvent} />
    </>
  );
};
