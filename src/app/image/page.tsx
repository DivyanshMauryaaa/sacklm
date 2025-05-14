'use client'

import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { SendHorizonal, Wand2 } from "lucide-react";
import { useState, useEffect } from "react";
import Replicate from "replicate";

const Page = () => {
    const [prompt, setPrompt] = useState('');
    const { user } = useUser();
    const [loadingResponse, setLoadingResponse] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    
    // Initialize Replicate correctly
    const replicate = new Replicate({
        auth: process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN,
    });

    // Fetch existing images on component mount
    useEffect(() => {
        const fetchImages = async () => {
            if (user?.id) {
                const { data, error } = await supabase
                    .from('images')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });
                
                if (data && !error) {
                    // Assuming image URLs are stored in the 'bytes' field
                    setImages(data.map(item => item.bytes));
                }
            }
        };
        
        fetchImages();
    }, [user]);

    const handleSubmitPrompt = async () => {
        if (!prompt.trim() || !user) return;
        
        try {
            setLoadingResponse(true);
            
            // Run Replicate model with correct parameters
            const output = await replicate.run(
                "black-forest-labs/flux-schnell",
                {
                    input: {
                        prompt: prompt
                    }
                }
            );
            
            // Check if output is an array of image URLs
            const imageUrl = Array.isArray(output) ? output[0] : output;
            
            if (imageUrl) {
                // Add new image to state
                setImages((prevImages: string[]) => [imageUrl, ...prevImages]);
                
                // Store in Supabase
                await supabase.from('images').insert({
                    user_id: user.id,
                    bytes: imageUrl,
                    prompt: prompt
                });
                
                // Clear prompt
                setPrompt('');
            }
        } catch (error) {
            console.error("Error generating image:", error);
            alert("Failed to generate image. Please try again.");
        } finally {
            setLoadingResponse(false);
        }
    };

    return (
        <div className="min-h-screen pb-24">
            {!images.length && (
                <div className="m-auto w-full max-w-[500px] mt-[50px] text-center">
                    <Wand2 size={64} className="mx-auto" />
                    <br />
                    <p className="text-4xl">
                        What image do you want to create?{" "}
                        <span className="font-bold">{user?.firstName || "..."}</span>
                    </p>
                </div>
            )}

            <div className="flex flex-wrap justify-center gap-6 mt-10">
                {images.map((url, idx) => (
                    <img
                        key={idx}
                        src={url}
                        alt={`Generated image ${idx + 1}`}
                        className="w-80 rounded-lg shadow-lg border"
                    />
                ))}
            </div>

            <div className="p-1 bg-transparent fixed bottom-10 left-0 right-0">
                <div className="max-w-3xl mx-auto flex gap-2 items-center">
                    <textarea
                        rows={1}
                        maxLength={12000}
                        className="p-5 text-gray-800 border rounded-lg focus:border-black focus:ring-2 bg-white focus:ring-black focus:outline-none flex-grow transition-all min-h-[4rem] max-h-[400px] scroll-smooth overflow-auto duration-150"
                        placeholder={user ? "Describe the image you want to create..." : "Sign in to start generating images"}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && user) {
                                e.preventDefault();
                                handleSubmitPrompt();
                            }
                        }}
                        disabled={loadingResponse || !user}
                        autoFocus
                    />

                    <button
                        className={`bg-black text-white rounded-lg p-3 cursor-pointer transition-all duration-150 flex items-center justify-center flex-shrink-0 ${(!prompt.trim() || loadingResponse || !user) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'}`}
                        onClick={handleSubmitPrompt}
                        disabled={!prompt.trim() || loadingResponse || !user}
                    >
                        {loadingResponse ? (
                            <div className="w-[18px] h-[18px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <SendHorizonal size={18} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Page;