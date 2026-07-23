import type { Entry, EntryFrontmatter, EntryType } from "@/lib/content/entries";

/**
 * Publishing domain contracts.
 *
 * Open-source default: filesystem adapters under content/sources/.
 * Hosted/paid product: swap these adapters for DB + object storage + queue.
 */

export type PublishJobKind = "compile-graph" | "compile-full" | "reindex";
export type PublishJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface EntryDraft {
  slug: string;
  type: EntryType;
  frontmatter: EntryFrontmatter;
  /** Markdown or HTML body (without frontmatter fence for md) */
  body: string;
  /** Prefer folder packaging when true or when assets are present */
  asFolder?: boolean;
  draft?: boolean;
}

export interface EntryAssetWrite {
  /** Path relative to the entry folder, e.g. embeds/plot.html */
  relativePath: string;
  content: string | Buffer;
  contentType?: string;
}

export interface PublishResult {
  slug: string;
  type: EntryType;
  path: string;
  published: boolean;
  warnings: string[];
}

export interface PublishJob {
  id: string;
  kind: PublishJobKind;
  status: PublishJobStatus;
  createdAt: string;
  updatedAt: string;
  error?: string;
  result?: Record<string, unknown>;
}

export interface ContentRepository {
  listEntries(filter?: { type?: EntryType | EntryType[] }): Promise<Entry[]>;
  getEntry(slug: string): Promise<Entry | null>;
  /** Validate + write an entry draft to the store (filesystem or remote). */
  publishEntry(draft: EntryDraft, assets?: EntryAssetWrite[]): Promise<PublishResult>;
  deleteEntry?(slug: string): Promise<boolean>;
}

export interface AssetStore {
  /** Resolve a path-traversal-safe absolute/local path or remote URL for an entry asset. */
  resolveEntryAsset(entryDir: string, assetPath: string): string | null;
  writeEntryAsset?(
    slug: string,
    asset: EntryAssetWrite,
  ): Promise<{ url: string; path: string }>;
}

export interface PublishJobRunner {
  enqueue(kind: PublishJobKind): Promise<PublishJob>;
  getJob(id: string): Promise<PublishJob | null>;
}

/** Future hosted control-plane entitlements (not implemented in OSS). */
export interface Entitlements {
  plan: "oss" | "hosted" | "pro";
  canUseCmsUi: boolean;
  canUseMultiTenant: boolean;
  canUseManagedVectors: boolean;
  maxSites: number;
}

export const OSS_ENTITLEMENTS: Entitlements = {
  plan: "oss",
  canUseCmsUi: false,
  canUseMultiTenant: false,
  canUseManagedVectors: false,
  maxSites: 1,
};
