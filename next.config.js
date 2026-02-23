/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
};

if (process.env.NEXT_OUTPUT_EXPORT === '1') {
  nextConfig.output = 'export';
}

module.exports = nextConfig;
