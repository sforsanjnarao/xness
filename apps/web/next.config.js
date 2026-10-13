/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    // On Vercel: set BACKEND_URL=https://<your-render-service>.onrender.com
    async rewrites() {
        const backend = process.env.BACKEND_URL;
        return backend ? [{ source: "/v1/:path*", destination: `${backend}/v1/:path*` }] : [];
    },
};

export default nextConfig;
