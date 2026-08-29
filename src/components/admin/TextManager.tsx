"use client";

import { FinanceVisibilityToggle } from "@/components/admin/FinanceVisibilityToggle";
import { Button, Column, Heading, Row, Text, Textarea, useToast } from "@once-ui-system/core";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./text-manager.module.scss";

type TextField = {
  key: string;
  label: string;
  description: string;
  parentKey?: string;
  defaultValue: string;
  maxLength: number;
  lines: number;
  value: string;
};

type TextAction = "save" | "set-default" | "reset";

type TextFieldEditorProps = {
  field: TextField;
  value: string;
  busyAction: { key: string; action: TextAction } | null;
  onValueChange: (key: string, value: string) => void;
  onSave: (field: TextField) => void;
  onSetDefault: (field: TextField) => void;
  onReset: (field: TextField) => void;
};

function TextFieldEditor({
  field,
  value,
  busyAction,
  onValueChange,
  onSave,
  onSetDefault,
  onReset,
}: TextFieldEditorProps) {
  const busy = busyAction?.key === field.key;

  return (
    <>
      <Textarea
        aria-label={field.label}
        id={`text-${field.key.replace(".", "-")}`}
        placeholder=" "
        value={value}
        onChange={(event) => onValueChange(field.key, event.target.value)}
        maxLength={field.maxLength}
        lines={field.lines}
        characterCount
        resize="vertical"
      />
      <Row className={styles.editorActions} gap="8" wrap>
        <Button
          size="s"
          variant="primary"
          loading={busyAction?.key === field.key && busyAction.action === "save"}
          disabled={busy || !value.trim() || value.trim() === field.value}
          onClick={() => onSave(field)}
        >
          Save
        </Button>
        <Button
          size="s"
          variant="secondary"
          loading={busyAction?.key === field.key && busyAction.action === "set-default"}
          disabled={busy || !value.trim() || value.trim() === field.defaultValue}
          onClick={() => onSetDefault(field)}
        >
          Set default
        </Button>
        <Button
          size="s"
          variant="secondary"
          loading={busyAction?.key === field.key && busyAction.action === "reset"}
          disabled={busy || value.trim() === field.defaultValue}
          onClick={() => onReset(field)}
        >
          Reset to default
        </Button>
      </Row>
    </>
  );
}

