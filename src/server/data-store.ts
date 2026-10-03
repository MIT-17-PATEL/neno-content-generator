import crypto from "crypto";
import { DbUser, DbWorkspace, DbBrandSettings } from "@/db/schema";

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "editor" | "viewer";
}

interface StoredUser extends DbUser {
  passwordHash: string;
}

// In-memory persistent database store (with isolation and schema contracts)
class MemoryDataStore {
  private users: Map<string, StoredUser> = new Map();
  private workspaces: Map<string, DbWorkspace> = new Map();
  private members: WorkspaceMember[] = [];
  private brandSettings: Map<string, DbBrandSettings> = new Map();

  constructor() {
    // Seed default admin account for local development
    const defaultUserId = "usr_default_mit";
    this.users.set(defaultUserId, {
      id: defaultUserId,
      email: "mitpatel@nenotechnology.com",
      name: "Mit Patel",
      passwordHash: "$2a$10$wN9QkPz/tE2rPzX1wFq7.u8Q7gK8eI3tT1xM5hV0p9m2k8q6l8u4e", // "password123"
      created_at: new Date(),
      updated_at: new Date(),
    });

    const defaultWorkspaceId = "ws_default_neno";
    this.workspaces.set(defaultWorkspaceId, {
      id: defaultWorkspaceId,
      owner_id: defaultUserId,
      name: "Neno Content Engine",
      description: "Primary workspace for autonomous content generation",
      created_at: new Date(),
      updated_at: new Date(),
    });

    this.members.push({
      workspaceId: defaultWorkspaceId,
      userId: defaultUserId,
      role: "owner",
    });

    this.brandSettings.set(defaultWorkspaceId, {
      id: "brand_default",
      workspace_id: defaultWorkspaceId,
      brand_name: "Neno Technology",
      industry: "Enterprise AI & Cloud Engineering",
      audience: "CTOs, Engineering Leaders, VP of Product, Tech Founders",
      tone: "Authoritative, insightful, modern, highly articulate",
      style_guidelines: "Concise sentences, data-driven points, no filler phrases.",
      preferred_terms: ["autonomous", "fault-tolerant", "high-velocity", "scalable"],
      prohibited_terms: ["game-changer", "revolutionary", "synergy", "paradigm shift"],
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  // Users
  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const allUsers = Array.from(this.users.values());
    for (const user of allUsers) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  async findUserById(id: string): Promise<DbUser | null> {
    const user = this.users.get(id);
    if (!user) return null;
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }

  async createUser(data: { email: string; name: string; passwordHash: string }): Promise<DbUser> {
    const id = `usr_${crypto.randomUUID().slice(0, 8)}`;
    const user: StoredUser = {
      id,
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.set(id, user);

    // Auto-create personal workspace for new user
    const workspaceId = `ws_${crypto.randomUUID().slice(0, 8)}`;
    const workspace: DbWorkspace = {
      id: workspaceId,
      owner_id: id,
      name: `${data.name}'s Workspace`,
      description: "Default workspace",
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.workspaces.set(workspaceId, workspace);
    this.members.push({
      workspaceId,
      userId: id,
      role: "owner",
    });

    // Default brand settings for new workspace
    this.brandSettings.set(workspaceId, {
      id: `brand_${crypto.randomUUID().slice(0, 8)}`,
      workspace_id: workspaceId,
      brand_name: `${data.name} Brand`,
      industry: "Technology",
      audience: "Target Audience",
      tone: "Professional & Engaging",
      style_guidelines: "Clear, concise, and professional writing style.",
      preferred_terms: [],
      prohibited_terms: [],
      created_at: new Date(),
      updated_at: new Date(),
    });

    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }

  // Workspaces
  async getUserWorkspaces(userId: string): Promise<DbWorkspace[]> {
    const memberWorkspaceIds = this.members
      .filter((m) => m.userId === userId)
      .map((m) => m.workspaceId);

    return Array.from(this.workspaces.values()).filter((w) =>
      memberWorkspaceIds.includes(w.id)
    );
  }

  async getWorkspaceById(workspaceId: string): Promise<DbWorkspace | null> {
    return this.workspaces.get(workspaceId) || null;
  }

  async isUserInWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    return this.members.some(
      (m) => m.userId === userId && m.workspaceId === workspaceId
    );
  }

  async createWorkspace(data: {
    ownerId: string;
    name: string;
    description?: string;
  }): Promise<DbWorkspace> {
    const id = `ws_${crypto.randomUUID().slice(0, 8)}`;
    const workspace: DbWorkspace = {
      id,
      owner_id: data.ownerId,
      name: data.name,
      description: data.description,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.workspaces.set(id, workspace);
    this.members.push({
      workspaceId: id,
      userId: data.ownerId,
      role: "owner",
    });

    // Initialize blank brand settings
    this.brandSettings.set(id, {
      id: `brand_${crypto.randomUUID().slice(0, 8)}`,
      workspace_id: id,
      brand_name: data.name,
      industry: "General",
      audience: "General Audience",
      tone: "Professional",
      style_guidelines: "",
      preferred_terms: [],
      prohibited_terms: [],
      created_at: new Date(),
      updated_at: new Date(),
    });

    return workspace;
  }

  async updateWorkspace(
    workspaceId: string,
    data: { name?: string; description?: string }
  ): Promise<DbWorkspace | null> {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return null;
    if (data.name) ws.name = data.name;
    if (data.description !== undefined) ws.description = data.description;
    ws.updated_at = new Date();
    this.workspaces.set(workspaceId, ws);
    return ws;
  }

  // Brand Settings
  async getBrandSettings(workspaceId: string): Promise<DbBrandSettings | null> {
    return this.brandSettings.get(workspaceId) || null;
  }

  async updateBrandSettings(
    workspaceId: string,
    data: {
      brandName: string;
      industry: string;
      audience: string;
      tone: string;
      styleGuidelines?: string;
      preferredTerms: string[];
      prohibitedTerms: string[];
    }
  ): Promise<DbBrandSettings> {
    let current = this.brandSettings.get(workspaceId);
    if (!current) {
      current = {
        id: `brand_${crypto.randomUUID().slice(0, 8)}`,
        workspace_id: workspaceId,
        brand_name: data.brandName,
        industry: data.industry,
        audience: data.audience,
        tone: data.tone,
        style_guidelines: data.styleGuidelines,
        preferred_terms: data.preferredTerms,
        prohibited_terms: data.prohibitedTerms,
        created_at: new Date(),
        updated_at: new Date(),
      };
    } else {
      current = {
        ...current,
        brand_name: data.brandName,
        industry: data.industry,
        audience: data.audience,
        tone: data.tone,
        style_guidelines: data.styleGuidelines,
        preferred_terms: data.preferredTerms,
        prohibited_terms: data.prohibitedTerms,
        updated_at: new Date(),
      };
    }
    this.brandSettings.set(workspaceId, current);
    return current;
  }
}

// Global singleton for server execution
const globalForDataStore = global as unknown as { dataStore?: MemoryDataStore };
export const dataStore = globalForDataStore.dataStore || new MemoryDataStore();
if (process.env.NODE_ENV !== "production") globalForDataStore.dataStore = dataStore;
