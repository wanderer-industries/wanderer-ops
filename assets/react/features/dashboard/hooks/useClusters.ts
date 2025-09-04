import { useMemo } from 'react';

import { useMaps } from '@/react/state/useDashboard';

const createStyle = (baseColor: string) => ({
  fill: baseColor,
  stroke: baseColor,
  labelFill: '#fff',
  labelPadding: 2,
  labelBackgroundFill: baseColor,
  labelBackgroundRadius: 5,
});

const useClusters = (nodes: any[]): any[] => {
  const maps = useMaps();

  const groupedNodesByCluster = useMemo(
    () =>
      nodes.reduce((acc, node) => {
        const cluster = node.data.mapId;
        acc[cluster] ||= [];
        acc[cluster].push(node.id);
        return acc;
      }, {}),
    [nodes],
  );

  const clusters = useMemo(() => {
    const result = maps.map((map: any) => {
      return {
        key: map.id,
        type: 'hull',
        members: groupedNodesByCluster[map.id],
        // labelText: map.title,
        ...createStyle(map.color),
      };
    });

    return result;
  }, [maps, nodes]);

  return clusters;
};

export default useClusters;
