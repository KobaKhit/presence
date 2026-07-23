import { describe, expect, it } from "vitest";
import {
  PresenceSchema,
  BlogPostSummarySchema,
  WikiPageSummarySchema,
  WikiGraphSchema,
  SearchQuerySchema,
  ChatRequestSchema,
  EntryDraftSchema,
  NavigationActionSchema,
  ProjectSummarySchema,
} from "@/lib/api/schemas";
import { extractWikiLinks, renderWikiLinks, stripDuplicateTitleH1 } from "@/lib/content/markdown";
import {
  filterSourceRefs,
  findUnknownCitations,
  isSignificantEntity,
  type SourceIndex,
} from "@/lib/content/citations";
import {
  isAllowedNavigationHref,
  looksLikeExplicitNavigation,
  sanitizeNavigationAction,
  validateEntryDraft,
} from "@/lib/publishing";
import { BUILTIN_THEME_PRESETS, resolveThemeConfig } from "@/lib/config/themes";
import type { PresenceConfig } from "@/lib/config/types";

describe("OpenAPI / Zod schemas", () => {
  it("parses PresenceSchema sample", () => {
    const parsed = PresenceSchema.parse({
      name: "Ada",
      fullName: "Ada Lovelace",
      tagline: "Notes",
      bio: "Writer",
      social: { github: "https://github.com/ada" },
    });
    expect(parsed.name).toBe("Ada");
  });

  it("parses key route schemas", () => {
    expect(
      BlogPostSummarySchema.parse({
        slug: "hello",
        title: "Hello",
        date: "2026-01-01",
        summary: "Hi",
        tags: ["a"],
      }).slug,
    ).toBe("hello");

    expect(
      WikiPageSummarySchema.parse({
        slug: "index",
        title: "Index",
        summary: "",
        type: "hub",
        sources: [],
        links: ["a"],
      }).type,
    ).toBe("hub");

    expect(
      WikiGraphSchema.parse({
        nodes: [{ id: "a", title: "A", type: "concept" }],
        edges: [{ source: "a", target: "a" }],
      }).nodes,
    ).toHaveLength(1);

    expect(SearchQuerySchema.parse({ q: "nba" }).q).toBe("nba");
    expect(
      ChatRequestSchema.parse({
        messages: [{ role: "user", content: "hi" }],
        autoNavigate: true,
      }).autoNavigate,
    ).toBe(true);

    expect(
      ProjectSummarySchema.parse({
        slug: "lab",
        title: "Lab",
        date: "2026-01-01",
        summary: "x",
        tags: [],
        status: "active",
        kind: "project",
        featured: true,
      }).featured,
    ).toBe(true);

    expect(
      EntryDraftSchema.parse({
        slug: "my-post",
        type: "post",
        frontmatter: { title: "Hi" },
        body: "Hello",
      }).type,
    ).toBe("post");

    expect(
      NavigationActionSchema.parse({
        href: "/blog",
        label: "Blog",
        confidence: "high",
        explicit: true,
      }).href,
    ).toBe("/blog");
  });
});

describe("wiki links", () => {
  it("extracts normal [[slug]] links", () => {
    expect(extractWikiLinks("See [[nba-analytics]] and [[Linear Optimization]].")).toEqual([
      "nba-analytics",
      "linear-optimization",
    ]);
  });

  it("strips leading brackets from triple-bracket junk", () => {
    expect(extractWikiLinks("Bad [[[slug]]] and [[[[nested]]]]")).toEqual(["slug", "nested"]);
  });

  it("renderWikiLinks produces /wiki/slug hrefs", () => {
    expect(renderWikiLinks("Go [[presence-framework|Presence]].")).toBe(
      "Go [Presence](/wiki/presence-framework).",
    );
    expect(renderWikiLinks("Go [[[weird]]].")).toBe("Go [weird](/wiki/weird).");
  });

  it("stripDuplicateTitleH1 removes matching leading H1", () => {
    expect(stripDuplicateTitleH1("# D3.js\n\nBody", "D3.js")).toBe("Body");
    expect(stripDuplicateTitleH1("# Other\n\nBody", "D3.js")).toBe("# Other\n\nBody");
  });
});

