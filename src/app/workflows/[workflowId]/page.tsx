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
import { BoxIcon, Edit, ImageIcon, LoaderCircle, Play, PlayIcon, PlusIcon, Sparkles, Trash2Icon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Markdown from 'react-markdown';

const Page = () => {
    const params = useParams();
    const workflowId = Array.isArray(params.workflowId) ? params.workflowId[0] : params.workflowId;
    const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
    const [agents, setAgents] = useState<any>([]);

    // Agent States
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [Instructions, setInstructions] = useState('');
    const [Model, setModel] = useState('gemini-2.0-flash');
    const [AddLoading, setLoading] = useState(false);
    const [context, setContext] = useState('response');

    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingAgent, setEditingAgent] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editInstructions, setEditInstructions] = useState('');
    const [editModel, setEditModel] = useState('gemini-2.0-flash');
    const [editContext, setEditContext] = useState('response');
    const [editLoading, setEditLoading] = useState(false);
    const [prompt, setPrompt] = useState('');

    const [agentResponses, setAgentResponses] = useState<any>([]);
    const [runLoading, setRunLoading] = useState(false)

    const { user } = useUser();

    const deleteResponse = async (id: string) => {
        const { error } = await supabase
            .from('responses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting response:", error.message);
        } else {
            console.log("Response successfully deleted");
            fetchResponses(); // Refresh the responses list
        }
    };

    const fetchResponses = async () => {
        const { data: responses, error } = await supabase.from('responses').select("*").eq('workflow_id', workflowId);
        if (responses) {
            setAgentResponses(responses.sort((a: any, b: any) => a.index - b.index));
        }
    }

    useEffect(() => {
        fetchResponses();
    }, [workflowId]);

    const runWorkflow = async (prompt: string) => {
        setRunLoading(true)

        await supabase.from('responses').delete().eq('workflow_id', workflowId);
        fetchResponses();

        const { data } = await supabase.from('run_sessions').insert({
            user_id: user?.id,
            workflow_id: workflowId,
        });

        console.log("Session: ", data)

        // Ensure agents are sorted by index before running
        const sortedAgents = [...agents].sort((a, b) => a.index - b.index);

        // Get the AI response from the API for the first agent (index 0 in the sorted array)
        const get_initial_response = await fetch('/api/generate', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: sortedAgents[0].model,
                prompt: prompt,
                chatContext: [],
                context: '', // Initial agent has no previous context
                file: null,
                instructions: sortedAgents[0].instructions
            }),
        });

        // Parse the initial response
        const initial_json = await get_initial_response.json();
        let content = "No response received.";

        if (sortedAgents[0].model.includes("gpt")) { // Check for gpt models
            content = initial_json?.response?.choices?.[0]?.message?.content || content;
        } else if (sortedAgents[0].model.includes("gemini")) { // Check for gemini models
            content = initial_json?.response?.candidates?.[0]?.content?.parts?.[0]?.text || content;
        }

        const initial_response_content = content; // Store content for 'initial response' context type
        console.log(content)

        // Insert the initial response with the correct agent ID and index
        await supabase.from('responses').insert({
            user_id: user?.id,
            content: content,
            workflow_id: workflowId,
            agent_id: sortedAgents[0].id, // Use the agent's ID
            index: sortedAgents[0].index // Use the agent's index
        });

        fetchResponses(); // Fetch responses to show the first one

        // Run the rest of the agents
        for (let i = 1; i < sortedAgents.length; ++i) {
            console.log("Current Agent Index in Array: ", i);
            console.log("Current Agent Workflow Index: ", sortedAgents[i].index);

            let context_content: string | null = null;

            if (!sortedAgents[i]?.model || !sortedAgents[i]?.instructions) {
                console.warn(`Agent ${i} is missing required properties`);
                continue;
            }

            if (sortedAgents[i].context === "response") {
                // Fetch the response from the previous agent using its agent_id
                 const { data: contextData, error } = await supabase
                    .from('responses')
                    .select("content") // Only fetch the content
                    .eq('agent_id', sortedAgents[i - 1].id) // Use the previous agent's ID
                    .eq('workflow_id', workflowId)
                    .single();


                if (error) {
                    console.error("Error fetching context for agent", sortedAgents[i].index, ":", error);
                    // Depending on requirements, you might want to stop or use null context
                     context_content = null;
                } else {
                    context_content = contextData?.content || null;
                }

            } else if (sortedAgents[i].context === "prompt") {
                context_content = prompt;
            } else if (sortedAgents[i].context === "initial response") {
                context_content = initial_response_content;
            }

            // Ensure there is context content to send to the API, or handle null context if appropriate
             if (context_content === null) {
                 console.warn(`No context available for agent ${sortedAgents[i].index} with context type ${sortedAgents[i].context}. Proceeding without context.`);
                 // If context is critical, you might want to break or return here.
             }


            const response = await fetch('/api/generate', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: sortedAgents[i].model,
                    prompt: prompt, // Still include the original prompt
                    chatContext: [], // Assuming chatContext is not used for subsequent agents in this workflow
                    context: context_content, // Pass the fetched or determined context
                    file: null,
                    instructions: sortedAgents[i].instructions
                }),
            });

            const responseJson = await response.json();
            let newContent = "No response.";

             if (sortedAgents[i].model.includes("gpt")) { // Check for gpt models
                newContent = responseJson?.response?.choices?.[0]?.message?.content || newContent;
            } else if (sortedAgents[i].model.includes("gemini")) { // Check for gemini models
                newContent = responseJson?.response?.candidates?.[0]?.content?.parts?.[0]?.text || newContent;
            }


            await supabase.from('responses').insert({
                user_id: user?.id,
                workflow_id: workflowId,
                agent_id: sortedAgents[i].id, // Use the current agent's ID
                content: newContent,
                index: sortedAgents[i].index // Use the current agent's index
            });

            fetchResponses();
        }

        setRunLoading(false)
    }

    const addAgent = async () => {
        setLoading(true);

        const { error } = await supabase.from('workflow_agents').insert({
            title: name,
            description: description,
            instructions: Instructions,
            model: Model,
            context: context,
            workflow_id: workflowId,
            user_id: user?.id,
            index: agents.length + 1 // This might lead to non-sequential indices if agents are deleted
        });

        if (error) {
            console.error("Error adding agent:", error.message);
        } else {
            console.log("Agent successfully added.");
            setAddDialogOpen(false);
            setName('');
            setDescription('');
            setInstructions('');
            setModel('gemini-2.0-flash');
            setContext('response');
            fetchAgents(); // Refresh agent list
        }

        setLoading(false); // Moved setLoading outside the if/else block
    }

    const fetchAgents = async () => {
        const { data, error } = await supabase
            .from('workflow_agents')
            .select('*')
            .eq('workflow_id', workflowId)
            .order('index', { ascending: true }); // Order agents by index

        if (!error) {
            setAgents(data);
        } else {
            console.error("Error fetching agents:", error.message);
        }
    }

    const EditAgent = async (id: string, title: string, description: string, instructions: string, model: string, context: string) => {
        const { error } = await supabase.from('workflow_agents').update(
            {
                title: title,
                description: description,
                instructions: instructions,
                model: model,
                context: context
            }
        ).eq('id', id);

        if (!error) console.log("Object Edit successfully!");
        if (error) console.error(error.message + " " + error.name + " " + error.cause + " " + error.code);
    }

    const getCurrentWorkflow = async () => {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();

        if (error) {
            console.error('Error fetching workflow:', error.message);
        } else {
            setCurrentWorkflow(data);
        }
    };

    useEffect(() => {
        if (workflowId && user) {
            getCurrentWorkflow();
            fetchAgents(); // Fetch agents when workflowId or user changes
        }
    }, [workflowId, user]);

    const deleteAgent = async (id: string) => {
        await supabase.from('workflow_agents').delete().eq('id', id);
        fetchAgents(); // Refresh agents after deletion
    }

    const handleEditClick = (agent: any) => {
        setEditingAgent(agent);
        setEditName(agent.title);
        setEditDescription(agent.description);
        setEditInstructions(agent.instructions);
        setEditModel(agent.model);
        setEditContext(agent.context || 'response');
        setEditDialogOpen(true);
    };

    const handleEditSubmit = async () => {
        setEditLoading(true);
        if (editingAgent) {
            await EditAgent(
                editingAgent.id,
                editName,
                editDescription,
                editInstructions,
                editModel,
                editContext
            );
            fetchAgents();
            setEditDialogOpen(false);
        }
        setEditLoading(false);
    };

    return (
        <div className='p-5'>
            {currentWorkflow ? (
                <div>
                    <p className='text-5xl font-bold text-gray-700'>{currentWorkflow.title}</p>
                    <br />

                    <div className='flex justify-between'>
                        <AddNewAgent
                            isOpen={addDialogOpen}
                            setIsOpen={setAddDialogOpen}
                            name={name}
                            setName={setName}
                            description={description}
                            setDescription={setDescription}
                            Instructions={Instructions}
                            setInstructions={setInstructions}
                            Model={Model}
                            setModel={setModel}
                            context={context}
                            setContext={setContext}
                            Loading={AddLoading}
                            addAgent={addAgent}
                            index={agents.length + 1} // This index is for adding a new agent, not fetching context
                        />

                        <Button className='flex cursor-pointer gap-3 disabled:bg-gray-700 disabled:text-white' disabled={runLoading} onClick={() => runWorkflow(prompt)}>
                            <PlayIcon />
                            Run
                        </Button>
                    </div>

                    <br /><br />
                    <div className='flex gap-4'>
                        {agents.map((agent: any) => (
                            <div className='border border-gray-300 rounded-xl p-4 w-[250px] h-[150px]' key={agent.id}>
                                <div className='flex gap-2'>
                                    <Edit
                                        size={16}
                                        className='cursor-pointer text-blue-600'
                                        onClick={() => handleEditClick(agent)}
                                    />
                                    <Trash2Icon
                                        color='red'
                                        size={16}
                                        className='cursor-pointer'
                                        onClick={() => deleteAgent(agent.id)}
                                    />
                                </div>

                                <p className='text-2xl font-bold mt-1'>
                                    {agent.title}
                                </p>
                                <p className='text-sm text-gray-400'>
                                    {agent.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    <EditDialog
                        isOpen={editDialogOpen}
                        setIsOpen={setEditDialogOpen}
                        name={editName}
                        setName={setEditName}
                        description={editDescription}
                        setDescription={setEditDescription}
                        Instructions={editInstructions}
                        setInstructions={setEditInstructions}
                        Model={editModel}
                        setModel={setEditModel}
                        context={editContext}
                        setContext={setEditContext}
                        Loading={editLoading}
                        onSubmit={handleEditSubmit}
                        index={editingAgent?.index}
                    />

                    <br /><br />

                    <Textarea
                        placeholder="Enter your prompt here..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full min-h-[100px] mt-4"
                    />

                    <p className='text-center font-bold text-3xl'>Previous Responses</p>
                    <div className='flex gap-3'>
                        {agentResponses.map((res: any) => (
                            <div key={res.id} className='w-[600px] p-4 border cursor-pointer border-gray-300 h-[400px] overflow-scroll relative'>
                                <div className='absolute top-2 right-2'>
                                    <Trash2Icon
                                        color='red'
                                        size={16}
                                        className='cursor-pointer hover:scale-110 transition-transform'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteResponse(res.id);
                                        }}
                                    />
                                </div>
                                <Markdown>{res.content}</Markdown>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <p>Loading workflow...</p>
            )}
        </div>
    );
};

const AddNewAgent = ({
    isOpen,
    setIsOpen,
    name,
    setName,
    description,
    setDescription,
    Instructions,
    setInstructions,
    Model,
    setModel,
    context,
    setContext,
    Loading,
    addAgent,
    index,
}: any) => {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className='cursor-pointer'><PlusIcon /> Agent</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create a new Agent</DialogTitle>
                    <DialogDescription>
                        Add a new Agent
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" placeholder='Agent Name' value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">Description</Label>
                        <Textarea id="desc" placeholder='Agent Description' value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="instr" className="text-right">Instructions</Label>
                        <Textarea id="instr" placeholder='Instructions' value={Instructions} onChange={(e) => setInstructions(e.target.value)} className="col-span-3" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Model</Label>
                        <Select onValueChange={(value) => setModel(value)} value={Model}>
                            <SelectTrigger className="w-[130px] flex">
                                <Sparkles /><SelectValue placeholder="Model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gemini-2.0-flash" key={"Gemini 2.0 Flash"}>Gemini 2.0 Flash</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {index !== 1 && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Context</Label>
                            <Select onValueChange={(value) => setContext(value)} value={context}>
                                <SelectTrigger className="w-[130px] flex">
                                    <BoxIcon /><SelectValue placeholder="Context" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='response'>Response</SelectItem>
                                    <SelectItem value='prompt'>Prompt</SelectItem>
                                    <SelectItem value='initial response'>Initial Response</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        type="submit"
                        className='cursor-pointer'
                        onClick={addAgent}
                        disabled={Loading}
                    >
                        {Loading ? "Adding..." : "Save changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const EditDialog = ({
    isOpen,
    setIsOpen,
    name,
    setName,
    description,
    setDescription,
    Instructions,
    setInstructions,
    Model,
    setModel,
    context,
    setContext,
    Loading,
    onSubmit,
    index,
}: any) => {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Agent</DialogTitle>
                    <DialogDescription>
                        Modify agent details
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Name</Label>
                        <Input id="name" placeholder='Agent Name' value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="desc" className="text-right">Description</Label>
                        <Textarea id="desc" placeholder='Agent Description' value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="instr" className="text-right">Instructions</Label>
                        <Textarea id="instr" placeholder='Instructions' value={Instructions} onChange={(e) => setInstructions(e.target.value)} className="col-span-3" />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Model</Label>
                        <Select onValueChange={(value) => setModel(value)} value={Model}>
                            <SelectTrigger className="w-[130px] flex">
                                <Sparkles /><SelectValue placeholder="Model" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="gemini-2.0-flash" key={"Gemini 2.0 Flash"}>Gemini 2.0 Flash</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {index !== 1 && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Context</Label>
                            <Select onValueChange={(value) => setContext(value)} value={context}>
                                <SelectTrigger className="w-[130px] flex">
                                    <BoxIcon /><SelectValue placeholder="Context" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value='response'>Response</SelectItem>
                                    <SelectItem value='prompt'>Prompt</SelectItem>
                                    <SelectItem value='initial response'>Initial Response</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button
                        type="submit"
                        className='cursor-pointer'
                        onClick={onSubmit}
                        disabled={Loading}
                    >
                        {Loading ? "Saving..." : "Save changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default Page;
