"use client";

import { socialSharing } from "@/resources";
import { Button, Row, Text, useToast } from "@once-ui-system/core";
import styles from "./ShareSection.module.scss";

interface ShareSectionProps {
  title: string;
  url: string;
}

interface SocialPlatform {
  icon: string;
  label: string;
  generateUrl: (title: string, url: string) => string;
}

const socialPlatforms: Record<string, SocialPlatform> = {
  x: {
    icon: "twitter",
    label: "X",
    generateUrl: (title, url) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  linkedin: {
    icon: "linkedin",
    label: "LinkedIn",
    generateUrl: (_title, url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  facebook: {
    icon: "facebook",
    label: "Facebook",
    generateUrl: (_title, url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  pinterest: {
    icon: "pinterest",
    label: "Pinterest",
    generateUrl: (title, url) =>
      `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(title)}`,
  },
  whatsapp: {
    icon: "whatsapp",
    label: "WhatsApp",
    generateUrl: (title, url) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
  },
  reddit: {
    icon: "reddit",
    label: "Reddit",
    generateUrl: (title, url) =>
      `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  telegram: {
    icon: "telegram",
    label: "Telegram",
    generateUrl: (title, url) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  email: {
    icon: "email",
    label: "Email",
    generateUrl: (title, url) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this post: ${url}`)}`,
  },
};

export function ShareSection({ title, url }: ShareSectionProps) {
  const { addToast } = useToast();
  // Don't render if sharing is disabled
  if (!socialSharing.display) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      addToast({
        variant: "success",
        message: "Link copied to clipboard",
      });
    } catch (err) {
      console.error("Failed to copy: ", err);
      addToast({
        variant: "danger",
        message: "Failed to copy link",
      });
    }
  };

  const enabledPlatforms = Object.entries(socialSharing.platforms)
    .filter(([platformKey, enabled]) => enabled && platformKey !== "copyLink")
    .flatMap(([platformKey]) => {
      const platform = socialPlatforms[platformKey];
      return platform ? [{ key: platformKey, ...platform }] : [];
    });

  return (
    <Row className={styles.share} fillWidth center gap="16" marginTop="32" marginBottom="16">
      <Text className={styles.label} variant="label-default-m" onBackground="neutral-weak">
        Share this post:
      </Text>
      <Row className={styles.actions} data-border="rounded" gap="16" horizontal="center" wrap>
        {enabledPlatforms.map((platform) => (
          <Button
            aria-label={`Share on ${platform.label}`}
            className={styles.button}
            data-mobile-label={platform.label}
            key={platform.key}
            variant="secondary"
            size="s"
            href={platform.generateUrl(title, url)}
            prefixIcon={platform.icon}
          />
        ))}

        {socialSharing.platforms.copyLink && (
          <Button
            aria-label="Copy link"
            className={styles.button}
            data-mobile-label="Copy"
            variant="secondary"
            size="s"
            onClick={handleCopy}
            prefixIcon="openLink"
          />
        )}
      </Row>
    </Row>
  );
}
