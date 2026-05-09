import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => <h1 className="font-title text-primary mb-6 text-4xl font-bold">{children}</h1>,
    h2: ({ children }) => <h2 className="font-title text-primary mb-4 mt-8 text-2xl font-bold">{children}</h2>,
    h3: ({ children }) => <h3 className="font-title text-primary mb-3 mt-6 text-xl font-semibold">{children}</h3>,
    p: ({ children }) => (
      <p className="font-body text-foreground mb-4 text-lg leading-relaxed opacity-90">{children}</p>
    ),
    ul: ({ children }) => (
      <ul className="font-body text-foreground mb-4 list-disc space-y-2 pl-6 text-lg opacity-90">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="font-body text-foreground mb-4 list-decimal space-y-2 pl-6 text-lg opacity-90">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }) => (
      <a href={href} className="text-primary underline underline-offset-4 hover:opacity-80">
        {children}
      </a>
    ),
    pre: ({ children }) => <pre className="bg-muted mb-4 overflow-x-auto rounded-lg p-4">{children}</pre>,
    code: ({ children }) => <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">{children}</code>,
    blockquote: ({ children }) => (
      <blockquote className="border-primary/50 text-muted-foreground my-4 border-l-4 pl-4 italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-border my-8" />,
    table: ({ children }) => (
      <div className="mb-6 overflow-x-auto">
        <table className="border-border w-full border-collapse border text-left text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-border border-b last:border-0">{children}</tr>,
    th: ({ children }) => (
      <th className="font-title text-primary border-border border px-4 py-2 font-semibold">{children}</th>
    ),
    td: ({ children }) => (
      <td className="font-body text-foreground border-border border px-4 py-2 align-top opacity-90">{children}</td>
    ),
    ...components
  }
}
