import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Для локальной разработки
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
