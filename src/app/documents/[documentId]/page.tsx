'use client'

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Markdown from 'react-markdown';

interface Document {
  title: string,
  content: string,
  user_id: string
}

const Page = (document: Document) => {
  const [content, setContent] = useState('');
  const [markdown, setMarkdown] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);

  const formatText = (format: 'bold' | 'italic' | 'heading') => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();

    if (!selectedText) return;

    let wrapped = '';
    if (format === 'bold') {
      if (/<strong>(.*?)<\/strong>/.test(selectedText)) {
        wrapped = selectedText.replace(/<strong>(.*?)<\/strong>/g, '$1'); // remove bold
      } else {
        wrapped = `<strong>${selectedText}</strong>`; // add bold
      }
    } else if (format === 'italic') {
      if (/<em>(.*?)<\/em>/.test(selectedText)) {
        wrapped = selectedText.replace(/<em>(.*?)<\/em>/g, '$1'); // remove italic
      } else {
        wrapped = `<em>${selectedText}</em>`; // add italic
      }
    } else if (format === 'heading') {
      if (/<h2>(.*?)<\/h2>/.test(selectedText)) {
        wrapped = selectedText.replace(/<h2>(.*?)<\/h2>/g, '$1'); // remove heading
      } else {
        wrapped = `<h2>${selectedText}</h2>`; // add heading
      }
    }

    // Replace selected text with formatted/unformatted text
    range.deleteContents();
    const el = window.document.createElement('span');
    el.innerHTML = wrapped;
    range.insertNode(el);

    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML;
      setContent(newContent);
      setMarkdown(convertToMarkdown(newContent));
    }
  };

  const convertToMarkdown = (html: string) => {
    return html
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '_$1_')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1')
      .replace(/<[^>]+>/g, ''); // strip other HTML
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="flex gap-3 mb-4">
        <button onClick={() => formatText('bold')} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Bold</button>
        <button onClick={() => formatText('italic')} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Italic</button>
        <button onClick={() => formatText('heading')} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">Heading</button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        className="border border-gray-400 rounded p-4 min-h-[200px] bg-white focus:outline-none"
        style={{ outline: 'none' }}
        onInput={() => {
          if (editorRef.current) {
            setContent(editorRef.current.innerHTML);
            setMarkdown(convertToMarkdown(editorRef.current.innerHTML));
          }
        }}
      />

      {/* Live Markdown Preview */}
      <h3 className="text-lg font-semibold mt-6 mb-2">Live Markdown Preview</h3>
      <div className="border p-4 rounded bg-gray-100 min-h-[100px]">
        <Markdown>{markdown}</Markdown>
      </div>
    </div>
  );
}

export default Page;
