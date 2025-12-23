import { useMemo } from 'react';
import constate from 'constate';

import { getBackgroundClass } from '@/react/utils/getBackgroundClass';

type UseSharedMapProps = {
  map: any;
  mapCachedData: Record<string, any>;
  expiresAt: string;
};

const useSharedMap = ({ map, mapCachedData, expiresAt }: UseSharedMapProps) => {
  const systems = useMemo(() => {
    const data = mapCachedData[map.id];
    return data?.systems || [];
  }, [mapCachedData, map.id]);

  const connections = useMemo(() => {
    const data = mapCachedData[map.id];
    return data?.connections || [];
  }, [mapCachedData, map.id]);

  const nodes = useMemo(() => {
    return systems.map((system: any) => ({
      id: `${system.solar_system_id}`,
      style: {
        x: system.position_x * 0.5,
        y: system.position_y * 0.5,
      },
      data: {
        name: system.name,
        systemEveId: system.solar_system_id,
        mapId: system.map_id,
        nodeType: 'hexagon',
        bgFill: getBackgroundClass(system.static_info?.system_class, system.static_info?.security),
        systemClass: system.static_info?.system_class,
        security: system.static_info?.security,
        isMain: system.status === 1,
        isBorder: system.is_border || false,
        borderMaps: system.border_maps || [],
      },
    }));
  }, [systems]);

  const edges = useMemo(() => {
    return connections.map((connection: any) => ({
      id: `${connection.solar_system_source}-${connection.solar_system_target}`,
      source: `${connection.solar_system_source}`,
      target: `${connection.solar_system_target}`,
      data: {
        name: '',
      },
    }));
  }, [connections]);

  return {
    map,
    nodes,
    edges,
    expiresAt,
  };
};

export const [SharedMapProvider, useSharedMapContext, useSharedMapData, useSharedNodes, useSharedEdges, useExpiresAt] =
  constate(
    useSharedMap,
    value => value,
    value => value.map,
    value => value.nodes,
    value => value.edges,
    value => value.expiresAt,
  );
