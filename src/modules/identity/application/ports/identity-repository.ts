import type { ActorProfile } from "../../domain/actor";
import type { PlatifyRole } from "../../domain/roles";

export interface IdentityRepository {
  findProfileByUserId(userId: string): Promise<ActorProfile | null>;
  findRolesByUserId(userId: string): Promise<readonly PlatifyRole[]>;
}
