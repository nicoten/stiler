import { useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from 'ui/context/AppProvider';

export const useAsyncReference = (value, isProp = false) => {
  const ref = useRef(value);
  const [, forceRender] = useState(false);

  function updateState(newState) {
    if (!Object.is(ref.current, newState)) {
      ref.current = newState;
      forceRender(s => !s);
    }
  }

  if (isProp) {
    ref.current = value;
    return ref;
  }

  return [ref, updateState];
};

export const usePrevious = value => {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

export const useInterval = (callback, delay) => {
  const [tileCheckDelay, setTileCheckDelay] = useState(null);

  const savedCallback = useRef();

  useEffect(() => {
    savedCallback.current = callback;
  });

  useEffect(() => {
    function tick() {
      savedCallback.current();
    }

    if (tileCheckDelay !== null) {
      let id = setInterval(tick, tileCheckDelay);
      return () => clearInterval(id);
    }
  }, [tileCheckDelay]);

  return () => {
    setTileCheckDelay(tileCheckDelay === null ? delay : null);
  };
};

export const useIsFirstRender = () => {
  const isMountRef = useRef(true);
  useEffect(() => {
    isMountRef.current = false;
  }, []);
  return isMountRef.current;
};

export const useEnvironment = ({ environmentId }) => {
  const { environments } = useContext(AppContext);
  return environments.find(e => e.id === environmentId);
};
