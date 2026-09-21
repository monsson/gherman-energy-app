import { useState } from "react";
import { Box, Text } from "@mantine/core";
import { GUIDE_LANG, GUIDE_VIDEOS, guideVideoUrl, type GuideVideoId } from "~/lib/guide";

/**
 * Videoclipul ghidului pentru un rol (`manager.ro.mp4` / `sofer.ro.mp4`), o data, deasupra cuprinsului.
 *
 * Fisierele nu fac parte din bundle: se copiaza separat pe server, in `guide/` de langa
 * `index.html` (sau la `VITE_GUIDE_MEDIA_URL`, cand sunt gazduite in alta parte). Pe un server
 * pe care nu au fost copiate, `<video>` da eroare la incarcarea metadatelor, si atunci blocul se
 * strange intr-o singura linie, in loc sa lase un player negru in pagina.
 *
 * `#t=0.1` cere browserului primul cadru real ca poster, in loc de un dreptunghi negru.
 */
export function GuideVideo({ video }: { video: GuideVideoId }) {
  const [missing, setMissing] = useState(false);
  const title = GUIDE_VIDEOS[video];

  if (missing) {
    return (
      <Text size="xs" c="dimmed" fs="italic" mb="md">
        Videoclipul „{title}” nu este instalat pe acest server.
      </Text>
    );
  }

  return (
    <Box
      mb="md"
      style={{
        borderRadius: "var(--mantine-radius-lg)",
        overflow: "hidden",
        background: "var(--mantine-color-dark-8)",
        aspectRatio: "16 / 9",
      }}
    >
      <video
        controls
        preload="metadata"
        playsInline
        src={`${guideVideoUrl(video, GUIDE_LANG)}#t=0.1`}
        aria-label={title}
        onError={() => setMissing(true)}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
    </Box>
  );
}
