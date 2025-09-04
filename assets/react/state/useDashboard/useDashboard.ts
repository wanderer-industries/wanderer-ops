import { useCallback, useEffect, useMemo } from 'react';
import parseInt from '@antv/util/lib/lodash/to-integer';
import useStateRef from 'react-usestateref';

import { ServerEvent } from '@/react/constants/serverEvent';
import { usePushEventAsync } from '@/react/hooks/usePushEventAsync';

import useEdges from './useEdges';
import useMapEdges from './useMapEdges';
import useMapNodes from './useMapNodes';
import useNodes from './useNodes';

type UseDashboardProps = {
  serverMaps: any[];
  mapCachedData: Record<string, any>;
  pushEvent?: (event: string, payload: any, callback?: (reply: any) => void) => void;
};

type DashboardContext = {
  setupVisible: boolean;
  maps: any[];
  nodes: any[];
  mapNodes: any[];
  edges: any[];
  mapEdges: any[];
  mapData: Record<string, any>;

  showSetup: (show: boolean) => void;
  editMap: (mapId: string) => Promise<void>;
  removeMap: (mapId: string) => Promise<void>;
  markAsMain: (systemId: string) => Promise<void>;
};

export const useDashboard = ({
  serverMaps,
  mapCachedData,
  pushEvent = () => {},
}: UseDashboardProps): DashboardContext => {
  const [showSetup, setShowSetup] = useStateRef<boolean>(false);
  const [maps, setMaps] = useStateRef<any[]>(serverMaps);
  const [mapData, setMapData] = useStateRef<Record<string, any>>({});

  const pushEventAsync = usePushEventAsync({ pushEvent });

  const systems = useMemo(() => {
    return maps.reduce((acc, map) => {
      if (!mapData[map.id]) return acc;
      return acc.concat(mapData[map.id].systems);
    }, []);
  }, [mapData, maps]);

  const connections = useMemo(() => {
    return maps.reduce((acc, map) => {
      if (!mapData[map.id]) return acc;
      return acc.concat(mapData[map.id].connections);
    }, []);
  }, [mapData, maps]);

  const { nodes } = useNodes(systems, maps);
  const edges = useEdges(connections);

  const mapNodes = useMapNodes(maps);
  const mapEdges = useMapEdges(maps);

  const editMap = useCallback(async (mapId: string) => {
    await pushEventAsync(ServerEvent.EDIT_MAP, mapId);
  }, []);

  const removeMap = useCallback(async (mapId: string) => {
    await pushEventAsync(ServerEvent.REMOVE_MAP, mapId);
  }, []);

  const markAsMain = useCallback(
    async (systemId: string) => {
      const node = nodes.find((n: any) => n.data.systemEveId === parseInt(systemId));

      if (!node) return;

      await pushEventAsync(ServerEvent.MARK_AS_MAIN, { mapId: node.data.mapId, systemEveId: node.data.systemEveId });
    },
    [nodes],
  );

  const markMapAsMain = useCallback(async (mapId: string) => {
    if (!mapId) return;

    await pushEventAsync(ServerEvent.MARK_MAP_AS_MAIN, { mapId: mapId });
  }, []);

  useEffect(() => {
    setMaps(serverMaps);
  }, [serverMaps]);

  useEffect(() => {
    setMapData(mapCachedData);
  }, [mapCachedData]);

  return {
    setupVisible: showSetup,
    maps,
    mapData,
    nodes,
    edges,
    mapNodes,
    mapEdges,
    editMap,
    removeMap,
    markAsMain,
    markMapAsMain,
    showSetup: setShowSetup,
  };
};
