import type { MUiEngineManifest } from "./contracts.js";

export interface MUiEngineValidationIssue {
  path: string;
  message: string;
}

export class MUiEngineValidationError extends Error {
  public readonly mIssues: MUiEngineValidationIssue[];

  constructor(issues: MUiEngineValidationIssue[]) {
    super(`Invalid MUiEngineManifest. Issue count: ${issues.length}`);
    this.name = "MUiEngineValidationError";
    this.mIssues = issues;
  }
}

export function MValidateUiEngineManifest(manifest: unknown): MUiEngineValidationIssue[] {
  const issues: MUiEngineValidationIssue[] = [];
  const value = manifest as Partial<MUiEngineManifest> | null | undefined;

  if (!value || typeof value !== "object") {
    issues.push({ path: "$", message: "manifest must be an object" });
    return issues;
  }

  if (value.schemaVersion !== "mui.engine.v1" && value.schemaVersion !== "mui.engine.v2") {
    issues.push({
      path: "schemaVersion",
      message: "schemaVersion must be 'mui.engine.v1' or 'mui.engine.v2'"
    });
  }

  if (!Array.isArray(value.navigationGroups)) {
    issues.push({ path: "navigationGroups", message: "navigationGroups must be an array" });
  }

  if (!Array.isArray(value.screens)) {
    issues.push({ path: "screens", message: "screens must be an array" });
  }

  if (!Array.isArray(value.actions)) {
    issues.push({ path: "actions", message: "actions must be an array" });
  }

  if (!Array.isArray(value.dataSources)) {
    issues.push({ path: "dataSources", message: "dataSources must be an array" });
  }

  if (value.componentRegistry !== undefined) {
    if (!value.componentRegistry || typeof value.componentRegistry !== "object") {
      issues.push({ path: "componentRegistry", message: "componentRegistry must be an object" });
    } else if (
      !("components" in value.componentRegistry) ||
      typeof value.componentRegistry.components !== "object" ||
      value.componentRegistry.components === null
    ) {
      issues.push({
        path: "componentRegistry.components",
        message: "componentRegistry.components must be a dictionary"
      });
    }
  }

  if (Array.isArray(value.screens)) {
    for (let index = 0; index < value.screens.length; index += 1) {
      const screen = value.screens[index];
      if (!screen || !screen.screenKey) {
        issues.push({
          path: `screens[${index}].screenKey`,
          message: "screenKey is required"
        });
      }
      if (!screen || !screen.route) {
        issues.push({
          path: `screens[${index}].route`,
          message: "route is required"
        });
      }
    }
  }

  if (Array.isArray(value.actions)) {
    for (let index = 0; index < value.actions.length; index += 1) {
      const action = value.actions[index];
      if (!action || !action.actionKey) {
        issues.push({
          path: `actions[${index}].actionKey`,
          message: "actionKey is required"
        });
      }
    }
  }

  if (value.schemaVersion === "mui.engine.v2") {
    if (value.appShell !== undefined && value.appShell !== null) {
      if (typeof value.appShell !== "object" || !value.appShell.rootLayout) {
        issues.push({
          path: "appShell.rootLayout",
          message: "appShell.rootLayout is required for schema v2"
        });
      }
    }

    if (value.authProfile !== undefined && value.authProfile !== null) {
      const source = value.authProfile.tokenSource;
      if (source !== "header" && source !== "cookie" && source !== "localStorage") {
        issues.push({
          path: "authProfile.tokenSource",
          message: "authProfile.tokenSource must be header, cookie, or localStorage"
        });
      }
    }
  }

  return issues;
}

export function MAssertUiEngineManifest(manifest: unknown): asserts manifest is MUiEngineManifest {
  const issues = MValidateUiEngineManifest(manifest);
  if (issues.length > 0) {
    throw new MUiEngineValidationError(issues);
  }
}
