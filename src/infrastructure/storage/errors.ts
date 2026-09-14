export type StorageFailureKind = "missing" | "conflict" | "provider";

export class StorageInfrastructureError extends Error {
  readonly kind: StorageFailureKind;

  constructor(kind: StorageFailureKind) {
    super(`Storage operation failed: ${kind}`);
    this.name = "StorageInfrastructureError";
    this.kind = kind;
  }
}
