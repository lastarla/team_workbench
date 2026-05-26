import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './MessageRenderer.css'

interface Props {
  content: string
  role: 'user' | 'assistant'
}

interface FileEdit {
  filename: string
  additions: number
  deletions: number
}

function parseFileEdits(content: string): { text: string; edits: FileEdit[] } {
  const editRegex = /\[FILE_EDIT:(.+?)\|(\+\d+)\|(−?\-?\d+)\]/g
  const edits: FileEdit[] = []
  const text = content.replace(editRegex, (_, filename, add, del) => {
    edits.push({ filename, additions: parseInt(add), deletions: parseInt(del) })
    return ''
  })
  return { text, edits }
}

export default function MessageRenderer({ content, role }: Props) {
  const { text, edits } = parseFileEdits(content)

  return (
    <div className={`msg-bubble ${role}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const code = String(children).replace(/\n$/, '')
            if (match) {
              return (
                <div className="code-block">
                  <div className="code-header">
                    <span>{match[1]}</span>
                    <button className="copy-btn" onClick={() => navigator.clipboard.writeText(code)}>复制</button>
                  </div>
                  <SyntaxHighlighter style={oneLight} language={match[1]} PreTag="div">
                    {code}
                  </SyntaxHighlighter>
                </div>
              )
            }
            return <code className={className} {...props}>{children}</code>
          }
        }}
      >
        {text}
      </ReactMarkdown>

      {edits.map((edit, i) => (
        <div key={i} className="file-edit-card">
          <span className="file-edit-icon">📄</span>
          <span className="file-edit-name">已编辑 {edit.filename}</span>
          <span className="file-edit-diff">
            <span className="add">+{edit.additions}</span>
            <span className="del">{edit.deletions}</span>
          </span>
          <div className="file-edit-actions">
            <button>撤销 ↩</button>
            <button>审核</button>
          </div>
        </div>
      ))}
    </div>
  )
}
