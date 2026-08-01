import { useSyncExternalStore } from 'react';
import {
  getPortalDemoSnapshot,
  subscribeToPortalDemo,
} from '../services/portalDemoRepository';

export function usePortalDemo() {
  return useSyncExternalStore(
    subscribeToPortalDemo,
    getPortalDemoSnapshot,
    getPortalDemoSnapshot,
  );
}
