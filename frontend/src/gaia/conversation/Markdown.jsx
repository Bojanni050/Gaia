import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="code-block" data-testid="code-block">
      <div className="code-block-bar">
        <span className="code-lang">{language || 'text'}</span>
        <button className="code-copy" onClick={copy} data-testid="code-copy-btn" aria-label="Copy code">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={oneDark}
        customStyle={{ margin: 0, background: 'transparent', fontSize: '0.85rem', padding: '14px 16px' }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export default function Markdown({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children: c, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const value = String(c).replace(/\n$/, '');
          if (!inline && (match || value.includes('\n'))) {
            return <CodeBlock language={match ? match[1] : ''} value={value} />;
          }
          return <code className="inline-code" {...props}>{c}</code>;
        },
        a: ({ node, ...props }) => <a target="_blank" rel="noreferrer" {...props} />,
        table: ({ node, ...props }) => (
          <div className="md-table-wrap"><table {...props} /></div>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
