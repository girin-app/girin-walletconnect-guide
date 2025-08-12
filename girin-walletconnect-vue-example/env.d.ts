/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 환경 변수 타입 정의
interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_DESCRIPTION: string;
  readonly VITE_APP_URL: string;
  readonly VITE_APP_ICON_URL: string;
  readonly VITE_XRPL_NETWORK: "mainnet" | "testnet";
  readonly VITE_XRPL_MAINNET_URL: string;
  readonly VITE_XRPL_TESTNET_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
