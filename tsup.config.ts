import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { cli: "src/entry/cli.ts" },
    format: ["esm"],
    target: "node22",
    platform: "node",
    bundle: true,
    splitting: false,
    clean: true,
    minify: false,
    sourcemap: false,
    dts: false,
    banner: { js: "#!/usr/bin/env node" }
  },
  {
    entry: { index: "src/index.ts" },
    format: ["esm"],
    target: "node22",
    platform: "node",
    bundle: true,
    splitting: false,
    clean: false,
    minify: false,
    sourcemap: false,
    dts: true
  }
]);
