"use client";

import { type FormEvent, useRef, useState } from "react";
import styles from "./fake-terminal.module.scss";

const PROMPT = "ubuntu@scriptbridge:~$";
const REDIRECTS = ["/rickroll", "/jumpscare"] as const;

export function FakeTerminal() {
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const enteredCommand = command.trim();
    if (!enteredCommand) return;

    if (Math.random() < 0.25) {
      window.location.assign(REDIRECTS[Math.floor(Math.random() * REDIRECTS.length)]);
      return;
    }

    setHistory((currentHistory) => [...currentHistory, enteredCommand]);
    setCommand("");
  }

  return (
    <main className={styles.page}>
      <section
        aria-label="Simulated Linux terminal"
        className={styles.terminal}
        onClick={() => inputRef.current?.focus()}
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
          {history.map((enteredCommand, index) => {
            const executable = enteredCommand.split(/\s+/, 1)[0];
            return (
              <div className={styles.historyEntry} key={`${enteredCommand}-${index}`}>
                <div>
                  <span className={styles.prompt}>{PROMPT}</span> {enteredCommand}
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
              autoFocus
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
