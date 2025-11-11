import { useMemo } from 'react';

import { getBackgroundClass } from '@/react/utils/getBackgroundClass';

const filterUniqueSystems = (data: any[], main_map_id: string) => {
  const map = new Map();

  for (const item of data) {
    const systemId = item.solar_system_id;

    if (!map.has(systemId)) {
      // First occurrence → add it
      map.set(systemId, item);
    } else {
      const existing = map.get(systemId);

      // Prefer item with map_id === main_map_id
      const existingPreferred = existing.map_id === main_map_id;
      const currentPreferred = item.map_id === main_map_id;

      if (!existingPreferred && currentPreferred) {
        // Replace existing with the one from main_map_id
        map.set(systemId, item);
      }
    }
  }

  return Array.from(map.values());
};

const useNodes = (systems: any[], maps: any[]): any => {
  const mapsMap = useMemo(() => {
    const result = maps.reduce((acc: any, map: any) => {
      acc[map.id] = map;
      return acc;
    }, {});

    return result;
  }, [maps]);

  const nodes = useMemo(() => {
    const mainMapId = maps[0].id;
    const result = filterUniqueSystems(systems, mainMapId).map((system: any) => {
      return {
        id: `${system.solar_system_id}`,
        data: {
          name: system.name,
          systemEveId: system.solar_system_id,
          mapId: system.map_id,
          nodeType: 'hexagon',
          bgFill: getBackgroundClass(system.static_info.system_class, system.static_info.security),
          isMain: system.status === 1,
          isBorder: system.is_border || false,
          borderMaps: system.border_maps || [],
        },
      };
    });

    return result;
  }, [systems, mapsMap, maps]);

  return { nodes };
};

export default useNodes;
