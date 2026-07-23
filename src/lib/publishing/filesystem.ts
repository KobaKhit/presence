import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import {
  ENTRIES_DIR,
  getEntries,
  getEntry,
  resolveEntryAsset,
  type Entry,
  type EntryType,
} from "@/lib/content/entries";
import type {
  AssetStore,
  ContentRepository,
  EntryAssetWrite,
  EntryDraft,
  PublishJob,
  PublishJobKind,
  PublishJobRunner,
  PublishResult,
} from "./types";
import { validateEntryDraft } from "./validate";

function toMarkdown(draft: EntryDraft): string {
  const fm = {
    ...draft.frontmatter,
    type: draft.type,
    draft: draft.draft ?? draft.frontmatter.draft ?? false,
  };
  return matter.stringify(draft.body.replace(/^\n+/, ""), fm);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export class FilesystemContentRepository implements ContentRepository {
  async listEntries(filter?: {
    type?: EntryType | EntryType[];
  }): Promise<Entry[]> {
    return getEntries(filter);
  }

  async getEntry(slug: string): Promise<Entry | null> {
    return getEntry(slug);
  }

  async publishEntry(
    draft: EntryDraft,
    assets: EntryAssetWrite[] = [],
  ): Promise<PublishResult> {
    const issues = validateEntryDraft(draft);
    if (issues.length) {
      throw new Error(
        `Invalid entry draft: ${issues.map((i) => `${i.field}: ${i.message}`).join("; ")}`,
      );
    }

    const warnings: string[] = [];
    const useFolder =
      draft.asFolder ||
      assets.length > 0 ||
      draft.type === "visual" ||
      Boolean(draft.frontmatter.visualPath && !draft.frontmatter.visualPath.startsWith("/"));

    let outPath: string;
    if (useFolder) {
      const dir = path.join(ENTRIES_DIR, draft.slug);
      await ensureDir(dir);
      outPath = path.join(dir, "index.md");
      await fs.writeFile(outPath, toMarkdown(draft), "utf-8");
      for (const asset of assets) {
        if (asset.relativePath.includes("..")) {
          warnings.push(`Skipped unsafe asset path: ${asset.relativePath}`);
          continue;
        }
        const abs = path.join(dir, asset.relativePath);
        await ensureDir(path.dirname(abs));
        await fs.writeFile(abs, asset.content);
      }
    } else {
      outPath = path.join(ENTRIES_DIR, `${draft.slug}.md`);
      await fs.writeFile(outPath, toMarkdown(draft), "utf-8");
      if (assets.length) {
        warnings.push("Assets ignored for flat .md entries; set asFolder or use a visual folder");
      }
    }

    return {
      slug: draft.slug,
      type: draft.type,
      path: path.relative(process.cwd(), outPath).replace(/\\/g, "/"),
      published: !(draft.draft ?? draft.frontmatter.draft),
      warnings,
    };
  }

  async deleteEntry(slug: string): Promise<boolean> {
    const flat = path.join(ENTRIES_DIR, `${slug}.md`);
    const dir = path.join(ENTRIES_DIR, slug);
    try {
      await fs.unlink(flat);
      return true;
    } catch {
      /* try folder */
    }
    try {
      await fs.rm(dir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }
}

export class FilesystemAssetStore implements AssetStore {
  resolveEntryAsset(entryDir: string, assetPath: string): string | null {
    return resolveEntryAsset(entryDir, assetPath);
  }

  async writeEntryAsset(
    slug: string,
    asset: EntryAssetWrite,
  ): Promise<{ url: string; path: string }> {
    if (asset.relativePath.includes("..")) {
      throw new Error("Invalid asset path");
    }
    const dir = path.join(ENTRIES_DIR, slug);
    await ensureDir(dir);
    const abs = path.join(dir, asset.relativePath);
    await ensureDir(path.dirname(abs));
    await fs.writeFile(abs, asset.content);
    return {
      path: path.relative(process.cwd(), abs).replace(/\\/g, "/"),
      url: `/entries/${slug}/${asset.relativePath.replace(/\\/g, "/")}`,
    };
  }
}

/** In-process job runner — OSS default. Hosted products replace with a queue. */
export class LocalPublishJobRunner implements PublishJobRunner {
  private jobs = new Map<string, PublishJob>();

  async enqueue(kind: PublishJobKind): Promise<PublishJob> {
    const now = new Date().toISOString();
    const job: PublishJob = {
      id: `job_${Date.now().toString(36)}`,
      kind,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);

    // Fire-and-forget local execution
    void this.run(job.id);
    return job;
  }

  async getJob(id: string): Promise<PublishJob | null> {
    return this.jobs.get(id) ?? null;
  }

  private async run(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    job.status = "running";
    job.updatedAt = new Date().toISOString();
    try {
      if (job.kind === "compile-graph" || job.kind === "compile-full") {
        const { getKnowledgeProvider, writeWikiGraph, WikiKnowledgeProvider } =
          await import("@/lib/knowledge");
        const provider = getKnowledgeProvider();
        if (!(provider instanceof WikiKnowledgeProvider)) {
          throw new Error("Unsupported knowledge provider");
        }
        const graph = await provider.buildGraphFromPages();
        await writeWikiGraph(graph);
        const report = await provider.doctor();
        job.result = {
          pageCount: report.pageCount,
          linkCount: report.linkCount,
          orphans: report.orphans,
          missingTargets: report.missingTargets,
          note:
            job.kind === "compile-full"
              ? "Graph refreshed. Full LLM synthesis still runs via `npm run presence -- compile`."
              : "Graph index refreshed from content/wiki.",
        };
      } else if (job.kind === "reindex") {
        const { reindexEmbeddings } = await import("@/lib/knowledge");
        const result = await reindexEmbeddings();
        job.result = result as unknown as Record<string, unknown>;
      }
      job.status = "succeeded";
    } catch (err) {
      job.status = "failed";
      job.error = err instanceof Error ? err.message : "Job failed";
    }
    job.updatedAt = new Date().toISOString();
  }
}

let repoSingleton: FilesystemContentRepository | null = null;
let assetsSingleton: FilesystemAssetStore | null = null;
let jobsSingleton: LocalPublishJobRunner | null = null;

export function getContentRepository(): ContentRepository {
  repoSingleton ??= new FilesystemContentRepository();
  return repoSingleton;
}

export function getAssetStore(): AssetStore {
  assetsSingleton ??= new FilesystemAssetStore();
  return assetsSingleton;
}

export function getPublishJobRunner(): PublishJobRunner {
  jobsSingleton ??= new LocalPublishJobRunner();
  return jobsSingleton;
}
