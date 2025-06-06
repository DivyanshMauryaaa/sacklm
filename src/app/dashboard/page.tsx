'use client';

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Box, Clock, FileIcon, Folder, ImagesIcon, LucideInspectionPanel, MessageCircleMore, Paperclip, WandIcon, Workflow } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [time, setTime] = useState('');
  const [recents, setRecents] = useState<any>([]);
  const [recentChats, setRecentChats] = useState<any>([]);

  const { user } = useUser();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      const formattedHours = hours % 12 || 12;
      const period = hours >= 12 ? 'PM' : 'AM';
      setTime(`${formattedHours}:${minutes.toString().padStart(2, '0')} ${period}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  const fetchRecents = async () => {
    const { data, error } = await supabase.from('documents').select('*').eq('user_id', user?.id).limit(3);

    if (!error) setRecents(data);
  }

  const fetchRecentChats = async () => {
    const { data, error } = await supabase.from('chats').select('*').eq('user_id', user?.id).limit(3);

    if (!error) setRecentChats(data);
  }

  useEffect(() => {
    if (user) {
      fetchRecents();
      fetchRecentChats();
    }
  }, [user]);

  return (
    <div>
      <div className="w-full p-6 rounded-xl border-b border-gray-300">
        <Image
          width={60}
          height={60}
          src={user?.imageUrl || "https://picsum.photos/"}
          alt={user?.id || "Profile Pic not available"}
          className="rounded-full cursor-pointer"
        />
        <p className="text-[70px] font-[600] text-gray-700">
          Nice to see you again <span className="
          bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 font-bold
        ">{user?.firstName || "Loading..."}</span></p>
        <p className="text-[30px] font-bold text-gray-700 flex gap-1"><Clock size={32} /> {time}</p>
        <br />
        <br />

        <div className="flex gap-4 flex-wrap">

          <Link href={"/chats"}>
            <div className="w-[170px] p-3 border border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-blue-700 hover:text-white hover:to-indigo-700 cursor-pointer">
              <MessageCircleMore size={32} className="mt-3" />

              <div className="h-[70px]"></div>

              <p className="font-bold text-2xl mb-3">Chats</p>
            </div>
          </Link>


          <Link href={"/documents"}>
            <div className="w-[170px] p-3 border border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-blue-700 hover:text-white hover:to-indigo-700 cursor-pointer">
              <FileIcon size={32} className="mt-3" />

              <div className="h-[70px]"></div>

              <p className="font-bold text-2xl mb-3">Documents</p>
            </div>
          </Link>


          <Link href={"/models"}>
            <div className="w-[170px] p-3 border border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-blue-700 hover:text-white hover:to-indigo-700 cursor-pointer">
              <Box size={32} className="mt-3" />

              <div className="h-[70px]"></div>

              <p className="font-bold text-2xl mb-3">Models</p>
            </div>
          </Link>

          <Link href={"/workflows"}>
            <div className="w-[170px] p-3 border border-gray-300 rounded-lg hover:bg-gradient-to-r hover:from-blue-700 hover:text-white hover:to-indigo-700 cursor-pointer">
              <Workflow size={32} className="mt-3" />

              <div className="h-[70px]"></div>

              <p className="font-bold text-2xl mb-3">Workflows</p>
            </div>
          </Link>

        </div>

        <br />

      </div>

      <br />

      <div>
        {recents.length === "0" ? recentChats.length === "0" ? "" : <p className="font-bold text-2xl">Recents</p> : ""}
        <br />

        <div className="flex gap-3 flex-wrap">

          {recents.map((data: any) => (
            <div className="border p-4 border-gray-300 min-w-[300px] rounded-xl transition-all duration-200 cursor-pointer hover:bg-gray-100 max-w-[330px] min-h-[100px] max-h-[160px] " key={data.id}>
              <FileIcon size={24} />
              <Link href={'/documents'}><p className="hover:underline font-bold text-2xl mt-2 ">{data.title}</p></Link>
            </div>
          ))}

        </div>

        <br />

        <div className="flex gap-3 flex-wrap">
          {recentChats.map((data: any) => (
            <div key={data.id} className="border p-4 border-gray-300 min-w-[300px] rounded-xl transition-all duration-200 cursor-pointer hover:bg-gray-100 max-w-[330px] min-h-[100px] max-h-[160px] ">
              <MessageCircleMore size={24} />
              <Link href={'/chats'}><p className="font-bold text-2xl hover:underline mt-2 ">{data.title}</p></Link>
            </div>
          ))}
        </div>
      </div>


      <br />
      <br />
      <br />
      <br />
      <br />
      <br />

    </div>
  );
}
