import { useEffect, useState } from "react";
import { MessageSquare, Plus, MoreVertical, Share, Edit2, Archive, Pin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  created_at: string;
  user_id: string;
  is_pinned: boolean;
  is_archived: boolean;
}

interface ChatHistoryProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
}

const ChatHistory = ({ currentConversationId, onSelectConversation, onNewChat }: ChatHistoryProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isArchivedView, setIsArchivedView] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setIsLoading(true);
      // Try to load with all columns first
      let { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      // If it fails (likely due to missing columns), fall back to basic select
      if (error) {
        console.warn('Full query failed, falling back to basic select:', error);
        const fallback = await supabase
          .from('conversations')
          .select('id, title, updated_at, created_at, user_id')
          .order('updated_at', { ascending: false });

        if (fallback.error) throw fallback.error;

        // Map fallback data to include default values for missing columns
        const mappedData: Conversation[] = (fallback.data || []).map(conv => ({
          id: conv.id,
          title: conv.title,
          updated_at: conv.updated_at,
          created_at: conv.created_at,
          user_id: conv.user_id,
          is_pinned: false,
          is_archived: false
        }));
        data = mappedData as any; // Cast back to match inferred 'data' type if necessary, or just use mappedData directly if the outer scope allows.
      }

      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (e: React.MouseEvent | React.KeyboardEvent, action: string, conv: Conversation) => {
    e.stopPropagation();

    switch (action) {
      case 'share':
        const shareUrl = `${window.location.origin}/?chat=${conv.id}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Chat link copied to clipboard!');
        break;
      case 'rename':
        setIsEditingId(conv.id);
        setEditTitle(conv.title);
        break;
      case 'archive':
        const { error: archiveError } = await supabase
          .from('conversations')
          .update({ is_archived: !conv.is_archived })
          .eq('id', conv.id);

        if (archiveError) {
          toast.error('Failed to archive chat');
        } else {
          toast.success(conv.is_archived ? 'Chat restored' : 'Chat archived');
          loadConversations();
        }
        break;
      case 'pin':
        const { error: pinError } = await supabase
          .from('conversations')
          .update({ is_pinned: !conv.is_pinned })
          .eq('id', conv.id);

        if (pinError) {
          toast.error('Failed to pin chat');
        } else {
          toast.success(conv.is_pinned ? 'Chat unpinned' : 'Chat pinned to top');
          loadConversations();
        }
        break;
      case 'delete':
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', conv.id);

        if (deleteError) {
          toast.error('Failed to delete chat');
        } else {
          toast.success('Chat deleted');
          if (currentConversationId === conv.id) {
            onNewChat();
          }
          loadConversations();
        }
        break;
    }
  };

  const submitRename = async (convId: string) => {
    if (!editTitle.trim()) return;

    const { error } = await supabase
      .from('conversations')
      .update({ title: editTitle.trim(), updated_at: new Date().toISOString() })
      .eq('id', convId);

    if (error) {
      toast.error('Failed to rename chat');
    } else {
      toast.success('Chat renamed');
      setIsEditingId(null);
      loadConversations();
    }
  };

  const filteredConversations = conversations.filter(c => c.is_archived === isArchivedView);

  return (
    <div className="h-full flex flex-col bg-black/30 backdrop-blur-xl border-none">
      <div className="p-4 border-b border-white/5 space-y-3">
        <Button
          onClick={onNewChat}
          className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/10 shadow-lg justify-start px-4 h-11 rounded-xl transition-all duration-300 group"
        >
          <Plus className="h-4 w-4 mr-3 text-white/70 group-hover:text-white group-hover:rotate-90 transition-all duration-300" />
          <span className="font-medium tracking-wide">New Chat</span>
        </Button>
        <div className="flex bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setIsArchivedView(false)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${!isArchivedView ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white/60'}`}
          >
            Chats
          </button>
          <button
            onClick={() => setIsArchivedView(true)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${isArchivedView ? 'bg-primary/20 text-primary' : 'text-white/40 hover:text-white/60'}`}
          >
            Archived
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1 px-1">
        <div className="p-2 pr-4 space-y-1">
          {isLoading ? (
            <div className="text-muted-foreground text-sm text-center py-4">
              Loading...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-muted-foreground text-sm text-center py-4">
              {isArchivedView ? "No archived chats" : "No conversations yet"}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => isEditingId !== conv.id && onSelectConversation(conv.id)}
                className={`w-full text-left pl-3 pr-10 py-3 rounded-xl transition-all duration-300 mb-1 group/item relative cursor-pointer flex items-center ${currentConversationId === conv.id
                  ? 'bg-primary/15 text-white shadow-[0_0_15px_rgba(251,191,36,0.1)] border border-primary/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
              >
                <div className="flex items-start gap-3 w-full min-w-0">
                  <div className="relative">
                    <MessageSquare className={`h-4 w-4 mt-0.5 flex-shrink-0 transition-colors ${currentConversationId === conv.id ? 'text-primary' : 'text-white/40'}`} />
                    {conv.is_pinned && (
                      <div className="absolute -top-1 -right-1">
                        <Pin className="h-2 w-2 text-primary fill-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isEditingId === conv.id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => submitRename(conv.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename(conv.id);
                          if (e.key === 'Escape') setIsEditingId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full bg-white/10 border border-primary/30 rounded px-1.5 py-0.5 text-sm outline-none text-white focus:border-primary"
                        maxLength={20}
                      />
                    ) : (
                      <>
                        <div className="text-sm font-medium truncate tracking-wide pr-2">
                          {conv.title.length > 20 ? `${conv.title.substring(0, 20)}...` : conv.title}
                        </div>
                        <div className="text-[11px] text-white/40 mt-1">
                          {new Date(conv.updated_at).toLocaleDateString()}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Options Menu */}
                <div
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity z-20"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10 rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-black/99 backdrop-blur-xl border-white/10 text-white rounded-xl shadow-2xl p-2 z-50">
                      <DropdownMenuItem onClick={(e) => handleAction(e, 'share', conv)} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-lg focus:bg-white/10 focus:text-white transition-colors">
                        <Share className="h-4 w-4" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleAction(e, 'rename', conv)} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-lg focus:bg-white/10 focus:text-white transition-colors">
                        <Edit2 className="h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleAction(e, 'delete', conv)} className="flex items-center gap-2 cursor-pointer text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg focus:bg-red-500/20 focus:text-red-300 transition-colors">
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleAction(e, 'pin', conv)} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-lg focus:bg-white/10 focus:text-white transition-colors">
                        <Pin className={`h-4 w-4 ${conv.is_pinned ? 'fill-primary text-primary' : ''}`} /> {conv.is_pinned ? 'Unpin' : 'Pin'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => handleAction(e, 'archive', conv)} className="flex items-center gap-2 cursor-pointer hover:bg-white/10 rounded-lg focus:bg-white/10 focus:text-white transition-colors">
                        <Archive className="h-4 w-4" /> {conv.is_archived ? 'Restore' : 'Archive'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatHistory;
