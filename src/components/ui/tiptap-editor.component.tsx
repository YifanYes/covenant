'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/cn.lib'
import { useEffect } from 'react'

interface ToolbarBtnProps {
  onClick: () => void
  isActive: boolean
  children: React.ReactNode
  title?: string
}

function ToolbarBtn({ onClick, isActive, children, title }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors cursor-pointer',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function TiptapEditor({ content, onChange, placeholder, className, disabled }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] }
      }),
      Underline,
      Placeholder.configure({
        placeholder: placeholder || ''
      })
    ],
    content,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    }
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [editor, content])

  if (!editor) return null

  return (
    <div className={cn('tiptap-editor flex flex-col overflow-hidden rounded-xl border bg-background shadow-sm', className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <span className="font-bold">B</span>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <span className="italic">I</span>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline"
        >
          <span className="underline">U</span>
        </ToolbarBtn>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          H1
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarBtn>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet list"
        >
          &bull;
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Ordered list"
        >
          1.
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          &ldquo;
        </ToolbarBtn>
      </div>
      <EditorContent editor={editor} className="flex-1 px-4 py-3" />
    </div>
  )
}
