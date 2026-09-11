import type { PlatifyRole } from "./roles";

export type ActorProfile = Readonly<{
  username: string;
  displayName: string | null;
  avatarPath: string | null;
}>;

export type CurrentActor = Readonly<{
  userId: string;
  email?: string;
  profile: ActorProfile | null;
  roles: readonly PlatifyRole[];
  effectiveRole: PlatifyRole | null;
}>;
