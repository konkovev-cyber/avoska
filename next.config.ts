import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // Позволяет собирать статический билд для мобильного приложения
  trailingSlash: true, // Создает папки с index.html (admin/index.html) вместо файлов (admin.html) - это решает проблему 403
  images: {
    unoptimized: true, // Нужно для мобильного приложения, так как нет сервера Next.js для обработки фото
  },
};

export default nextConfig;
