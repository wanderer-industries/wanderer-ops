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
  useEditMap,
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
  value => value.editMap,
  value => value.removeMap,
  value => value.markAsMain,
  value => value.markMapAsMain,
  value => value.setupVisible,
  value => value.showSetup,
);
