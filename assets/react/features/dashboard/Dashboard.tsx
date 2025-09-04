import React from 'react';

import { DashboardProvider } from '@/react/state/useDashboard';

import Map from './Map';
import { Setup } from './Setup';

export const Dashboard = ({
  data,
  map_cached_data,
  pushEvent,
}: {
  data: any;
  map_cached_data: any;
  pushEvent: any;
}) => {
  return (
    <DashboardProvider pushEvent={pushEvent} serverMaps={data} mapCachedData={map_cached_data}>
      <Map />
      <Setup />
    </DashboardProvider>
  );
};
