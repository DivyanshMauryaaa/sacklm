'use client'

import { Button } from "@/components/ui/button"
import { useRouter } from 'next/navigation'
import { Sparkles, Workflow, FileText, MessageSquare, Brain, MousePointerClick } from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import { useEffect } from 'react'

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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            {/* Hero Section */}
            <div className="container mx-auto px-12 py-24">
                <div className="flex flex-col items-center text-center">
                    <div className="flex items-center space-x-2 mb-8">
                        <Sparkles className="h-12 w-12 text-blue-600" />
                        <span className="text-4xl font-bold text-gray-800">SackLM</span>
                    </div>
                    <h1 className="text-5xl font-bold text-gray-900 mb-6">
                        Your all in one <span className="text-blue-700">AI Workspace</span>
                    </h1>
                    <p className="text-xl text-gray-600 mb-8 max-w-2xl">
                        Create powerful AI-powered workflows, automate tasks, and boost productivity with our intelligent agent system.
                    </p>
                    <div className="flex space-x-4">
                        <Button size="lg" onClick={() => router.push('/sign-in')} className="cursor-pointer">
                            Get Started
                        </Button>
                        <Button size="lg" variant="outline" onClick={() => router.push('/sign-up')} className="cursor-pointer">
                            Know more &rarr;
                        </Button>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="bg-gray-50 py-16">
                <div className="container mx-auto px-6">
                    <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
                        Powerful Features
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="hover:ring-2 hover:ring-blue-600 p-6 rounded-lg shadow-sm transition-all duration-150 cursor-pointer">
                            <Workflow className="h-12 w-12  mb-4" />
                            <h3 className="text-xl font-semibold mb-2">AI Workflows</h3>
                            <p className="text-gray-600">
                                Create custom workflows with multiple AI agents working together.
                            </p>
                        </div>
                        <div className="hover:ring-2 hover:ring-blue-600 p-6 rounded-lg shadow-sm transition-all duration-150 cursor-pointer">
                            <Brain className="h-12 w-12  mb-4" />
                            <h3 className="text-xl font-semibold mb-2">Multiple Models</h3>
                            <p className="text-gray-600">
                                Choose from various AI models including Gemini, GPT-4, and more.
                            </p>
                        </div>
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
