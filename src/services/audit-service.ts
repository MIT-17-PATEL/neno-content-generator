import crypto from "crypto";
import { AuditEvent, AuditAction } from "@/types";

const MAX_AUDIT_LOGS = 1000;
const memoryAuditLog: AuditEvent[] = [];

export class AuditService {
  static record(data: {
    workspaceId?: string;
    userId?: string;
    userEmail?: string;
    action: AuditAction;
    resourceId?: string;
    resourceType?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): AuditEvent {
    const id = `aud_${crypto.randomUUID().slice(0, 8)}`;
    const event: AuditEvent = {
      id,
      workspaceId: data.workspaceId,
      userId: data.userId,
      userEmail: data.userEmail,
      action: data.action,
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: new Date().toISOString(),
    };

    memoryAuditLog.unshift(event);

    // Keep log buffer bounded
    if (memoryAuditLog.length > MAX_AUDIT_LOGS) {
      memoryAuditLog.pop();
    }

    return event;
  }

  static list(options?: {
    workspaceId?: string;
    userId?: string;
    action?: AuditAction;
    limit?: number;
  }): AuditEvent[] {
    let list = [...memoryAuditLog];

    if (options?.workspaceId) {
      list = list.filter((e) => !e.workspaceId || e.workspaceId === options.workspaceId);
    }
    if (options?.userId) {
      list = list.filter((e) => e.userId === options.userId);
    }
    if (options?.action) {
      list = list.filter((e) => e.action === options.action);
    }

    return list.slice(0, options?.limit || 50);
  }
}
