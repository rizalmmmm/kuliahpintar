// Definisi tipe Hono context untuk type-safe env variables dan variables
export type AppEnv = {
  Bindings: Record<string, never> // pakai process.env, bukan Bindings (Node.js adapter)
  Variables: {
    userId: string
  }
}
