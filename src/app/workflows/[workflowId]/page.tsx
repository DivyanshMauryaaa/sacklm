'use client'

import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const Page = () => {
    const params = useParams();
    const workflowId = Array.isArray(params.workflowId) ? params.workflowId[0] : params.workflowId;
    const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);

    const getCurrentWorkflow = async () => {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', workflowId)
            .single();

        if (error) {
            console.error('Error fetching workflow:', error);
        } else {
            setCurrentWorkflow(data);
        }
    };

    useEffect(() => {
        if (workflowId) {
            getCurrentWorkflow();
        }
    }, [workflowId]); // ✅ Dependency array so it doesn't run infinitely

    return (
        <div className='p-5'>
            {currentWorkflow ? (
                //Main    
                
            
                <p className='text-5xl font-bold text-gray-700'>{currentWorkflow.title}</p>
                


            ) : (
                <p>Loading workflow...</p>
            )}
        </div>
    );
};

export default Page;
