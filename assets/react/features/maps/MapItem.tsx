import React, { useCallback } from 'react';

import { useConfirmDialog } from '@/react/hooks/useConfirmDialog';
import { useEditMap, useRemoveMap } from '@/react/state/useDashboard';

export const MapItem = ({ map }: { map: any }) => {
  const editMap = useEditMap();
  const removeMap = useRemoveMap();

  const handleEditMap = useCallback(() => {
    editMap(map.id);
  }, [map.id]);

  const handleRemoveMap = useCallback(() => {
    removeMap(map.id);
  }, [map.id]);

  const confirmDelete = useConfirmDialog({
    text: 'Confirm removing map',
    onConfirm: handleRemoveMap,
  });

  return (
    <div
      key={map.id}
      className="bg-gray-800 border border-gray-700 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10 group relative overflow-hidden"
    >
      {/* Card content */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className="flex items-center justify-center">
          <h3 className="text-[10px] font-medium px-2">{map.title}</h3>
        </div>

        {/* Action buttons */}
        <div className="absolute top-0 right-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <a
            className="bg-gray-700 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 transition-colors"
            href={`/dashboard/edit/${map.id}`}
          >
            <span className="hero-pencil-solid w-5 h-12" />
          </a>
          <button
            className="bg-gray-700 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 transition-colors"
            onClick={confirmDelete}
          >
            <span className="hero-trash-solid w-5 h-12" />
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
