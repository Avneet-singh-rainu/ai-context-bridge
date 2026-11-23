interface WorkspacePlaceholderProps {
  title: string;
  summary: string;
  milestone: string;
}

/** Stand-in content for a workspace whose feature lands in a later milestone. */
export function WorkspacePlaceholder({ title, summary, milestone }: WorkspacePlaceholderProps) {
  return (
    <section className="workspace">
      <h1>{title}</h1>
      <p>{summary}</p>
      <p className="workspace-milestone">Coming in {milestone}.</p>
    </section>
  );
}
