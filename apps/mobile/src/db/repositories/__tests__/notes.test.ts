import { beforeEach, describe, expect, it } from "vitest";
import { __resetDbForTests } from "../../client";
import * as notesRepo from "../notes";

beforeEach(() => { __resetDbForTests(); });

describe("notes repository", () => {
  it("creates a note with an optional source", async () => {
    const note = await notesRepo.createNote({ title: "Cell biology", subject: "Biology", body: "Notes here", source: "summarizer" });
    expect(note.source).toBe("summarizer");
  });

  it("defaults source to null when omitted", async () => {
    const note = await notesRepo.createNote({ title: "Untitled", subject: "General", body: "..." });
    expect(note.source).toBeNull();
  });

  it("lists most-recently-created first", async () => {
    await notesRepo.createNote({ title: "First", subject: "A", body: "1" });
    await new Promise(resolve => setTimeout(resolve, 2));
    const second = await notesRepo.createNote({ title: "Second", subject: "A", body: "2" });
    const notes = await notesRepo.listNotes();
    expect(notes[0]!.id).toBe(second.id);
  });

  it("deletes a note", async () => {
    const note = await notesRepo.createNote({ title: "Temp", subject: "A", body: "x" });
    await notesRepo.deleteNote(note.id);
    expect(await notesRepo.listNotes()).toHaveLength(0);
  });
});
