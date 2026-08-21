/// <reference types="vite/client" />

import type { FrontendEnv } from './utils/env/parseEnv'

// Declares the VITE_* variables the app reads, so import.meta.env lines up
// with what parseEnv expects instead of being an empty interface.
declare global {
  interface ImportMetaEnv extends FrontendEnv {}
}

export {}
