export const WORK_EXPERIENCE_LIMITS = {
  company: 120,
  role: 120,
  timeframe: 80,
  achievement: 500,
  achievements: 20,
} as const;

export type WorkExperienceImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type WorkExperience = {
  id: string;
  company: string;
  role: string;
  timeframe: string;
  achievements: string[];
  images: WorkExperienceImage[];
};

export type WorkExperienceInput = Pick<
  WorkExperience,
  "company" | "role" | "timeframe" | "achievements"
>;

export const defaultWorkExperiences: WorkExperience[] = [
  {
    id: "modo-technologies",
    company: "Modo technologies",
    timeframe: "2026 - 2026",
    role: "Intern",
    achievements: [
      "Did some sales or something.",
      "SpEarHeDead tHe UsE oF cOlD mAilInG aS a OpTIoN tO iNcREaSe CusTomEr bAsE.",
    ],
    images: [
      {
        src: "/images/projects/project-01/cover-01.jpg",
        alt: "Once UI Project",
        width: 16,
        height: 9,
      },
    ],
  },
  {
    id: "early-years",
    company: "-",
    timeframe: "2008 - 2026",
    role: "what exactly do you expect a child to be doing...",
    achievements: ["never broken a bone.", "slept for 14 hours in one day."],
    images: [],
  },
];
