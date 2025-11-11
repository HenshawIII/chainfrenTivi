/** @type {import('next').NextConfig} */
// Extract Supabase hostname from environment variable
const getSupabaseHostname = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  try {
    const url = new URL(supabaseUrl);
    return url.hostname;
  } catch (error) {
    console.warn('Invalid NEXT_PUBLIC_SUPABASE_URL:', error);
    return null;
  }
};

const supabaseHostname = getSupabaseHostname();

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID:
      process.env.NEXT_PUBLIC_PRIVY_ENVIRONMENT_ID,
  },
  images: {
    domains: [
      "vod-cdn.lp-playback.studio", 
      'recordings-cdn-s.lp-playback.studio',
      // Add Supabase hostname dynamically if available
      ...(supabaseHostname ? [supabaseHostname] : []),
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
