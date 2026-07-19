/**
 * KnowledgeProvider — swap LLM Wiki for full GraphRAG without touching API/UI.
 */

export interface KnowledgeDocument {
  id: string;
  title: string;
  kind: "wiki" | "source";
  slug: string;
  summary: string;
  content: string;
  score?: number;
  links?: string[];
}

export interface SearchOptions {
  limit?: number;
  expandHops?: number;
  includeSources?: boolean;
}

export interface SearchResult {
  query: string;
  documents: KnowledgeDocument[];
  expandedFrom?: string[];
}

export interface ChatContext {
  query: string;
  documents: KnowledgeDocument[];
}

export interface DoctorReport {
  orphans: string[];
  missingTargets: { from: string; to: string }[];
  contradictions: { page: string; note: string }[];
  pageCount: number;
  linkCount: number;
}

export interface WikiGraph {
  nodes: { id: string; title: string; type: string }[];
  edges: { source: string; target: string }[];
}

export interface KnowledgeProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  getPage(slug: string): Promise<KnowledgeDocument | null>;
  listPages(): Promise<KnowledgeDocument[]>;
  getGraph(): Promise<WikiGraph>;
  getChatContext(query: string): Promise<ChatContext>;
  doctor(): Promise<DoctorReport>;
}
