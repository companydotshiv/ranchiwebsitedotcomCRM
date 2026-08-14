import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      {
        source: '/profile/verticals',
        destination: '/dashboard/admin/settings/verticals',
        permanent: true,
      },
      {
        source: '/profile/employees',
        destination: '/dashboard/admin/settings/employees',
        permanent: true,
      },
      {
        source: '/profile/teams',
        destination: '/dashboard/admin/settings/teams',
        permanent: true,
      },
      {
        source: '/profile/mini-tasks',
        destination: '/dashboard/admin/settings/mini-tasks',
        permanent: true,
      },
      {
        source: '/dashboard/admin/access',
        destination: '/dashboard/admin/settings/access',
        permanent: true,
      }
    ];
  },
};

export default nextConfig;
