import constate from 'constate';

import { useDashboard } from './useDashboard';

export const [
  DashboardProvider,
  useDashboardContext,
  useMaps,
  useNodes,
  useMapNodes,
  useEdges,
  useMapEdges,
  useMapLicenseState,
  useEditMap,
  useStartMap,
  useStopMap,
  useRemoveMap,
  useMarkAsMain,
  useMarkMapAsMain,
  useSetupVisible,
  useShowSetup,
] = constate(
  useDashboard,
  value => value,
  value => value.maps,
  value => value.nodes,
  value => value.mapNodes,
  value => value.edges,
  value => value.mapEdges,
  value => value.mapLicenseState,
  value => value.editMap,
  value => value.startMap,
  value => value.stopMap,
  value => value.removeMap,
  value => value.markAsMain,
  value => value.markMapAsMain,
  value => value.setupVisible,
  value => value.showSetup,
);
