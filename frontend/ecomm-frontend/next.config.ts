// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;




// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        // Allow Cloudinary images
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
}

module.exports = nextConfig