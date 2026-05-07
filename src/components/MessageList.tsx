import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Edit2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: any[];
}

interface MessageListProps {
  messages: Message[];
}

const renderSafeString = (text: string): JSX.Element => {
  const hasHTML = /<[a-z][\s\S]*>/i.test(text);

  if (hasHTML) {
    const cleanHTML = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: ['div', 'p', 'ul', 'li', 'br', 'strong', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'],
      FORBID_TAGS: ['script', 'style'],
    });
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: cleanHTML }} 
        className="space-y-2 [&>ul]:list-disc [&>ul]:ml-5 [&>p]:mb-2" 
      />
    );
  } else {
    return (
      <div>
        {text.split('\n').map((line, i) => (
          <span key={i}>
            {line}
            {i !== text.split('\n').length - 1 && <br />}
          </span>
        ))}
      </div>
    );
  }
};

const MessageList = ({ messages }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Message copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleReadAloud = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Simple text extraction for JSON payloads if needed, or just read raw string
    let textToSpeak = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.output) textToSpeak = parsed.output;
      else if (parsed.response) textToSpeak = JSON.stringify(parsed.response);
    } catch {
      // It's just text
    }

    // Strip HTML tags for speech synthesis if present
    const cleanTextToSpeak = textToSpeak.replace(/<[^>]+>/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanTextToSpeak);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleEdit = () => {
    toast.info("Edit feature coming soon");
  };

  const formatResponse = (data: string): JSX.Element => {
    try {
      const parsed = JSON.parse(data);

      if (parsed.results) {
        // Multiple file results
        return (
          <div className="space-y-4">
            {parsed.results.map((result: any, idx: number) => (
              <div key={idx} className="border-l-2 border-accent/50 pl-4">
                <div className="font-semibold text-accent mb-2">
                  File: {result.file}
                </div>
                {result.error ? (
                  <div className="text-destructive">Error: {result.error}</div>
                ) : (
                  <div className="space-y-1">
                    {formatObjectData(result.response)}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      }

      return <div className="space-y-1">{formatObjectData(parsed)}</div>;
    } catch {
      return <div>{renderSafeString(data)}</div>;
    }
  };

  const formatObjectData = (obj: any, level = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    if (typeof obj !== 'object' || obj === null) {
      return [<div key={0}>{typeof obj === 'string' ? renderSafeString(obj) : String(obj)}</div>];
    }

    Object.entries(obj).forEach(([key, value], idx) => {
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          if (value.length > 0 && typeof value[0] === 'object') {
            elements.push(
              <div key={`${key}-${idx}`} className="space-y-1 mt-2">
                <div className="font-semibold">{key}</div>
                {value.map((item, i) => (
                  <div key={i} className="ml-4 space-y-1">
                    {formatObjectData(item, level + 1)}
                  </div>
                ))}
              </div>
            );
          } else {
            elements.push(
              <div key={`${key}-${idx}`}>
                <span className="font-semibold">{key}: </span> 
                {JSON.stringify(value)}
              </div>
            );
          }
        } else {
          elements.push(
            <div key={`${key}-${idx}`} className="mt-2">
              <div className="font-semibold">{key}</div>
              <div className="ml-4">
                {formatObjectData(value, level + 1)}
              </div>
            </div>
          );
        }
      } else {
        const indent = level > 0 ? '  →  ' : '';
        elements.push(
          <div key={`${key}-${idx}`}>
            <span className="font-semibold">{indent}{key}: </span>
            {typeof value === 'string' ? renderSafeString(value) : String(value)}
          </div>
        );
      }
    });

    return elements;
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-4 p-4">
      {messages.map((message, index) => (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
          key={index}
          className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`group/msg relative max-w-[85%] rounded-[24px] p-5 shadow-xl ${message.role === 'user'
              ? 'bg-gradient-to-br from-primary to-orange-500 text-primary-foreground rounded-tr-sm'
              : 'glass-panel-heavy rounded-tl-sm border-white/10 text-white'
              }`}
          >
            {message.role === 'user' ? (
              <div>
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                {message.files && message.files.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-primary-foreground/10 px-2 py-1 rounded"
                      >
                        📎 {file.name}
                      </div>
                    ))}
                  </div>
                )}
                <div className="absolute right-3 -bottom-4 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-2 py-1 shadow-lg border border-white/10">
                  <button onClick={() => handleEdit()} className="p-1.5 text-white/70 hover:text-white transition-colors" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleCopy(message.content, index)} className="p-1.5 text-white/70 hover:text-white transition-colors" title="Copy">
                    {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="text-[10px] text-primary">CA</span>
                  </div>
                  <div className="text-primary font-medium text-sm tracking-wide">CA Agent</div>
                </div>
                <div className="text-white/90 text-[15px] leading-relaxed pb-4">
                  {formatResponse(message.content)}
                </div>
                <div className="absolute left-3 -bottom-4 opacity-0 group-hover/msg:opacity-100 transition-opacity flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-2 py-1 shadow-lg border border-white/10">
                  <button onClick={() => handleCopy(message.content, index)} className="p-1.5 text-white/70 hover:text-white transition-colors" title="Copy">
                    {copiedIndex === index ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleReadAloud(message.content)} className={`p-1.5 transition-colors ${isSpeaking ? 'text-primary' : 'text-white/70 hover:text-white'}`} title="Read Aloud">
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;

