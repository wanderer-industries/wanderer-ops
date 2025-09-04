import { useMemo } from 'react';

function createEdges(maps: any[]): any[] {
  if (!maps.length) return [];
  // Find the main object (assumes only one exists)
  const mainMap = maps.find(map => map.is_main) || maps[0];

  // Create edges between main and all non-main objects
  return maps
    .filter(map => map.id !== mainMap.id) // exclude main object
    .map(map => ({
      id: `${mainMap.id}-${map.id}`,
      source: mainMap.id,
      target: map.id,
      data: {
        name: '',
      },
    }));
}

const useMapEdges = (maps: any[]): any[] => {
  const edges = useMemo(() => {
    return createEdges(maps);
  }, [maps]);

  return edges;
};

export default useMapEdges;
