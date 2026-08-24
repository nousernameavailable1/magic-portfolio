import type { MDXComponents } from "mdx/types";
import { MDXRemote, type MDXRemoteProps } from "next-mdx-remote/rsc";
import { isValidElement } from "react";
import type React from "react";
import type { ReactNode } from "react";
import { slugify as transliterate } from "transliteration";
import { AiGeneratedNotice } from "./projects/AiGeneratedNotice";
import { MagicPortfolioArchitecture } from "./projects/MagicPortfolioArchitecture";

import {
  Accordion,
  AccordionGroup,
  Button,
  Card,
  CodeBlock,
  Column,
  Feedback,
  Grid,
  Heading,
  HeadingLink,
  Icon,
  InlineCode,
  Line,
  List,
  ListItem,
  Media,
  type MediaProps,
  Row,
  SmartLink,
  Table,
  Text,
  type TextProps,
} from "@once-ui-system/core";

type CustomLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

function CustomLink({ href, children, ...props }: CustomLinkProps) {
  if (href.startsWith("/")) {
    return (
      <SmartLink href={href} {...props}>
        {children}
      </SmartLink>
    );
  }

  if (href.startsWith("#")) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

function createImage({ alt, src, ...props }: MediaProps & { src: string }) {
  if (!src) {
    console.error("Media requires a valid 'src' property.");
    return null;
  }

  return (
    <Media
      marginTop="8"
      marginBottom="16"
      enlarge
      radius="m"
      border="neutral-alpha-medium"
      sizes="(max-width: 960px) 100vw, 960px"
      alt={alt}
      src={src}
      {...props}
    />
  );
}

function slugify(str: string): string {
  const strWithAnd = str.replace(/&/g, " and "); // Replace & with 'and'
  return transliterate(strWithAnd, {
    lowercase: true,
    separator: "-", // Replace spaces with -
  }).replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

function createHeading(as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
  const CustomHeading = ({
    children,
    ...props
  }: Omit<React.ComponentProps<typeof HeadingLink>, "as" | "id">) => {
    const slug = slugify(children as string);
    return (
      <HeadingLink marginTop="24" marginBottom="12" as={as} id={slug} {...props}>
        {children}
      </HeadingLink>
    );
  };

  CustomHeading.displayName = `${as}`;

  return CustomHeading;
}

function createPlainHeading(as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") {
  const PlainHeading = ({
    children,
    ...props
  }: Omit<React.ComponentProps<typeof Heading>, "as">) => (
    <Heading marginTop="24" marginBottom="12" as={as} {...props}>
      {children}
    </Heading>
  );

  PlainHeading.displayName = `${as}`;

  return PlainHeading;
}

function createParagraph({ children }: TextProps) {
  return (
    <Text
      style={{ lineHeight: "175%" }}
      variant="body-default-m"
      onBackground="neutral-medium"
      marginTop="8"
      marginBottom="12"
    >
      {children}
    </Text>
  );
}

function createInlineCode({ children }: { children: ReactNode }) {
  return <InlineCode>{children}</InlineCode>;
}

type CodeBlockProps = React.ComponentPropsWithoutRef<"pre">;
type CodeChild = React.ReactElement<{ className: string; children?: ReactNode }>;

function getCodeChild(children: ReactNode): CodeChild | null {
  if (!isValidElement<{ className: string; children?: ReactNode }>(children)) {
    return null;
  }

  return typeof children.props.className === "string" ? children : null;
}

function createCodeBlock({ children, ...props }: CodeBlockProps) {
  const codeChild = getCodeChild(children);

  // MDX wraps fenced code in a code element inside a pre element.
  if (codeChild && typeof codeChild.props.children === "string") {
    const { className, children: code } = codeChild.props;

    // Extract language from className (format: language-xxx)
    const language = className.replace("language-", "");
    const label = language.charAt(0).toUpperCase() + language.slice(1);

    return (
      <CodeBlock
        marginTop="8"
        marginBottom="16"
        codes={[
          {
            code,
            language,
            label,
          },
        ]}
        copyButton={true}
      />
    );
  }

  // Fallback for other pre tags or empty code blocks
  return <pre {...props}>{children}</pre>;
}

function createList(as: "ul" | "ol") {
  return ({ children }: { children: ReactNode }) => <List as={as}>{children}</List>;
}

function createListItem({ children }: { children: ReactNode }) {
  return (
    <ListItem marginTop="4" marginBottom="8" style={{ lineHeight: "175%" }}>
      {children}
    </ListItem>
  );
}

function createHR() {
  return (
    <Row fillWidth horizontal="center">
      <Line maxWidth="40" />
    </Row>
  );
}

const components = {
  p: createParagraph,
  h1: createHeading("h1"),
  h2: createHeading("h2"),
  h3: createHeading("h3"),
  h4: createHeading("h4"),
  h5: createHeading("h5"),
  h6: createHeading("h6"),
  img: createImage,
  a: CustomLink,
  code: createInlineCode,
  pre: createCodeBlock,
  ol: createList("ol"),
  ul: createList("ul"),
  li: createListItem,
  hr: createHR,
  Heading,
  Text,
  CodeBlock,
  InlineCode,
  Accordion,
  AccordionGroup,
  Table,
  Feedback,
  Button,
  Card,
  Grid,
  Row,
  Column,
  Icon,
  Media,
  SmartLink,
  AiGeneratedNotice,
  MagicPortfolioArchitecture,
  // Once UI components intentionally accept a wider prop surface than MDX intrinsic elements.
  // This boundary keeps that mapping explicit without weakening the individual component types.
} as unknown as MDXComponents;

const plainHeadingComponents = {
  h1: createPlainHeading("h1"),
  h2: createPlainHeading("h2"),
  h3: createPlainHeading("h3"),
  h4: createPlainHeading("h4"),
  h5: createPlainHeading("h5"),
  h6: createPlainHeading("h6"),
} as unknown as MDXComponents;

type CustomMDXProps = Omit<MDXRemoteProps, "components"> & {
  components?: MDXComponents;
  headingLinks?: boolean;
};

export function CustomMDX({ components: customComponents, headingLinks = true, ...props }: CustomMDXProps) {
  return (
    <MDXRemote
      options={{ blockJS: false }}
      {...props}
      components={{
        ...components,
        ...(headingLinks ? {} : plainHeadingComponents),
        ...(customComponents || {}),
      }}
    />
  );
}
