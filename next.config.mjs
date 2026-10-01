/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdfjs-dist", "mammoth", "@prisma/client"],
  },
};

export default nextConfig;
