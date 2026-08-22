"use client";

import { Button, Column, Heading, Row, Text, Textarea, useToast } from "@once-ui-system/core";
import { useCallback, useEffect, useRef, useState } from "react";

type TextField = {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
  maxLength: number;
  lines: number;
  value: string;
};

export function TextManager() {
  const [fields, setFields] = useState<TextField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
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
    setBusyKey(field.key);
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
      setBusyKey(null);
    }
  };

  const resetField = async (field: TextField) => {
    setBusyKey(field.key);
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
      setBusyKey(null);
    }
  };

  const setDefaultField = async (field: TextField) => {
    setBusyKey(field.key);
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
      setBusyKey(null);
    }
  };

  if (!loading && fields.length === 0) {
    return <Text onBackground="neutral-weak">No editable text fields are configured.</Text>;
  }

  return (
    <Column fillWidth gap="16">
      {fields.map((field) => {
        const busy = busyKey === field.key;
        const value = values[field.key] ?? "";
        return (
          <Column
            key={field.key}
            fillWidth
            gap="16"
            padding="20"
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
          >
            <Column gap="4">
              <Heading as="h2" variant="heading-strong-l">
                {field.label}
              </Heading>
              <Text onBackground="neutral-weak">{field.description}</Text>
            </Column>
            <Textarea
              aria-label={field.label}
              id={`text-${field.key.replace(".", "-")}`}
              placeholder=" "
              value={value}
              onChange={(event) =>
                setValues((current) => ({ ...current, [field.key]: event.target.value }))
              }
              maxLength={field.maxLength}
              lines={field.lines}
              characterCount
              resize="vertical"
            />
            <Row gap="8" wrap>
              <Button
                size="s"
                variant="primary"
                loading={busy}
                disabled={!value.trim() || value.trim() === field.value}
                onClick={() => void saveField(field)}
              >
                Save
              </Button>
              <Button
                size="s"
                variant="secondary"
                loading={busy}
                disabled={!value.trim() || value.trim() === field.defaultValue}
                onClick={() => void setDefaultField(field)}
              >
                Set default
              </Button>
              <Button
                size="s"
                variant="secondary"
                loading={busy}
                disabled={value.trim() === field.defaultValue}
                onClick={() => void resetField(field)}
              >
                Reset to default
              </Button>
            </Row>
          </Column>
        );
      })}
    </Column>
  );
}
