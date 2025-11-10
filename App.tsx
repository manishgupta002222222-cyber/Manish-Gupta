import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '@google/genai';
import { PERSONAS } from './constants';
import type { Persona, Message } from './types';
import { MessageRole } from './types';
import { createChatSession } from './services/geminiService';

// --- Helper & Icon Components ---

const BotIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2" />
        <path d="M20 14h2" />
        <path d="M15 13v2" />
        <path d="M9 13v2" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 2-7 20-4-9-9-4Z" />
        <path d="M22 2 11 13" />
    </svg>
);

const MenuIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
    </svg>
);

const LoadingDots: React.FC = () => (
    <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
        <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
    </div>
);

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isModel = message.role === MessageRole.MODEL;
    return (
        <div className={`flex items-start gap-4 my-6 ${isModel ? 'justify-start' : 'justify-end'}`}>
            {isModel && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center ring-2 ring-slate-600">
                    <BotIcon />
                </div>
            )}
            <div className={`p-4 rounded-xl max-w-2xl prose prose-invert prose-p:my-2 ${isModel ? 'bg-slate-800' : 'bg-sky-600 text-white'}`}>
                {message.text.split(/(```[\s\S]*?```)/g).map((part, index) => {
                    if (part.startsWith('```') && part.endsWith('```')) {
                        const code = part.slice(3, -3).trim();
                        return (
                            <pre key={index} className="bg-slate-900/70 p-3 my-2 rounded-md overflow-x-auto text-sm font-mono">
                                <code>{code}</code>
                            </pre>
                        );
                    }
                    return <span key={index} className="whitespace-pre-wrap">{part}</span>;
                })}
            </div>
             {!isModel && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center ring-2 ring-slate-600">
                    <UserIcon />
                </div>
            )}
        </div>
    );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        } else {
            setIsSidebarOpen(true);
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial state
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    try {
      setError(null);
      const newChatSession = createChatSession(selectedPersona);
      setChatSession(newChatSession);
      setMessages([]);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    } catch (e) {
      setError("Failed to initialize chat session. Please check your API key.");
      console.error(e);
    }
  }, [selectedPersona]);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chatSession) return;

    const userMessage: Message = { role: MessageRole.USER, text: userInput };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await chatSession.sendMessage({ message: userInput });
      const modelMessage: Message = { role: MessageRole.MODEL, text: result.text };
      setMessages(prev => [...prev, modelMessage]);
    } catch (e: any) {
      console.error(e);
      const errorMessage = e.message || 'An error occurred while fetching the response.';
      setError(`Error: ${errorMessage}`);
      setMessages(prev => prev.slice(0, -1)); // Remove the user message if API call fails
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStarterPrompt = async () => {
      if(isLoading || !chatSession) return;
      const starter = selectedPersona.starterPrompt;
      const userMessage: Message = { role: MessageRole.USER, text: starter };
      setMessages(prev => [...prev, userMessage]);
      setUserInput('');
      setIsLoading(true);
      setError(null);

      try {
        const result = await chatSession.sendMessage({ message: starter });
        const modelMessage: Message = { role: MessageRole.MODEL, text: result.text };
        setMessages(prev => [...prev, modelMessage]);
      } catch (e: any) {
        console.error(e);
        const errorMessage = e.message || 'An error occurred while fetching the response.';
        setError(`Error: ${errorMessage}`);
        setMessages(prev => prev.slice(0, -1));
      } finally {
        setIsLoading(false);
      }
  };

  return (
    <div className="relative flex h-screen w-full font-sans bg-slate-900 text-slate-200 overflow-hidden">
      {/* Overlay for mobile */}
      {isSidebarOpen && (
          <div 
              onClick={() => setIsSidebarOpen(false)} 
              className="fixed inset-0 bg-black/60 z-20 lg:hidden"
              aria-hidden="true"
          ></div>
      )}

      {/* Sidebar for Personas */}
      <aside className={`absolute top-0 left-0 h-full w-[320px] bg-slate-800 p-4 flex flex-col border-r border-slate-700/50 z-30 transition-transform duration-300 ease-in-out lg:fixed ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <header className="flex items-center gap-3 mb-8 px-2">
            <BotIcon className="w-8 h-8 text-sky-400" />
            <h1 className="text-2xl font-bold text-sky-400">Gemini EDU Bots</h1>
        </header>
        <div className="flex-grow overflow-y-auto pr-2 -mr-2">
          {PERSONAS.map(persona => (
            <button
              key={persona.id}
              onClick={() => setSelectedPersona(persona)}
              className={`w-full text-left p-4 my-2 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                selectedPersona.id === persona.id
                  ? 'bg-slate-700 shadow-lg ring-2 ring-sky-500/50'
                  : 'bg-slate-800 hover:bg-slate-700/50'
              }`}
            >
              <h3 className="font-semibold text-base text-slate-100">{persona.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{persona.description}</p>
            </button>
          ))}
        </div>
        <div className="text-xs text-slate-500 mt-4 p-2 border-t border-slate-700/50">
           <strong>Disclaimer:</strong> This assistant is for learning purposes. Please use it responsibly and maintain academic integrity.
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className={`flex-1 flex flex-col bg-slate-900 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'lg:ml-[320px]' : 'ml-0'}`}>
        <header className="p-4 border-b border-slate-700/50 bg-slate-800/80 backdrop-blur-sm z-10 flex items-center gap-4">
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-md hover:bg-slate-700"
                aria-label="Toggle sidebar"
            >
                <MenuIcon />
            </button>
            <div>
                 <h2 className="text-xl font-bold">{selectedPersona.name}</h2>
                 <p className="text-sm text-slate-400">{selectedPersona.description}</p>
            </div>
        </header>

        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 h-full flex flex-col items-center justify-center">
              <BotIcon className="w-20 h-20 mx-auto mb-6 text-slate-600" />
              <h3 className="text-3xl font-semibold text-slate-300">Start a conversation!</h3>
              <p className="mt-2 max-w-md">Select a persona and ask a question, or try a starter prompt to see how it works.</p>
               <button 
                  onClick={handleStarterPrompt}
                  className="mt-6 px-5 py-3 bg-sky-500 text-white font-semibold rounded-lg hover:bg-sky-600 transition-colors duration-200 shadow-lg shadow-sky-500/20"
               >
                  Try: "{selectedPersona.starterPrompt}"
               </button>
            </div>
          )}
          {messages.map((msg, index) => (
            <ChatMessage key={index} message={msg} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-4 my-6 justify-start">
               <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center ring-2 ring-slate-600">
                    <BotIcon />
                </div>
              <div className="p-4 rounded-xl bg-slate-800">
                <LoadingDots />
              </div>
            </div>
          )}
          {error && <div className="text-center text-red-300 p-4 my-4 bg-red-500/20 rounded-lg border border-red-500/30">{error}</div>}
        </div>

        <div className="p-6 border-t border-slate-700/50 bg-slate-800">
          <form onSubmit={handleSendMessage} className="flex items-center gap-4">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder={`Message ${selectedPersona.name}...`}
              disabled={isLoading}
              className="w-full p-4 bg-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow text-base"
            />
            <button
              type="submit"
              disabled={isLoading || !userInput.trim()}
              className="p-4 bg-sky-500 rounded-full hover:bg-sky-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200"
              aria-label="Send message"
            >
              <SendIcon className="w-6 h-6 text-white"/>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default App;
