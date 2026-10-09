import { registerAuditActions } from "./auditActions";

let registered = false;

export function registerActions(): void {
  if (registered) {
    return;
  }

  registered = true;

  registerAuditActions();
}
