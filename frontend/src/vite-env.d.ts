/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOLANA_RPC_ENDPOINT?: string;
  readonly VITE_METADATA_BASE_URL?: string;
  readonly VITE_PROGRAM_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
