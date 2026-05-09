/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      { source: "/admin/subjects", destination: "/admin?tab=subjects", permanent: true },
      { source: "/admin/topics", destination: "/admin?tab=topics", permanent: true },
      { source: "/admin/notes", destination: "/admin?tab=notes", permanent: true },
    ];
  },
};

module.exports = nextConfig;
