import { useState, useRef, useEffect } from "react";
import { Paperclip, Mic, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

        const webhookUrl = "https://undeferred-jaiden-overgenerously.ngrok-free.dev/webhook/ca-agent";
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

        const webhookUrl = "https://undeferred-jaiden-overgenerously.ngrok-free.dev/webhook/ca-agent";
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
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <form onSubmit={handleSubmit} className="relative">
        <div className="bg-secondary/50 backdrop-blur-xl border border-border rounded-2xl p-2 shadow-2xl">
          {selectedFiles.length > 0 && (
            <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2">
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
            </div>
          )}
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything related to Accounts"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground px-4 py-3 focus:outline-none resize-none min-h-[60px] max-h-[200px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          <div className="flex items-center justify-between px-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
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
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                disabled={isLoading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${isListening ? 'text-red-500 animate-pulse' : 'text-muted-foreground'} hover:text-foreground hover:bg-secondary`}
                disabled={isLoading}
                onClick={toggleDictation}
              >
                <Mic className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="icon"
                className="h-8 w-8 bg-accent text-primary-foreground hover:bg-accent/90 rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <div className="w-4 h-4 flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-current rounded-full"></div>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default QueryInput;
