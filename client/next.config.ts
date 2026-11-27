import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi open the dev server at these addresses.
  allowedDevOrigins: ["192.168.1.9", "192.168.1.8"],
};

export default nextConfig;
