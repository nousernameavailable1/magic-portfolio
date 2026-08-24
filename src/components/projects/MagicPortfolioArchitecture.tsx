import styles from "./magic-portfolio-architecture.module.scss";

const projectStructure = [
  { path: "src/app", title: "Routes", detail: "Pages, layouts and API handlers" },
  { path: "src/components", title: "Interface", detail: "Reusable views and feature UI" },
  { path: "src/lib", title: "Server helpers", detail: "Auth, data access and route policy" },
  { path: "src/resources", title: "Configuration", detail: "Content, navigation and design settings" },
];

const requestStages = [
  { type: "Client", title: "Visitor browser", detail: "Navigation and form input" },
  { type: "Domain", title: "Cloudflare", detail: "Domain and DNS management" },
  { type: "Host", title: "OCI virtual machine", detail: "Docker image running Next.js" },
];

const services = [
  { type: "Data", title: "PostgreSQL", detail: "Submissions, visitors and route settings" },
  { type: "Status", title: "GitHub API", detail: "Latest deployment context" },
];

export function MagicPortfolioArchitecture() {
  return (
    <div className={styles.diagrams}>
      <figure className={styles.diagram}>
        <figcaption>
          <span>Project structure</span>
          <small>Codebase map</small>
        </figcaption>
        <div className={styles.structureTree}>
          <div className={styles.structureRoot}>
            <span>Application</span>
            <strong>Magic Portfolio</strong>
            <small>Next.js + Once UI</small>
          </div>
          <div aria-hidden="true" className={styles.treeStem} />
          <div className={styles.structureGrid}>
            {projectStructure.map((item) => (
              <div className={styles.structureNode} key={item.path}>
                <code>{item.path}</code>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
            ))}
          </div>
        </div>
      </figure>

      <figure className={styles.diagram}>
        <figcaption>
          <span>Request and data flow</span>
          <small>Public request path</small>
        </figcaption>
        <ol className={styles.flowSteps}>
          {requestStages.map((stage, index) => (
            <li className={styles.flowStep} key={stage.title}>
              <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.stepType}>{stage.type}</span>
              <strong>{stage.title}</strong>
              <span className={styles.stepDetail}>{stage.detail}</span>
            </li>
          ))}
        </ol>
        <div className={styles.services}>
          <span className={styles.servicesLabel}>Connected services</span>
          <div className={styles.serviceGrid}>
            {services.map((service) => (
              <div className={styles.serviceNode} key={service.title}>
                <span>{service.type}</span>
                <strong>{service.title}</strong>
                <small>{service.detail}</small>
              </div>
            ))}
          </div>
        </div>
      </figure>
    </div>
  );
}
