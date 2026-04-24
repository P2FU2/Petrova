import withPWA from "next-pwa";
import path from "node:path";

const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(process.cwd(), "src")
    };
    return config;
  }
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development"
})(nextConfig);