export function TextManager() {
  const [fields, setFields] = useState<TextField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<{ key: string; action: TextAction } | null>(null);
  const { addToast } = useToast();
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  const loadFields = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/text", { cache: "no-store" });
      const data = (await response.json()) as { fields?: TextField[]; error?: string };
      if (!response.ok) throw new Error(data.error);

      const nextFields = data.fields ?? [];
      setFields(nextFields);
      setValues(Object.fromEntries(nextFields.map((field) => [field.key, field.value])));
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not load text settings.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFields();
  }, [loadFields]);

  const saveField = async (field: TextField) => {
    setBusyAction({ key: field.key, action: "save" });
    try {
      const response = await fetch("/api/admin/text", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: field.key, value: values[field.key] ?? "" }),
      });
      const data = (await response.json()) as { field?: TextField; error?: string };
      const updatedField = data.field;
      if (!response.ok || !updatedField) throw new Error(data.error);

      setValues((current) => ({ ...current, [field.key]: updatedField.value }));
      setFields((current) => current.map((item) => (item.key === field.key ? updatedField : item)));
      addToastRef.current({ variant: "success", message: `${field.label} saved.` });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not save this text.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const resetField = async (field: TextField) => {
    setBusyAction({ key: field.key, action: "reset" });
    try {
      const response = await fetch(`/api/admin/text?key=${encodeURIComponent(field.key)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { field?: TextField; error?: string };
      const updatedField = data.field;
      if (!response.ok || !updatedField) throw new Error(data.error);

      setValues((current) => ({ ...current, [field.key]: updatedField.value }));
      setFields((current) => current.map((item) => (item.key === field.key ? updatedField : item)));
      addToastRef.current({ variant: "success", message: `${field.label} reset.` });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not reset this text.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const setDefaultField = async (field: TextField) => {
    setBusyAction({ key: field.key, action: "set-default" });
    try {
      const response = await fetch("/api/admin/text", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: field.key, value: values[field.key] ?? "" }),
      });
      const data = (await response.json()) as { field?: TextField; error?: string };
      const updatedField = data.field;
      if (!response.ok || !updatedField) throw new Error(data.error);

      setValues((current) => ({ ...current, [field.key]: updatedField.value }));
      setFields((current) => current.map((item) => (item.key === field.key ? updatedField : item)));
      addToastRef.current({ variant: "success", message: `${field.label} set as the default.` });
    } catch (error) {
      addToastRef.current({
        variant: "danger",
        message: error instanceof Error ? error.message : "Could not set this text as the default.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  if (!loading && fields.length === 0) {
    return <Text onBackground="neutral-weak">No editable text fields are configured.</Text>;
  }

  const topLevelFields = fields.filter(
    (field) => !field.parentKey && field.key !== "about.financeVisible",
  );

  return (
    <Column className={styles.manager} fillWidth gap="16">
      {topLevelFields.map((field) => {
        const value = values[field.key] ?? "";
        const nestedFields = fields.filter((candidate) => candidate.parentKey === field.key);
        const isFinanceGroup = field.key === "about.finance";
        const isCryptoGroup = field.key === "about.crypto";
        const isSettingsGroup = isFinanceGroup || isCryptoGroup;
        const nestedTitle = isFinanceGroup
          ? "Card and bank fields"
          : isCryptoGroup
            ? "Wallet address fields"
            : "After-hours message";
        const nestedDescription = isFinanceGroup
          ? "Each saved change is reflected in the Finance section. This visibility switch also controls Crypto wallets."
          : isCryptoGroup
            ? "Each saved change is reflected in the Crypto wallets section, which follows Finance visibility."
            : "Shown from 1:00 AM to 5:59 AM (Asia/Dubai).";
        return (
          <Column
            className={styles.fieldCard}
            key={field.key}
            fillWidth
            gap="16"
            padding="20"
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
          >
            {isFinanceGroup ? (
              <Column gap="4">
                <Row
                  className={styles.financeHeader}
                  fillWidth
                  horizontal="between"
                  vertical="center"
                  gap="16"
                >
                  <Heading as="h2" variant="heading-strong-l">
                    {field.label}
                  </Heading>
                  <FinanceVisibilityToggle />
                </Row>
                <Text onBackground="neutral-weak">{field.description}</Text>
              </Column>
            ) : (
              <Column gap="4">
                <Heading as="h2" variant="heading-strong-l">
                  {field.label}
                </Heading>
                <Text onBackground="neutral-weak">{field.description}</Text>
              </Column>
            )}
            {!isSettingsGroup && (
              <TextFieldEditor
                field={field}
                value={value}
                busyAction={busyAction}
                onValueChange={(key, nextValue) =>
                  setValues((current) => ({ ...current, [key]: nextValue }))
                }
                onSave={(nextField) => void saveField(nextField)}
                onSetDefault={(nextField) => void setDefaultField(nextField)}
                onReset={(nextField) => void resetField(nextField)}
              />
            )}
            {nestedFields.length > 0 && (
              <Column
                className={styles.nestedGroup}
                fillWidth
                gap="16"
                padding="16"
                background="neutral-alpha-weak"
                border="neutral-alpha-weak"
                radius="m"
              >
                <Column gap="4">
                  <Heading as="h3" variant="heading-strong-m">
                    {nestedFields.length === 1 ? nestedFields[0].label : nestedTitle}
                  </Heading>
                  <Text onBackground="neutral-weak">{nestedDescription}</Text>
                </Column>
                {nestedFields.map((nestedField) => (
                  <Column className={styles.nestedField} key={nestedField.key} gap="8">
                    <Column gap="2">
                      <Text variant="label-strong-s">{nestedField.label}</Text>
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        {nestedField.description}
                      </Text>
                    </Column>
                    <TextFieldEditor
                      field={nestedField}
                      value={values[nestedField.key] ?? ""}
                      busyAction={busyAction}
                      onValueChange={(key, nextValue) =>
                        setValues((current) => ({ ...current, [key]: nextValue }))
                      }
                      onSave={(nextField) => void saveField(nextField)}
                      onSetDefault={(nextField) => void setDefaultField(nextField)}
                      onReset={(nextField) => void resetField(nextField)}
                    />
                  </Column>
                ))}
              </Column>
            )}
          </Column>
        );
      })}
    </Column>
  );
}
