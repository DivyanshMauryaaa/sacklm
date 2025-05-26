// app/api/generate/route.tsx
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

// Command detection interface
interface CommandDetection {
    hasSearch: boolean;
    hasImageAnalysis: boolean;
    searchQuery?: string;
    imageUrl?: string;
    cleanPrompt: string;
}

// Detect commands in prompt
function detectCommands(prompt: string, imageUrl?: string): CommandDetection {
    let cleanPrompt = prompt;
    let hasSearch = false;
    let hasImageAnalysis = false;
    let searchQuery = "";

    // Check for /search command
    const searchMatch = prompt.match(/\/search\s+(.+?)(?:\s|$)/i);
    if (searchMatch) {
        hasSearch = true;
        searchQuery = searchMatch[1].trim();
        cleanPrompt = prompt.replace(/\/search\s+/i, '').trim();
    }

    // Check for /image command or if imageUrl is provided
    const imageMatch = prompt.match(/\/image\s+(.+?)(?:\s|$)/i);
    if (imageMatch || imageUrl) {
        hasImageAnalysis = true;
        if (imageMatch) {
            cleanPrompt = prompt.replace(/\/image\s+/i, '').trim();
        }
    }

    // Auto-detect search keywords if no explicit command
    if (!hasSearch) {
        const searchKeywords = [
            'search', 'find', 'latest', 'current', 'news', 'recent',
            'today', 'yesterday', 'this week', 'what happened',
            'weather', 'stock price', 'trending', 'update', 'when did',
            'who is', 'what is happening', 'breaking news'
        ];

        const needsSearch = searchKeywords.some(keyword =>
            prompt.toLowerCase().includes(keyword.toLowerCase())
        );

        if (needsSearch) {
            hasSearch = true;
            searchQuery = extractSearchQuery(prompt);
        }
    }

    return {
        hasSearch,
        hasImageAnalysis,
        searchQuery: searchQuery || undefined,
        imageUrl,
        cleanPrompt
    };
}

// Extract search query from prompt
function extractSearchQuery(prompt: string): string {
    const searchPatterns = [
        /search for (.+)/i,
        /find (.+)/i,
        /what is (.+)/i,
        /tell me about (.+)/i,
        /latest (.+)/i,
        /current (.+)/i,
        /news about (.+)/i,
        /who is (.+)/i,
        /when did (.+)/i,
        /what happened (.+)/i
    ];

    for (const pattern of searchPatterns) {
        const match = prompt.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }

    return prompt;
}

// Web search function using Tavily API
async function performTavilySearch(query: string) {
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
                max_results: 5
            })
        });

        if (!response.ok) {
            throw new Error('Tavily search failed');
        }

        const data = await response.json();

        return {
            query,
            results: data.results?.map((result: any) => ({
                title: result.title,
                url: result.url,
                content: result.content,
                score: result.score
            })) || [],
            answer: data.answer || null,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Tavily search error:', error);
        return {
            query,
            results: [],
            error: 'Failed to perform Tavily search',
            timestamp: new Date().toISOString()
        };
    }
}

