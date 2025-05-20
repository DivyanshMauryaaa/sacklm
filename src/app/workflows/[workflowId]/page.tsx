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
import { BoxIcon, Edit, ImageIcon, LoaderCircle, Play, PlayIcon, PlusIcon, SaveIcon, Sparkles, Trash2Icon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Markdown from 'react-markdown';
import { toast, ToastContainer } from 'react-toast';

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

        // Clear existing responses for this workflow
        await supabase.from('responses').delete().eq('workflow_id', workflowId);
        fetchResponses();

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
                prompt: prompt || " ",
                chatContext: [],
                context: ' (this is the initial prompt, if it"s empty, so.... just do what the instructions say, no context unless you get one for this one)', // Initial agent has no previous context
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
        console.log("Initial response:", content)

        // Insert the initial response with the correct agent ID and index
        const { data: initialResponseData, error: initialResponseError } = await supabase.from('responses').insert({
            user_id: user?.id,
            content: content,
            workflow_id: workflowId,
            agent_id: sortedAgents[0].id, // Use the agent's ID
            index: sortedAgents[0].index // Use the agent's index
        }).select();

        if (initialResponseError) {
            console.error("Error inserting initial response:", initialResponseError);
            setRunLoading(false);
            return;
        }

        fetchResponses(); // Fetch responses to show the first one

        // Run the rest of the agents
        let agent_index = 1;

        for (agent_index = 1; agent_index < sortedAgents.length; ++agent_index) {
            let current_agent = sortedAgents[agent_index];
            console.log("Current agent at: ", current_agent + " " + current_agent.index);

            // Get all responses up to this point, sorted by index
            const { data: responses, error: responsesError } = await supabase
                .from('responses')
                .select('*')
                .eq('workflow_id', workflowId)
                .order('index', { ascending: true });

            if (responsesError) {
                console.error("Error fetching responses:", responsesError);
                continue;
            }

            // Determine the context based on the agent's context setting
            let context_content = '';
            // Get the most recent response
            const lastResponse = responses[responses.length - 1];
        
            if (current_agent.context === "response") {
                context_content = lastResponse.content || '';
            } else if (current_agent.context === "prompt") {
                context_content = prompt;
            } else if (current_agent.context === "initial response") {
                context_content = initial_response_content;
            }


            // Get the AI response for the current agent
            const get_response = await fetch('/api/generate', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: current_agent.model,
                    prompt: prompt || " ",
                    chatContext: [],
                    context: context_content,
                    file: null,
                    instructions: current_agent.instructions
                }),
            });

            // Parse the response
            const response_json = await get_response.json();
            let response_content = "No response received.";

            if (current_agent.model.includes("gpt")) {
                response_content = response_json?.response?.choices?.[0]?.message?.content || response_content;
            } else if (current_agent.model.includes("gemini")) {
                response_content = response_json?.response?.candidates?.[0]?.content?.parts?.[0]?.text || response_content;
            }

            // Insert the response
            const { error: responseError } = await supabase.from('responses').insert({
                user_id: user?.id,
                content: response_content,
                workflow_id: workflowId,
                agent_id: current_agent.id,
                index: current_agent.index
            });

            if (responseError) {
                console.error("Error inserting response:", responseError);
            }

            // Fetch updated responses
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
            <ToastContainer></ToastContainer>
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
                            {runLoading ? "Running..." : "Run"}
                        </Button>
                    </div>

                    <br /><br />
                    <div className='flex gap-4 flex-wrap'>
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

                    <br />

                    <p className='text-center font-bold text-3xl'>Response will appear here...</p>

                    <br />
                    <div className='flex gap-3 flex-wrap'>
                        {agentResponses.map((res: any) => (
                            <div key={res.id} className='w-[600px] p-5 rounded-xl border cursor-pointer border-gray-300 h-[400px] overflow-scroll relative'>
                                <div className='border-b border-gray-300 flex gap-2 p-4'>
                                    <Trash2Icon
                                        color='red'
                                        size={20}
                                        className='cursor-pointer hover:scale-110 transition-transform'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteResponse(res.id);
                                        }}
                                    />
                                    <SaveIcon 
                                        color='blue'
                                        size={20}
                                        className='cursor-pointer hover:scale-110 transition-transform'
                                        onClick={async () => {
                                            
                                            await supabase.from('documents').insert({
                                                title: "Untitled",
                                                content: res.content,
                                                user_id: user?.id,  
                                            })

                                            toast.success('Document saved as "Untitled" ')
                                          
                                        }}
                                    />
                                </div>
                                <br />
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
