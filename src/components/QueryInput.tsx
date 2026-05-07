import { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: any[];
}

interface QueryInputProps {
  conversationId: string | null;
  messages: Message[];
  onMessagesUpdate: (messages: Message[]) => void;
  onConversationCreated: (id: string, title: string) => void;
}

const QueryInput = ({ conversationId, messages, onMessagesUpdate, onConversationCreated }: QueryInputProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} file(s) selected`);
    }
    // Reset input to allow selecting same file again
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createOrGetConversation = async (): Promise<string> => {
    if (conversationId) return conversationId;

    // Create new conversation
    const title = query.slice(0, 50) + (query.length > 50 ? '...' : '');
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user?.id,
        title
      })
      .select()
      .single();

    if (error) throw error;
    onConversationCreated(data.id, data.title);
    return data.id;
  };

  const saveMessage = async (convId: string, role: 'user' | 'assistant', content: string, files?: any[]) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        role,
        content,
        files: files ? JSON.stringify(files) : null
      });

    if (error) throw error;
  };

  const processFilesSequentially = async (files: File[]): Promise<any[]> => {
    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      toast.info(`Processing file ${i + 1} of ${files.length}: ${file.name}`);

      try {
        const formData = new FormData();
        formData.append('query', query);
        formData.append('timestamp', new Date().toISOString());
        formData.append('inputType', 'file');
        formData.append('file_0', file);
        formData.append('fileCount', '1');

        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
        const result = await fetch(webhookUrl, {
          method: "POST",
          body: formData,
        });

        if (!result.ok) {
          throw new Error(`Server returned ${result.status}: ${result.statusText}`);
        }

        const text = await result.text();
        if (!text || text.trim() === '') {
          throw new Error("Server returned empty response");
        }

        const data = JSON.parse(text);
        results.push({ file: file.name, response: data });

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        results.push({ file: file.name, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    return results;
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setQuery(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast.error('Speech recognition error. Please try again.');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in your browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      toast.success('Listening...');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) {
      toast.error("Please enter a query");
      return;
    }

    if (!user) {
      toast.error("Please sign in to chat");
      return;
    }

    setIsLoading(true);

    try {
      // Get or create conversation
      const convId = await createOrGetConversation();

      // Save user message
      const userMessage: Message = {
        role: 'user',
        content: query,
        files: selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
      };

      await saveMessage(convId, 'user', query, userMessage.files);
      onMessagesUpdate([...messages, userMessage]);

      let responseData;

      if (selectedFiles.length > 0) {
        // Process files sequentially
        const results = await processFilesSequentially(selectedFiles);
        responseData = { results };

        const successCount = results.filter(r => !r.error).length;
        if (successCount === selectedFiles.length) {
          toast.success(`All ${selectedFiles.length} file(s) processed successfully!`);
        } else {
          toast.warning(`Processed ${successCount} of ${selectedFiles.length} files`);
        }
      } else {
        // Text-only query
        const formData = new FormData();
        formData.append('query', query);
        formData.append('timestamp', new Date().toISOString());
        formData.append('inputType', 'text');

        const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
        const result = await fetch(webhookUrl, {
          method: "POST",
          body: formData,
        });

        if (!result.ok) {
          throw new Error(`Server returned ${result.status}: ${result.statusText}`);
        }

        const text = await result.text();
        if (!text || text.trim() === '') {
          throw new Error("Server returned empty response");
        }

        responseData = JSON.parse(text);
        toast.success("Query processed successfully!");
      }

      // Save assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: JSON.stringify(responseData)
      };

      await saveMessage(convId, 'assistant', assistantMessage.content);
      onMessagesUpdate([...messages, userMessage, assistantMessage]);

      // Update conversation timestamp
      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);

      // Clear form
      setQuery("");
      setSelectedFiles([]);

    } catch (error) {
      console.error("Error sending query:", error);
      toast.error("Failed to send query. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-4xl mx-auto space-y-6 relative"
    >
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-orange-500/20 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700 pointer-events-none" />
        <div className="glass-panel-heavy rounded-[32px] p-3 shadow-2xl relative transition-all duration-300 border-white/10 group-focus-within:border-primary/30 z-10">
          <AnimatePresence>
            {selectedFiles.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pt-3 pb-2 flex flex-wrap gap-2"
              >
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-1 rounded-lg text-sm"
                  >
                    <span className="max-w-[200px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="hover:bg-accent/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything related to Accounts, Taxes, or upload an invoice..."
            className="w-full bg-transparent text-white placeholder:text-white/40 px-5 py-4 focus:outline-none resize-none min-h-[60px] max-h-[250px] text-lg"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />

          <div className="flex items-center justify-between px-3 pt-3 pb-1 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-10 w-10 rounded-full transition-colors ${isListening
                    ? 'text-red-400 bg-red-400/10 animate-pulse shadow-[0_0_15px_rgba(248,113,113,0.3)]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                disabled={isLoading}
                onClick={toggleDictation}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="icon"
                className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-orange-500 text-primary-foreground hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:shadow-[0_0_20px_rgba(251,191,36,0.5)] disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
};

export default QueryInput;
