'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { toast, ToastContainer } from 'react-toast';
import Image from 'next/image';
import { PencilLine, Trash2 } from 'lucide-react';
import DocumentEditor from './editor/page';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { DialogTitle } from '@radix-ui/react-dialog';
import Markdown from 'react-markdown';
import Link from 'next/link';


interface Document {
    id?: string;
    title: string;
    content: string;
    user_id?: string;
}

export default function Page() {
    const { user, isLoaded } = useUser(); // <- isLoaded is important
    const [loadedDocs, setLoadedDocs] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [editorTitle, setEditorTitle] = useState('');
    const [editorContent, setEditorContent] = useState('');

    const [editorOpen, setEditorOpen] = useState(false);

    const toggleEditor = (document: Document) => {
        setEditorOpen(!editorOpen);
        
        setEditorTitle(document.title);
        setEditorContent(document.content);
    }

    const loadDocumentsfromDb = async () => {
        if (!user) return; // prevent null crash

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', user.id);

        if (data) {
            setLoadedDocs(data);
        } else if (error) {
            console.error(error.message);
            toast.error("Failed to load documents.");
        }

        setLoadingDocs(false);
    };

    useEffect(() => {
        if (isLoaded && user) {
            loadDocumentsfromDb();
        }
    }, [isLoaded, user]);

    const deleteDoc = async (docId: string) => {
        const { error } = await supabase.from('documents').delete().eq('id', docId);

        if (error) {
            toast.error("Error: " + error.message);
        } else {
            setLoadedDocs((prev) => prev.filter((doc) => doc.id !== docId));
            toast.success("Deleted successfully!");
        }
    };

    if (!isLoaded || loadingDocs) {
        return (
            <div className="p-6">
                <p className="text-xl">Loading documents...</p>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-4 flex justify-between">
                <p className='text-3xl font-bold '>Documents</p> 

                <Link href={'/documents/editor'}>
                    <p className='flex gap-2 p-4 hover:bg-gray-200 cursor-pointer rounded-lg'><PencilLine /> Editor</p>
                </Link>
            </div>

            <ToastContainer position="bottom-right" />

            <div className="flex flex-wrap gap-3">
                {loadedDocs.length > 0 ? (
                    loadedDocs.map((doc) => (
                        
                            <div
                                key={doc.id}
                                className="p-4 border overflow-y-hidden border-gray-300 rounded-xl hover:border-black hover:ring-1 hover:ring-black cursor-pointer transition-all duration-150 w-[400px] h-[240px]"
                                
                            >
                                <div className="flex justify-between">
                                    <Trash2
                                        size={16}
                                        className="cursor-pointer text-red-600"
                                        onClick={() => deleteDoc(doc.id)}
                                    />
                                </div>
                                <hr className="my-2" />

                                <div className="mt-1" onClick={() => toggleEditor(doc)}>
                                    <p className="font-sm max-h-[100px] h-[100px] overflow-hidden text-gray-400">
                                        {doc.content}
                                    </p>
                                </div>

                                <hr className="my-2" />

                                <div className="mt-1">
                                    <p className="font-bold text-2xl overflow-hidden">{doc.title}</p>

                                    <div className="flex items-center gap-2 mt-2">
                                        <Image
                                            src={user?.imageUrl || "https://via.placeholder.com/30"}
                                            height={20}
                                            width={20}
                                            alt="Profile Pic"
                                            className="rounded-full"
                                        />
                                        <span className="text-gray-400 text-sm">{user?.firstName}</span>
                                    </div>
                                </div>
                            </div>

                        
                    ))
                ) : (
                    <p>No documents found. 🥲</p>
                )}

                <Dialog 
                    open={editorOpen} 
                    onOpenChange={setEditorOpen}
                >
                    <DialogTitle className="text-2xl font-bold p-4"></DialogTitle>
                    <DialogContent className="overflow-y-auto max-h-[500px] p-4">
                        <div className="prose max-w-none">
                            <Markdown>{editorContent}</Markdown>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
