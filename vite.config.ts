import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { pathToFileURL } from "url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
  root: path.resolve(__dirname),
  server: {
    port: 5000,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    {
      name: "vercel-api-middleware",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith("/api/")) {
            // Expose .env / .env.local to serverless-style API handlers in dev
            for (const [key, value] of Object.entries(env)) {
              if (value && !process.env[key]) {
                process.env[key] = value;
              }
            }

            try {
              const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
              const apiName = urlObj.pathname.slice(5); // Remove "/api/"

              if (!/^[a-z][a-z0-9-]*$/.test(apiName)) {
                next();
                return;
              }

              // Resolve to .ts or .js file in ./api/ directory
              let apiPath = path.resolve(__dirname, `./api/${apiName}.ts`);
              let exists = true;
              try {
                await fs.promises.access(apiPath);
              } catch {
                try {
                  apiPath = path.resolve(__dirname, `./api/${apiName}.js`);
                  await fs.promises.access(apiPath);
                } catch {
                  exists = false;
                }
              }

              if (!exists) {
                next();
                return;
              }

              const { default: handler } = await import(pathToFileURL(apiPath).href);

              // Parse search query params
              const query: Record<string, string> = {};
              urlObj.searchParams.forEach((val, key) => {
                query[key] = val;
              });

              // Read request body for POST/PUT requests
              let body: any = "";
              if (req.method === "POST" || req.method === "PUT") {
                const chunks: Buffer[] = [];
                let bytes = 0;
                for await (const chunk of req) {
                  bytes += chunk.length;
                  if (bytes <= 4_400_000) chunks.push(chunk);
                }
                if (bytes > 4_400_000) {
                  res.statusCode = 413;
                  res.end("Request body too large");
                  return;
                }
                body = Buffer.concat(chunks).toString("utf8");
              }

              const mockReq = {
                method: req.method,
                query,
                body,
                headers: req.headers,
              };

              const mockRes = {
                statusCode: 200,
                get headersSent() { return res.headersSent; },
                flushHeaders() {
                  res.statusCode = this.statusCode;
                  for (const [key, value] of Object.entries(this.headers)) res.setHeader(key, value);
                  res.flushHeaders();
                },
                headers: {} as Record<string, string>,
                status(code: number) {
                  this.statusCode = code;
                  return this;
                },
                setHeader(name: string, val: string) {
                  this.headers[name] = val;
                  return this;
                },
                write(chunk: any) {
                  if (!res.headersSent) this.flushHeaders();
                  res.write(chunk);
                  return this;
                },
                end(data?: any) {
                  if (!res.headersSent) this.flushHeaders();
                  res.end(data);
                  return this;
                },
                json(data: unknown) {
                  res.statusCode = this.statusCode;
                  res.setHeader("Content-Type", "application/json");
                  for (const [k, v] of Object.entries(this.headers)) {
                    res.setHeader(k, v as string);
                  }
                  res.end(JSON.stringify(data));
                  return this;
                },
              };

              await handler(mockReq, mockRes);
            } catch (err) {
              console.error("Vercel API Middleware error:", err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Internal Server Error" }));
            }
            return;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: path.resolve(__dirname),
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Firebase SDK (large)
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage",
            "firebase/analytics",
          ],
          // Charting library (large)
          "vendor-recharts": ["recharts"],
          // Radix UI primitives
          "vendor-radix": [
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
          // Animation libraries
          "vendor-animation": ["framer-motion", "gsap", "@gsap/react"],
          // Markdown renderer
          "vendor-markdown": ["react-markdown"],
          // PDF renderer (heavy, only used on materials page)
          "vendor-pdf": ["pdfjs-dist"],
        },
      },
    },
    // Warn at 600 KB since we have intentional chunking
    chunkSizeWarningLimit: 600,
  },
};
});
