"use client";

import { SourceCodeCharts } from "@/components/statistics/SourceCodeCharts";
import type { PortfolioSourceMetrics } from "@/lib/portfolio-case-study";
import Link from "next/link";
import { useState } from "react";
import {
  HiArrowRight,
  HiArrowUpRight,
  HiCodeBracket,
  HiOutlineCube,
  HiOutlineGlobeAlt,
  HiOutlineServerStack,
} from "react-icons/hi2";
import styles from "./magic-portfolio-case-study.module.scss";

const journeys = [
  {
    name: "Read a story",
    nodes: ["Visitor", "Route policy", "MDX + React", "Rendered page"],
    detail:
      "Blog and project entries live in MDX. The App Router composes the content with shared components and metadata. When a managed page is locked, its access check runs before the protected page is served.",
    foot: "Content path · source files → rendered interface",
  },
  {
    name: "Leave a message",
    nodes: ["Wall form", "API validation", "PostgreSQL", "Moderated feed"],
    detail:
      "The Wall API checks access, validates the message, applies a rate limit and stores the submission. The ordinary path waits for moderation; the public feed reads approved messages. A configurable publishing bypass is also supported.",
    foot: "Write path · validated input → stored submission → publication",
  },
  {
    name: "Manage the site",
    nodes: ["Admin session", "Authorized API", "Stored settings", "Public experience"],
    detail:
      "Private tools manage editable text, route visibility, page protection and Wall moderation. Server handlers authorize changes. Navigation visibility and password protection are separate settings, so hiding a link is not the access boundary.",
    foot: "Control path · authorized change → persisted configuration",
  },
];

const decisions = [
  [
    "Content belongs beside code.",
    "MDX keeps a project’s writing, metadata and embedded components in one versioned workflow. It is a good fit for authored case studies; database-backed notes and editable site text cover content that needs runtime changes.",
  ],
  [
    "Interaction has a server boundary.",
    "React handles drafts, filters and feedback. API handlers validate writes and check the relevant session before touching stored data. The simulated terminal is a browser interaction, not a remote shell.",
  ],
  [
    "One application, distinct responsibilities.",
    "The portfolio and private tools share a Next.js deployment, while PostgreSQL owns persistent data. This simplifies the application footprint, but the running site still depends on the database and its operational care.",
  ],
  [
    "A template is a starting point.",
    "Once UI supplies the foundation. The custom work adds route policy, administration, analytics, visitor interaction and separate desktop and mobile layouts. The visual system stays shared while each screen has its own composition.",
  ],
];

