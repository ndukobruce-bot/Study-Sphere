import { describe, expect, it } from "vitest";
import { addDays, daysBetweenInclusive, daysUntil, dueBucket, formatDueLabel, parseExamLines, toIsoDate } from "../dates";

describe("daysUntil", () => {
  it("is 0 for today", () => {
    expect(daysUntil("2026-09-10", "2026-09-10")).toBe(0);
  });
  it("is negative for overdue dates", () => {
    expect(daysUntil("2026-09-08", "2026-09-10")).toBe(-2);
  });
  it("is positive for future dates", () => {
    expect(daysUntil("2026-09-15", "2026-09-10")).toBe(5);
  });
  it("returns Infinity for an empty date", () => {
    expect(daysUntil("", "2026-09-10")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("daysBetweenInclusive", () => {
  it("clamps to 0 when end is before start", () => {
    expect(daysBetweenInclusive("2026-09-10", "2026-09-05")).toBe(0);
  });
  it("counts inclusive days ahead", () => {
    expect(daysBetweenInclusive("2026-09-10", "2026-09-17")).toBe(7);
  });
  it("is 0 for the same day", () => {
    expect(daysBetweenInclusive("2026-09-10", "2026-09-10")).toBe(0);
  });
});

describe("dueBucket", () => {
  const today = "2026-09-10";
  it("buckets overdue", () => expect(dueBucket("2026-09-09", today)).toBe("overdue"));
  it("buckets today", () => expect(dueBucket("2026-09-10", today)).toBe("today"));
  it("buckets tomorrow", () => expect(dueBucket("2026-09-11", today)).toBe("tomorrow"));
  it("buckets this-week", () => expect(dueBucket("2026-09-16", today)).toBe("this-week"));
  it("buckets later", () => expect(dueBucket("2026-09-25", today)).toBe("later"));
  it("buckets none for no date", () => expect(dueBucket(null, today)).toBe("none"));
});

describe("formatDueLabel", () => {
  const today = "2026-09-10";
  it("matches the original tasks.js copy", () => {
    expect(formatDueLabel("2026-09-09", today)).toBe("overdue");
    expect(formatDueLabel("2026-09-10", today)).toBe("due today");
    expect(formatDueLabel("2026-09-11", today)).toBe("due tomorrow");
    expect(formatDueLabel("2026-09-13", today)).toBe("due in 3 days");
    expect(formatDueLabel("", today)).toBe("");
  });
});

describe("parseExamLines", () => {
  it("parses 'Name - YYYY-MM-DD' lines", () => {
    expect(parseExamLines("Linear Algebra - 2026-11-03")).toEqual([
      { name: "Linear Algebra", date: "2026-11-03" }
    ]);
  });
  it("parses 'Name on YYYY-MM-DD' lines", () => {
    expect(parseExamLines("Organic Chemistry on 2026-12-01")).toEqual([
      { name: "Organic Chemistry", date: "2026-12-01" }
    ]);
  });
  it("ignores unparseable lines and handles multiple lines", () => {
    const result = parseExamLines("Linear Algebra - 2026-11-03\nnot a valid line\nStats on 2026-12-10");
    expect(result).toEqual([
      { name: "Linear Algebra", date: "2026-11-03" },
      { name: "Stats", date: "2026-12-10" }
    ]);
  });
  it("returns an empty array for empty input", () => {
    expect(parseExamLines("")).toEqual([]);
  });
});

describe("addDays / toIsoDate", () => {
  it("adds days across a month boundary", () => {
    expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
  });
  it("toIsoDate formats as YYYY-MM-DD using local calendar fields", () => {
    expect(toIsoDate(new Date(2026, 0, 5, 12, 0, 0))).toBe("2026-01-05");
  });
});
