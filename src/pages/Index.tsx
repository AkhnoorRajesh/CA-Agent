import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import QueryInput from "@/components/QueryInput";
import ChatHistory from "@/components/ChatHistory";
import MessageList from "@/components/MessageList";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, FileText, Landmark, Sparkles } from "lucide-react";

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

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    } else if (user) {
      const chatId = searchParams.get("chat");
      if (chatId) {
        setCurrentConversationId(chatId);
        loadMessages(chatId);
        // Clear the param after loading to prevent re-loading on every refresh
        setSearchParams({}, { replace: true });
      }
    }
  }, [user, loading, navigate, searchParams, setSearchParams]);

  const loadMessages = async (conversationId: string) => {
    setIsLoadingMessages(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = data.map((msg) => {
        let parsedFiles = undefined;
        if (msg.files) {
          try {
            parsedFiles = typeof msg.files === 'string' ? JSON.parse(msg.files) : msg.files;
          } catch (e) {
            console.error('Error parsing files:', e);
          }
        }
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          files: parsedFiles
        };
      });

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

      <div className="ml-[72px] flex-1 flex z-10">
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{
            opacity: isChatHistoryOpen ? 1 : 0,
            width: isChatHistoryOpen ? 256 : 0 // 256px = 64 tailwind width
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="flex-shrink-0 overflow-hidden border-r border-white/5 bg-black/20 backdrop-blur-md"
        >
          <ChatHistory
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />
        </motion.div>

        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* subtle animated glow in the background of the chat area */}
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
          {isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center ">
              <div className="text-muted-foreground">Loading messages...</div>
            </div>
          ) : messages.length > 0 ? (
            <MessageList messages={messages} />
          ) : (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.15, delayChildren: 0.2 }
                }
              }}
              className="flex-1 flex items-center justify-center max-h-screen"
            >
              <div className="text-center space-y-8 max-w-2xl mx-auto p-10 rounded-[32px] glass-panel-heavy relative overflow-hidden shadow-2xl border border-white/10">
                {/* Decorative glow inside the empty state card */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-b from-primary/20 to-transparent pointer-events-none" />

                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.8, y: 20 },
                    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 200 } }
                  }}
                  className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-orange-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.3)] mb-6"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>

                <motion.h1
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
                  }}
                  className="text-5xl font-light tracking-tight text-white mb-4"
                >
                  Your <span className="text-gradient font-semibold drop-shadow-lg">CA Agent</span>
                </motion.h1>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                  className="text-white/70 text-lg max-w-md mx-auto leading-relaxed"
                >
                  Your intelligent assistant for professional accounting, taxation, and instant document analysis.
                </motion.p>

                <motion.div
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1 }
                  }}
                  className="flex flex-wrap items-center justify-center gap-4 pt-4"
                >
                  {[
                    { icon: Calculator, label: "Accounts" },
                    { icon: Landmark, label: "Taxation" },
                    { icon: FileText, label: "Documents" },
                  ].map((feature, idx) => (
                    <motion.div
                      key={idx}
                      variants={{
                        hidden: { opacity: 0, scale: 0.8 },
                        visible: { opacity: 1, scale: 1 }
                      }}
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 cursor-default transition-colors"
                    >
                      <feature.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-white/90">{feature.label}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
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
