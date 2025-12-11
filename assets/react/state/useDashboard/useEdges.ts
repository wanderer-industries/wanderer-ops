import { useMemo } from 'react';

const useEdges = (connections: any[]): any[] => {
  const edges = useMemo(() => {
    console.log('[useEdges] Recalculating edges, connections count:', connections.length);
    const result = connections.map((connection: any) => ({
      id: `${connection.solar_system_source}-${connection.solar_system_target}`,
      source: `${connection.solar_system_source}`,
      target: `${connection.solar_system_target}`,
      data: {
        name: '',
      },
    }));

    return result;
  }, [connections]);

  return edges;
};

export default useEdges;
