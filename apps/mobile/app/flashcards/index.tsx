import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { View } from "react-native";
import { Button, Card, Divider, EmptyState, Input, Muted, Screen, Text } from "../../src/components/ui";
import { nextDueCard, useFlashcardsStore } from "../../src/store/flashcardsStore";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function Flashcards() {
  const theme = useTheme();
  const { cards, load, addCard, rateCard } = useFlashcardsStore();
  const [showAnswer, setShowAnswer] = useState(false);
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [showForm, setShowForm] = useState(false);

  useFocusEffect(useCallback(() => { load(); }, []));

  const due = nextDueCard(cards);

  async function rate(id: string, rating: "hard" | "easy") {
    await rateCard(id, rating);
    setShowAnswer(false);
  }

  async function submit() {
    if (!question.trim() || !answer.trim()) return;
    await addCard({ subject: subject.trim() || "General", question: question.trim(), answer: answer.trim() });
    setSubject("");
    setQuestion("");
    setAnswer("");
    setShowForm(false);
  }

  return (
    <Screen>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text variant="display">Flashcards</Text>
        <Button label={showForm ? "Cancel" : "Add card"} variant={showForm ? "outline" : "primary"} onPress={() => setShowForm(!showForm)} />
      </View>

      {showForm && (
        <Card style={{ gap: theme.spacing.md }}>
          <Input placeholder="Subject" value={subject} onChangeText={setSubject} />
          <Input placeholder="Question" value={question} onChangeText={setQuestion} />
          <Input placeholder="Answer" value={answer} onChangeText={setAnswer} />
          <Button label="Save card" onPress={submit} />
        </Card>
      )}

      {due ? (
        <Card style={{ gap: theme.spacing.md }}>
          <Muted>{due.subject}</Muted>
          <Text variant="title">{due.question}</Text>
          {showAnswer ? (
            <>
              <Text>{due.answer}</Text>
              <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
                <Button label="Hard" variant="outline" onPress={() => rate(due.id, "hard")} />
                <Button label="Easy" onPress={() => rate(due.id, "easy")} />
              </View>
            </>
          ) : (
            <Button label="Show answer" variant="outline" onPress={() => setShowAnswer(true)} />
          )}
        </Card>
      ) : (
        <EmptyState text="No cards due today. Add one above or come back tomorrow." />
      )}

      <Text variant="title">All cards</Text>
      {cards.length === 0 ? (
        <EmptyState text="No flashcards yet." />
      ) : (
        <Card style={{ padding: 0 }}>
          {cards.map((card, index) => (
            <View key={card.id}>
              {index > 0 && <Divider />}
              <View style={{ padding: theme.spacing.md }}>
                <Text>{card.question}</Text>
                <Muted>{card.subject} · due {card.dueDate}</Muted>
              </View>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}
