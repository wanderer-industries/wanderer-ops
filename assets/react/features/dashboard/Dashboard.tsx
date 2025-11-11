import React from 'react';

import { DashboardProvider } from '@/react/state/useDashboard';

import Map from './Map';
import { Setup } from './Setup';

export const Dashboard = ({
  data,
  map_cached_data,
  license_state,
  pushEvent,
}: {
  data: any;
  map_cached_data: any;
  license_state: any;
  pushEvent: any;
}) => {
  return (
    <DashboardProvider
      pushEvent={pushEvent}
      serverMaps={data}
      mapCachedData={map_cached_data}
      licenseState={license_state}
    >
      <Map />
      <Setup />
    </DashboardProvider>
  );
};
