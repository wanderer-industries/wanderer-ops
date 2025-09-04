import { useCallback, useEffect, useRef } from 'react';

interface usePushEventAsyncProps {
  pushEvent?: (event: string, payload: any, callback?: (reply: any) => void) => void;
}

type PushEventAsync = (event: string, payload: any) => Promise<{ result: string | any }>;

export const usePushEventAsync = ({ pushEvent = () => {} }: usePushEventAsyncProps): PushEventAsync => {
  const pushEventRef = useRef(pushEvent);

  useEffect(() => {
    pushEventRef.current = pushEvent;
  }, [pushEvent]);

  const pushEventAsync = useCallback(
    (event: string, payload: any): Promise<{ result: string | any }> =>
      new Promise(resolve => {
        pushEventRef.current(event, payload, (reply: { result: string | any }) => resolve(reply));
      }),
    [],
  );

  return pushEventAsync;
};
