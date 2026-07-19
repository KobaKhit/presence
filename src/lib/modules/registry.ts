import { getPresenceConfig } from "@/lib/config";
import type { PresenceModule } from "@/lib/modules/types";
import {
  BlogPostSchema,
  BlogPostSummarySchema,
  ProjectSchema,
  ProjectSummarySchema,
  ResumeSchema,
  SearchResultSchema,
  WikiPageSchema,
  WikiPageSummarySchema,
} from "@/lib/api/schemas";

export function getEnabledModules(): PresenceModule[] {
  const config = getPresenceConfig();
  const modules: PresenceModule[] = [
    {
      id: "blog",
      name: "Blog",
      description: "Immutable posts under content/sources/entries (type: post)",
      enabled: config.modules.blog,
      routes: ["/blog", "/blog/[slug]", "/api/v1/blog", "/api/v1/blog/{slug}"],
      schemas: { BlogPostSummary: BlogPostSummarySchema, BlogPost: BlogPostSchema },
      mcpTools: ["list_blog_posts", "get_blog_post"],
      agentTools: ["list_blog_posts", "get_blog_post"],
      skillPath: "/skills/blog/SKILL.md",
    },
    {
      id: "projects",
      name: "Projects",
      description: "Projects & visuals under content/sources/entries (type: project|visual)",
      enabled: config.modules.projects,
      routes: ["/projects", "/projects/[slug]", "/visuals", "/visuals/[slug]", "/api/v1/projects"],
      schemas: { ProjectSummary: ProjectSummarySchema, Project: ProjectSchema },
      mcpTools: ["list_projects", "get_project"],
      agentTools: ["list_projects"],
      skillPath: "/skills/projects/SKILL.md",
    },
    {
      id: "resume",
      name: "Resume",
      description: "Single resume source at content/sources/resume.md",
      enabled: config.modules.resume,
      routes: ["/resume", "/api/v1/resume"],
      schemas: { Resume: ResumeSchema },
      mcpTools: ["get_resume"],
      agentTools: ["get_resume"],
    },
    {
      id: "wiki",
      name: "Wiki",
      description: "LLM-compiled knowledge base with link graph",
      enabled: config.modules.wiki,
      routes: ["/wiki", "/wiki/[slug]", "/api/v1/wiki", "/api/v1/wiki/graph"],
      schemas: { WikiPageSummary: WikiPageSummarySchema, WikiPage: WikiPageSchema },
      mcpTools: ["get_wiki_page", "list_wiki_pages", "get_wiki_graph"],
      agentTools: ["get_wiki_page", "search_knowledge"],
      skillPath: "/skills/wiki/SKILL.md",
    },
    {
      id: "search",
      name: "Search",
      description: "Hybrid lexical + graph-expanded retrieval",
      enabled: config.modules.search,
      routes: ["/api/v1/search"],
      schemas: { SearchResult: SearchResultSchema },
      mcpTools: ["search_knowledge"],
      agentTools: ["search_knowledge"],
    },
    {
      id: "chat",
      name: "Chat",
      description: "Wiki-grounded conversational agent",
      enabled: config.modules.chat,
      routes: ["/chat", "/api/v1/chat", "/api/agent"],
      mcpTools: [],
      agentTools: ["search_knowledge", "get_wiki_page"],
    },
  ];

  return modules.filter((m) => m.enabled);
}
