import React from 'react';

import { useSetupVisible } from '@/react/state/useDashboard';

import MapsSetup from './MapsSetup';

export const Setup = () => {
  const setupVisible = useSetupVisible();

  if (!setupVisible) return null;
  return <MapsSetup />;
};
