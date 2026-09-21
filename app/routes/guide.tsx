import { Fragment, type ReactNode } from "react";
import {
  Alert,
  Anchor,
  Card,
  Code,
  List,
  Paper,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { AppShell } from "~/components/AppShell";
import { GuideVideo } from "~/components/GuideVideo";
import { type GuideBlock, type GuideSection, guideSectionsFor, guideVideoFor } from "~/lib/guide";
import { useSession } from "./auth-layout";

export function meta() {
  return [{ title: "Ghid de utilizare — Gherman Energy" }];
}

/**
 * Ghidul de utilizare: textul din `~/lib/guide`, randat bloc cu bloc, cu un cuprins in fata.
 *
 * Aceeasi pagina pentru ambele roluri; ce difera este lista de sectiuni (`guideSectionsFor`),
 * ca un sofer sa nu citeasca despre ecrane pe care nu le are, si videoclipul de deasupra
 * cuprinsului (`guideVideoFor`): unul singur per rol, care parcurge toate sectiunile lui.
 */
export default function GuideRoute() {
  const session = useSession();
  const sections = guideSectionsFor(session.role);
  const back = session.role === "manager" ? "/manager" : "/driver";

  return (
    <AppShell session={session} title="Ghid de utilizare" back={back}>
      <GuideVideo video={guideVideoFor(session.role)} />
      <Card withBorder radius="lg" padding="md" shadow="xs" mb="lg">
        <Text size="xs" fw={700} tt="uppercase" c="gray.6" mb="xs" style={{ letterSpacing: "0.08em" }}>
          Cuprins
        </Text>
        <List type="ordered" spacing={4} size="sm">
          {sections.map((s) => (
            <List.Item key={s.id}>
              <Anchor href={`#${s.id}`} fw={600} size="sm">
                {s.title}
              </Anchor>
            </List.Item>
          ))}
        </List>
      </Card>

      <Stack gap="xl">
        {sections.map((s) => (
          <Section key={s.id} section={s} />
        ))}
      </Stack>
    </AppShell>
  );
}

function Section({ section }: { section: GuideSection }) {
  return (
    <Stack component="section" id={section.id} gap="sm" style={{ scrollMarginTop: 96 }}>
      <Title order={2} fz="h3">
        {section.title}
      </Title>
      {section.blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </Stack>
  );
}

const NOTE_COLOR = { info: "brand", warn: "orange", danger: "red" } as const;

function Block({ block }: { block: GuideBlock }) {
  switch (block.kind) {
    case "p":
      return (
        <Text size="sm" style={{ lineHeight: 1.6 }}>
          {inline(block.text)}
        </Text>
      );
    case "h3":
      return (
        <Title order={3} fz="h5" id={block.id} mt="xs" style={{ scrollMarginTop: 96 }}>
          {block.text}
        </Title>
      );
    case "ul":
    case "ol":
      return (
        <List type={block.kind === "ol" ? "ordered" : "unordered"} spacing={4} size="sm" pl="xs">
          {block.items.map((item, i) => (
            <List.Item key={i}>{inline(item)}</List.Item>
          ))}
        </List>
      );
    case "table":
      return (
        <Table.ScrollContainer minWidth={320}>
          <Table withTableBorder withColumnBorders fz="sm" style={{ borderRadius: 12 }}>
            <Table.Thead>
              <Table.Tr>
                {block.head.map((h, i) => (
                  <Table.Th key={i}>{inline(h)}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {block.rows.map((row, r) => (
                <Table.Tr key={r}>
                  {row.map((cell, c) => (
                    <Table.Td key={c}>{inline(cell)}</Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      );
    case "note":
      return (
        <Alert color={NOTE_COLOR[block.tone]} variant="light" radius="lg" title={block.title}>
          <Text size="sm">{inline(block.text)}</Text>
        </Alert>
      );
    case "flow":
      return (
        <Paper withBorder radius="lg" p="sm">
          <Stack gap="xs">
            {block.steps.map((step, i) => (
              <Stack key={i} gap={0} style={{ position: "relative", paddingLeft: 40 }}>
                <ThemeIcon
                  size={28}
                  radius="xl"
                  variant="filled"
                  color="dark.8"
                  style={{ position: "absolute", left: 0, top: 0 }}
                >
                  <Text fw={800} size="xs" c="brand.4">
                    {i + 1}
                  </Text>
                </ThemeIcon>
                <Text size="sm" fw={700}>
                  {inline(step.name)}
                </Text>
                {step.sub && (
                  <Text size="xs" c="dimmed">
                    {inline(step.sub)}
                  </Text>
                )}
              </Stack>
            ))}
            {block.caption && (
              <Text size="xs" c="dimmed" fs="italic" mt={4}>
                {inline(block.caption)}
              </Text>
            )}
          </Stack>
        </Paper>
      );
    case "sample":
      return (
        <Code block style={{ whiteSpace: "pre-wrap" }}>
          {block.text}
        </Code>
      );
  }
}

/**
 * Marcajul inline al ghidului: `**bold**`, `*italic*` si `` `cod` ``. Atat - textul este scris
 * de noi, nu de utilizator, deci nu are nevoie de un parser adevarat.
 */
const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;

function inline(text: string): ReactNode {
  const parts = text.split(INLINE);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <Code key={i}>{part.slice(1, -1)}</Code>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
