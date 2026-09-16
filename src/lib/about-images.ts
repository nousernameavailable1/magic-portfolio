// Saved admin entries can still contain images from older site defaults.
// Resolve only those known paths, preserving custom images and entry content.
const replacements: Record<string, { src: string; alt: string }> = {
  "/images/projects/project-01/cover-01.jpg": {
    src: "/images/about/sales-outreach.jpg",
    alt: "Hands typing on a laptop showing an email marketing dashboard",
  },
  "/images/projects/project-01/cover-02.jpg": {
    src: "/images/about/oci-dashboard.png",
    alt: "Oracle Cloud Console home dashboard with Build and Resources widgets",
  },
  "/images/projects/project-01/cover-03.jpg": {
    src: "/images/about/oci-console.png",
    alt: "Oracle Cloud Console virtual machine instance configuration",
  },
  "/images/projects/project-01/cover-04.jpg": {
    src: "/images/about/linux-terminal.png",
    alt: "Linux terminal running htop with CPU, memory, and process statistics",
  },
};

replacements["/images/about/cloud-data-center.jpg"] =
  replacements["/images/projects/project-01/cover-02.jpg"];
replacements["/images/about/cloud-networking.jpg"] =
  replacements["/images/projects/project-01/cover-03.jpg"];
replacements["/images/about/linux-server-racks.jpg"] =
  replacements["/images/projects/project-01/cover-04.jpg"];

export function resolveAboutImages<T extends { src: string; alt: string }>(images: T[]): T[] {
  return images.map((image) => {
    const replacement = replacements[image.src];
    return replacement ? { ...image, ...replacement } : image;
  });
}
