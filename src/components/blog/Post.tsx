"use client";

import { person } from "@/resources";
import { formatDate } from "@/utils/formatDate";
import type { MDXPost } from "@/utils/utils";
import { Avatar, Card, Column, Media, Row, Text } from "@once-ui-system/core";
import styles from "./Post.module.scss";

interface PostProps {
  post: MDXPost;
  thumbnail: boolean;
  direction?: "row" | "column";
}

export default function Post({ post, thumbnail, direction }: PostProps) {
  return (
    <Card
      className={styles.card}
      fillWidth
      key={post.slug}
      href={`/blog/${post.slug}`}
      transition="micro-medium"
      direction={direction}
      border="transparent"
      background="transparent"
      padding="4"
      radius="l-4"
      gap={direction === "column" ? undefined : "24"}
      s={{ direction: "column" }}
    >
      {post.metadata.image && thumbnail && (
        <Media
          className={styles.media}
          priority
          sizes="(max-width: 768px) 100vw, 640px"
          border="neutral-alpha-weak"
          cursor="interactive"
          radius="l"
          src={post.metadata.image}
          alt={`Thumbnail of ${post.metadata.title}`}
          aspectRatio="16 / 9"
        />
      )}
      <Row className={styles.body} fillWidth>
        <Column
          className={styles.content}
          maxWidth={28}
          paddingY="24"
          paddingX="l"
          gap="20"
          vertical="center"
        >
          <Row className={styles.meta} gap="24" vertical="center">
            <Row className={styles.author} vertical="center" gap="16">
              <Avatar src={person.avatar} size="s" />
              <Text variant="label-default-s">{person.name}</Text>
            </Row>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {formatDate(post.metadata.publishedAt, false)}
            </Text>
          </Row>
          <Text className={styles.title} variant="heading-strong-l" wrap="balance">
            {post.metadata.title}
          </Text>
          {post.metadata.tag && (
            <Text className={styles.tag} variant="label-strong-s" onBackground="neutral-weak">
              {post.metadata.tag}
            </Text>
          )}
        </Column>
      </Row>
    </Card>
  );
}