export function MagicPortfolioCaseStudy({ metrics }: { metrics: PortfolioSourceMetrics }) {
  const [journey, setJourney] = useState(0);
  const totalFiles = metrics.layers.reduce((sum, item) => sum + item.files, 0);
  const totalLines = metrics.layers.reduce((sum, item) => sum + item.lines, 0);

  return (
    <article className={styles.caseStudy}>
      <Link href="/projects" className={styles.back}>
        ← All projects
      </Link>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>PROJECT FILE / 01</span>
          <h1>
            Magic
            <br />
            Portfolio<span>.</span>
          </h1>
        </div>
        <div className={styles.heroAside}>
          <span className={styles.eyebrow}>A PERSONAL SITE, BUILT OUT</span>
          <p>
            A corner of the internet.
            <br />
            An application underneath.
          </p>
          <span>
            From an open-source portfolio template to a place for publishing, experiments and
            conversations—with the tools to run it.
          </span>
          <Link className={styles.visit} href="/">
            Explore the site <HiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </header>
      <div className={styles.facts}>
        <div>
          <span>FOUNDATION</span>
          <strong>Next.js + Once UI</strong>
        </div>
        <div>
          <span>PERSISTENCE</span>
          <strong>PostgreSQL</strong>
        </div>
        <div>
          <span>DELIVERY</span>
          <strong>Docker → OCI</strong>
        </div>
        <div>
          <span>PROJECT PUBLISHED</span>
          <strong>24 August 2026</strong>
        </div>
      </div>
      <nav className={styles.sectionNav} aria-label="Case study sections">
        <a href="#mp-system">01 / The system</a>
        <a href="#mp-source">02 / In the source</a>
        <a href="#mp-delivery">03 / Shipping it</a>
        <a href="#mp-decisions">04 / The decisions</a>
      </nav>

      <section id="mp-system" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>01 / THE SYSTEM</span>
          <h2>
            More than a set of pages<span>.</span>
          </h2>
          <p>
            The public experience is intentionally simple. Behind it, content, interactions and
            administration take different paths through the same application.
          </p>
        </div>
        <div className={styles.systemMap}>
          <div className={styles.mapLabel}>
            <HiOutlineGlobeAlt aria-hidden="true" /> THE PUBLIC SURFACE{" "}
            <span>Portfolio · Blog · Gallery · Notes · Wall</span>
          </div>
          <div className={styles.mapConnector} aria-hidden="true">
            ↓
          </div>
          <div className={styles.application}>
            <HiOutlineCube aria-hidden="true" />
            <strong>Next.js application</strong>
            <span>App Router / React / Once UI</span>
          </div>
          <div className={styles.branches}>
            <div>
              <HiCodeBracket aria-hidden="true" />
              <h3>Authored content</h3>
              <p>MDX stories and project entries, composed with reusable interface components.</p>
              <code>src/app + src/components</code>
            </div>
            <div>
              <HiOutlineServerStack aria-hidden="true" />
              <h3>Persistent data</h3>
              <p>Messages, reactions, visitor records, notes and editable configuration.</p>
              <code>API handlers → PostgreSQL</code>
            </div>
            <div>
              <HiOutlineCube aria-hidden="true" />
              <h3>Private controls</h3>
              <p>Authorized tools for moderation, page access and operational settings.</p>
              <code>Admin UI → server helpers</code>
            </div>
          </div>
        </div>
        <div className={styles.journey}>
          <div className={styles.panelTop}>
            <span className={styles.eyebrow}>FOLLOW A REQUEST</span>
            <div className={styles.segmented} aria-label="Request journey">
              {journeys.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  aria-pressed={journey === index}
                  onClick={() => setJourney(index)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
          <ol className={styles.flow}>
            {journeys[journey].nodes.map((node, index) => (
              <li key={node}>
                <span>0{index + 1}</span>
                <strong>{node}</strong>
                {index < 3 && <HiArrowRight aria-hidden="true" />}
              </li>
            ))}
          </ol>
          <div className={styles.journeyDetail} aria-live="polite">
            <p>{journeys[journey].detail}</p>
            <small>{journeys[journey].foot}</small>
          </div>
        </div>
      </section>

      <section id="mp-source" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>02 / IN THE SOURCE</span>
          <h2>
            The shape of the code<span>.</span>
          </h2>
          <p>
            A source inventory of this version of the site. Explore where the files live and how the
            implementation is distributed.
          </p>
        </div>
        <div className={styles.sourceSummary}>
          <strong>
            {totalFiles.toLocaleString("en")} <span>source files</span>
          </strong>
          <strong>
            {totalLines.toLocaleString("en")} <span>non-empty lines</span>
          </strong>
          <span>
            Measured from <code>src/</code>
            <br />
            Recalculated when the page is built.
          </span>
        </div>
        <SourceCodeCharts metrics={metrics} />
      </section>

      <section id="mp-delivery" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>03 / SHIPPING IT</span>
          <h2>
            From a commit to a container<span>.</span>
          </h2>
          <p>
            The repository defines the build. The host runs the result. Those are separate steps,
            with a versioned image in between.
          </p>
        </div>
        <ol className={styles.delivery}>
          {[
            ["01", "Push to main", "GitHub Actions starts the image build."],
            ["02", "Build the image", "Docker installs dependencies and compiles Next.js."],
            ["03", "Publish to GHCR", "The image receives latest and commit-SHA tags."],
            ["04", "Run on OCI", "The virtual machine runs the application container."],
          ].map(([number, title, detail]) => (
            <li key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{detail}</p>
              <HiArrowRight aria-hidden="true" />
            </li>
          ))}
        </ol>
        <div className={styles.deliveryNotes}>
          <div>
            <span className={styles.eyebrow}>INSIDE THE DOCKERFILE</span>
            <div className={styles.buildStages}>
              <code>deps</code>
              <span>→</span>
              <code>builder</code>
              <span>→</span>
              <code>runner</code>
            </div>
            <p>
              Three Node 22 Alpine stages separate dependency installation, compilation and the
              production runtime. The final stage runs the standalone Next.js server alongside the
              static assets and source content.
            </p>
          </div>
          <div>
            <span className={styles.eyebrow}>OUTSIDE THE CONTAINER</span>
            <h3>A domain. A host. Persistent state.</h3>
            <p>
              Cloudflare manages the domain and DNS. OCI hosts the application runtime, while
              PostgreSQL stores the data that must survive an application rebuild. The checked-in
              workflow builds and publishes the image; it does not itself deploy the OCI container.
            </p>
          </div>
        </div>
      </section>

      <section id="mp-decisions" className={styles.section}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>04 / THE DECISIONS</span>
          <h2>
            What holds it together<span>.</span>
          </h2>
        </div>
        <div className={styles.decisions}>
          {decisions.map(([title, detail], index) => (
            <div key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{detail}</p>
            </div>
          ))}
        </div>
        <div className={styles.outcome}>
          <span className={styles.eyebrow}>THE RESULT</span>
          <h2>A portfolio that can be lived in.</h2>
          <p>
            Writing has a home. Visitors can leave a thought. The owner can change content, moderate
            messages and control access without editing each page. The next improvement can be a
            piece of content or a feature, within the same application.
          </p>
          <Link href="/wall">
            Leave something on the Wall <HiArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </section>
      <footer className={styles.credits}>
        <div>
          <span className={styles.eyebrow}>BUILT WITH</span>
          <p>
            <a href="https://www.linkedin.com/company/once-ui/">Once UI Team</a> · Template
            foundation
            <br />
            <a href="https://github.com/nousernameavailable1">Talal Kadli</a> · Development
            <br />
            <a href="https://chatgpt.com/">ChatGPT</a> · AI contribution
          </p>
        </div>
        <p>
          Article content generated by AI and grounded in the project source. Hosting context
          follows the project’s existing documentation.
        </p>
      </footer>
    </article>
  );
}
