// app/api/upload-image/route.tsx
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const fileName = `${Date.now()}-${file.name}`;
        const { data, error } = await supabase.storage
            .from('images')
            .upload(fileName, file);

        if (error) {
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('images')
            .getPublicUrl(fileName);

        return NextResponse.json({ url: publicUrl });
    } catch (error) {
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}