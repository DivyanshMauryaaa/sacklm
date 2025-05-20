// app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";

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

        // Validate required fields
        if (!model && !prompt) {
            return NextResponse.json({ error: "Model and prompt are required." }, { status: 400 });
        }

        // Construct the main prompt object
        const mainPrompt = {
            prompt,
            chatContext: chatContext || "",
            file: file || "",
            context: context || "",
            instructions: instructions || ""
        };

        let response;

        // API call routing based on model
        if (model === "gpt-4") {
            response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4",
                    messages: [
                        ...(mainPrompt.chatContext || []),
                        { role: "user", content: mainPrompt.prompt },
                    ],
                    ...(mainPrompt.instructions ? { system: { content: mainPrompt.instructions } } : {})
                })
            });
        } else if (model === "gemini-2.0-flash") {
            response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + process.env.GOOGLE_GEMINI_API_KEY, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [
                            {
                                text: "User prompt: " + mainPrompt.prompt + " Some system instructions: You are SackLM AI. " + mainPrompt.instructions + " Context: " + mainPrompt.context
                            }
                        ]
                    }],

                })
            });
        } else {
            return NextResponse.json({ error: "Unsupported model." }, { status: 400 });
        }

        const data = await response.json();
        return NextResponse.json({ response: data });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internal server error." }, { status: 500 });
    }
}
