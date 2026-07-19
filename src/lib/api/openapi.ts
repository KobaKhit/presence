import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import {
  BlogPostSchema,
  BlogPostSummarySchema,
  ChatRequestSchema,
  ErrorSchema,
  PresenceSchema,
  ProjectSchema,
  ProjectSummarySchema,
  ResumeSchema,
  SearchQuerySchema,
  SearchResultSchema,
  WikiGraphSchema,
  WikiPageProposalSchema,
  WikiPageSchema,
  WikiPageSummarySchema,
  WikiProposeSchema,
  WikiSaveSchema,
} from "./schemas";

const registry = new OpenAPIRegistry();

registry.register("Presence", PresenceSchema);
registry.register("BlogPostSummary", BlogPostSummarySchema);
registry.register("BlogPost", BlogPostSchema);
registry.register("ProjectSummary", ProjectSummarySchema);
registry.register("Project", ProjectSchema);
registry.register("Resume", ResumeSchema);
registry.register("WikiPageSummary", WikiPageSummarySchema);
registry.register("WikiPage", WikiPageSchema);
registry.register("WikiGraph", WikiGraphSchema);
registry.register("WikiPageProposal", WikiPageProposalSchema);
registry.register("WikiPropose", WikiProposeSchema);
registry.register("WikiSave", WikiSaveSchema);
registry.register("SearchResult", SearchResultSchema);
registry.register("Error", ErrorSchema);

registry.registerPath({
  method: "get",
  path: "/api/v1/presence",
  summary: "Get Presence identity",
  tags: ["Presence"],
  responses: {
    200: {
      description: "Presence profile",
      content: { "application/json": { schema: PresenceSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/blog",
  summary: "List blog posts",
  tags: ["Blog"],
  responses: {
    200: {
      description: "Blog post summaries",
      content: {
        "application/json": {
          schema: { type: "array", items: { $ref: "#/components/schemas/BlogPostSummary" } },
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/blog/{slug}",
  summary: "Get a blog post",
  tags: ["Blog"],
  request: {
    params: BlogPostSummarySchema.pick({ slug: true }),
  },
  responses: {
    200: {
      description: "Full blog post",
      content: { "application/json": { schema: BlogPostSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/projects",
  summary: "List projects",
  tags: ["Projects"],
  responses: {
    200: {
      description: "Project summaries",
      content: {
        "application/json": {
          schema: { type: "array", items: { $ref: "#/components/schemas/ProjectSummary" } },
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/projects/{slug}",
  summary: "Get a project",
  tags: ["Projects"],
  request: {
    params: ProjectSummarySchema.pick({ slug: true }),
  },
  responses: {
    200: {
      description: "Full project",
      content: { "application/json": { schema: ProjectSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/resume",
  summary: "Get resume",
  tags: ["Resume"],
  responses: {
    200: {
      description: "Resume markdown + HTML",
      content: { "application/json": { schema: ResumeSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/wiki",
  summary: "List wiki pages",
  tags: ["Wiki"],
  responses: {
    200: {
      description: "Wiki page summaries",
      content: {
        "application/json": {
          schema: { type: "array", items: { $ref: "#/components/schemas/WikiPageSummary" } },
        },
      },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/wiki/{slug}",
  summary: "Get a wiki page",
  tags: ["Wiki"],
  request: {
    params: WikiPageSummarySchema.pick({ slug: true }),
  },
  responses: {
    200: {
      description: "Full wiki page",
      content: { "application/json": { schema: WikiPageSchema } },
    },
    404: {
      description: "Not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/wiki/graph",
  summary: "Get wiki link graph",
  tags: ["Wiki"],
  responses: {
    200: {
      description: "Adjacency graph of wiki pages",
      content: { "application/json": { schema: WikiGraphSchema } },
    },
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/search",
  summary: "Hybrid graph-expanded search",
  tags: ["Search"],
  request: { query: SearchQuerySchema },
  responses: {
    200: {
      description: "Ranked wiki pages + source excerpts",
      content: { "application/json": { schema: SearchResultSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/chat",
  summary: "Chat grounded in the wiki knowledge base",
  tags: ["Chat"],
  request: {
    body: {
      content: { "application/json": { schema: ChatRequestSchema } },
    },
  },
  responses: {
    200: {
      description: "Assistant reply (JSON or SSE stream)",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              role: { type: "string" },
              content: { type: "string" },
              sources: {
                type: "array",
                items: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/wiki/propose",
  summary: "Propose a wiki page draft from a chat answer (save-back)",
  tags: ["Wiki"],
  request: {
    body: {
      content: { "application/json": { schema: WikiProposeSchema } },
    },
  },
  responses: {
    200: {
      description: "Draft proposal for human approval",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              proposal: { $ref: "#/components/schemas/WikiPageProposal" },
            },
          },
        },
      },
    },
    503: {
      description: "LLM unavailable",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/wiki/save",
  summary: "Save an approved wiki page proposal",
  tags: ["Wiki"],
  request: {
    body: {
      content: { "application/json": { schema: WikiSaveSchema } },
    },
  },
  responses: {
    200: {
      description: "Saved page metadata",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              ok: { type: "boolean" },
              slug: { type: "string" },
              path: { type: "string" },
            },
          },
        },
      },
    },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Presence API",
      version: "1.0.0",
      description:
        "Stable headless API for a Presence personal site. Build alternate UIs against this contract. Knowledge endpoints read the compiled LLM Wiki with graph-expanded retrieval.",
    },
    servers: [{ url: "/" }],
    tags: [
      { name: "Presence" },
      { name: "Blog" },
      { name: "Projects" },
      { name: "Resume" },
      { name: "Wiki" },
      { name: "Search" },
      { name: "Chat" },
    ],
  });
}
