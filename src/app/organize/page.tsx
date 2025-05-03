import { Folder } from "lucide-react";

const page = () => {
    return (
        <div>
            <div className="h-[calc(100vh-4rem)] flex flex-col items-center justify-center">
                <p className="font-bold text-black text-4xl flex gap-3"><Folder size={30}/>Organize</p>
              <p className="text-3xl font-bold bg-gradient-to-r text-transparent bg-clip-text from-blue-600 to-purple-600">Coming soon!...</p>
              <div className=""></div>
            </div>
        </div>
    )
}

export default page;