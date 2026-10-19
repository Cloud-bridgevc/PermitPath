import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();
// `npm run build` runs OpenNext itself, so point it at the plain Next build to avoid recursion.
config.buildCommand = "npm run build:next";

export default config;
