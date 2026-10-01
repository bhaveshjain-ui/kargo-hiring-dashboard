/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist", "mammoth", "@prisma/client"],
    // pdfjs-dist always runs its text-extraction worker through a dynamic
    // import("./pdf.worker.mjs") relative to pdf.mjs, deliberately marked
    // with a webpackIgnore/vite-ignore comment so bundlers leave it as a
    // real runtime file lookup instead of inlining it (the same mechanism
    // also makes it the "fake worker" — it runs in-process, not an OS
    // thread — which is required and correct in Node/serverless, not a
    // workaround). Because that import is deliberately invisible to static
    // analysis, Vercel's output file tracer doesn't know pdf.worker.mjs is
    // a dependency and leaves it out of the deployed bundle, so the lookup
    // 404s at runtime ("Cannot find module... pdf.worker.mjs") even though
    // the build and every local run (which has the full node_modules on
    // disk, not a traced subset) succeed. This forces it to be included.
    outputFileTracingIncludes: {
      "/api/candidates/parse": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
    },
  },
};

export default nextConfig;
