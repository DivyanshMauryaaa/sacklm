'use client'

import { ChatSidebar, SidebarContent, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { SendHorizonal, Sparkle, PlusCircle, Trash2, Save } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://liukotwfxerodfaccutn.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpdWtvdHdmeGVyb2RmYWNjdXRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NTgzNTksImV4cCI6MjA2MTIzNDM1OX0.vuZMYShUySiQAWVqZrK0xg-lQIoNZ4ekhEMe8Z9yuWk"
)

const ChatPage = () => {
    const [chatMessages, setChatMessages] = useState<Array<{ role: string, content: string }>>([]);
    const [prompt, setPrompt] = useState("");
    const [loadingResponse, setLoadingResponse] = useState(false);
    const [chatHistory, setChatHistory] = useState<Array<{ id: string, title: string, messages: Array<{ role: string, content: string }> }>>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const { user } = useUser();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    // Load chat history from Supabase on initial render
    useEffect(() => {
        if (user) {
            fetchChatHistory();
        }
    }, [user]);
    
    const fetchChatHistory = async () => {
        if (!user) return;
        
        try {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
                
            if (error) {
                throw error;
            }
            
            if (data) {
                const formattedChats = data.map(chat => {
                    // Ensure we're properly extracting the messages array
                    const messages = chat.content && Array.isArray(chat.content.messages) 
                        ? chat.content.messages 
                        : [];
                        
                    return {
                        id: chat.id,
                        title: chat.title,
                        messages: messages
                    };
                });
                
                setChatHistory(formattedChats);
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
            console.error('Error details:', JSON.stringify(error));
        }
    };
    
    // Scroll to bottom whenever messages change
    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const startNewChat = () => {
        // Save current chat if it has messages
        if (chatMessages.length > 0) {
            saveCurrentChat();
        }
        
        setActiveChatId(null);
        setChatMessages([]);
    };
    
    const saveCurrentChat = async () => {
        if (chatMessages.length === 0 || !user) return;
        
        const title = chatMessages[0].content.length > 20 
            ? chatMessages[0].content.slice(0, 20) + "..." 
            : chatMessages[0].content;
            
        try {
            if (activeChatId) {
                // Update existing chat
                const { error } = await supabase
                    .from('chats')
                    .update({
                        title,
                        content: { messages: chatMessages }  // Ensure proper structure
                    })
                    .eq('id', activeChatId)
                    .eq('user_id', user.id);
                    
                if (error) {
                    console.error('Update error:', error);
                    throw error;
                }
                
                // Update local state
                setChatHistory(prev => prev.map(chat => 
                    chat.id === activeChatId 
                        ? { ...chat, messages: chatMessages, title } 
                        : chat
                ));
            } else {
                // Create new chat
                const { data, error } = await supabase
                    .from('chats')
                    .insert({
                        user_id: user.id,
                        title,
                        content: { messages: chatMessages }  // Ensure proper structure
                    })
                    .select('id')
                    .single();
                    
                if (error) {
                    console.error('Insert error:', error);
                    throw error;
                }
                
                // Update local state with the new chat
                const newChatId = data.id;
                setChatHistory(prev => [{ id: newChatId, title, messages: chatMessages }, ...prev]);
                setActiveChatId(newChatId);
            }
        } catch (error) {
            console.error('Error saving chat:', error);
        }
    };
    
    const loadChat = async (chatId: string) => {
        // Save current chat before switching
        if (chatMessages.length > 0 && activeChatId !== chatId) {
            await saveCurrentChat();
        }
        
        // First check local state
        const chat = chatHistory.find(c => c.id === chatId);
        if (chat && chat.messages && chat.messages.length > 0) {
            setChatMessages(chat.messages);
            setActiveChatId(chatId);
            return;
        }
        
        // If not in local state or messages are empty, fetch directly from Supabase
        try {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('id', chatId)
                .eq('user_id', user?.id)
                .single();
                
            if (error) throw error;
            
            if (data && data.content && data.content.messages) {
                setChatMessages(data.content.messages);
                setActiveChatId(chatId);
                
                // Also update the chat history
                setChatHistory(prev => 
                    prev.map(c => c.id === chatId 
                        ? { ...c, messages: data.content.messages } 
                        : c
                    )
                );
            }
        } catch (error) {
            console.error('Error loading chat:', error);
        }
    };
    
    const deleteChat = async (chatId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!user) return;
        
        try {
            const { error } = await supabase
                .from('chats')
                .delete()
                .eq('id', chatId)
                .eq('user_id', user.id);
                
            if (error) throw error;
            
            // Update local state
            setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
            
            if (activeChatId === chatId) {
                setActiveChatId(null);
                setChatMessages([]);
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    };

    const handleSubmitPrompt = async (userPrompt: string) => {
        if (!userPrompt.trim()) return;

        setLoadingResponse(true);

        // Add the user prompt to the chat history
        const updatedMessages = [
            ...chatMessages,
            { role: 'user', content: userPrompt }
        ];
        setChatMessages(updatedMessages);

        try {
            // Create a context from previous messages (last few exchanges)
            const conversationContext = chatMessages
                .slice(-6) // Take last 3 exchanges (6 messages) for context
                .map(msg => msg.content)
                .join("\n\n");
                
            const promptWithContext = conversationContext 
                ? `Previous conversation:\n${conversationContext}\n\nUser: ${userPrompt}\nAI:`
                : userPrompt;

            const payload = {
                contents: [
                    {
                        parts: [
                            { text: `You are SackLM. other yk wht u are. ${promptWithContext}` }, //Used short form type of text in prompt for least possible given extra prompt
                        ],
                    },
                ],
            };

            // Use environment variable for API key in production
            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyA7cKRnNEj6YXyA6L4IKckwox-8YtVciKw";
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            };

            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            const content = data.candidates[0].content.parts[0].text;

            const finalMessages = [
                ...updatedMessages,
                { role: "model", content: content }
            ];
            
            setChatMessages(finalMessages);
            
            // Auto-save chat after response
            if (user) {
                // Use timeout to ensure state is updated before saving
                setTimeout(async () => {
                    // Save with the updated messages
                    if (activeChatId) {
                        // Update existing chat
                        const { error } = await supabase
                            .from('chats')
                            .update({
                                content: { messages: finalMessages }
                            })
                            .eq('id', activeChatId)
                            .eq('user_id', user.id);
                            
                        if (error) {
                            console.error('Auto-save update error:', error);
                        } else {
                            // Update local state to ensure it's in sync
                            setChatHistory(prev => prev.map(chat => 
                                chat.id === activeChatId 
                                    ? { ...chat, messages: finalMessages } 
                                    : chat
                            ));
                        }
                    } else {
                        // This is a new chat, save it
                        const title = userPrompt.length > 20 
                            ? userPrompt.slice(0, 20) + "..." 
                            : userPrompt;
                            
                        const { data, error } = await supabase
                            .from('chats')
                            .insert({
                                user_id: user.id,
                                title,
                                content: { messages: finalMessages }
                            })
                            .select('id')
                            .single();
                            
                        if (error) {
                            console.error('Auto-save insert error:', error);
                        } else if (data) {
                            const newChatId = data.id;
                            setChatHistory(prev => [{ id: newChatId, title, messages: finalMessages }, ...prev]);
                            setActiveChatId(newChatId);
                        }
                    }
                }, 500);
            }
            
        } catch (error) {
            console.error("Error fetching response:", error);
            setChatMessages((prevMessages) => [
                ...prevMessages,
                { role: "model", content: "Sorry, I encountered an error while processing your request." }
            ]);
        } finally {
            setLoadingResponse(false);
            setPrompt("");
        }
    };

    return (
        <SidebarProvider className="w-full h-screen flex overflow-hidden">
            <ChatSidebar className="h-screen">
                <SidebarHeader>
                    <div className="p-3 flex justify-between items-center">
                        <p className="font-bold text-2xl">Chats</p>
                        <button
                            onClick={startNewChat}
                            className="p-2 hover:bg-gray-100 cursor-pointer rounded-full transition-all"
                            title="New Chat"
                        >
                            <PlusCircle size={24} />
                        </button>
                    </div>
                </SidebarHeader>
                <hr />
                <SidebarContent className="w-full overflow-y-auto">
                    {!user ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                            Sign in to view your chats
                        </div>
                    ) : chatHistory.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                            No saved chats yet
                        </div>
                    ) : (
                        chatHistory.map((chat) => (
                            <div 
                                key={chat.id} 
                                className={`p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center group ${
                                    activeChatId === chat.id ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => loadChat(chat.id)}
                            >
                                <p className="truncate text-sm">{chat.title}</p>
                                <button 
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full"
                                    onClick={(e) => deleteChat(chat.id, e)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </SidebarContent>
            </ChatSidebar>

            <main className="flex flex-col justify-between w-full h-screen overflow-hidden">
                <div className="flex-grow overflow-y-auto p-4 pb-16">
                    <div className="max-w-3xl mx-auto w-full">
                        {!user ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center text-gray-500">
                                    <Sparkle className="mx-auto mb-4" size={32} />
                                    <h2 className="text-2xl font-semibold mb-2">Sign in to start chatting</h2>
                                    <p>You need to be signed in to use this chat application</p>
                                </div>
                            </div>
                        ) : chatMessages.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-center text-gray-500">
                                    <Sparkle className="mx-auto mb-4" size={32} />
                                    <h2 className="text-2xl font-semibold mb-2">Start a new conversation</h2>
                                    <p>Type a message below to begin chatting with the AI</p>
                                </div>
                            </div>
                        ) : (
                            chatMessages.map((chat, index) => (
                                <div key={index} className={`p-3 my-3 rounded-lg flex gap-3 ${
                                    chat.role === "user"
                                        ? 'bg-neutral-50 ml-auto max-w-md border border-gray-300'
                                        : 'text-gray-800 max-w-2xl'
                                    }`}>
                                    <div className="flex-shrink-0 mt-1">
                                        {chat.role === "user" ? (
                                            <Image
                                                src={user?.imageUrl || "https://via.placeholder.com/30"}
                                                height={22}
                                                width={22}
                                                alt="User Profile"
                                                className="rounded-full"
                                            />
                                        ) : (
                                            <Sparkle size={22} className="text-blue-500" />
                                        )}
                                    </div>
                                    <div className="flex-grow prose prose-sm max-w-none">
                                        {chat.role === "model" ? (
                                            <div className="whitespace-pre-wrap max-w-[700px] overflow-x-scroll border border-gray-300 p-3 rounded">
                                                <Markdown>
                                                    {chat.content}
                                                </Markdown>
                                            </div>
                                        ) : (
                                            chat.content
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {loadingResponse && (
                            <div className="p-3 border border-gray-300 rounded-lg max-w-2xl flex gap-3 my-3">
                                <Sparkle size={22} className="text-blue-500 animate-pulse" />
                                <p>Thinking...</p>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="p-2 border-t bg-white fixed bottom-0 left-0 right-0">
                    <div className="max-w-3xl mx-auto flex gap-2 items-center">
                        {chatMessages.length > 0 && activeChatId === null && user && (
                            <button
                                onClick={saveCurrentChat}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
                                title="Save conversation"
                            >
                                <Save size={18} />
                            </button>
                        )}
                        
                        <input
                            type="text"
                            className="p-3 text-gray-800 border rounded-lg focus:border-blue-700 focus:ring-1 focus:ring-blue-200 focus:outline-none flex-grow transition-all duration-150"
                            placeholder={user ? "Type your message here..." : "Sign in to start chatting"}
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && user) {
                                    e.preventDefault();
                                    handleSubmitPrompt(prompt);
                                }
                            }}
                            disabled={loadingResponse || !user}
                            autoFocus
                        />

                        <button
                            className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 cursor-pointer transition-all duration-150 flex items-center justify-center flex-shrink-0 ${
                                (!prompt.trim() || loadingResponse || !user) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            onClick={() => handleSubmitPrompt(prompt)}
                            disabled={!prompt.trim() || loadingResponse || !user}
                        >
                            <SendHorizonal size={18} />
                        </button>
                    </div>
                </div>
            </main>
        </SidebarProvider>
    );
};

export default ChatPage;