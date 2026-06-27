import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export function ReportMarkdown({ content }: { content: string }) {
  return (
    <div className="flex flex-col gap-3 text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-2 text-base font-semibold tracking-tight text-foreground">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-1 text-sm font-semibold text-foreground">{children}</h3>
          ),
          p: ({ children }) => <p className="text-muted-foreground">{children}</p>,
          ul: ({ children }) => (
            <ul className="ml-4 flex list-disc flex-col gap-1.5 text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-4 flex list-decimal flex-col gap-1.5 text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b px-2 py-1.5 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b px-2 py-1.5 text-muted-foreground">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
