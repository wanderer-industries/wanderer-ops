import { useMemo } from 'react';

const useMapNodes = (maps: any[]): any[] => {
  const nodes = useMemo(() => {
    const result = maps
      .map((map: any) => {
        return {
          id: `${map.id}`,
          data: {
            name: map.title,
            color: map.color,
            isMain: map.is_main,
            order: map.is_main ? 10 : 1,
          },
        };
      })
      .sort((a, b) => b.data.order - a.data.order);

    return result;
  }, [maps]);

  return nodes;
};

export default useMapNodes;
