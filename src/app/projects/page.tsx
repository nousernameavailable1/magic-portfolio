import { PortfolioPreview } from "@/components/home/PortfolioPreview";
import { Projects } from "@/components/projects/Projects";
import { DesktopPageHeading } from "@/components/public/DesktopPageHeading";
import desktop from "@/components/public/public-pages.module.scss";
import { getPublicRouteStates } from "@/lib/public-routes";
import { getSiteText } from "@/lib/site-text";
import { about, baseURL, person, work } from "@/resources";
import { Column, Heading, Meta, Schema } from "@once-ui-system/core";

export async function generateMetadata() {
  return Meta.generate({
    title: work.title,
    description: work.description,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(work.title)}`,
    path: work.path,
  });
}

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [text, routes] = await Promise.all([getSiteText(), getPublicRouteStates()]);
  return (
    <Column className={desktop.page} maxWidth="m" paddingTop="24">
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={work.path}
        title={work.title}
        description={work.description}
        image={`/api/og/generate?title=${encodeURIComponent(work.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${about.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <DesktopPageHeading
        eyebrow="SELECTED WORK"
        title="Projects"
        description="A closer look at the things I build, how they work, and what goes into them."
      />
      <Heading
        className={desktop.mobileHeading}
        marginBottom="l"
        variant="heading-strong-xl"
        align="center"
      >
        {work.title}
      </Heading>
      <Projects
        portfolioPreview={
          <PortfolioPreview
            headline={text["home.headline"]}
            subline={text["home.subline"]}
            routes={routes
              .filter(
                (route) => route.listed && ["/blog", "/projects", "/gallery"].includes(route.path),
              )
              .map((route) => ({ path: route.path, label: route.label }))}
          />
        }
      />
    </Column>
  );
}
