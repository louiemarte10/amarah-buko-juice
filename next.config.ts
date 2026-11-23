import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This POS app is fully dynamic (live inventory, auth), so we don't use the
  // Cache Components prerender model. Data flows through Route Handlers that are
  // dynamic by default.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
