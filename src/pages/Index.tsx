import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import QueryInput from "@/components/QueryInput";
import ChatHistory from "@/components/ChatHistory";
import MessageList from "@/components/MessageList";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: any[];
}

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = data.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        files: msg.files ? JSON.parse(msg.files as string) : undefined
      }));

      setMessages(loadedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    loadMessages(id);
  };

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleConversationCreated = (id: string, title: string) => {
    setCurrentConversationId(id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-h-screen  flex">
      <Sidebar onToggleChatHistory={() => setIsChatHistoryOpen(!isChatHistoryOpen)} />
      
      <div className="ml-16 flex-1 flex">
        <div 
          className={`transition-all duration-300 flex-shrink-0 ${
            isChatHistoryOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}
        >
          <ChatHistory
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />
        </div>
        
        <div className="flex-1 flex flex-col">
          {isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center ">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length > 0 ? (
            <MessageList messages={messages} />
          ) : (
            <div className="flex-1 flex items-center justify-center max-h-screen">
              <div className="text-center text-muted-foreground space-y-4">
                <h1 className="text-5xl font-light tracking-tight text-foreground">
                  Your CA Agent
                </h1>
                <p>Ask anything related to Accounts</p>
              </div>
            </div>
          )}
          
          <div className="p-4  z-50 bg-transparent">
            <QueryInput
              conversationId={currentConversationId}
              messages={messages}
              onMessagesUpdate={setMessages}
              onConversationCreated={handleConversationCreated}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
