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
      className="bg-gray-800 border border-gray-700 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group relative"
    >
      {/* Card content */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="flex items-center justify-center gap-1.5">
          {/* Active/Inactive indicator */}
          {!map.started && (
            <div className="p-1 items-center gap-2">
              <div className="block w-2 h-2 rounded-full shadow-inner  bg-red-500"></div>
            </div>
          )}

          {map.started && (
            <svg
              className="animate-spin -ml-1 h-3 w-3 text-[#00f705]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          )}

          <h3 className="text-[10px] font-medium">{map.title}</h3>
        </div>

        {/* Action buttons */}
        <div className="absolute top-[30px] h-[10px] right-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {/* Play/Pause icons */}
          {map.started && (
            <a
              className="bg-gray-700 hover:bg-blue-800 text-blue-400 hover:text-blue-300 transition-colors"
              onClick={handleStopMap}
            >
              <span className="hero-pause-circle w-5 h-5" />
            </a>
          )}
          {!map.started && (
            <a
              className="bg-gray-700 hover:bg-blue-800 text-blue-400 hover:text-blue-300 transition-colors"
              onClick={handleStartMap}
            >
              <span className="hero-play-circle w-5 h-5" />
            </a>
          )}

          <a
            className="bg-gray-700 hover:bg-blue-800 text-blue-400 hover:text-blue-300 transition-colors"
            href={`/edit/${map.id}`}
          >
            <span className="hero-pencil-solid w-5 h-5" />
          </a>
          <button
            className="bg-gray-700 hover:bg-blue-800 text-blue-400 hover:text-blue-300 transition-colors"
            onClick={confirmDelete}
          >
            <span className="hero-trash-solid w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Futuristic bottom accent */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 opacity-90 group-hover:opacity-100 transition-opacity duration-300`}
        style={{ backgroundColor: map.color }}
      ></div>
    </div>
  );
};
