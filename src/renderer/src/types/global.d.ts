import type { BridgeApi } from '../../../shared/ipc-contract';

declare global {
  interface Window {
    /** Set by the preload script. Missing when the renderer runs outside Electron. */
    bridge?: BridgeApi;
  }
}
