import { getDatabase } from "@/database";
import type {
  AuditChanges,
  AuditLog,
  CreateAuditLogInput,
} from "@/models/auditLog";

type AuditLogRow = {
  id: number;
  user_id: number | null;
  user_name: string;
  action: AuditLog["action"];
  entity_type: AuditLog["entityType"];
  entity_id: number | null;
  entity_name: string;
  changes: string;
  created_at: string;
};

function parseChanges(value: string): AuditChanges {
  try {
    const parsed = JSON.parse(value);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as AuditChanges;
    }
  } catch {
    // Return an empty object for invalid JSON.
  }

  return {};
}

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    changes: parseChanges(row.changes),
    createdAt: row.created_at,
  };
}

export async function createAuditLog(
  input: CreateAuditLogInput,
): Promise<AuditLog> {
  const db = await getDatabase();

  const userName = input.userName.trim();

  if (!userName) {
    throw new Error("Audit log user name is required.");
  }

  const entityName = input.entityName?.trim() ?? "";

  const changes = JSON.stringify(input.changes ?? {});
  const createdAt = new Date().toISOString();

  const result = await db.runAsync(
    `
      INSERT INTO audit_logs (
        user_id,
        user_name,
        action,
        entity_type,
        entity_id,
        entity_name,
        changes,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    `,
    input.userId ?? null,
    userName,
    input.action,
    input.entityType,
    input.entityId ?? null,
    entityName,
    changes,
    createdAt,
  );

  const auditLog = await getAuditLogById(Number(result.lastInsertRowId));

  if (!auditLog) {
    throw new Error("Audit log was created but could not be retrieved.");
  }

  return auditLog;
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<AuditLogRow>(
    `
      SELECT
        id,
        user_id,
        user_name,
        action,
        entity_type,
        entity_id,
        entity_name,
        changes,
        created_at
      FROM audit_logs
      ORDER BY created_at DESC, id DESC;
    `,
  );

  return rows.map(mapAuditLog);
}

export async function getAuditLogsByEntity(
  entityType: AuditLog["entityType"],
  entityId: number,
): Promise<AuditLog[]> {
  const db = await getDatabase();

  const rows = await db.getAllAsync<AuditLogRow>(
    `
      SELECT
        id,
        user_id,
        user_name,
        action,
        entity_type,
        entity_id,
        entity_name,
        changes,
        created_at
      FROM audit_logs
      WHERE entity_type = ?
        AND entity_id = ?
      ORDER BY created_at DESC, id DESC;
    `,
    entityType,
    entityId,
  );

  return rows.map(mapAuditLog);
}

export async function getAuditLogById(id: number): Promise<AuditLog | null> {
  const db = await getDatabase();

  const row = await db.getFirstAsync<AuditLogRow>(
    `
      SELECT
        id,
        user_id,
        user_name,
        action,
        entity_type,
        entity_id,
        entity_name,
        changes,
        created_at
      FROM audit_logs
      WHERE id = ?
      LIMIT 1;
    `,
    id,
  );

  return row ? mapAuditLog(row) : null;
}
