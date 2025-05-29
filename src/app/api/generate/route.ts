// app/api/generate/route.tsx
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

// Enhanced command detection interface
interface CommandDetection {
    hasSearch: boolean;
    hasImageAnalysis: boolean;
    hasImageGeneration: boolean;
    hasVideoGeneration: boolean;
    searchQuery?: string;
    imageUrl?: string;
    imagePrompt?: string;
    videoPrompt?: string;
    cleanPrompt: string;
}

// Media generation interfaces
interface ImageGenerationResult {
    imageUrl: string;
    prompt: string;
    timestamp: string;
    error?: string;
}

interface VideoGenerationResult {
    videoUrl: string;
    prompt: string;
    timestamp: string;
    error?: string;
}

// Enhanced command detection with media generation
async function detectCommands(prompt: string, imageUrl?: string): Promise<CommandDetection> {
    let cleanPrompt = prompt;
    let hasSearch = false;
    let hasImageAnalysis = false;
    let hasImageGeneration = false;
    let hasVideoGeneration = false;
    let searchQuery = "";
    let imagePrompt = "";
    let videoPrompt = "";

    // Check for /search command - now captures everything after /search
    const searchMatch = prompt.match(/\/search\s+(.*)/i);
    if (searchMatch && searchMatch[1]) {
        hasSearch = true;
        searchQuery = searchMatch[1].trim();
        cleanPrompt = prompt.replace(/\/search\s+.*/i, '').trim();
    }

    // Check for /generate-image command - now captures everything after /generate-image
    const imageGenMatch = prompt.match(/\/generate-image\s+(.*)/i);
    if (imageGenMatch && imageGenMatch[1]) {
        hasImageGeneration = true;
        imagePrompt = imageGenMatch[1].trim();
        cleanPrompt = prompt.replace(/\/generate-image\s+.*/i, '').trim();
    }

    // Check for /generate-video command - now captures everything after /generate-video
    const videoGenMatch = prompt.match(/\/generate-video\s+(.*)/i);
    if (videoGenMatch && videoGenMatch[1]) {
        hasVideoGeneration = true;
        videoPrompt = videoGenMatch[1].trim();
        cleanPrompt = prompt.replace(/\/generate-video\s+.*/i, '').trim();
    }

    // Check for /analyze-image command or if imageUrl is provided
    const imageMatch = prompt.match(/\/analyze-image\s+(.*)/i);
    if (imageMatch && imageMatch[1]) {
        hasImageAnalysis = true;
        cleanPrompt = prompt.replace(/\/analyze-image\s+.*/i, '').trim();
    } else if (imageUrl) {
        hasImageAnalysis = true;
    }

    // Auto-detect search intent with improved keywords
    if (!hasSearch && !hasImageGeneration && !hasVideoGeneration) {
        const searchKeywords = [
            'search', 'find', 'latest', 'current', 'news', 'recent',
            'today', 'yesterday', 'this week', 'what happened',
            'weather', 'stock price', 'trending', 'update', 'when did',
            'who is', 'what is happening', 'breaking news', 'show me',
            'tell me about recent', 'what\'s new'
        ];

        const needsSearch = searchKeywords.some(keyword =>
            prompt.toLowerCase().includes(keyword.toLowerCase())
        );

        if (needsSearch) {
            hasSearch = true;
            searchQuery = await generateSmartSearchQuery(prompt);
        }
    }

    // Auto-detect image generation intent
    if (!hasImageGeneration) {
        const imageGenKeywords = [
            'create image', 'generate image', 'draw', 'make picture',
            'create artwork', 'design image', 'paint', 'illustrate'
        ];

        const needsImageGen = imageGenKeywords.some(keyword =>
            prompt.toLowerCase().includes(keyword.toLowerCase())
        );

        if (needsImageGen) {
            hasImageGeneration = true;
            imagePrompt = extractCreativePrompt(prompt, 'image');
        }
    }

    // Auto-detect video generation intent
    if (!hasVideoGeneration) {
        const videoGenKeywords = [
            'create video', 'generate video', 'make video',
            'create animation', 'animate', 'video of'
        ];

        const needsVideoGen = videoGenKeywords.some(keyword =>
            prompt.toLowerCase().includes(keyword.toLowerCase())
        );

        if (needsVideoGen) {
            hasVideoGeneration = true;
            videoPrompt = extractCreativePrompt(prompt, 'video');
        }
    }

    return {
        hasSearch,
        hasImageAnalysis,
        hasImageGeneration,
        hasVideoGeneration,
        searchQuery: searchQuery || undefined,
        imageUrl,
        imagePrompt: imagePrompt || undefined,
        videoPrompt: videoPrompt || undefined,
        cleanPrompt: cleanPrompt || prompt
    };
}

// Generate optimized search query using AI
async function generateSmartSearchQuery(prompt: string): Promise<string> {
    try {
        const api = new OpenAI({
            apiKey: process.env.AIML_API_KEY!,
            baseURL: "https://api.aimlapi.com/v1"
        });

        const response = await api.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "Extract the most relevant 3-5 word search query from the user's prompt. Focus on key entities, recent events, or specific information needs. Return only the search query, nothing else."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 50,
            temperature: 0.1
        });

        return response.choices[0].message.content?.trim() || prompt;
    } catch (error) {
        console.error('Smart search query generation failed:', error);
        return prompt.slice(0, 50); // Fallback to truncated prompt
    }
}

