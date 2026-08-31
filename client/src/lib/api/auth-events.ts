type AuthFailureHandler = () => void;

let authFailureHandler: AuthFailureHandler | null = null;

/** Register a handler invoked when refresh fails after 401 (session expired). */
export function setAuthFailureHandler(handler: AuthFailureHandler | null): void {
  authFailureHandler = handler;
}

export function notifyAuthFailure(): void {
  authFailureHandler?.();
}
