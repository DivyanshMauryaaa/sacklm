// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            model,
            chatContext,
            file,
            context,
            prompt,
            instructions
        } = body;

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
            return NextResponse.json({ response: responseData });
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
                max_tokens: 2056
            });

            const mistralResponse = completion.choices[0].message.content;
            return NextResponse.json({ response: mistralResponse });
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

            const llamaRes = completion.choices[0].message.content;
            return NextResponse.json({ response: llamaRes });
        }

        else {
            return NextResponse.json({ error: "Unsupported model." }, { status: 400 });
        }

        return NextResponse.json({ response: responseData });

    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