// Extract creative prompts for media generation
function extractCreativePrompt(prompt: string, type: 'image' | 'video'): string {
    const patterns = {
        image: [
            /create (?:an? )?image (?:of )?(.+)/i,
            /generate (?:an? )?image (?:of )?(.+)/i,
            /draw (.+)/i,
            /make (?:a )?picture (?:of )?(.+)/i,
            /illustrate (.+)/i
        ],
        video: [
            /create (?:a )?video (?:of )?(.+)/i,
            /generate (?:a )?video (?:of )?(.+)/i,
            /make (?:a )?video (?:of )?(.+)/i,
            /animate (.+)/i,
            /video (?:of )?(.+)/i
        ]
    };

    for (const pattern of patterns[type]) {
        const match = prompt.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }

    return prompt; // Return full prompt if no pattern matches
}

// Optimized web search using Tavily API
async function performOptimizedSearch(query: string) {
    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`
            },
            body: JSON.stringify({
                query: query,
                search_depth: "basic",
                include_answer: true,
                include_images: false,
                include_raw_content: false,
                max_results: 12, // Reduced for efficiency
                include_domains: ["wikipedia.org", "reuters.com", "bbc.com", "cnn.com", "techcrunch.com"] // Focus on reliable sources
            })
        });

        if (!response.ok) {
            throw new Error('Tavily search failed');
        }

        const data = await response.json();

        return {
            query,
            results: data.results?.slice(0, 3).map((result: any) => ({
                title: result.title,
                url: result.url,
                content: result.content?.slice(0, 500) + '...', // Truncate for efficiency
                score: result.score
            })) || [],
            answer: data.answer?.slice(0, 300) || null, // Truncate answer
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Optimized search error:', error);
        return {
            query,
            results: [],
            error: 'Search temporarily unavailable',
            timestamp: new Date().toISOString()
        };
    }
}

// Image generation using DALL-E via AIML API
async function generateImage(prompt: string): Promise<ImageGenerationResult> {
    try {
        const api = new OpenAI({
            apiKey: process.env.AIML_API_KEY!,
            baseURL: "https://api.aimlapi.com/v1"
        });

        const response = await api.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "standard"
        });

        if (!response.data?.[0]?.url) {
            throw new Error('No image URL in response');
        }

        return {
            imageUrl: response.data[0].url,
            prompt,
            timestamp: new Date().toISOString()
        };
    } catch (error: any) {
        console.error('Image generation error:', error);
        return {
            imageUrl: '',
            prompt,
            timestamp: new Date().toISOString(),
            error: 'Image generation failed'
        };
    }
}

// Video generation using Veo 2 via AIML API
async function generateVideo(prompt: string): Promise<VideoGenerationResult> {
    try {
        const response = await fetch('https://api.aimlapi.com/v1/videos/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.AIML_API_KEY}`
            },
            body: JSON.stringify({
                model: "veo-2",
                prompt: prompt,
                duration: 5, // 5 second videos for efficiency
                resolution: "720p"
            })
        });

        if (!response.ok) {
            throw new Error('Video generation API failed');
        }

        const data = await response.json();

        return {
            videoUrl: data.video_url || '',
            prompt,
            timestamp: new Date().toISOString()
        };
    } catch (error: any) {
        console.error('Video generation error:', error);
        return {
            videoUrl: '',
            prompt,
            timestamp: new Date().toISOString(),
            error: 'Video generation failed'
        };
    }
}

