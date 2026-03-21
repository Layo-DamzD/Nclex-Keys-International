import { useEffect, useState } from 'react';
import {
  getPwaInstallSnapshot,
  promptToInstallPwa,
  subscribeToPwaInstall
} from '../services/pwaInstall';

export const usePwaInstall = () => {
  const [state, setState] = useState(() => getPwaInstallSnapshot());

  useEffect(() => {
    const unsubscribe = subscribeToPwaInstall(setState);
    setState(getPwaInstallSnapshot());
    return unsubscribe;
  }, []);

  return {
    ...state,
    promptToInstallPwa
  };
};

export default usePwaInstall;
