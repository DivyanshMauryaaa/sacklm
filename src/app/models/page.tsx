'use client'

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Model, modelService } from '@/lib/supabase';
import { ModelDialog } from '@/components/ui/model-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Edit2, Box } from 'lucide-react';

export default function ModelsPage() {
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useUser();

    useEffect(() => {
        if (user?.id) {
            loadModels();
        }
    }, [user?.id]);

    const loadModels = async () => {
        try {
            const data = await modelService.getModels(user!.id);
            setModels(data);
        } catch (error) {
            console.error('Error loading models:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this model?')) return;

        try {
            await modelService.deleteModel(id);
            setModels(prev => prev.filter(model => model.id !== id));
        } catch (error) {
            console.error('Error deleting model:', error);
        }

        loadModels();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
                <div className="text-center">
                    <p className="text-lg">Loading models...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Your Models</h1>
                <ModelDialog />
            </div>

            {models.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-lg text-gray-500">No models yet. Create your first model!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {models.map((model) => (
                        <Card key={model.id}>
                            <CardHeader>
                                <div>
                                    <Box size={32} />
                                </div>
                                <br />
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{model.title}</CardTitle>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {/* TODO: Implement edit */ }}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(model.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="">
                                    {model.description && (
                                        <CardDescription>{model.description}</CardDescription>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}