describe("citation helper", () => {
  const index: SourceIndex = {
    refs: new Set([
      "blog/hello-world",
      "projects/presence",
      "entries/hello-world",
      "entries/presence",
      "hello-world",
      "presence",
      "resume",
    ]),
    canonicalBySlug: new Map([
      ["hello-world", "blog/hello-world"],
      ["presence", "projects/presence"],
      ["resume", "resume"],
    ]),
  };

  it("coerces wrong route prefix to canonical", () => {
    const { valid, unknown } = filterSourceRefs(index, ["projects/hello-world"]);
    expect(unknown).toEqual([]);
    expect(valid).toEqual(["blog/hello-world"]);
  });

  it("findUnknownCitations reports page → bad source", () => {
    const issues = findUnknownCitations(
      [
        { slug: "llm-wiki", sources: ["projects/presence", "blog/nope"] },
        { slug: "ok", sources: ["resume"] },
      ],
      index,
    );
    expect(issues).toEqual([{ page: "llm-wiki", source: "blog/nope" }]);
  });

  it("isSignificantEntity requires ≥2 sources unless hub/career/own work", () => {
    expect(
      isSignificantEntity(
        {
          slug: "kebab-case",
          title: "Kebab Case",
          type: "concept",
          sourceRefs: ["blog/hello-world"],
        },
        index,
      ),
    ).toBe(false);

    expect(
      isSignificantEntity(
        {
          slug: "nba",
          title: "NBA",
          type: "concept",
          sourceRefs: ["blog/hello-world", "projects/presence"],
        },
        index,
      ),
    ).toBe(true);

    expect(
      isSignificantEntity(
        {
          slug: "koba-career",
          title: "Career",
          type: "entity",
          sourceRefs: ["resume"],
        },
        index,
      ),
    ).toBe(true);

    expect(
      isSignificantEntity(
        {
          slug: "presence",
          title: "Presence",
          type: "entity",
          sourceRefs: ["projects/presence"],
        },
        index,
      ),
    ).toBe(true);
  });
});

describe("publishing / navigation", () => {
  it("validates entry drafts", () => {
    expect(
      validateEntryDraft({
        slug: "Bad Slug",
        type: "post",
        frontmatter: {},
        body: "x",
      }).some((i) => i.field === "slug"),
    ).toBe(true);

    expect(
      validateEntryDraft({
        slug: "good-post",
        type: "post",
        frontmatter: { title: "Hello" },
        body: "body",
      }),
    ).toEqual([]);
  });

  it("allowlists internal navigation only", () => {
    expect(isAllowedNavigationHref("/blog")).toBe(true);
    expect(isAllowedNavigationHref("/wiki/alex-rivera")).toBe(true);
    expect(isAllowedNavigationHref("https://evil.example")).toBe(false);
    expect(isAllowedNavigationHref("//evil.example")).toBe(false);
    expect(isAllowedNavigationHref("/blog/../etc/passwd")).toBe(false);
    expect(sanitizeNavigationAction({ href: "/projects", label: "Projects" })?.href).toBe(
      "/projects",
    );
    expect(sanitizeNavigationAction({ href: "https://x.com", label: "X" })).toBeNull();
  });

  it("detects explicit navigation phrasing", () => {
    expect(looksLikeExplicitNavigation("take me to the wiki")).toBe(true);
    expect(looksLikeExplicitNavigation("what is Presence?")).toBe(false);
  });
});

describe("themes", () => {
  it("resolves named presets and legacy flat themes", () => {
    expect(Object.keys(BUILTIN_THEME_PRESETS)).toEqual(
      expect.arrayContaining(["lab", "midnight", "minimal"]),
    );

    const modern = resolveThemeConfig({
      theme: {
        defaultTheme: "midnight",
        presets: BUILTIN_THEME_PRESETS,
      },
    } as PresenceConfig);
    expect(modern.defaultTheme).toBe("midnight");

    const legacy = resolveThemeConfig({
      theme: {
        accent: "#111",
        accentBright: "#222",
        ink: "#000",
        muted: "#333",
        paper: "#fff",
      },
    } as PresenceConfig);
    expect(legacy.presets.lab.accent).toBe("#111");
  });
});
