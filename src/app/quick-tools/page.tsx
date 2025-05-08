'use client'

import Link from 'next/link';
import { useState, useEffect } from 'react';

const page = () => {

    const tools = [
        {
            id: 1,
            label: "Clipboard AI",
            instructions: "Sammurize, explain and analyze this text",
            path: "/quick-tools/clipboard",
        },
        {
            id: 2,
            label: "Flashcard Maker",
            instructions: "Generate Flash cards for me of the given prompt.",
            path: "/quick-tools/flashmaker",
        },
        {
            id: 3,
            label: "Notes Generator",
            instructions: "Generate Notes for the given prompt.",
            path: "/quick-tools/notesgen",
        },
        {
            id: 4,
            label: "Text Chemistry AI",
            instructions: "Rewrite this text according to the given config.",
            path: "/quick-tools/textchem",
        },
        {
            id: 5,
            label: "Quiz Me AI",
            instructions: "Generate a quick quiz for me.",
            path: "/quick-notes/quiz-me"
        }
    ]

    return (
        <div>
            <p className='text-5xl text-center font-bold text-gray-800'>Quick Tools</p>
            <br />
            <div className='m-auto'>
                <div className='flex gap-3 flex-wrap'>
                    {tools.map((tool: any) => (
                        <Link key={tool.id} href={tool.path}>
                            <div className='p-5 border border-gray-300 rounded-xl hover:border-black transition-all duration-150 hover:ring-black hover:ring-2 gray-500 cursor-pointer min-w-[400px]'>
                                <p className='font-[600] text-2xl text-gray-600'>{tool.label}</p>
                                <p className='text-sm text-gray-400'>{tool.instructions}</p>
                            </div>
                        </Link>
                    ))}
                </div>

            </div>
        </div>
    )
}

export default page;