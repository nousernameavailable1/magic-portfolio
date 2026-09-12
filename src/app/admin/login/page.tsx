import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminLoginForm } from "@/components/wall/AdminLoginForm";
import Link from "next/link";
import styles from "./login.module.scss";

export const metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <div className={styles.page} data-admin-site="">
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Talal Kadli home">
          tk<span>.</span>
        </Link>
        <div>
          <Link className={styles.backLink} href="/">
            Back to site <span aria-hidden="true">↗</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className={styles.layout}>
        <section className={styles.intro}>
          <span className={styles.eyebrow}>TK / CONTROL ROOM</span>
          <h1>
            Behind
            <br />
            the scenes<span>.</span>
          </h1>
          <p>
            A little space to keep everything in order.
            <br />
            Your words, your work, your corner of the internet.
          </p>
          <div className={styles.index} aria-hidden="true">
            <span>01 / CURATE</span>
            <span>02 / CREATE</span>
            <span>03 / CONNECT</span>
          </div>
        </section>
        <section className={styles.signIn} aria-labelledby="sign-in-title">
          <span className={styles.accessLabel}>PRIVATE WORKSPACE</span>
          <h2 id="sign-in-title">Welcome back.</h2>
          <p>Sign in to manage your portfolio.</p>
          <AdminLoginForm />
        </section>
      </main>
      <footer className={styles.footer}>
        <span>Talal Kadli / Administration</span>
        <span>Made to make things yours.</span>
      </footer>
    </div>
  );
}