// Alternative web search using SerpAPI
async function performWebSearch(query: string) {
    try {
        const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${process.env.SERP_API_KEY}&num=5`);

        if (!response.ok) {
            throw new Error('Search API request failed');
        }

        const data = await response.json();

        const results = data.organic_results?.slice(0, 3).map((result: any) => ({
            title: result.title,
            link: result.link,
            snippet: result.snippet
        })) || [];

        return {
            query,
            results,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Web search error:', error);
        return {
            query,
            results: [],
            error: 'Failed to perform web search',
            timestamp: new Date().toISOString()
        };
    }
}

// Image analysis function
async function analyzeImage(imageUrl: string, prompt: string = "Describe this image in detail") {
    try {
        const api = new OpenAI({
            apiKey: process.env.AIML_API_KEY!,
            baseURL: "https://api.aimlapi.com/v1"
        });

        const response = await api.chat.completions.create({
            model: "gpt-4-vision-preview",
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
            max_tokens: 1000
        });

        return {
            description: response.choices[0].message.content,
            imageUrl,
            timestamp: new Date().toISOString()
        };
    } catch (error: any) {
        console.error('Image analysis error:', error);
        return {
            description: "Failed to analyze image",
            imageUrl,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        const body = await req.json();
        const {
            model,
            chatContext,
            file,
            context,
            prompt,
            instructions,
            imageUrl
        } = body;

        if (!model || !prompt) {
            return NextResponse.json({ error: "Model and prompt are required." }, { status: 400 });
        }

        // Detect commands in the prompt
        const commands = detectCommands(prompt, imageUrl);

        const mainPrompt = {
            prompt: commands.cleanPrompt,
            chatContext: chatContext || [],
            file: file || "",
            context: context || "",
            instructions: instructions || ""
        };

        mainPrompt.instructions = mainPrompt.instructions + ' You are SackLM, you are an AI assistant chatbot made to help.'

        let responseData: any;
        let searchResults: any = null;
        let imageAnalysis: any = null;

        // Perform web search if detected
        if (commands.hasSearch && commands.searchQuery) {
            console.log(`🔍 Performing search for: "${commands.searchQuery}"`);

            if (process.env.TAVILY_API_KEY) {
                searchResults = await performTavilySearch(commands.searchQuery);
            } else if (process.env.SERP_API_KEY) {
                searchResults = await performWebSearch(commands.searchQuery);
            }

            // Add search results to context
            if (searchResults && searchResults.results.length > 0) {
                const searchContext = searchResults.results
                    .map((result: any) => `Title: ${result.title}\nContent: ${result.content || result.snippet}`)
                    .join('\n\n');

                mainPrompt.context += `\n\nWeb Search Results for "${commands.searchQuery}":\n${searchContext}`;
            }
        }

        // Analyze image if detected
        if (commands.hasImageAnalysis && commands.imageUrl) {
            console.log(`📸 Analyzing image: ${commands.imageUrl}`);
            imageAnalysis = await analyzeImage(commands.imageUrl, `Analyze this image in the context of: ${mainPrompt.prompt}`);

            if (imageAnalysis && imageAnalysis.description) {
                mainPrompt.context += `\n\nImage Analysis:\n${imageAnalysis.description}`;
            }
        }

        // Update instructions
        let enhancedInstructions = mainPrompt.instructions;
        if (commands.hasSearch || commands.hasImageAnalysis) {
            enhancedInstructions += " You have access to current web information and can analyze images. " +
                "Use the provided search results and image analysis to give accurate, up-to-date responses.";
        }

        // Process different models
        if (model === "gpt-4") {
            const messages: any[] = [];

            if (enhancedInstructions) {
                messages.push({
                    role: "system",
                    content: enhancedInstructions
                });
            }

            if (mainPrompt.context) {
                messages.push({
                    role: "system",
                    content: `Context: ${mainPrompt.context}`
                });
            }

            messages.push({
                role: "user",
                content: mainPrompt.prompt
            });

            const api = new OpenAI({
                apiKey: process.env.AIML_API_KEY!,
                baseURL: "https://api.aimlapi.com/v1"
            });

            const completion = await api.chat.completions.create({
                model: "gpt-4",
                messages,
                temperature: 0.7,
                max_tokens: 2056
            });

            responseData = {
                response: completion.choices[0].message.content
            };
        }
        else if (model === "gemini-2.0-flash") {
            const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + process.env.GOOGLE_GEMINI_API_KEY, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{
                                text: `User prompt: ${mainPrompt.prompt} | Instructions: ${enhancedInstructions} | Context: ${mainPrompt.context}`
                            }]
                        }
                    ]
                })
            });

            const data = await response.json();
            responseData = data;
        }
        else if (model === "mistral-7b") {
            const messages: any[] = [];

            if (enhancedInstructions) {
                messages.push({
                    role: "system",
                    content: enhancedInstructions
                });
            }

            if (mainPrompt.context) {
                messages.push({
                    role: "system",
                    content: `Context: ${mainPrompt.context}`
                });
            }

            messages.push({
                role: "user",
                content: mainPrompt.prompt
            });

            const api = new OpenAI({
                apiKey: process.env.AIML_API_KEY!,
                baseURL: "https://api.aimlapi.com/v1"
            });

            const completion = await api.chat.completions.create({
                model: "mistralai/Mistral-7B-Instruct-v0.2",
                messages,
                temperature: 0.7,
                max_tokens: 4096
            });

            responseData = {
                response: completion.choices[0].message.content
            };
        }
        else if (model === "llama-4-scout") {
            const messages: any[] = [];

            if (enhancedInstructions) {
                messages.push({
                    role: "system",
                    content: enhancedInstructions
                });
            }

            if (mainPrompt.context) {
                messages.push({
                    role: "system",
                    content: `Context: ${mainPrompt.context}`
                });
            }

            messages.push({
                role: "user",
                content: mainPrompt.prompt
            });

            const api = new OpenAI({
                apiKey: process.env.AIML_API_KEY!,
                baseURL: "https://api.aimlapi.com/v1"
            });

            const completion = await api.chat.completions.create({
                model: "meta-llama/llama-4-scout",
                messages,
                temperature: 0.7,
                max_tokens: 2056
            });

            responseData = {
                response: completion.choices[0].message.content
            };
        }
        else if (model === "deepseek-v3") {
            const messages: any[] = [];

            if (enhancedInstructions) {
                messages.push({
                    role: "system",
                    content: enhancedInstructions
                });
            }

            if (mainPrompt.context) {
                messages.push({
                    role: "system",
                    content: `Context: ${mainPrompt.context}`
                });
            }

            messages.push({
                role: "user",
                content: mainPrompt.prompt
            });

            const api = new OpenAI({
                apiKey: process.env.AIML_API_KEY!,
                baseURL: "https://api.aimlapi.com/v1"
            });

            const completion = await api.chat.completions.create({
                model: "deepseek-chat",
                messages,
                temperature: 0.7,
                max_tokens: 12000
            });

            responseData = {
                response: completion.choices[0].message.content
            };
        }
        else {
            return NextResponse.json({ error: "Unsupported model." }, { status: 400 });
        }

        // Parse the response text based on the model
        let parsedText = "";
        if (model === "gemini-2.0-flash") {
            parsedText = responseData.candidates[0].content.parts[0].text;
        } else {
            parsedText = responseData.response;
        }

        console.log("✅ Response generated successfully");
        console.log("🔍 Search executed:", commands.hasSearch);
        console.log("📸 Image analyzed:", commands.hasImageAnalysis);

        return NextResponse.json({
            text: parsedText,
            searchResults: searchResults,
            imageAnalysis: imageAnalysis,
            commands: {
                detectedSearch: commands.hasSearch,
                detectedImage: commands.hasImageAnalysis,
                searchQuery: commands.searchQuery,
                cleanPrompt: commands.cleanPrompt
            },
            metadata: {
                model,
                hasWebSearch: !!searchResults,
                hasImageAnalysis: !!imageAnalysis,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error("❌ API Error:", error);
        return NextResponse.json({
            error: "Internal server error.",
            details: error.message
        }, { status: 500 });
    }
}