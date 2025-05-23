// app/api/generate/route.ts
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

function parseSackLang(input: string) {
    const matches = input.match(/<sack-(\w+)-gen.*?prompt="(.*?)"(.*?)\/?>/);
    if (!matches) return null;
    return {
        type: matches[1],
        prompt: matches[2],
        raw: input
    };
}

const generateMedia = async (prompt: string, type: string, AudioText: string, imgSettings: any, videoSettings: any) => {
    if (type === "image") {
        const settings = imgSettings;
        const width = settings.width;
        const height = settings.height;
        const seed = settings.seed;
        const steps = settings.steps;

        const user = useUser();

        const response = await fetch('https://api.aimlapi.com/v1/images/generations', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.AIML_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                width: width,
                height: height,
                seed: seed,
                steps: steps,
            }),
        });

        const result = await response.json();
        const imageUrl = result?.data?.[0]?.url;

        if (imageUrl) {
            await supabase.from('media').insert([
                {
                    type: 'image',
                    url: imageUrl,
                    prompt: prompt,
                    created_at: new Date().toISOString(),
                    user_id: user?.user?.id
                }
            ]);
            return {
                type: 'image',
                url: imageUrl,
                alt: prompt
            };
        }
        throw new Error("No image URL returned from API.");
    }
    else if (type === "video") {
        // Video Generation block - Use Google Veo3
        const response = await fetch('https://api.aimlapi.com/v2/generate/video/google/generation', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.AIML_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'veo2',
                aspect_ratio: '16:9',
                duration: 5,
                prompt: prompt
            }),
        });

        const result = await response.json();
        const videoUrl = result?.data?.[0]?.url;

        if (videoUrl) {
            const user = useUser();
            await supabase.from('media').insert([
                {
                    type: 'video',
                    url: videoUrl,
                    prompt: prompt,
                    created_at: new Date().toISOString(),
                    user_id: user?.user?.id
                }
            ]);
            return {
                type: 'video',
                url: videoUrl,
                alt: prompt
            };
        }
        throw new Error("No video URL returned from API.");
    }
    else if (type === "audio") {
        // Audio Generation block - Use ElevenLabs
        return null;
    }
    return null;
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { model, chatContext, file, context, prompt, instructions } = body;

        if (!model || !prompt) {
            return NextResponse.json({ error: "Model and prompt are required." }, { status: 400 });
        }

        const mainPrompt = {
            prompt,
            chatContext: chatContext || [],
            file: file || "",
            context: context || "",
            instructions: instructions || ""
        };

        let responseData;
        let mediaResponse = null;

        if (model === "gpt-4") {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [
                        ...(mainPrompt.chatContext || []),
                        ...(mainPrompt.instructions ? [{ role: "system", content: mainPrompt.instructions }] : []),
                        { role: "user", content: mainPrompt.prompt },
                    ]
                })
            });

            responseData = await response.json();
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
                                text: `User prompt: ${mainPrompt.prompt} | Instructions: ${mainPrompt.instructions} | Context: ${mainPrompt.context}`
                            }]
                        }
                    ]
                })
            });

            responseData = await response.json();

            //MEDIA GENERATION BLOCK
            //Parsing the response text based on the model

            {
                const mediaCondition = parseSackLang(responseData.candidates?.[0].content.parts?.[0].text);

                if (mediaCondition?.type === "image") {
                    const imgSettings = {
                        width: 1024,
                        height: 1024,
                        seed: Math.floor(Math.random() * 1000000),
                        steps: 50
                    };

                    mediaResponse = await generateMedia(
                        mediaCondition.prompt, //Prompting for the API KEY, here for the "image" type.
                        mediaCondition.type, //defining the type of the media
                        "",
                        imgSettings, //Image settings object for setting the image.
                        {} // video settings not needed for image generation
                    );
                } else if (mediaCondition?.type === "video") {
                    //Video generation block.
                    mediaResponse = await generateMedia(
                        mediaCondition.prompt, //Prompting for the API KEY, here for the "video" type.
                        mediaCondition.type, //defining the type of the media
                        "",
                        {}, // image settings not needed for video generation
                        {
                            model: 'veo2',
                            aspect_ratio: '16:9',
                            duration: 5
                        }, // video settings object for setting the video.
                    );
                } else if (mediaCondition?.type === "audio") { //Coming soon.
                    //Audio generation block.
                }
            }


        }
        else if (model === "mistral-7b") {
            const messages: any[] = [];

            if (mainPrompt.instructions) {
                messages.push({
                    role: "system",
                    content: mainPrompt.instructions
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

            if (mainPrompt.instructions) {
                messages.push({
                    role: "system",
                    content: mainPrompt.instructions
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

        return NextResponse.json({ 
            text: parsedText,
            media: mediaResponse 
        });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
