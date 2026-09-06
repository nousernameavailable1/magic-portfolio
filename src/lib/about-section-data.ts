export const STUDY_LIMITS = {
  name: 160,
  description: 1000,
} as const;

export const TECHNICAL_SKILL_LIMITS = {
  title: 160,
  description: 2000,
  tagName: 60,
  tags: 20,
} as const;

export type AboutEntryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type StudyEntry = {
  id: string;
  name: string;
  description: string;
};

export type StudyEntryInput = Pick<StudyEntry, "name" | "description">;

export type TechnicalSkillTag = {
  id: string;
  name: string;
  icon: string;
};

export type TechnicalSkillEntry = {
  id: string;
  title: string;
  description: string;
  tags: TechnicalSkillTag[];
  images: AboutEntryImage[];
};

export type TechnicalSkillInput = Pick<TechnicalSkillEntry, "title" | "description" | "tags">;

export const technicalIconOptions = [
  { value: "oracle", label: "Oracle" },
  { value: "ubuntu", label: "Ubuntu" },
  { value: "nodejs", label: "Node.js" },
  { value: "openvpn", label: "OpenVPN" },
  { value: "wireguard", label: "WireGuard" },
  { value: "seafile", label: "Seafile" },
  { value: "javascript", label: "JavaScript" },
  { value: "nextjs", label: "Next.js" },
  { value: "supabase", label: "Supabase" },
  { value: "figma", label: "Figma" },
  { value: "github", label: "GitHub" },
  { value: "globe", label: "Web / globe" },
  { value: "rocket", label: "Deployment / rocket" },
  { value: "document", label: "Document" },
  { value: "grid", label: "Grid" },
  { value: "stickyNote", label: "Note" },
] as const;

export const technicalIconNames = new Set<string>(
  technicalIconOptions.map((option) => option.value),
);

export const defaultStudies: StudyEntry[] = [
  {
    id: "al-diyafah-high-school",
    name: "Al Diyafah High School",
    description: "High school qualifications, notably igcse and A-levels.",
  },
  {
    id: "future-studies",
    name: "Who can say....",
    description: "Inshallah...",
  },
];

export const defaultTechnicalSkills: TechnicalSkillEntry[] = [
  {
    id: "oracle-cloud-infrastructure",
    title: "Oracle cloud infrastructure",
    description: "Able to navigate oci interface and manage basic cloud resources.",
    tags: [{ id: "oci", name: "OCI", icon: "oracle" }],
    images: [
      {
        src: "/images/projects/project-01/cover-02.jpg",
        alt: "Project image",
        width: 16,
        height: 9,
      },
      {
        src: "/images/projects/project-01/cover-03.jpg",
        alt: "Project image",
        width: 16,
        height: 9,
      },
    ],
  },
  {
    id: "linux-server-management",
    title: "Linux server management",
    description:
      "Maintaining and optimizing Linux servers for running vpns, private cloud, minecraft servers, website infrastructure and prob some more things i cant remember.",
    tags: [
      { id: "ubuntu", name: "Ubuntu", icon: "ubuntu" },
      { id: "nodejs", name: "Node.js", icon: "nodejs" },
      { id: "openvpn", name: "OpenVPN", icon: "openvpn" },
      { id: "wireguard", name: "Wireguard", icon: "wireguard" },
      { id: "seafile", name: "Seafile", icon: "seafile" },
    ],
    images: [
      {
        src: "/images/projects/project-01/cover-04.jpg",
        alt: "Project image",
        width: 16,
        height: 9,
      },
    ],
  },
];
