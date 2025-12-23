import React from 'react';

import { SharedMapProvider } from '@/react/state/useSharedMap';
import SharedMapViewer from './SharedMapViewer';

interface SharedMapProps {
  map: any;
  map_cached_data: Record<string, any>;
  expires_at: string;
}

export const SharedMap: React.FC<SharedMapProps> = ({ map, map_cached_data, expires_at }) => {
  return (
    <SharedMapProvider map={map} mapCachedData={map_cached_data} expiresAt={expires_at}>
      <SharedMapViewer />
    </SharedMapProvider>
  );
};

export default SharedMap;
