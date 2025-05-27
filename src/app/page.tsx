'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { Sparkles, Workflow, FileText, MessageSquare, Brain, MousePointerClick } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'
import Image from 'next/image'

export default function Home() {
    const router = useRouter()
    const { user, isLoaded } = useUser()

    useEffect(() => {
        if (isLoaded && user) {
            router.push('/dashboard')
        }
    }, [isLoaded, user, router])

    if (!isLoaded || user) {
        return null // Return null while loading or if user is logged in (will redirect)
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white scroll-smooth">
            {/* Hero Section */}
            <div className="container mx-auto px-12 py-24">
                <div className="flex flex-col items-center text-center">

                    <Image
                        src="/home.png"
                        width={1000}
                        height={450}
                        alt="AI Workspace"
                        className="rounded-lg ring-2 ring-gray-300 user-select-none"
                    />

                    <br /><br />
                    <h1 className="text-5xl font-bold text-gray-900 mb-6">
                        Your all in one <span className="text-blue-700">AI Workspace</span>
                    </h1>
                    <p className="text-md text-gray-600 mb-8 max-w-2xl">
                        Meet SackLM — an intelligent, flexible platform where your AI personas, smart documents, and deep conversations come together. Say goodbye to scattered tools and hello to organized brilliance.
                    </p>
                    <div className="flex space-x-4">
                        <Button size="lg" onClick={() => router.push('/sign-in')} className="cursor-pointer">
                            Get Started
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => router.push('#features')} className="cursor-pointer">
                            Know more &rarr;
                        </Button>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-gray-50 py-16" id="features">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                        Powerful Features
                    </h2>
                    <div className="">
                        <div className="p-6 flex jusitfy-center gap-5 transition-all duration-150">
                            <div>

                                <Workflow className="h-12 w-12  mb-4" />
                                <h3 className="text-5xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-700 to-orange-700">AI Workflows</h3>
                                <p className="text-gray-600">
                                    Create custom workflows with multiple AI agents working together.
                                </p>

                            </div>

                            <br />

                            <center>

                                <Image
                                    src={'/workflows.png'}
                                    width={1000}
                                    height={400}
                                    alt=""
                                    className="rounded-lg border border-gray-300"
                                />

                            </center>
                            <br />
                        </div>
                        <div className="flex justify-center gap-2 p-6 transition-all duration-150">
                            <div>
                                <Brain className="h-12 w-12 mb-4" />
                                <h3 className="text-5xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-700 to-orange-700">Multiple Models</h3>
                                <p className="text-gray-600">
                                    Choose from various AI models including Gemini, GPT-4, and more.
                                </p>

                                <br />

                                <div className="flex gap-3">

                                    <Image
                                        src={'/icons/gpt.png'}
                                        width={40}
                                        height={40}
                                        alt="OpenAI GPT Models"
                                    />

                                    <Image
                                        src={'/icons/gemini.png'}
                                        width={40}
                                        height={40}
                                        alt="Google Gemini"
                                    />

                                    <Image
                                        src={'/icons/mistral-icon.png'}
                                        width={40}
                                        height={40}
                                        alt="Mistral Icon"
                                    />

                                    <Image
                                        src={'/icons/deepseek.png'}
                                        width={40}
                                        height={40}
                                        alt="Mistral Icon"
                                    />

                                    <Image
                                        src={'/icons/LLaMA.webp'}
                                        width={40}
                                        height={40}
                                        alt="Mistral Icon"
                                    />

                                </div>
                            </div>

                            <br />

                            <div>

                                <center>

                                    <Image
                                        src={'/demos/chat-demo.png'}
                                        width={500}
                                        height={200}
                                        alt=""
                                        className="rounded-lg border border-gray-300"
                                    />

                                </center>

                            </div>

                        </div>

                        <div className="grid grid-cols-3 gap-4">

                            <div className="hover:ring-2 hover:ring-blue-600 p-6 rounded-lg shadow-sm transition-all duration-150 cursor-pointer">
                                <FileText className="h-12 w-12  mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Document Management</h3>
                                <p className="text-gray-600">
                                    Easily save your AI responses with one click and use them later whenever you want from within the app.
                                </p>
                            </div>
                            <div className="hover:ring-2 hover:ring-blue-600 p-6 rounded-lg shadow-sm transition-all duration-150 cursor-pointer">
                                <MessageSquare className="h-12 w-12  mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Smart Context</h3>
                                <p className="text-gray-600">
                                    Intelligent context handling between agents for better results.
                                </p>
                            </div>
                            <div className="hover:ring-2 hover:ring-blue-600 p-6 rounded-lg shadow-sm transition-all duration-150 cursor-pointer">
                                <MousePointerClick className="h-12 w-12  mb-4" />
                                <h3 className="text-xl font-semibold mb-2">Multiple Purpose Models</h3>
                                <p className="text-gray-600">
                                    Multiple purpose agents like video generation, image generation, text generation working together to give result.
                                </p>
                            </div>

                        </div>

                    </div>
                </div>
            </div>



            {/* CTA Section */}
            <div className="container mx-auto px-6 py-16">
                <div className="bg-blue-600 rounded-2xl p-12 text-center">
                    <h2 className="text-3xl font-bold text-white mb-4">
                        Ready to Transform Your Work?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8">
                        Start creating powerful AI workflows today.
                    </p>
                    <Button
                        size="lg"
                        variant="secondary"
                        onClick={() => router.push('/sign-up')}
                    >
                        Get Started Now
                    </Button>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-300 py-8">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center space-x-2 mb-4 md:mb-0">
                            <Sparkles className="h-6 w-6 text-blue-500" />
                            <span className="text-xl font-bold">SackLM</span>
                        </div>
                        <div className="text-sm">
                            © 2024 SackLM. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    )
}