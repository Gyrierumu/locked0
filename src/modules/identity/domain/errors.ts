export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("The current actor does not have the required role.");
    this.name = "ForbiddenError";
  }
}

export class IdentityProviderError extends Error {
  constructor(message = "The identity provider operation failed.") {
    super(message);
    this.name = "IdentityProviderError";
  }
}
