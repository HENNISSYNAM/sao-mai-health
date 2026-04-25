import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Workbox generates sw.js — replaces the manual public/sw.js
      // Push notification logic lives in public/push-handler.js (imported below)
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp}"],
        importScripts: ["/push-handler.js"],
        // NetworkFirst for Supabase: prefer live data, fallback to 5-min cache when offline
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/eovndykfixqvvsvovmsw\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-v1",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // CacheFirst for Mapbox tiles: tiles don't change, cache 30 days
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "mapbox-tiles-v1",
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // StaleWhileRevalidate for fonts + static CDN assets
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-v1" },
          },
        ],
      },
      // Web app manifest — enables "Add to Home Screen" on mobile
      manifest: {
        name: "Sao Mai Health",
        short_name: "SaoMai",
        description: "Nền tảng giám sát sức khỏe và dịch tễ học cộng đồng",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        orientation: "portrait-primary",
        scope: "/",
        start_url: "/",
        lang: "vi",
        categories: ["health", "medical"],
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        // App shortcuts — show on long-press of app icon on Android
        shortcuts: [
          {
            name: "Nhập ca bệnh nhanh",
            short_name: "Ca bệnh",
            description: "Nhập ca bệnh mới trong 30 giây",
            url: "/case-intake",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Bản đồ giám sát",
            short_name: "Bản đồ",
            description: "Xem bản đồ dịch tễ theo thời gian thực",
            url: "/maps",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
          {
            name: "Đánh giá đột quỵ",
            short_name: "Đột quỵ",
            description: "Đánh giá rủi ro đột quỵ theo môi trường",
            url: "/stroke-risk",
            icons: [{ src: "/pwa-192.png", sizes: "192x192" }],
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-mapbox": ["mapbox-gl"],
          "vendor-three": ["three", "@react-three/fiber", "@react-three/drei"],
          "vendor-recharts": ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-label",
            "@radix-ui/react-menubar",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
          ],
        },
      },
    },
  },
}));
