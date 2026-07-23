import type { EntryDraft } from "./types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ValidationIssue {
  field: string;
  message: string;
}

export function validateEntryDraft(draft: EntryDraft): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!draft.slug || !SLUG_RE.test(draft.slug)) {
    issues.push({
      field: "slug",
      message: "Slug must be lowercase kebab-case (a-z, 0-9, hyphens)",
    });
  }

  if (!["post", "project", "visual"].includes(draft.type)) {
    issues.push({ field: "type", message: "type must be post, project, or visual" });
  }

  const title = draft.frontmatter.title?.trim();
  if (!title) {
    issues.push({ field: "frontmatter.title", message: "Title is required" });
  }

  if (draft.type === "visual") {
    const hasVisualPath = Boolean(draft.frontmatter.visualPath?.trim());
    const hasHtmlBody = draft.body.trim().startsWith("<");
    if (!hasVisualPath && !hasHtmlBody && !draft.asFolder) {
      issues.push({
        field: "visualPath",
        message:
          "Visuals need visualPath, an HTML body, or folder packaging with index.html",
      });
    }
  }

  if (draft.body == null) {
    issues.push({ field: "body", message: "Body is required (may be empty string)" });
  }

  return issues;
}
