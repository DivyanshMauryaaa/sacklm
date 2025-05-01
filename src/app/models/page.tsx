'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Model, modelService } from '@/lib/supabase';
import { ModelDialog } from '@/components/ui/model-dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Trash2, Edit2, Box } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  // Edit model dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editInstructions, setEditInstructions] = useState('');

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
  };

  const openEditDialog = (model: Model) => {
    setEditId(model.id);
    setEditTitle(model.title || '');
    setEditDescription(model.description || '');
    setEditInstructions(model.instructions || '');
    setEditDialogOpen(true);
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await modelService.updateModel(editId, {
        title: editTitle,
        description: editDescription,
        instructions: editInstructions
      });

      setModels(prev =>
        prev.map(m =>
          m.id === editId
            ? {
                ...m,
                title: editTitle,
                description: editDescription,
                instructions: editInstructions
              }
            : m
        )
      );

      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Models</h1>
        <ModelDialog />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <p className="text-lg">Loading models...</p>
        </div>
      ) : models.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">
            No models yet. Create your first model!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map(model => (
            <Card
              key={model.id}
              className="hover:shadow-xl hover:rounded-xl transition-all duration-200 hover:mb-2 cursor-pointer"
            >
              <CardHeader>
                <Box size={32} />
                <br />
                <div className="flex justify-between items-start">
                  <CardTitle>{model.title}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(model)}
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
                {model.description && (
                  <CardDescription>{model.description}</CardDescription>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* EDIT DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Model</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdateModel}>
            <div>
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="title"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                placeholder="Enter model title"
              />
            </div>
            <div>
              <label htmlFor="instructions" className="text-sm font-medium">
                Instructions
              </label>
              <Textarea
                id="instructions"
                value={editInstructions}
                onChange={e => setEditInstructions(e.target.value)}
                placeholder="Enter model instructions"
                className="min-h-[100px]"
              />
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                placeholder="Enter model description"
                className="min-h-[80px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
