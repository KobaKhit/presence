export function MarkdownBody({ html }: { html: string }) {
  return (
    <div
      className="prose-presence max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
