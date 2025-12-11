import React, { useCallback } from 'react';

import { useConfirmDialog } from '@/react/hooks/useConfirmDialog';
import { useRemoveMap, useStartMap, useStopMap } from '@/react/state/useDashboard';

export const MapItem = ({ map }: { map: any }) => {
  const removeMap = useRemoveMap();
  const stopMap = useStopMap();
  const startMap = useStartMap();

  const handleRemoveMap = useCallback(() => {
    removeMap(map.id);
  }, [map.id]);

  const handleStartMap = useCallback(() => {
    startMap(map.id);
  }, [map.id]);

  const handleStopMap = useCallback(() => {
    stopMap(map.id);
  }, [map.id]);

  const confirmDelete = useConfirmDialog({
    text: 'Confirm removing map',
    onConfirm: handleRemoveMap,
  });

  return (
    <div
      key={map.id}
      className="relative bg-cyber-dark-800/80 border border-cyber-primary/20 rounded
                 hover:border-cyber-primary/50 transition-all duration-200 group overflow-hidden"
    >
      {/* Card content */}
      <div className="relative z-10 flex items-center px-1 gap-1.5">
        {/* Status indicator */}
        {!map.started ? (
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-danger shadow-[0_0_4px_rgba(255,51,102,0.6)]" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-cyber-accent shadow-[0_0_4px_rgba(0,255,136,0.6)] animate-pulse" />
        )}

        {/* Map title */}
        <span className="text-[9px] font-mono font-medium uppercase text-cyber-primary/80 group-hover:text-cyber-primary">
          {map.title}
        </span>

        {/* Action buttons - inline, appear on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-auto">
          {map.started ? (
            <button
              className="p-0.5 hover:bg-cyber-warning/20 rounded transition-colors"
              onClick={handleStopMap}
              title="Stop"
            >
              <span className="hero-pause-circle w-3 h-3 text-cyber-warning" />
            </button>
          ) : (
            <button
              className="p-0.5 hover:bg-cyber-accent/20 rounded transition-colors"
              onClick={handleStartMap}
              title="Start"
            >
              <span className="hero-play-circle w-3 h-3 text-cyber-accent" />
            </button>
          )}
          <a
            className="p-0.5 hover:bg-cyber-secondary/20 rounded transition-colors"
            href={`/edit/${map.id}`}
            title="Edit"
          >
            <span className="hero-pencil-solid w-3 h-3 text-cyber-secondary" />
          </a>
          <button
            className="p-0.5 hover:bg-cyber-danger/20 rounded transition-colors"
            onClick={confirmDelete}
            title="Delete"
          >
            <span className="hero-trash-solid w-3 h-3 text-cyber-danger" />
          </button>
        </div>
      </div>

      {/* Color accent bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: map.color }} />
    </div>
  );
};
