'use client'

import { ChatSidebar, SidebarContent, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { SendHorizonal, Sparkle, PlusCircle, Trash2, Save, Sparkles, Copy, Box, Code, Pencil, Plane } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
// import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import { ToastContainer, toast } from 'react-toast';
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Image, Search, X } from 'lucide-react';

const ChatPage = () => {
    const [chatMessages, setChatMessages] = useState<Array<{ role: string, content: string }>>([]);
    const [prompt, setPrompt] = useState("");
    const [loadingResponse, setLoadingResponse] = useState(false);
    const [chatHistory, setChatHistory] = useState<Array<{ id: string, title: string, messages: Array<{ role: string, content: string }> }>>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const { user } = useUser();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [documentTitle, setDocumentTitle] = useState("");
    const [documentToSave, setDocumentToSave] = useState<{ title: string, content: string } | null>(null);
    const [modelInstruction, setModelInstruction] = useState('');
    const [userModels, setUserModels] = useState<any>([]);
    const [model, setModel] = useState('gemini-2.0-flash');
    // Add these state variables to your component
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);


    const fetchModels = async () => {
        const { data, error } = await supabase.from('models').select('*').eq('user_id', user?.id);

        if (error) console.error(error.message);
        if (!error) setUserModels(data);
    }

    // Load chat history from Supabase on initial render
    useEffect(() => {
        if (user) {
            fetchChatHistory();
            fetchModels();
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
        // Prevent the click event from bubbling up to parent elements
        // This ensures the chat deletion doesn't trigger the chat selection
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

    const handleSubmitPrompt = async (userPrompt: string, imageUrl?: string) => {
        if (!userPrompt.trim()) return;

        setLoadingResponse(true);

        // Add the user prompt to the chat history
        const updatedMessages = [
            ...chatMessages,
            {
                role: 'user',
                content: userPrompt,
                imageUrl: imageUrl || undefined,
                timestamp: new Date().toISOString()
            }
        ];
        setChatMessages(updatedMessages);

        try {
            // Create a context from previous messages (last few exchanges)
            const conversationContext = chatMessages
                .slice(-5)
                .map(msg => msg.content)
                .join("\n\n");

            const instructions = modelInstruction || "";

            // Call your enhanced Next.js API route
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    prompt: userPrompt, // Send clean prompt, let API handle context
                    chatContext: chatMessages.slice(-10), // Send more context but limit to last 10 messages
                    context: conversationContext,
                    file: null,
                    instructions,
                    imageUrl: imageUrl || undefined, // Pass image URL if provided
                    enableWebSearch: userPrompt.toLowerCase().includes('/search') || undefined // Optional explicit enable
                }),
            });

            if (!res.ok) {
                throw new Error(`API request failed: ${res.status}`);
            }

            const data = await res.json();

            let content = "No response received.";
            let searchResults = null;
            let imageAnalysis = null;
            let commandsUsed = null;

            // Extract response based on your API structure
            if (data?.text) {
                content = data.text;
            } else if (model === "gemini-2.0-flash" && data?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
                content = data.response.candidates[0].content.parts[0].text;
            }

            // Extract additional data from enhanced API
            searchResults = data?.searchResults || null;
            imageAnalysis = data?.imageAnalysis || null;
            commandsUsed = data?.commands || null;

            // Create enhanced message object
            const assistantMessage = {
                role: "model",
                content,
                searchResults,
                imageAnalysis,
                commandsUsed,
                timestamp: new Date().toISOString(),
                metadata: data?.metadata || null
            };

            const finalMessages = [
                ...updatedMessages,
                assistantMessage
            ];

            setChatMessages(finalMessages);

            // Log enhanced features usage
            if (searchResults?.results?.length > 0) {
                console.log(`🔍 Web search executed: "${searchResults.query}" - ${searchResults.results.length} results`);
            }
            if (imageAnalysis?.description) {
                console.log(`📸 Image analyzed: ${imageUrl}`);
            }

            // Auto-save chat to Supabase with enhanced data
            if (user) {
                setTimeout(async () => {
                    if (activeChatId) {
                        const { error } = await supabase
                            .from('chats')
                            .update({
                                content: { messages: finalMessages },
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', activeChatId)
                            .eq('user_id', user.id);

                        if (error) {
                            console.error('Auto-save update error:', error);
                        } else {
                            setChatHistory(prev => prev.map(chat =>
                                chat.id === activeChatId
                                    ? { ...chat, messages: finalMessages }
                                    : chat
                            ));
                        }
                    } else {
                        // Generate title from clean prompt if commands were used
                        const titlePrompt = commandsUsed?.cleanPrompt || userPrompt;
                        const title = titlePrompt.length > 30
                            ? titlePrompt.slice(0, 30) + "..."
                            : titlePrompt;

                        const { data: insertData, error } = await supabase
                            .from('chats')
                            .insert({
                                user_id: user.id,
                                title,
                                content: { messages: finalMessages },
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .select('id')
                            .single();

                        if (error) {
                            console.error('Auto-save insert error:', error);
                        } else if (insertData) {
                            const newChatId = insertData.id;
                            setChatHistory(prev => [
                                { id: newChatId, title, messages: finalMessages },
                                ...prev
                            ]);
                            setActiveChatId(newChatId);
                        }
                    }
                }, 500);
            }

        } catch (error) {
            console.error("Error fetching response:", error);

            // Enhanced error message with more context
            let errorMessage = "Sorry, I encountered an error while processing your request.";

            if (error instanceof Error) {
                if (error.message.includes('API request failed')) {
                    errorMessage = "The AI service is currently unavailable. Please try again in a moment.";
                } else if (error.message.includes('network')) {
                    errorMessage = "Network error. Please check your connection and try again.";
                }
            }

            setChatMessages((prevMessages) => [
                ...prevMessages,
                {
                    role: "model",
                    content: errorMessage,
                    error: true,
                    timestamp: new Date().toISOString()
                }
            ]);
        } finally {
            setLoadingResponse(false);
            setPrompt("");
        }
    };

    // Enhanced submit handler for image uploads
    const handleSubmitWithImage = async (userPrompt: string, imageFile?: File) => {
        let imageUrl: string | undefined;

        if (imageFile) {
            try {
                // Upload image to your preferred storage (Supabase, Cloudinary, etc.)
                const formData = new FormData();
                formData.append('file', imageFile);

                const uploadRes = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    imageUrl = uploadData.url;
                } else {
                    console.error('Image upload failed');
                    // You might want to show an error toast here
                }
            } catch (error) {
                console.error('Image upload error:', error);
            }
        }

        await handleSubmitPrompt(userPrompt, imageUrl);
    };

    // Helper function to detect if message has enhanced features
    const hasEnhancedFeatures = (message: any) => {
        return message.searchResults?.results?.length > 0 ||
            message.imageAnalysis?.description ||
            message.commandsUsed?.detectedSearch ||
            message.commandsUsed?.detectedImage;
    };

    // Helper function to format message with enhanced features for display
    const formatMessageContent = (message: any) => {
        let content = message.content;

        // Add search results indicator
        if (message.searchResults?.results?.length > 0) {
            content = `🔍 Web search performed for: "${message.searchResults.query}"\n\n${content}`;
        }

        // Add image analysis indicator  
        if (message.imageAnalysis?.description) {
            content = `📸 Image analyzed\n\n${content}`;
        }

        return content;
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('Image size should be less than 10MB');
                return;
            }

            setSelectedImage(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // Clear image
    const clearImage = () => {
        setSelectedImage(null);
        setImagePreview(null);
    };

    // Enhanced submit handler
    const handleEnhancedSubmit = async () => {
        if (!prompt.trim()) return;

        if (selectedImage) {
            await handleSubmitWithImage(prompt, selectedImage);
            clearImage();
        } else {
            await handleSubmitPrompt(prompt);
        }
    };


    const saveDocument = async (title: string, content: string) => {
        const { error } = await supabase.from('documents').insert([
            {
                title: title,
                content: content,
                user_id: user?.id
            }
        ])

        if (!error) {
            toast.success("New document Saved Successfully");
            setIsSaveDialogOpen(false);
            setDocumentTitle("");
            setDocumentToSave(null);
        } else {
            toast.error(error.message);
        }
    }

    const handleSaveClick = (content: string) => {
        setDocumentToSave({ title: "", content });
        setIsSaveDialogOpen(true);
    }

    return (
        <SidebarProvider className="w-full flex overflow-scroll">
            <ToastContainer position="bottom-right" delay={1000}></ToastContainer>
            <ChatSidebar className="h-[99vh]">
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
                <SidebarContent className="w-full overflow-y-auto p-4">
                    {!user ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                            Sign in to view your chats
                        </div>
                    ) : chatHistory.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                            No saved chats yet
                        </div>
                    ) : (

                        chatHistory.map((chat: any) => {
                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => loadChat(chat.id)}
                                    className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group relative ${activeChatId === chat.id ? 'bg-black text-white' : ''
                                        }`}
                                >
                                    <p className="truncate text-sm">{chat.title}</p>
                                    <button
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded-full z-10"
                                        onClick={(e) => deleteChat(chat.id, e)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })


                    )}
                </SidebarContent>
            </ChatSidebar>

            <main className="flex flex-col justify-between w-full h-[80vh] overflow-hidden">
                <div className="flex-grow overflow-y-auto p-4 pb-6">
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
                                    <Sparkles className="mx-auto mb-4" size={64} />
                                    <p className="text-3xl font-semibold mb-2">How can I help you today <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-800 to-indigo-700 font-bold">{user?.firstName}</span></p>
                                    <p>Type a message below to begin chatting with the AI</p>
                                    <br />
                                    <div className="flex gap-3">

                                        <div
                                            onClick={() => setPrompt("Help me solve a python problem:  ")}
                                            className="w-[150px] hover:bg-gray-100 cursor-pointer transition-all duration-150 p-3 overflow-hidden h-[150px] border border-gray-300 rounded-lg">

                                            <Code size={32} />
                                            <br />
                                            <p className="text-black font-[600] mt-2">Help me solve a coding problem.</p>
                                        </div>

                                        <div
                                            onClick={() => setPrompt("Help me write a sick leave letter to my boss. Keep the tone formal ")}
                                            className="w-[150px] hover:bg-gray-100 cursor-pointer transition-all duration-150 p-3 overflow-hidden h-[150px] border border-gray-300 rounded-lg">

                                            <Pencil size={32} />
                                            <br />
                                            <p className="text-black font-[600] mt-2">Help me write a document.</p>
                                        </div>

                                        <div
                                            onClick={() => setPrompt("Help me plan a trip to ")}
                                            className="w-[150px] hover:bg-gray-100 cursor-pointer transition-all duration-150 p-3 overflow-hidden h-[150px] border border-gray-300 rounded-lg">
                                            <Plane size={32} />
                                            <br />
                                            <p className="text-black font-[600] mt-2">Help me plan my trip.</p>
                                        </div>


                                    </div>
                                </div>
                            </div>
                        ) : (
                            chatMessages.map((chat, index) => (
                                <div key={index}>
                                    <div className="flex-shrink mt-1">
                                        {chat.role === "user" ? (
                                            // <Image
                                            //     src={user?.imageUrl || "https://via.placeholder.com/30"}
                                            //     height={22}
                                            //     width={22}
                                            //     alt="User Profile"
                                            //     className="rounded-full"
                                            // />
                                            <p></p>
                                        ) : (
                                            // <Sparkle size={22} className="text-blue-700" />
                                            <p></p>
                                        )}
                                    </div>
                                    <div key={index} className={`p-3 my-3 rounded-lg flex gap-3 ${chat.role === "user"
                                        ? 'bg-black ml-auto max-w-md border text-white'
                                        : 'text-gray-800 max-w-5xl right-2'
                                        }`}>
                                        <div className="flex-grow prose prose-sm max-w-none">
                                            {chat.role === "model" ? (
                                                <div>
                                                    <div className="whitespace-pre-wrap max-w-[700px] overflow-x-scroll p-3 rounded">
                                                        <Markdown>
                                                            {chat.content}
                                                        </Markdown>
                                                    </div>
                                                    <br />
                                                    <div className="flex gap-3">
                                                        <Copy size={18} className="cursor-pointer" onClick={() => {
                                                            navigator.clipboard.writeText(chat.content);
                                                            toast.success("Copied Successfully!")
                                                        }} />
                                                        <Save size={18} className="cursor-pointer" onClick={() => {
                                                            handleSaveClick(chat.content)
                                                        }} />
                                                    </div>
                                                </div>
                                            ) : (
                                                chat.content
                                            )}
                                        </div>
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

                <div className="p-0 bg-transparent fixed bottom-10 left-0 right-0">
                    <div className="max-w-3xl mx-auto gap-2 items-center">
                        {chatMessages.length > 0 && activeChatId === null && user && (
                            <button
                                onClick={saveCurrentChat}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-all flex-shrink-0"
                                title="Save conversation"
                            >
                                <Save size={18} />
                            </button>
                        )}

                        {/* Image Preview */}
                        {imagePreview && (
                            <div className="mb-2 relative inline-block">
                                <img
                                    src={imagePreview}
                                    alt="Upload preview"
                                    className="max-w-32 max-h-32 rounded-lg border"
                                />
                                <button
                                    onClick={clearImage}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}

                        {/* Command Helper */}
                        {prompt.includes('/') && (
                            <div className="mb-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                                💡 Commands: <code>/search query</code> for web search, <code>/image</code> for image analysis
                            </div>
                        )}

                        <div className="flex gap-2">
                            <div className="flex flex-col gap-2 flex-grow">
                                <textarea
                                    rows={1}
                                    className="p-5 text-gray-800 border rounded-lg focus:border-black focus:ring-2 bg-white focus:ring-black focus:outline-none flex-grow transition-all min-h-[4rem] max-h-[400px] scroll-smooth overflow-auto duration-150"
                                    placeholder={
                                        user
                                            ? "Type your message here... (Try /search for web search)"
                                            : "Sign in to start chatting"
                                    }
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey && user) {
                                            e.preventDefault();
                                            handleEnhancedSubmit();
                                        }
                                    }}
                                    disabled={loadingResponse || !user}
                                    autoFocus
                                />
                            </div>

                            {/* Image Upload Button */}
                            <div className="flex flex-col gap-2">
                                <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-3 cursor-pointer transition-all duration-150 flex items-center justify-center flex-shrink-0">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={loadingResponse || !user}
                                    />
                                    <Image size={18} />
                                </label>

                                {/* Send Button */}
                                <button
                                    className={`bg-black text-white rounded-lg p-3 cursor-pointer transition-all duration-150 flex items-center justify-center flex-shrink-0 ${(!prompt.trim() || loadingResponse || !user)
                                        ? 'opacity-50 cursor-not-allowed'
                                        : ''
                                        }`}
                                    onClick={handleEnhancedSubmit}
                                    disabled={!prompt.trim() || loadingResponse || !user}
                                >
                                    {selectedImage ? <Image size={18} /> : <SendHorizonal size={18} />}
                                </button>
                            </div>
                        </div>

                        <br />

                        <div className="gap-2 flex">
                            <Select onValueChange={(value) => setModelInstruction(value)} defaultValue=" ">
                                <SelectTrigger className="w-[130px] flex">
                                    <Box /><SelectValue placeholder="Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value=" " key={'default'}>Default</SelectItem>
                                    {userModels.map((model: any) => (
                                        <SelectItem key={model.id} value={model.instructions}>{model.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select onValueChange={(value) => setModel(value)} defaultValue="gemini-2.0-flash">
                                <SelectTrigger className="w-[130px] flex">
                                    <Sparkles /><SelectValue placeholder="Model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gemini-2.0-flash" key={"Gemini 2.0 Flash"}>Gemini 2.0 Flash</SelectItem>
                                    <SelectItem value="mistral-7b" key={"mistral-7b"}>Mistral 7B</SelectItem>
                                    <SelectItem value="llama-4-scout" key={"llama-4-scout"}>LLaMA 4 Scout</SelectItem>
                                    <SelectItem value="gpt-4" key={"gpt-4"}>GPT 4</SelectItem>
                                    <SelectItem value="deepseek-v3" key={"deepseek-v3"}>Deepseek v3</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Search indicator */}
                            {prompt.toLowerCase().includes('/search') && (
                                <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    <Search size={12} />
                                    Web Search
                                </div>
                            )}
                        </div>
                    </div>
                </div>


            </main>

            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Save Document</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="title" className="text-sm font-medium">
                                Document Title
                            </label>
                            <Input
                                id="title"
                                value={documentTitle}
                                onChange={(e) => setDocumentTitle(e.target.value)}
                                placeholder="Enter document title"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsSaveDialogOpen(false);
                                setDocumentTitle("");
                                setDocumentToSave(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (documentToSave) {
                                    saveDocument(documentTitle || "Untitled Document", documentToSave.content);
                                }
                            }}
                            disabled={!documentTitle.trim()}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
};

export default ChatPage;