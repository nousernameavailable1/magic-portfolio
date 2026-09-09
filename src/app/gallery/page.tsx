import GalleryView from "@/components/gallery/GalleryView";
import styles from "@/components/gallery/gallery.module.scss";
import { baseURL, gallery, person } from "@/resources";
import { Column, Flex, Heading, Meta, Schema, Text } from "@once-ui-system/core";

export async function generateMetadata() {
  return Meta.generate({
    title: gallery.title,
    description: gallery.description,
    baseURL: baseURL,
    image: `/api/og/generate?title=${encodeURIComponent(gallery.title)}`,
    path: gallery.path,
  });
}

export default function Gallery() {
  return (
    <Flex className={styles.page} maxWidth="l" data-desktop-gallery>
      <Schema
        as="webPage"
        baseURL={baseURL}
        title={gallery.title}
        description={gallery.description}
        path={gallery.path}
        image={`/api/og/generate?title=${encodeURIComponent(gallery.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}${gallery.path}`,
          image: `${baseURL}${person.avatar}`,
        }}
      />
      <header className={styles.desktopIntro}>
        <div>
          <p className={styles.desktopEyebrow}>
            <span /> VISUAL ARCHIVE
          </p>
          <h1>
            Gallery<span>.</span>
          </h1>
        </div>
        <p className={styles.desktopDescription}>
          Places, textures, and passing moments.
          <br />A few things worth looking at twice.
        </p>
      </header>
      <Column className={styles.mobileIntro} gap="8">
        <Text className={styles.eyebrow} variant="label-strong-s">
          VISUAL ARCHIVE
        </Text>
        <Heading as="h1" variant="display-strong-m">
          Gallery
        </Heading>
        <Text onBackground="neutral-weak">
          {gallery.images.length} frames. Tap any photograph to open it full size.
        </Text>
      </Column>
      <GalleryView />
    </Flex>
  );
}
