'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@clerk/nextjs';
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from '@/components/ui/textarea';
import { LoaderCircle, PlusIcon } from 'lucide-react';
import Link from 'next/link';

const page = () => {
    const [fetchLoading, setFetchLoading] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [workflows, setWorkflows] = useState<any>([]);

    //Dialog Conditions
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    //Add workflow form feilds
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const { user } = useUser();

    //Fetch
    useEffect(() => {
        if (user) {
            fetchWorkflows();
        }
    }, [user])

    const fetchWorkflows = async () => {
        setFetchLoading(true)

        const { data, error } = await supabase.from('workflows').select('*').eq('user_id', user?.id)
        if (!error) setWorkflows(data);
        if (error) alert(error.message);

        setFetchLoading(false);
    }

    const addWorkflow = async () => {
        setAddLoading(true);

        const { error } = await supabase.from('workflows').insert({
            title: title,
            description: description,
            user_id: user?.id
        })

        if (error) console.log(error.message);
        fetchWorkflows()

        setAddLoading(false);
    }
    return (
        <div className='p-5'>
            <p className='text-center font-[600] text-4xl'>Workflows</p>
            <br />

            <AddDialog
                isOpen={isAddDialogOpen}
                setIsOpen={setIsAddDialogOpen}
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                addWorkflow={addWorkflow}
                addLoading={addLoading}
            />

            <br /><br />

            <div className='flex flex-wrap gap-4'>
                {fetchLoading && <LoaderCircle />}
                {workflows.map((workflow: any) => (

                    <Link href={`/workflows/${workflow.id}`} key={workflow.id}>
                        <div className='border border-gray-300 p-4 rounded-xl min-w-[400px] cursor-pointer min-h-[100px] w-[400px] h-[150px] hover:bg-gray-100 transition-all duration-150'>
                            <p className='font-[600] text-3xl text-black'>{workflow.title}</p>

                            <p className='text-gray-400'>{workflow.description ? workflow.description : <p className='italic text-slate-300'>No Description available</p>}</p>
                        </div>
                    </Link>

                ))}
            </div>

        </div>
    )
}

const AddDialog = ({
    isOpen,
    setIsOpen,
    title,
    setTitle,
    description,
    setDescription,
    addWorkflow,
    addLoading,
}: any) => {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className='cursor-pointer'><PlusIcon /> New Workflow</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create a new Workflow</DialogTitle>
                    <DialogDescription>
                        Add a new workflow
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Title</Label>
                        <Input id="name" value={title} onChange={(e) => setTitle(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">Description</Label>
                        <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        type="submit"
                        className='cursor-pointer'
                        onClick={addWorkflow}
                        disabled={addLoading}
                    >
                        {addLoading ? "Adding..." : "Save changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default page;
