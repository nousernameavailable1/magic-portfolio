import mdx from "@next/mdx";

const withMDX = mdx({
  extension: /\.mdx?$/,
  options: {},
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/projects/automate-design-handovers-with-a-figma-to-code-pipeline",
        destination: "/projects/self-hosted-vpn",
        permanent: true,
      },
      {
        source: "/work/:path*",
        destination: "/projects/:path*",
        permanent: true,
      },
    ];
  },
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  transpilePackages: ["next-mdx-remote"],
  sassOptions: {
    compiler: "modern",
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default withMDX(nextConfig);