// Enhanced image analysis
async function analyzeImage(imageUrl: string, prompt: string = "Describe this image in detail"): Promise<any> {
    try {
        const api = new OpenAI({
            apiKey: process.env.AIML_API_KEY!,
            baseURL: "https://api.aimlapi.com/v1"
        });

        const response = await api.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: prompt
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: imageUrl,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 800 // Reduced for efficiency
        });

        return {
            description: response.choices[0].message.content,
            imageUrl,
            timestamp: new Date().toISOString()
        };
    } catch (error: any) {
        console.error('Image analysis error:', error);
        return {
            description: "Image analysis failed",
            imageUrl,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Optimized model processing
async function processModel(model: string, messages: any[], temperature: number = 0.7) {
    const api = new OpenAI({
        apiKey: process.env.AIML_API_KEY!,
        baseURL: "https://api.aimlapi.com/v1"
    });

    const modelMap: { [key: string]: { name: string; maxTokens: number } } = {
        "gpt-4": { name: "gpt-4", maxTokens: 4096 },
        "mistral-7b": { name: "mistralai/Mistral-7B-Instruct-v0.2", maxTokens: 4096 },
        "llama-4-scout": { name: "meta-llama/llama-4-scout", maxTokens: 4096 },
        "deepseek-v3": { name: "deepseek-chat", maxTokens: 4096 },
        "gemini-2.5-Pro": { name: "google/gemini-2.5-flash-preview", maxTokens: 4096 },
        "claude-3.7": { name: "claude-3-7-sonnet-20250219", maxTokens: 4096 }
    };

    const modelConfig = modelMap[model];
    if (!modelConfig) {
        throw new Error(`Unsupported model: ${model}`);
    }

    const completion = await api.chat.completions.create({
        model: modelConfig.name,
        messages,
        temperature,
        max_tokens: modelConfig.maxTokens
    });

    return completion.choices[0].message.content;
}

// Main API handler
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json();
        const {
            model,
            chatContext,
            context,
            prompt,
            instructions,
            imageUrl
        } = body;

        if (!model || !prompt) {
            return NextResponse.json({ error: "Model and prompt are required." }, { status: 400 });
        }

        // Detect commands efficiently
        const commands = await detectCommands(prompt, imageUrl);

        // Prepare enhanced instructions
        let enhancedInstructions = (instructions || '') + ' You are SackLM, an AI assistant chatbot designed to help users efficiently.';

        // Parallel processing for better performance
        const promises: Promise<any>[] = [];

        // Add search promise if needed
        if (commands.hasSearch && commands.searchQuery) {
            console.log(`🔍 Executing optimized search: "${commands.searchQuery}"`);
            promises.push(performOptimizedSearch(commands.searchQuery));
        } else {
            promises.push(Promise.resolve(null));
        }

        // Add image analysis promise if needed
        if (commands.hasImageAnalysis && commands.imageUrl) {
            console.log(`📸 Analyzing image: ${commands.imageUrl}`);
            promises.push(analyzeImage(commands.imageUrl, `Analyze this image: ${commands.cleanPrompt}`));
        } else {
            promises.push(Promise.resolve(null));
        }

        // Add image generation promise if needed
        if (commands.hasImageGeneration && commands.imagePrompt) {
            console.log(`🎨 Generating image: "${commands.imagePrompt}"`);
            promises.push(generateImage(commands.imagePrompt));
        } else {
            promises.push(Promise.resolve(null));
        }

        // Add video generation promise if needed
        if (commands.hasVideoGeneration && commands.videoPrompt) {
            console.log(`🎬 Generating video: "${commands.videoPrompt}"`);
            promises.push(generateVideo(commands.videoPrompt));
        } else {
            promises.push(Promise.resolve(null));
        }

        // Execute all operations in parallel
        const [searchResults, imageAnalysis, imageGeneration, videoGeneration] = await Promise.all(promises);

        // Build context efficiently
        let enhancedContext = context || '';

        if (searchResults?.results?.length > 0) {
            const searchContext = searchResults.results
                .map((result: any) => `${result.title}: ${result.content}`)
                .join('\n');
            enhancedContext += `\n\nWeb Search Results: ${searchContext}`;
            enhancedInstructions += " Use the provided search results to give current, accurate information.";
        }

        if (imageAnalysis?.description) {
            enhancedContext += `\n\nImage Analysis: ${imageAnalysis.description}`;
            enhancedInstructions += " Reference the analyzed image in your response.";
        }

        // Prepare messages for model
        const messages: any[] = [];

        if (enhancedInstructions) {
            messages.push({ role: "system", content: enhancedInstructions });
        }

        if (enhancedContext.trim()) {
            messages.push({ role: "system", content: `Context: ${enhancedContext}` });
        }

        // Add recent chat context (limited for efficiency)
        if (chatContext && Array.isArray(chatContext)) {
            chatContext.slice(-4).forEach((msg: any) => {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            });
        }

        messages.push({ role: "user", content: commands.cleanPrompt });

        // Process with model (handle Gemini separately for direct API)
        let responseText = "";

        if (model === "gemini-2.0-flash") {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{
                            text: `${commands.cleanPrompt}\n\nInstructions: ${enhancedInstructions}\n\nContext: ${enhancedContext}`
                        }]
                    }]
                })
            });

            const data = await response.json();
            responseText = data.candidates[0].content.parts[0].text;
        } else {
            responseText = await processModel(model, messages) || " ";
        }

        console.log("✅ Response generated successfully");

        return NextResponse.json({
            text: responseText,
            searchResults,
            imageAnalysis,
            imageGeneration,
            videoGeneration,
            commands: {
                detectedSearch: commands.hasSearch,
                detectedImageAnalysis: commands.hasImageAnalysis,
                detectedImageGeneration: commands.hasImageGeneration,
                detectedVideoGeneration: commands.hasVideoGeneration,
                searchQuery: commands.searchQuery,
                cleanPrompt: commands.cleanPrompt
            },
            metadata: {
                model,
                hasWebSearch: !!searchResults,
                hasImageAnalysis: !!imageAnalysis,
                hasImageGeneration: !!imageGeneration,
                hasVideoGeneration: !!videoGeneration,
                timestamp: new Date().toISOString(),
                processingTime: Date.now() // Add processing time tracking
            }
        });

    } catch (error: any) {
        console.error("❌ API Error:", error);
        return NextResponse.json({
            error: "Internal server error",
            details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again'
        }, { status: 500 });
    }
}