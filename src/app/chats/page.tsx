'use client'

import { ChatSidebar, SidebarContent, SidebarHeader, SidebarProvider } from "@/components/ui/sidebar";
import { SendHorizonal, Sparkle, PlusCircle, Trash2, Save, Sparkles, Copy, Box, Code, Pencil, Plane, Image as ImageIcon, Search, X, BoxIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
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

// Types for better type safety
type ChatMessage = {
    role: string;
    content: string;
    imageUrl?: string;
    timestamp?: string;
    searchResults?: any;
    imageAnalysis?: any;
    imageGeneration?: any;
    videoGeneration?: any;
    commands?: any;
    metadata?: any;
    error?: boolean;
    errorType?: string;
};

type ChatHistoryItem = {
    id: string;
    title: string;
    messages: ChatMessage[];
};

const ChatPage = () => {
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [prompt, setPrompt] = useState("");
    const [loadingResponse, setLoadingResponse] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const { user } = useUser();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [documentTitle, setDocumentTitle] = useState("");
    const [documentToSave, setDocumentToSave] = useState<{ title: string, content: string } | null>(null);
    const [modelInstruction, setModelInstruction] = useState('');
    const [userModels, setUserModels] = useState<any>([]);
    const [model, setModel] = useState('gemini-2.0-flash');
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
    const [chatToRename, setChatToRename] = useState<{ id: string, title: string } | null>(null);
    const [newChatTitle, setNewChatTitle] = useState("");
    const [detectedCommands, setDetectedCommands] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    // Alternative using ReturnType of setTimeout
    const autoSaveTimeoutRef = useRef<number | null>(null);
    const [selectedUserModel, setSelectedUserModel] = useState('');

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

    // Command detection
    useEffect(() => {
        const commands = [];
        if (prompt.includes('/search')) commands.push('🔍 Search');
        if (prompt.includes('/generate-image')) commands.push('🎨 Image Generation');
        if (prompt.includes('/generate-video')) commands.push('🎬 Video Generation');
        if (prompt.includes('/analyze-image')) commands.push('📸 Image Analysis');
        setDetectedCommands(commands);
    }, [prompt]);

    const fetchChatHistory = async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (data) {
                const formattedChats = data.map(chat => ({
                    id: chat.id,
                    title: chat.title,
                    messages: chat.content?.messages || []
                }));
                setChatHistory(formattedChats);
            }
        } catch (error) {
            console.error('Error fetching chat history:', error);
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
        if (chatMessages.length > 0) {
            saveCurrentChat();
        }
        setActiveChatId(null);
        setChatMessages([]);
        setUploadedImageUrl(null);
    };

    const saveCurrentChat = async () => {
        if (chatMessages.length === 0 || !user) return;

        const title = chatMessages[0].content.length > 20
            ? chatMessages[0].content.slice(0, 20) + "..."
            : chatMessages[0].content;

        try {
            if (activeChatId) {
                const { error } = await supabase
                    .from('chats')
                    .update({
                        title,
                        content: { messages: chatMessages }
                    })
                    .eq('id', activeChatId)
                    .eq('user_id', user.id);

                if (error) throw error;

                setChatHistory(prev => prev.map(chat =>
                    chat.id === activeChatId
                        ? { ...chat, messages: chatMessages, title }
                        : chat
                ));
            } else {
                const { data, error } = await supabase
                    .from('chats')
                    .insert({
                        user_id: user.id,
                        title,
                        content: { messages: chatMessages }
                    })
                    .select('id')
                    .single();

                if (error) throw error;

                const newChatId = data.id;
                setChatHistory(prev => [{ id: newChatId, title, messages: chatMessages }, ...prev]);
                setActiveChatId(newChatId);
            }
        } catch (error) {
            console.error('Error saving chat:', error);
        }
    };

    const loadChat = async (chatId: string) => {
        if (chatMessages.length > 0 && activeChatId !== chatId) {
            await saveCurrentChat();
        }

        const chat = chatHistory.find(c => c.id === chatId);
        if (chat && chat.messages.length > 0) {
            setChatMessages(chat.messages);
            setActiveChatId(chatId);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('chats')
                .select('*')
                .eq('id', chatId)
                .eq('user_id', user?.id)
                .single();

            if (error) throw error;

            if (data?.content?.messages) {
                setChatMessages(data.content.messages);
                setActiveChatId(chatId);
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

            setChatHistory(prev => prev.filter(chat => chat.id !== chatId));

            if (activeChatId === chatId) {
                setActiveChatId(null);
                setChatMessages([]);
            }
        } catch (error) {
            console.error('Error deleting chat:', error);
        }
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image size should be less than 10MB');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            setUploadedImageUrl(data.url);
        } catch (error) {
            console.error('Image upload failed:', error);
            toast.error('Failed to upload image');
        }
    };

    const clearImage = () => {
        setUploadedImageUrl(null);
    };

    const handleSubmitPrompt = async (userPrompt: string, imageUrl?: string) => {
        if (!userPrompt.trim()) return;

        setLoadingResponse(true);

        const userMessage: ChatMessage = {
            role: 'user',
            content: userPrompt,
            imageUrl: imageUrl || undefined,
            timestamp: new Date().toISOString()
        };

        const updatedMessages = [...chatMessages, userMessage];
        setChatMessages(updatedMessages);

        try {
            const conversationContext = chatMessages
                .slice(-6)
                .map(msg => `${msg.role}: ${msg.content}`)
                .join("\n");

            const instructions = modelInstruction || "";

            const requestStart = Date.now();
            const res = await fetch("/api/generate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    prompt: userPrompt,
                    chatContext: chatMessages.slice(-8),
                    context: conversationContext,
                    file: null,
                    instructions,
                    imageUrl: imageUrl || undefined,
                    enableWebSearch: userPrompt.toLowerCase().includes('/search') || undefined
                }),
            });

            if (!res.ok) {
                throw new Error(`API request failed: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            const requestTime = Date.now() - requestStart;

            console.log(`⚡ API Response time: ${requestTime}ms`);

            let content = "No response received.";
            if (data?.text) {
                content = data.text;
            } else if (model === "gemini-2.0-flash" && data?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
                content = data.response.candidates[0].content.parts[0].text;
            }

            const {
                searchResults,
                imageAnalysis,
                imageGeneration,
                videoGeneration,
                commands,
                metadata
            } = data;

            const assistantMessage: ChatMessage = {
                role: "model",
                content,
                searchResults: searchResults || null,
                imageAnalysis: imageAnalysis || null,
                imageGeneration: imageGeneration || null,
                videoGeneration: videoGeneration || null,
                commands: commands || null,
                metadata: {
                    ...metadata,
                    clientProcessingTime: requestTime
                },
                timestamp: new Date().toISOString()
            };

            const finalMessages = [...updatedMessages, assistantMessage];
            setChatMessages(finalMessages);

            if (searchResults?.results?.length > 0) {
                console.log(`🔍 Web search executed: "${searchResults.query}" - ${searchResults.results.length} results`);
            }
            if (imageAnalysis?.description) {
                console.log(`📸 Image analyzed: ${imageUrl}`);
            }
            if (imageGeneration?.imageUrl) {
                console.log(`🎨 Image generated: ${imageGeneration.prompt}`);
                preloadImage(imageGeneration.imageUrl);
            }
            if (videoGeneration?.videoUrl) {
                console.log(`🎬 Video generated: ${videoGeneration.prompt}`);
                preloadVideo(videoGeneration.videoUrl);
            }

            if (user) {
                // Clear existing timeout properly
                if (autoSaveTimeoutRef.current) {
                    clearTimeout(autoSaveTimeoutRef.current);
                }

                // Set new timeout with window.setTimeout which returns number
                autoSaveTimeoutRef.current = window.setTimeout(async () => {
                    const titlePrompt = commands?.cleanPrompt || userPrompt;
                    const title = titlePrompt.length > 30
                        ? titlePrompt.slice(0, 30) + "..."
                        : titlePrompt;

                    if (activeChatId) {
                        const { error } = await supabase
                            .from('chats')
                            .update({
                                content: { messages: finalMessages },
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', activeChatId)
                            .eq('user_id', user.id);

                        if (!error) {
                            setChatHistory(prev => prev.map(chat =>
                                chat.id === activeChatId
                                    ? { ...chat, messages: finalMessages }
                                    : chat
                            ));
                        }
                    } else {
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

                        if (!error && insertData) {
                            const newChatId = insertData.id;
                            setChatHistory(prev => [
                                { id: newChatId, title, messages: finalMessages },
                                ...prev.slice(0, 49)
                            ]);
                            setActiveChatId(newChatId);
                        }
                    }
                }, 1000) as unknown as number; // Type assertion if needed
            }

        } catch (error) {
            console.error("Error fetching response:", error);

            let errorMessage = "Sorry, I encountered an error while processing your request.";
            let errorType = "generic";

            if (error instanceof Error) {
                if (error.message.includes('API request failed: 429')) {
                    errorMessage = "I'm currently busy. Please wait a moment and try again.";
                    errorType = "rate_limit";
                } else if (error.message.includes('API request failed: 5')) {
                    errorMessage = "The AI service is temporarily unavailable. Please try again in a moment.";
                    errorType = "server_error";
                } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
                    errorMessage = "Network error. Please check your connection and try again.";
                    errorType = "network_error";
                } else if (error.message.includes('timeout')) {
                    errorMessage = "Request timed out. Please try again with a simpler prompt.";
                    errorType = "timeout";
                }
            }

            setChatMessages((prevMessages) => [
                ...prevMessages,
                {
                    role: "model",
                    content: errorMessage,
                    error: true,
                    errorType,
                    timestamp: new Date().toISOString()
                }
            ]);
        } finally {
            setLoadingResponse(false);
            setPrompt("");
            setUploadedImageUrl(null);
        }
    };

    const preloadImage = (imageUrl: string) => {
        const img = new Image();
        img.onload = () => console.log(`✅ Image preloaded: ${imageUrl}`);
        img.onerror = () => console.warn(`❌ Failed to preload image: ${imageUrl}`);
        img.src = imageUrl;
    };

    const preloadVideo = (videoUrl: string) => {
        const video = document.createElement('video');
        video.onloadeddata = () => console.log(`✅ Video preloaded: ${videoUrl}`);
        video.onerror = () => console.warn(`❌ Failed to preload video: ${videoUrl}`);
        video.src = videoUrl;
        video.preload = 'metadata';
    };

    const downloadMedia = async (url: string, type: 'image' | 'video') => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `generated-${type}-${Date.now()}.${type === 'image' ? 'png' : 'mp4'}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(downloadUrl);

            toast.success(`${type} downloaded successfully`);
        } catch (error) {
            console.error(`❌ Failed to download ${type}:`, error);
            toast.error(`Failed to download ${type}. Please try again.`);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const commandSuggestions = [
        {
            command: '/search',
            description: 'Search the web for current information',
            example: '/search latest AI news',
            icon: '🔍'
        },
        {
            command: '/generate-image',
            description: 'Create an image using AI',
            example: '/generate-image sunset over mountains',
            icon: '🎨'
        },
        {
            command: '/generate-video',
            description: 'Create a short video using AI',
            example: '/generate-video waves crashing on beach',
            icon: '🎬'
        },
        {
            command: '/analyze-image',
            description: 'Analyze an uploaded image',
            example: '/analyze-image what do you see?',
            icon: '📸'
        }
    ];

    const handleEnhancedSubmit = async () => {
        if (!prompt.trim()) return;
        await handleSubmitPrompt(prompt, uploadedImageUrl || undefined);
    };

    const saveDocument = async (title: string, content: string) => {
        const { error } = await supabase.from('documents').insert([
            {
                title: title,
                content: content,
                user_id: user?.id
            }
        ]);

        if (!error) {
            toast.success("New document Saved Successfully");
            setIsSaveDialogOpen(false);
            setDocumentTitle("");
            setDocumentToSave(null);
        } else {
            toast.error(error.message);
        }
    };

    const handleSaveClick = (content: string) => {
        setDocumentToSave({ title: "", content });
        setIsSaveDialogOpen(true);
    };

    const renameChat = async (chatId: string, newTitle: string) => {
        if (!user || !newTitle.trim()) return;

        try {
            const { error } = await supabase
                .from('chats')
                .update({ title: newTitle })
                .eq('id', chatId)
                .eq('user_id', user.id);

            if (error) throw error;

            setChatHistory(prev => prev.map(chat =>
                chat.id === chatId
                    ? { ...chat, title: newTitle }
                    : chat
            ));

            toast.success("Chat renamed successfully");
            setIsRenameDialogOpen(false);
            setChatToRename(null);
            setNewChatTitle("");
        } catch (error) {
            console.error('Error renaming chat:', error);
            toast.error("Failed to rename chat");
        }
    };

    const MessageRenderer = ({ message }: { message: ChatMessage }) => {
        const {
            role,
            content,
            imageUrl,
            searchResults,
            imageAnalysis,
            imageGeneration,
            videoGeneration,
            commands,
            error,
            timestamp
        } = message;

        return (
            <div className={`p-3 my-3 rounded-lg flex gap-3 ${role === "user"
                ? 'bg-black ml-auto max-w-md border text-white'
                : 'text-gray-800 max-w-5xl right-2'
                }`}>
                <div className="flex-grow prose prose-sm max-w-none">
                    {role === "model" ? (
                        <div>
                            <div className="whitespace-pre-wrap max-w-[700px] overflow-x-scroll p-3 rounded">
                                <ReactMarkdown>{content}</ReactMarkdown>
                            </div>
                            {/* User uploaded image */}
                            {imageUrl && (
                                <div className="uploaded-image mt-2">
                                    <img src={imageUrl} alt="User upload" className="max-w-md rounded-lg" />
                                </div>
                            )}

                            {/* Generated image */}
                            {imageGeneration?.imageUrl && (
                                <div className="generated-media mt-4">
                                    <div className="media-header flex items-center gap-2 text-sm mb-2">
                                        <span className="media-type">🎨 Generated Image</span>
                                        <span className="media-prompt text-gray-600">"{imageGeneration.prompt}"</span>
                                    </div>
                                    <img
                                        src={imageGeneration.imageUrl}
                                        alt={imageGeneration.prompt}
                                        className="max-w-md rounded-lg shadow-lg"
                                        loading="lazy"
                                    />
                                    <div className="media-actions mt-2">
                                        <button
                                            onClick={() => downloadMedia(imageGeneration.imageUrl, 'image')}
                                            className="download-btn text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                                        >
                                            Download Image
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Generated video */}
                            {videoGeneration?.videoUrl && (
                                <div className="generated-media mt-4">
                                    <div className="media-header flex items-center gap-2 text-sm mb-2">
                                        <span className="media-type">🎬 Generated Video</span>
                                        <span className="media-prompt text-gray-600">"{videoGeneration.prompt}"</span>
                                    </div>
                                    <video
                                        src={videoGeneration.videoUrl}
                                        controls
                                        className="max-w-md rounded-lg shadow-lg"
                                        preload="metadata"
                                    />
                                    <div className="media-actions mt-2">
                                        <button
                                            onClick={() => downloadMedia(videoGeneration.videoUrl, 'video')}
                                            className="download-btn text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
                                        >
                                            Download Video
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Image analysis results */}
                            {imageAnalysis?.description && (
                                <div className="analysis-results mt-4 bg-gray-50 p-3 rounded">
                                    <div className="analysis-header flex items-center gap-2 text-sm mb-2">
                                        <span className="analysis-type">📸 Image Analysis</span>
                                    </div>
                                    <div className="analysis-content text-sm">
                                        {imageAnalysis.description}
                                    </div>
                                </div>
                            )}

                            {/* Search results */}
                            {searchResults?.results?.length > 0 && (
                                <div className="search-results mt-4">
                                    <div className="search-header flex items-center gap-2 text-sm mb-2">
                                        <span className="search-type">🔍 Web Search</span>
                                        <span className="search-query text-gray-600">"{searchResults.query}"</span>
                                    </div>
                                    <div className="search-items space-y-2">
                                        {searchResults.results.slice(0, 3).map((result: any, index: number) => (
                                            <div key={index} className="search-item bg-gray-50 p-2 rounded">
                                                <a
                                                    href={result.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="search-title text-blue-600 hover:underline block"
                                                >
                                                    {result.title}
                                                </a>
                                                <p className="search-snippet text-sm text-gray-600">{result.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Commands used indicator */}
                            {commands && (
                                <div className="commands-indicator mt-2">
                                    <div className="commands-used flex gap-2">
                                        {commands.detectedSearch && <span className="command-badge text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">🔍 Search</span>}
                                        {commands.detectedImageAnalysis && <span className="command-badge text-xs bg-green-100 text-green-800 px-2 py-1 rounded">📸 Analysis</span>}
                                        {commands.detectedImageGeneration && <span className="command-badge text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">🎨 Image Gen</span>}
                                        {commands.detectedVideoGeneration && <span className="command-badge text-xs bg-red-100 text-red-800 px-2 py-1 rounded">🎬 Video Gen</span>}
                                    </div>
                                </div>
                            )}

                            {/* Message metadata */}
                            <div className="message-meta flex justify-between items-center mt-2 text-xs text-gray-500">
                                <span className="timestamp">{timestamp && formatTimestamp(timestamp)}</span>
                                {message.metadata?.clientProcessingTime && (
                                    <span className="processing-time">
                                        {message.metadata.clientProcessingTime}ms
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-3 mt-2">
                                <Copy size={18} className="cursor-pointer hover:text-blue-600" onClick={() => {
                                    navigator.clipboard.writeText(content);
                                    toast.success("Copied Successfully!")
                                }} />
                                <Save size={18} className="cursor-pointer hover:text-blue-600" onClick={() => {
                                    handleSaveClick(content)
                                }} />
                            </div>
                        </div>
                    ) : (
                        <div>
                            {content}
                            {imageUrl && (
                                <div className="mt-2">
                                    <img src={imageUrl} alt="User upload" className="max-w-xs rounded-lg" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

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
                        chatHistory.map((chat) => (
                            <div
                                key={chat.id}
                                onClick={() => loadChat(chat.id)}
                                className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group relative ${activeChatId === chat.id ? 'bg-black text-white' : ''}`}
                            >
                                <p className="truncate text-sm">{chat.title}</p>
                                <div className="opacity-0 group-hover:opacity-100 flex gap-1 z-10">
                                    <button
                                        className="p-1 hover:bg-gray-200 rounded-full"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setChatToRename({ id: chat.id, title: chat.title });
                                            setNewChatTitle(chat.title);
                                            setIsRenameDialogOpen(true);
                                        }}
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        className="p-1 hover:bg-gray-200 rounded-full"
                                        onClick={(e) => deleteChat(chat.id, e)}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
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
                            chatMessages.map((message, index) => (
                                <div key={index}>
                                    <div className="flex-shrink mt-1">
                                        {message.role === "user" ? (
                                            <p></p>
                                        ) : (
                                            <p></p>
                                        )}
                                    </div>
                                    <MessageRenderer message={message} />
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

                        {/* Command detection indicator */}
                        {detectedCommands.length > 0 && (
                            <div className="mb-2 bg-gray-50 p-2 rounded-lg flex gap-2 items-center">
                                <span className="text-sm">Detected:</span>
                                {detectedCommands.map((command, index) => (
                                    <span key={index} className="text-xs bg-gray-200 px-2 py-1 rounded-full">{command}</span>
                                ))}
                            </div>
                        )}

                        {/* Uploaded image preview */}
                        {uploadedImageUrl && (
                            <div className="mb-2 relative inline-block">
                                <img
                                    src={uploadedImageUrl}
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

                        {/* Command suggestions toggle */}
                        {showSuggestions && (
                            <div className="mb-2 bg-gray-50 p-3 rounded-lg">
                                <h3 className="font-medium mb-2">Available Commands</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {commandSuggestions.map((suggestion, index) => (
                                        <div
                                            key={index}
                                            className="p-2 border rounded cursor-pointer hover:bg-gray-100"
                                            onClick={() => {
                                                setPrompt(suggestion.example);
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{suggestion.icon}</span>
                                                <span className="font-medium">{suggestion.command}</span>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">{suggestion.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <div className="flex flex-col gap-2 flex-grow">
                                <textarea
                                    rows={1}
                                    className="p-5 text-gray-800 border rounded-lg focus:border-black focus:ring-2 bg-white focus:ring-black focus:outline-none flex-grow transition-all min-h-[2rem] max-h-[400px] scroll-smooth overflow-auto duration-150"
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

                            <div className="flex flex-col gap-2">
                                <label className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-3 cursor-pointer transition-all duration-150 flex items-center justify-center flex-shrink-0">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={loadingResponse || !user}
                                    />
                                    <ImageIcon size={18} />
                                </label>

                                <button
                                    onClick={() => setShowSuggestions(!showSuggestions)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-3 cursor-pointer transition-all duration-150 flex items-center justify-center flex-shrink-0"
                                >
                                    💡
                                </button>

                                <button
                                    className={`bg-black text-white rounded-lg p-5 cursor-pointer transition-all duration-150 flex items-center justify-center flex-shrink-0 ${(!prompt.trim() || loadingResponse || !user)
                                        ? 'opacity-50 cursor-not-allowed'
                                        : ''
                                        }`}
                                    onClick={handleEnhancedSubmit}
                                    disabled={!prompt.trim() || loadingResponse || !user}
                                >
                                    {uploadedImageUrl ? <ImageIcon size={18} /> : <SendHorizonal size={18} />}
                                </button>
                            </div>
                        </div>

                        <br />

                        <div className="gap-2 flex">
                            <Select
                                value={model}
                                onValueChange={(value) => setModel(value)}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gemini-2.0-flash" key={"Gemini 2.0 Flash"}>Gemini 2.0 Flash</SelectItem>
                                    <SelectItem value="mistral-7b" key={"mistral-7b"}>Mistral 7B</SelectItem>
                                    <SelectItem value="llama-4-scout" key={"llama-4-scout"}>LLaMA 4 Scout</SelectItem>
                                    <SelectItem value="gpt-4" key={"gpt-4"}>GPT 4</SelectItem>
                                    <SelectItem value="deepseek-v3" key={"deepseek-v3"}>Deepseek v3</SelectItem>
                                    <SelectItem value="claude-3.7" key={"claude-3.7"}>Claude 3.7 Sonnet</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={selectedUserModel}
                                onValueChange={(value) => {
                                    const selectedModel = userModels.find((model: any) => model.title === value);
                                    setModelInstruction(selectedModel?.instructions || '');
                                    setSelectedUserModel(value);
                                }}
                                defaultValue="Default"
                            >
                                <SelectTrigger className="w-[180px]">
                                    <BoxIcon /><SelectValue placeholder="Select Persona" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Default" key={'default'}>Default</SelectItem>
                                    {userModels.map((model: any) => (
                                        <SelectItem value={model.title} key={model.title}>{model.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Save Document Dialog */}
                <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Save as Document</DialogTitle>
                        </DialogHeader>
                        <Input
                            placeholder="Document title"
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                        />
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsSaveDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (documentToSave) {
                                        saveDocument(
                                            documentTitle || "Untitled Document",
                                            documentToSave.content
                                        );
                                    }
                                }}
                                disabled={!documentTitle.trim()}
                            >
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Rename Chat Dialog */}
                <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Rename Chat</DialogTitle>
                        </DialogHeader>
                        <Input
                            placeholder="New chat title"
                            value={newChatTitle}
                            onChange={(e) => setNewChatTitle(e.target.value)}
                        />
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsRenameDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (chatToRename) {
                                        renameChat(chatToRename.id, newChatTitle);
                                    }
                                }}
                                disabled={!newChatTitle.trim()}
                            >
                                Rename
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </SidebarProvider>
    );
};

export default ChatPage;