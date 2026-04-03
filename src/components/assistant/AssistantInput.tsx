"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Card } from "@/components/ui/Card";
import { askAssistant } from "@/services/openClawService";
import { cn } from "@/lib/cn";

const SUGGESTED_PROMPTS = [
  "What should I focus on today?",
  "What's urgent right now?",
  "What can wait until later?",
  "How is Powershift performing?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function AssistantInput() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev: Message[]) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await askAssistant(text);
      const assistantMsg: Message = {
        role: "assistant",
        content: response,
        timestamp: new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev: Message[]) => [...prev, assistantMsg]);
    } catch {
      const errMsg: Message = {
        role: "assistant",
        content: "Sorry, I couldn't process that request. Please try again.",
        timestamp: new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev: Message[]) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-sand/40">
        <h3 className="font-heading text-sm font-semibold text-teal tracking-wide">
          Ask the assistant
        </h3>
        <span className="text-2xs text-teal/30 bg-blue-pale px-2 py-0.5 rounded border border-blue/10">
          Mock AI · OpenClaw ready
        </span>
      </div>

      {/* Message thread */}
      {messages.length > 0 && (
        <div className="max-h-80 overflow-y-auto px-5 py-4 space-y-4 border-b border-sand/30">
          {messages.map((msg: Message, i: number) => (
            <div
              key={i}
              className={cn(
                "flex gap-3",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-2xs font-semibold mt-0.5",
                  msg.role === "user"
                    ? "bg-teal text-white"
                    : "bg-sand text-teal/60"
                )}
              >
                {msg.role === "user" ? "Y" : "AI"}
              </div>

              <div
                className={cn(
                  "max-w-[80%] rounded-xl px-3.5 py-2.5",
                  msg.role === "user"
                    ? "bg-teal text-white"
                    : "bg-stone text-teal/80"
                )}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p
                  className={cn(
                    "text-2xs mt-1",
                    msg.role === "user" ? "text-white/40" : "text-teal/30"
                  )}
                >
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-sand flex items-center justify-center flex-shrink-0 text-2xs font-semibold text-teal/60">
                AI
              </div>
              <div className="bg-stone rounded-xl px-3.5 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i: number) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-teal/30 animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* Suggested prompts — shown before first message */}
      {messages.length === 0 && (
        <div className="px-5 pt-4 pb-3">
          <p className="text-xs text-teal/40 mb-2.5">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt: string) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-xs px-3 py-1.5 bg-stone border border-sand/60 rounded-full text-teal/60
                           hover:border-teal/30 hover:text-teal hover:bg-teal-pale transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your clients, priorities, or what to do next..."
            rows={2}
            className="input-base flex-1 resize-none text-sm"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="btn-primary h-[60px] px-4 flex-shrink-0"
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className="text-2xs text-teal/25 mt-1.5">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </Card>
  );
}
