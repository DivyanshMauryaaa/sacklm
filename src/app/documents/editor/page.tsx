'use client'

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Markdown from 'react-markdown';

interface Document {
  id?: string;
  title: string;
  content: string;
  user_id?: string;
}

const DocumentEditor = ({ document }: { document?: Document }) => {
  const [title, setTitle] = useState(document?.title || 'Untitled Document');
  const [content, setContent] = useState(document?.content || 'Get Started...');
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update content when document changes
  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setContent(document.content);
    }
  }, [document]);

  // Handle formatting button clicks
  const handleFormat = (formatType: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    let formatChars = '';
    let cursorOffset = 0;
    
    // Define formatting characters for each type
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
          const newContent = content.substring(0, start) + newText + content.substring(end);
          setContent(newContent);
          
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 1, start + 10);
          }, 0);
          return;
        } else {
          const newText = `[${selectedText}](url)`;
          const newContent = content.substring(0, start) + newText + content.substring(end);
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
          const newContent = content.substring(0, start) + newText + content.substring(end);
          setContent(newContent);
          
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + 2, start + 2);
          }, 0);
          return;
        } else {
          const lines = selectedText.split('\n');
          const listItems = lines.map(line => `- ${line}`).join('\n');
          const newContent = content.substring(0, start) + listItems + content.substring(end);
          setContent(newContent);
          return;
        }
      }
    }

    // Check if the text is already formatted with the selected format
    const beforeSelection = content.substring(0, start);
    const afterSelection = content.substring(end);
    
    // For headings and lists, check if we're at the start of a line
    if (['heading1', 'heading2', 'heading3', 'quote', 'list'].includes(formatType)) {
      // Find the start of the current line
      const lineStart = beforeSelection.lastIndexOf('\n') + 1;
      const linePrefix = beforeSelection.substring(lineStart);
      
      // If the line already has this formatting, remove it (toggle off)
      if (linePrefix === formatChars) {
        const newContent = content.substring(0, lineStart) + content.substring(lineStart + formatChars.length);
        setContent(newContent);
        
        // Position cursor at the beginning of the unformatted text
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(lineStart, lineStart);
        }, 0);
        return;
      }
      
      // If the line has different heading formatting, replace it
      if (['heading1', 'heading2', 'heading3'].includes(formatType) && 
          (linePrefix.startsWith('# ') || linePrefix.startsWith('## ') || linePrefix.startsWith('### '))) {
        const newContent = content.substring(0, lineStart) + formatChars + content.substring(lineStart + linePrefix.length);
        setContent(newContent);
        return;
      }
      
      // Add formatting at the beginning of the line
      const newContent = content.substring(0, lineStart) + formatChars + content.substring(lineStart);
      setContent(newContent);
      
      // Position cursor after the formatting
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart + formatChars.length, lineStart + formatChars.length);
      }, 0);
      return;
    }
    
    // For inline formatting (bold, italic, code, etc.)
    if (start === end) {
      // No text selected, insert empty formatting and place cursor between
      const newContent = content.substring(0, start) + formatChars + formatChars + content.substring(end);
      setContent(newContent);
      
      // Place cursor between the format chars
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + formatChars.length, start + formatChars.length);
      }, 0);
    } else {
      // Check if selected text is already formatted
      const isAlreadyFormatted = 
        content.substring(start - formatChars.length, start) === formatChars && 
        content.substring(end, end + formatChars.length) === formatChars;
      
      if (isAlreadyFormatted) {
        // Remove formatting
        const newContent = content.substring(0, start - formatChars.length) + 
                          selectedText + 
                          content.substring(end + formatChars.length);
        setContent(newContent);
        
        // Keep the same text selected
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start - formatChars.length, end - formatChars.length);
        }, 0);
      } else {
        // Add formatting
        const newContent = content.substring(0, start) + 
                          formatChars + selectedText + formatChars + 
                          content.substring(end);
        setContent(newContent);
        
        // Keep the same text selected including the format chars
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + formatChars.length, end + formatChars.length);
        }, 0);
      }
    }
  };

  const saveDocument = async () => {
    try {
      if (!document?.id) {
        // Create new document
        const { data, error } = await supabase
          .from('documents')
          .insert({
            title,
            content,
            user_id: document?.user_id || 'current-user-id'
          });
        
        if (error) throw error;
      } else {
        // Update existing document
        const { data, error } = await supabase
          .from('documents')
          .update({
            title,
            content
          })
          .eq('id', document.id);
        
        if (error) throw error;
      }
      
      alert('Document saved successfully!');
    } catch (error) {
      console.error('Error saving document:', error);
      alert('Failed to save document.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full text-2xl font-bold mb-4 p-2 border border-gray-300 rounded"
        placeholder="Document Title"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-100 rounded">
        <button onClick={() => handleFormat('bold')} className="p-2 hover:bg-gray-200 rounded">
          <span className="font-bold">B</span>
        </button>
        <button onClick={() => handleFormat('italic')} className="p-2 hover:bg-gray-200 rounded">
          <span className="italic">I</span>
        </button>
        <button onClick={() => handleFormat('strikethrough')} className="p-2 hover:bg-gray-200 rounded">
          <span className="line-through">S</span>
        </button>
        <button onClick={() => handleFormat('heading1')} className="p-2 hover:bg-gray-200 rounded">
          H1
        </button>
        <button onClick={() => handleFormat('heading2')} className="p-2 hover:bg-gray-200 rounded">
          H2
        </button>
        <button onClick={() => handleFormat('heading3')} className="p-2 hover:bg-gray-200 rounded">
          H3
        </button>
        <button onClick={() => handleFormat('quote')} className="p-2 hover:bg-gray-200 rounded">
          "
        </button>
        <button onClick={() => handleFormat('code')} className="p-2 hover:bg-gray-200 rounded">
          {'</>'}
        </button>
        <button onClick={() => handleFormat('codeblock')} className="p-2 hover:bg-gray-200 rounded">
          {'{}'}
        </button>
        <button onClick={() => handleFormat('link')} className="p-2 hover:bg-gray-200 rounded">
          🔗
        </button>
        <button onClick={() => handleFormat('list')} className="p-2 hover:bg-gray-200 rounded">
          •
        </button>
        <div className="flex-grow"></div>
        <button 
          onClick={() => setPreview(!preview)}
          className="p-2 hover:bg-gray-200 rounded"
        >
          {preview ? 'Edit' : 'Preview'}
        </button>
        <button 
          onClick={saveDocument}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Save
        </button>
      </div>

      {/* Editor/Preview */}
      <div className="border border-gray-300 rounded min-h-96">
        {preview ? (
          <div className="p-4 prose max-w-none">
            <Markdown>{content}</Markdown>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-96 p-4 font-mono resize-none focus:outline-none"
            placeholder="Start writing in Markdown..."
          />
        )}
      </div>
    </div>
  );
};

export default DocumentEditor;