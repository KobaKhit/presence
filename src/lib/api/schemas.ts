import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const PresenceSchema = z
  .object({
    name: z.string(),
    fullName: z.string(),
    tagline: z.string(),
    bio: z.string(),
    location: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    social: z.record(z.string(), z.string().optional()),
  })
  .openapi("Presence");

export const BlogPostSummarySchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    date: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
  })
  .openapi("BlogPostSummary");

export const BlogPostSchema = BlogPostSummarySchema.extend({
  content: z.string(),
  html: z.string(),
}).openapi("BlogPost");

export const ProjectSummarySchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    date: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    url: z.string().optional(),
    github: z.string().optional(),
    pdf: z.string().optional(),
    status: z.enum(["active", "archived", "wip"]),
    kind: z.enum(["project", "visual"]).default("project"),
    visualPath: z.string().optional(),
    image: z.string().optional(),
    featured: z.boolean().default(false),
  })
  .openapi("ProjectSummary");

export const ProjectSchema = ProjectSummarySchema.extend({
  content: z.string(),
  html: z.string(),
}).openapi("Project");

export const ResumeSchema = z
  .object({
    content: z.string(),
    html: z.string(),
    frontmatter: z.record(z.string(), z.unknown()),
  })
  .openapi("Resume");

export const WikiPageSummarySchema = z
  .object({
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    type: z.enum(["hub", "entity", "concept"]),
    sources: z.array(z.string()),
    links: z.array(z.string()),
  })
  .openapi("WikiPageSummary");

export const WikiPageSchema = WikiPageSummarySchema.extend({
  content: z.string(),
  html: z.string(),
  updated: z.string().optional(),
}).openapi("WikiPage");

export const WikiGraphSchema = z
  .object({
    nodes: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        type: z.string(),
      }),
    ),
    edges: z.array(
      z.object({
        source: z.string(),
        target: z.string(),
      }),
    ),
  })
  .openapi("WikiGraph");

export const SearchDocumentSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    kind: z.enum(["wiki", "source"]),
    slug: z.string(),
    summary: z.string(),
    score: z.number().optional(),
  })
  .openapi("SearchDocument");

export const SearchResultSchema = z
  .object({
    query: z.string(),
    documents: z.array(SearchDocumentSchema),
    expandedFrom: z.array(z.string()).optional(),
  })
  .openapi("SearchResult");

export const SearchQuerySchema = z
  .object({
    q: z.string().min(1),
    limit: z.coerce.number().int().min(1).max(20).optional(),
  })
  .openapi("SearchQuery");

export const ChatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
  })
  .openapi("ChatMessage");

export const ChatRequestSchema = z
  .object({
    messages: z.array(ChatMessageSchema).min(1),
    /** When true, client may auto-follow explicit navigation actions. */
    autoNavigate: z.boolean().optional(),
  })
  .openapi("ChatRequest");

export const NavigationActionSchema = z
  .object({
    href: z.string().min(1),
    label: z.string().min(1),
    reason: z.string().optional(),
    confidence: z.enum(["high", "medium", "low"]).optional(),
    explicit: z.boolean().optional(),
  })
  .openapi("NavigationAction");

export const EntryTypeSchema = z.enum(["post", "project", "visual"]).openapi("EntryType");

export const EntryDraftSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    type: EntryTypeSchema,
    frontmatter: z.record(z.string(), z.unknown()),
    body: z.string(),
    asFolder: z.boolean().optional(),
    draft: z.boolean().optional(),
  })
  .openapi("EntryDraft");

export const EntryAssetSchema = z
  .object({
    relativePath: z.string().min(1),
    content: z.string(),
    contentType: z.string().optional(),
  })
  .openapi("EntryAsset");

export const PublishResultSchema = z
  .object({
    slug: z.string(),
    type: EntryTypeSchema,
    path: z.string(),
    published: z.boolean(),
    warnings: z.array(z.string()),
  })
  .openapi("PublishResult");

export const PublishJobSchema = z
  .object({
    id: z.string(),
    kind: z.enum(["compile-graph", "compile-full", "reindex"]),
    status: z.enum(["queued", "running", "succeeded", "failed"]),
    createdAt: z.string(),
    updatedAt: z.string(),
    error: z.string().optional(),
    result: z.record(z.string(), z.unknown()).optional(),
  })
  .openapi("PublishJob");

export const WikiPageProposalSchema = z
  .object({
    title: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    summary: z.string(),
    type: z.enum(["concept", "entity", "hub"]),
    content: z.string().min(1),
    sources: z.array(z.string()),
  })
  .openapi("WikiPageProposal");

export const WikiProposeSchema = z
  .object({
    question: z.string().min(1),
    answer: z.string().min(1),
    sourceSlugs: z.array(z.string()).optional(),
  })
  .openapi("WikiPropose");

export const WikiSaveSchema = z
  .object({
    proposal: WikiPageProposalSchema,
    approved: z.boolean(),
  })
  .openapi("WikiSave");

export const ErrorSchema = z
  .object({
    error: z.string(),
    details: z.unknown().optional(),
  })
  .openapi("Error");
