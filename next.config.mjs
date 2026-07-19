/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel provides its own serverless output; standalone is for Docker/Railway.
  serverExternalPackages: ["better-sqlite3", "pg"],
};

export default nextConfig;
