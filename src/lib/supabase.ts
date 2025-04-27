import { createClient } from '@supabase/supabase-js';

export type Chat = {
  id: string;
  user_id: string;
  title: string;
  content: any; // JSONB type
  media: any[]; // JSONB array
  files: any[]; // JSONB array
  created_at: string;
};

export type Model = {
  id: string;
  user_id: string;
  title: string;
  instructions: string;
  description?: string;
  created_at: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const chatService = {
  // Create a new chat
  async createChat(chat: Omit<Chat, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('chats')
      .insert([chat])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all chats for a user
  async getChats(userId: string) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get a single chat by ID
  async getChatById(id: string) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update a chat
  async updateChat(id: string, updates: Partial<Chat>) {
    const { data, error } = await supabase
      .from('chats')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete a chat
  async deleteChat(id: string) {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

export const modelService = {
  // Create a new model
  async createModel(model: Omit<Model, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('models')
      .insert([model])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all models for a user
  async getModels(userId: string) {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Get a single model by ID
  async getModelById(id: string) {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update a model
  async updateModel(id: string, updates: Partial<Model>) {
    const { data, error } = await supabase
      .from('models')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete a model
  async deleteModel(id: string) {
    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}; 