/// <reference types="vite/client" />

interface Window {
  ezstandalone?: {
    cmd: any[];
    showAds: () => void;
    define?: (...args: any[]) => void;
    enable?: (...args: any[]) => void;
    display?: (...args: any[]) => void;
    initialized?: boolean;
  };
  ezslots?: any[];
}