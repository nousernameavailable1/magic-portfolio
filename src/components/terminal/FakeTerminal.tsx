"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import styles from "./fake-terminal.module.scss";

const PROMPT = "ubuntu@scriptbridge:~$";
const REDIRECTS = ["/rickroll", "/jumpscare"] as const;
type HistoryEntry = { id: number; command: string };

export function FakeTerminal() {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextHistoryId = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const enteredCommand = command.trim();
    if (!enteredCommand) return;

    if (Math.random() < 0.25) {
      window.location.assign(REDIRECTS[Math.floor(Math.random() * REDIRECTS.length)]);
      return;
    }

    const entry = { id: nextHistoryId.current, command: enteredCommand };
    nextHistoryId.current += 1;
    setHistory((currentHistory) => [...currentHistory, entry]);
    setCommand("");
  }

  return (
    <main className={styles.page}>
      <section
        aria-label="Simulated Linux terminal"
        className={styles.terminal}
        onPointerDown={() => inputRef.current?.focus()}
      >
        <header className={styles.titleBar}>
          <div aria-hidden="true" className={styles.windowControls}>
            <span />
            <span />
            <span />
          </div>
          <span>Terminal</span>
          <span aria-hidden="true" className={styles.titleSpacer} />
        </header>

        <div className={styles.screen}>
          {history.map((entry) => {
            const executable = entry.command.split(/\s+/, 1)[0];
            return (
              <div className={styles.historyEntry} key={entry.id}>
                <div>
                  <span className={styles.prompt}>{PROMPT}</span> {entry.command}
                </div>
                <div>{executable}: command not found</div>
              </div>
            );
          })}

          <form className={styles.commandLine} onSubmit={submit}>
            <label className={styles.prompt} htmlFor="terminal-command">
              {PROMPT}
            </label>
            <input
              aria-label="Enter a simulated terminal command"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              className={styles.commandInput}
              id="terminal-command"
              onChange={(event) => setCommand(event.target.value)}
              ref={inputRef}
              spellCheck={false}
              value={command}
            />
          </form>
        </div>
      </section>
    </main>
  );
}
