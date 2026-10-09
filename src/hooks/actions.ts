import type { ActionHandler, AppActionMap, AppActionName } from "./actionTypes";

type RegisteredAction = {
  handler: ActionHandler<unknown>;
  priority: number;
};

const actionRegistry = new Map<AppActionName, RegisteredAction[]>();

export function addAction<T extends AppActionName>(
  action: T,
  handler: ActionHandler<AppActionMap[T]>,
  priority = 10,
): void {
  const handlers = actionRegistry.get(action) ?? [];

  handlers.push({
    handler: handler as ActionHandler<unknown>,
    priority,
  });

  handlers.sort((a, b) => a.priority - b.priority);

  actionRegistry.set(action, handlers);
}

export function removeAction<T extends AppActionName>(
  action: T,
  handler: ActionHandler<AppActionMap[T]>,
): void {
  const handlers = actionRegistry.get(action);

  if (!handlers) {
    return;
  }

  const filteredHandlers = handlers.filter(
    (registeredAction) => registeredAction.handler !== handler,
  );

  if (filteredHandlers.length === 0) {
    actionRegistry.delete(action);
    return;
  }

  actionRegistry.set(action, filteredHandlers);
}

export async function doAction<T extends AppActionName>(
  action: T,
  payload: AppActionMap[T],
): Promise<void> {
  const handlers = actionRegistry.get(action);

  if (!handlers || handlers.length === 0) {
    return;
  }

  for (const registeredAction of handlers) {
    await registeredAction.handler(payload);
  }
}
