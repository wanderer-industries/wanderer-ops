import {
  SECURITY_BACKGROUND_CLASSES,
  SYSTEM_CLASS_BACKGROUND_CLASSES,
  WORMHOLE_CLASS_BACKGROUND_CLASSES,
} from '../constants/classes';

import { isKnownSpace } from './isKnownSpace';
import { isWormholeSpace } from './isWormholeSpace';
import { isZarzakhSpace } from './isZarzakhSpace';

export const getBackgroundClass = (systemClass: number, security: string) => {
  if (isZarzakhSpace(systemClass)) {
    return SYSTEM_CLASS_BACKGROUND_CLASSES[systemClass];
  } else if (isKnownSpace(systemClass)) {
    return SECURITY_BACKGROUND_CLASSES[security];
  } else if (isWormholeSpace(systemClass)) {
    return WORMHOLE_CLASS_BACKGROUND_CLASSES[systemClass];
  } else {
    return SYSTEM_CLASS_BACKGROUND_CLASSES[systemClass];
  }
};
