/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const nextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          // ── HTTPS ──────────────────────────────────────────
          {
            key: "Strict-Transport-Security",
            // 2 years, include subdomains, allow HSTS preload submission
            value: "max-age=63072000; includeSubDomains; preload",
          },

          // ── Clickjacking protection ────────────────────────
          {
            key: "X-Frame-Options",
            value: "DENY",
          },

          // ── Prevent MIME-type sniffing ──────────────────────
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },

          // ── Referrer policy ────────────────────────────────
          {
            // Send origin only to same-origin; nothing to cross-origin
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },

          // ── Disable browser features we don't need ─────────
          {
            key: "Permissions-Policy",
            // Allow camera for potential future Aadhaar scanning;
            // deny everything else we don't use
            value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
          },

          // ── Content Security Policy ────────────────────────
          {
            key: "Content-Security-Policy",
            value: [
              // Only allow resources from our own origin by default
              "default-src 'self'",

              // Scripts: own origin + Next.js inline scripts
              // 'unsafe-eval' is required in dev for webpack HMR; stripped in production
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,

              // Styles: own origin + Google Fonts CSS + inline styles (Tailwind/Next.js)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

              // Fonts: own origin + Google Fonts file delivery
              "font-src 'self' https://fonts.gstatic.com",

              // Images: own origin + data URIs (Aadhaar previews) + blob URIs
              "img-src 'self' data: blob:",

              // API connections: own origin + Supabase (REST + Realtime WebSocket)
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? " ws://localhost:* http://localhost:*" : ""}`,

              // Prevent embedding in iframes (redundant with X-Frame-Options but defense-in-depth)
              "frame-ancestors 'none'",

              // Block <object>, <embed>, <applet>
              "object-src 'none'",

              // Only allow forms to submit to own origin
              "form-action 'self'",

              // Restrict base URI to prevent <base> tag hijacking
              "base-uri 'self'",
            ].join("; "),
          },

          // ── XSS Protection (legacy browsers) ──────────────
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },

          // ── Prevent DNS prefetching to third parties ───────
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
