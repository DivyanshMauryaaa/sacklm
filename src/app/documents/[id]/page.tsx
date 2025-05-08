'use client'

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Markdown from 'react-markdown';
import { useUser } from '@clerk/nextjs';

interface DocumentEditorProps {
  id: string;
  title: string;
  content: string;
}

const DocumentEditor = ({ id, title, content }: DocumentEditorProps) => {
  const titleInstance = title;
  const contentInstance = content;
  const idInstance = id;

  const [editorTitle, setTitle] = useState(titleInstance);
  const [editorContent, setContent] = useState(contentInstance);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useUser();
  const [Saveloader, setSaveloader] = useState(false);

  const handleFormat = (formatType: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = editorContent.substring(start, end);
    
    let formatChars = '';
    let cursorOffset = 0;
    
    switch (formatType) {
      case 'bold':
        formatChars = '**';
        break;
      case 'italic':
        formatChars = '_';
        break;
      case 'strikethrough':
        formatChars = '~~';
        break;
      case 'heading1':
        formatChars = '# ';
        cursorOffset = 2;
        break;
      case 'heading2':
        formatChars = '## ';
        cursorOffset = 3;
        break;
      case 'heading3':
        formatChars = '### ';
        cursorOffset = 4;
        break;
      case 'quote':
        formatChars = '> ';
        cursorOffset = 2;
        break;
      case 'code':
        formatChars = '`';
        break;
      case 'codeblock':
        formatChars = '```\n';
        cursorOffset = 4;
        break;
      case 'link': {
        if (start === end) {
          const newText = '[Link Text](url)';
          const newContent = editorContent.substring(0, start) + newText + editorContent.substring(end);
          setContent(newContent);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 1, start + 10);
          }, 0);
          return;
        } else {
          const newText = `[${selectedText}](url)`;
          const newContent = editorContent.substring(0, start) + newText + editorContent.substring(end);
          setContent(newContent);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + selectedText.length + 2, start + selectedText.length + 5);
          }, 0);
          return;
        }
      }
      case 'list': {
        if (start === end) {
          const newText = '- ';
          const newContent = editorContent.substring(0, start) + newText + editorContent.substring(end);
          setContent(newContent);
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 2, start + 2);
          }, 0);
          return;
        } else {
          const lines = selectedText.split('\n');
          const listItems = lines.map(line => `- ${line}`).join('\n');
          const newContent = editorContent.substring(0, start) + listItems + editorContent.substring(end);
          setContent(newContent);
          return;
        }
      }
    }

    const beforeSelection = editorContent.substring(0, start);
    const afterSelection = editorContent.substring(end);
    
    if (['heading1', 'heading2', 'heading3', 'quote', 'list'].includes(formatType)) {
      const lineStart = beforeSelection.lastIndexOf('\n') + 1;
      const linePrefix = beforeSelection.substring(lineStart);
      
      if (linePrefix === formatChars) {
        const newContent = editorContent.substring(0, lineStart) + editorContent.substring(lineStart + formatChars.length);
        setContent(newContent);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart, lineStart);
        }, 0);
        return;
      }
      
      if (['heading1', 'heading2', 'heading3'].includes(formatType) && 
          (linePrefix.startsWith('# ') || linePrefix.startsWith('## ') || linePrefix.startsWith('### '))) {
        const newContent = editorContent.substring(0, lineStart) + formatChars + editorContent.substring(lineStart + linePrefix.length);
        setContent(newContent);
        return;
      }
      
      const newContent = editorContent.substring(0, lineStart) + formatChars + editorContent.substring(lineStart);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart + formatChars.length, lineStart + formatChars.length);
      }, 0);
      return;
    }
    
    if (start === end) {
      const newContent = editorContent.substring(0, start) + formatChars + formatChars + editorContent.substring(end);
      setContent(newContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + formatChars.length, start + formatChars.length);
      }, 0);
    } else {
      const isAlreadyFormatted = 
        editorContent.substring(start - formatChars.length, start) === formatChars && 
        editorContent.substring(end, end + formatChars.length) === formatChars;
      
      if (isAlreadyFormatted) {
        const newContent = editorContent.substring(0, start - formatChars.length) + 
                          selectedText + 
                          editorContent.substring(end + formatChars.length);
        setContent(newContent);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - formatChars.length, end - formatChars.length);
        }, 0);
      } else {
        const newContent = editorContent.substring(0, start) + 
                          formatChars + selectedText + formatChars + 
                          editorContent.substring(end);
        setContent(newContent);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + formatChars.length, start + formatChars.length);
        }, 0);
      }
    }
  };

  const saveDocument = async () => {
    setSaveloader(true)

    try {
      if (id) {
        const { data, error } = await supabase
          .from('documents')
          .update({
            title: editorTitle,
            content: editorContent,
          })
          .eq('id', id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('documents')
          .insert({
            title: editorTitle,
            content: editorContent,
            user_id: user?.id,
          });
        
        if (error) throw error;
      }
      alert('Document saved successfully!');
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Failed to save document.');
    }

    setSaveloader(false)
  };

  return (
    <div className="max-w-4xl mx-auto p-4 h-[80vh]">
      <input
        type="text"
        value={editorTitle}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-2xl font-bold mb-4 p-2 border border-gray-300 rounded"
        placeholder="Document Title"
      />
      
      <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-100 rounded">
        <button onClick={() => handleFormat('bold')} className="p-2 hover:bg-gray-200 rounded">B</button>
        <button onClick={() => handleFormat('italic')} className="p-2 hover:bg-gray-200 rounded">I</button>
        <button onClick={() => handleFormat('strikethrough')} className="p-2 hover:bg-gray-200 rounded">S</button>
        <button onClick={() => handleFormat('heading1')} className="p-2 hover:bg-gray-200 rounded">H1</button>
        <button onClick={() => handleFormat('heading2')} className="p-2 hover:bg-gray-200 rounded">H2</button>
        <button onClick={() => handleFormat('heading3')} className="p-2 hover:bg-gray-200 rounded">H3</button>
        <button onClick={() => handleFormat('quote')} className="p-2 hover:bg-gray-200 rounded">"</button>
        <button onClick={() => handleFormat('code')} className="p-2 hover:bg-gray-200 rounded">{'</>'}</button>
        <button onClick={() => handleFormat('codeblock')} className="p-2 hover:bg-gray-200 rounded">{'{}`'}</button>
        <button onClick={() => handleFormat('link')} className="p-2 hover:bg-gray-200 rounded">🔗</button>
        <button onClick={() => handleFormat('list')} className="p-2 hover:bg-gray-200 rounded">•</button>
        
        <div className="flex-grow"></div>
        <button onClick={() => setPreview(!preview)} className="p-2 hover:bg-gray-200 rounded">
          {preview ? 'Edit' : 'Preview'}
        </button>
        <button disabled={Saveloader} onClick={saveDocument} className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Save
        </button>
      </div>

      <div className="rounded min-h-96 h-[60vh]">
        {preview ? (
          <div className="p-4 prose max-w-none h-[60vh]">
            <Markdown>{editorContent}</Markdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={editorContent}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-[60vh] p-4 font-mono resize-none focus:outline-none"
            placeholder="Start writing in Markdown..."
          />
        )}
      </div>
    </div>
  );
};

export default DocumentEditor;
