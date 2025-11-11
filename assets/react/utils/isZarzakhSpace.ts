import { SOLAR_SYSTEM_CLASS_IDS } from '../constants/classes';

export const isZarzakhSpace = (wormholeClassID: number) => {
  switch (wormholeClassID) {
    case SOLAR_SYSTEM_CLASS_IDS.zarzakh:
      return true;
  }

  return false;
};
