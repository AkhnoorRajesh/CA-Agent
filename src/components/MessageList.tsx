import { useEffect, useRef } from "react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  files?: any[];
}

interface MessageListProps {
  messages: Message[];
}

const MessageList = ({ messages }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      return <div>{data}</div>;
    }
  };

  const formatObjectData = (obj: any, level = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    
    if (typeof obj !== 'object' || obj === null) {
      return [<div key={0}>{String(obj)}</div>];
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
                {key}: {JSON.stringify(value)}
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
            {indent}{key}: {String(value)}
          </div>
        );
      }
    });

    return elements;
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-4 p-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-2xl p-4 ${
              message.role === 'user'
                ? 'bg-accent text-primary-foreground'
                : 'bg-secondary/50 backdrop-blur-xl border border-border'
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
              </div>
            ) : (
              <div>
                <div className="text-accent font-semibold mb-2">CA Response</div>
                <div className="text-foreground text-sm">
                  {formatResponse(message.content)}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
