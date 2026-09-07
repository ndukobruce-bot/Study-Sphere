import { summarizeText, type SummaryResult } from "@studysphere/shared";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Button, Card, Divider, EmptyState, Input, Muted, Screen, Text } from "../../src/components/ui";
import { useNotesStore } from "../../src/store/notesStore";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function Notes() {
  const theme = useTheme();
  const { notes, load, saveSummaryAssets } = useNotesStore();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [source, setSource] = useState("");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [saved, setSaved] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  function summarize() {
    if (!source.trim()) return;
    setResult(summarizeText(title.trim() || "Study note", subject.trim() || "General", source));
    setSaved(false);
  }

  async function save() {
    if (!result) return;
    await saveSummaryAssets(result);
    setSaved(true);
  }

  return (
    <Screen>
      <Card style={{ gap: theme.spacing.md }}>
        <Text variant="title">Summarize your notes</Text>
        <Muted>This is a local, deterministic summary - not an AI model. It never leaves your device.</Muted>
        <Input placeholder="Title (optional)" value={title} onChangeText={setTitle} />
        <Input placeholder="Subject (optional)" value={subject} onChangeText={setSubject} />
        <Input
          placeholder="Paste your raw notes here"
          value={source}
          onChangeText={setSource}
          multiline
          numberOfLines={6}
          style={{ minHeight: 140, textAlignVertical: "top" }}
        />
        <Button label="Summarize" onPress={summarize} />
      </Card>

      {result && (
        <View style={{ gap: theme.spacing.md }}>
          <Card>
            <Text variant="title">Summary</Text>
            {result.summary.length === 0 ? (
              <Muted>Add more note text for a stronger summary.</Muted>
            ) : (
              result.summary.map((line, index) => <Text key={index}>• {line}</Text>)
            )}
          </Card>
          <Card>
            <Text variant="title">Key terms</Text>
            <Muted>{result.keywords.join(", ") || "No terms found"}</Muted>
          </Card>
          <Card>
            <Text variant="title">Revision checklist</Text>
            {result.checklist.map((line, index) => <Text key={index}>• {line}</Text>)}
          </Card>
          <Card>
            <Text variant="title">Quiz questions</Text>
            {result.quiz.map((line, index) => <Text key={index}>• {line}</Text>)}
          </Card>
          <Button label={saved ? "Saved as a note and flashcards" : "Save as note + flashcards"} onPress={save} disabled={saved} />
        </View>
      )}

      <Text variant="title">Your notes</Text>
      {notes.length === 0 ? (
        <EmptyState text="No notes yet. Summarize something above or add one in Settings later." />
      ) : (
        <Card style={{ padding: 0 }}>
          {notes.map((note, index) => (
            <View key={note.id}>
              {index > 0 && <Divider />}
              <View style={{ padding: theme.spacing.md }}>
                <Text>{note.title}</Text>
                <Muted>{note.subject}</Muted>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
