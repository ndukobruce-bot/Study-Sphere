/**
 * An in-memory stand-in for expo-sqlite's SQLiteDatabase, implementing only
 * the exact statement shapes this app actually issues (see every file in
 * src/db/repositories and src/db/backup.ts, src/db/schema.ts). This is not
 * a general SQL engine - expo-sqlite has no usable web target without extra
 * Metro/WASM/header setup (alpha-quality per Expo's own docs), so this fake
 * exists for two purposes:
 *
 *  1. The web build (src/db/client.ts swaps to this on Platform.OS==="web",
 *     never on Android/iOS - verified by grepping the Android export).
 *  2. apps/mobile's Vitest suite (src/db/repositories/*.test.ts), so
 *     repository logic can be tested without a device.
 *
 * If a statement shape appears that this fake doesn't recognize, it throws
 * loudly rather than silently no-op-ing - a wrong result here should fail a
 * test or crash the web build visibly, never hide a bug.
 */

export interface FakeSQLiteDatabase {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
}

type Row = Record<string, unknown>;

function parseLiteral(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.toUpperCase() === "NULL") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const quoted = trimmed.match(/^'([\s\S]*)'$/);
  if (quoted) return quoted[1]!.replace(/''/g, "'");
  return trimmed;
}

/** Splits a parenthesized, comma-separated list, respecting quoted strings. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i]!;
    if (char === "'" && input[i - 1] !== "\\") inString = !inString;
    if (!inString) {
      if (char === "(") depth += 1;
      if (char === ")") depth -= 1;
    }
    if (char === "," && depth === 0 && !inString) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim().length) parts.push(current);
  return parts.map(part => part.trim());
}

export function createFakeSQLiteDatabase(): FakeSQLiteDatabase {
  const tables = new Map<string, Row[]>();
  const pragmas = new Map<string, number>();
  let snapshot: Map<string, Row[]> | null = null;

  function table(name: string): Row[] {
    if (!tables.has(name)) tables.set(name, []);
    return tables.get(name)!;
  }

  function consumeParams(placeholders: string, params: unknown[]): unknown[] {
    let paramIndex = 0;
    return splitTopLevel(placeholders).map(token => {
      const trimmed = token.trim();
      if (trimmed === "?") return params[paramIndex++];
      return parseLiteral(trimmed);
    });
  }

  function evalTerm(term: string, existing: Row | undefined, candidate: Row): number {
    const trimmed = term.trim();
    const excludedMatch = trimmed.match(/^excluded\.(\w+)$/i);
    if (excludedMatch) return Number(candidate[excludedMatch[1]!]);
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    return Number(existing?.[trimmed] ?? 0);
  }

  function applyWhere(rows: Row[], whereClause: string | undefined, params: unknown[]): { matches: Row[]; rest: Row[] } {
    if (!whereClause) return { matches: rows, rest: [] };
    const match = whereClause.match(/^\s*(\w+)\s*=\s*(\?|-?\d+|'[^']*')\s*$/);
    if (!match) throw new Error(`fakeSqlite: unsupported WHERE clause "${whereClause}"`);
    const [, column, valueToken] = match;
    const value = valueToken === "?" ? params[0] : parseLiteral(valueToken!);
    const matches: Row[] = [];
    const rest: Row[] = [];
    for (const row of rows) {
      // SQLite is loose about 0/1 vs boolean; compare loosely on purpose.
      // eslint-disable-next-line eqeqeq
      if (row[column!] == value) matches.push(row);
      else rest.push(row);
    }
    return { matches, rest };
  }

  function runStatement(sql: string, params: unknown[]): { lastInsertRowId: number; changes: number } {
    const statement = sql.trim();

    if (/^BEGIN TRANSACTION/i.test(statement)) {
      snapshot = new Map(Array.from(tables.entries()).map(([name, rows]) => [name, rows.map(row => ({ ...row }))]));
      return { lastInsertRowId: 0, changes: 0 };
    }
    if (/^COMMIT/i.test(statement)) {
      snapshot = null;
      return { lastInsertRowId: 0, changes: 0 };
    }
    if (/^ROLLBACK/i.test(statement)) {
      if (snapshot) tables.clear();
      snapshot?.forEach((rows, name) => tables.set(name, rows));
      snapshot = null;
      return { lastInsertRowId: 0, changes: 0 };
    }
    if (/^PRAGMA journal_mode/i.test(statement)) return { lastInsertRowId: 0, changes: 0 };
    if (/^PRAGMA user_version\s*=\s*(\d+)/i.test(statement)) {
      const value = Number(statement.match(/=\s*(\d+)/)![1]);
      pragmas.set("user_version", value);
      return { lastInsertRowId: 0, changes: 0 };
    }
    if (/^CREATE TABLE/i.test(statement)) {
      const name = statement.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i)?.[1];
      if (name) table(name);
      return { lastInsertRowId: 0, changes: 0 };
    }
    // No query planner to speed up here - just acknowledge the DDL.
    if (/^CREATE INDEX/i.test(statement)) return { lastInsertRowId: 0, changes: 0 };

    const insertMatch = statement.match(/^INSERT INTO\s+(\w+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+?)\)\s*(?:ON CONFLICT\((\w+)\)\s*DO UPDATE SET\s*([\s\S]+))?$/i);
    if (insertMatch) {
      const [, tableName, columnList, valueList, conflictKey, setClause] = insertMatch;
      const columns = splitTopLevel(columnList!);
      const values = consumeParams(valueList!, params);
      const candidate: Row = {};
      columns.forEach((column, index) => { candidate[column] = values[index]; });

      const rows = table(tableName!);
      const existingIndex = conflictKey ? rows.findIndex(row => row[conflictKey] === candidate[conflictKey]) : -1;

      if (existingIndex === -1) {
        rows.push(candidate);
      } else if (setClause) {
        const existing = rows[existingIndex]!;
        for (const assignment of splitTopLevel(setClause)) {
          const [rawColumn, rawExpr] = assignment.split("=").map(part => part.trim());
          const column = rawColumn!;
          if (rawExpr!.includes("+")) {
            const sum = rawExpr!.split("+").reduce((total, term) => total + evalTerm(term, existing, candidate), 0);
            existing[column] = sum;
          } else if (/^excluded\.(\w+)$/i.test(rawExpr!)) {
            existing[column] = candidate[rawExpr!.match(/^excluded\.(\w+)$/i)![1]!];
          } else {
            existing[column] = parseLiteral(rawExpr!);
          }
        }
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    const updateMatch = statement.match(/^UPDATE\s+(\w+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (updateMatch) {
      const [, tableName, setClause, whereClause] = updateMatch;
      const assignments = splitTopLevel(setClause!);
      let paramIndex = 0;
      const rows = table(tableName!);
      const setterParams = params.slice(0, assignments.length);
      const whereParams = params.slice(assignments.length);
      const { matches } = applyWhere(rows, whereClause, whereParams);
      matches.forEach(row => {
        assignments.forEach((assignment, index) => {
          const [column, valueToken] = assignment.split("=").map(part => part.trim());
          row[column!] = valueToken === "?" ? setterParams[index] : parseLiteral(valueToken!);
        });
      });
      void paramIndex;
      return { lastInsertRowId: 0, changes: matches.length };
    }

    const deleteMatch = statement.match(/^DELETE FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]+))?$/i);
    if (deleteMatch) {
      const [, tableName, whereClause] = deleteMatch;
      const rows = table(tableName!);
      if (!whereClause) {
        const removed = rows.length;
        tables.set(tableName!, []);
        return { lastInsertRowId: 0, changes: removed };
      }
      const { matches, rest } = applyWhere(rows, whereClause, params);
      tables.set(tableName!, rest);
      return { lastInsertRowId: 0, changes: matches.length };
    }

    throw new Error(`fakeSqlite: unsupported statement: ${statement}`);
  }

  function runSelect<T>(sql: string, params: unknown[]): T[] {
    const statement = sql.trim();

    if (/^SELECT\s+COUNT\(\*\)\s+as\s+count\s+FROM\s+(\w+)/i.test(statement)) {
      const tableName = statement.match(/FROM\s+(\w+)/i)![1]!;
      return [{ count: table(tableName).length } as unknown as T];
    }

    const match = statement.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+ORDER BY\s+(\w+)\s*(ASC|DESC)?)?$/i);
    if (!match) throw new Error(`fakeSqlite: unsupported SELECT: ${statement}`);
    const [, columnsRaw, tableName, whereClause, orderColumn, orderDirection] = match;
    const rows = table(tableName!);
    const { matches } = applyWhere(rows, whereClause, params);

    let projected = matches.map(row => {
      if (columnsRaw!.trim() === "*") return { ...row };
      const projectedRow: Row = {};
      for (const column of splitTopLevel(columnsRaw!)) projectedRow[column] = row[column];
      return projectedRow;
    });

    if (orderColumn) {
      const direction = (orderDirection ?? "ASC").toUpperCase() === "DESC" ? -1 : 1;
      projected = [...projected].sort((a, b) => {
        const left = a[orderColumn]; const right = b[orderColumn];
        if (left === right) return 0;
        return (left! < right! ? -1 : 1) * direction;
      });
    }

    return projected as unknown as T[];
  }

  return {
    async execAsync(sql: string) {
      for (const statement of sql.split(";").map(part => part.trim()).filter(Boolean)) {
        runStatement(statement, []);
      }
    },
    async runAsync(sql: string, params: unknown[] = []) {
      return runStatement(sql, params);
    },
    async getAllAsync<T>(sql: string, params: unknown[] = []) {
      if (/^PRAGMA/i.test(sql.trim())) return [];
      return runSelect<T>(sql, params);
    },
    async getFirstAsync<T>(sql: string, params: unknown[] = []) {
      if (/^PRAGMA user_version/i.test(sql.trim())) {
        return { user_version: pragmas.get("user_version") ?? 0 } as unknown as T;
      }
      const rows = runSelect<T>(sql, params);
      return rows[0] ?? null;
    }
  };
}
