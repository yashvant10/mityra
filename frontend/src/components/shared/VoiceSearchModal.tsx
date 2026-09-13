"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, X, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVoiceResult: (result: {
    platform?: string;
    category?: string;
    color?: string;
    occasion?: string;
    rawText: string;
  }) => void;
}

export default function VoiceSearchModal({
  isOpen,
  onClose,
  onVoiceResult,
}: VoiceSearchModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  const parseAndSubmit = (text: string) => {
    const raw = text.toLowerCase();
    
    // Parse platforms
    let platform = undefined;
    if (raw.includes("myntra")) platform = "myntra";
    else if (raw.includes("amazon")) platform = "amazon";
    else if (raw.includes("flipkart")) platform = "flipkart";
    else if (raw.includes("ajio")) platform = "ajio";
    else if (raw.includes("meesho")) platform = "meesho";

    // Parse categories
    let category = undefined;
    if (raw.includes("kurta") || raw.includes("kurtis")) category = "tops"; // KURTA mapped to tops
    else if (raw.includes("shirt")) category = "tops";
    else if (raw.includes("blazer") || raw.includes("suit")) category = "outerwear";
    else if (raw.includes("pants") || raw.includes("trouser") || raw.includes("jeans") || raw.includes("chinos")) category = "bottoms";
    else if (raw.includes("shoes") || raw.includes("sneakers") || raw.includes("heel")) category = "shoes";
    else if (raw.includes("dress") || raw.includes("gown")) category = "dresses";

    // Parse colors
    const colorsList = ["blue", "red", "green", "black", "white", "yellow", "pink", "grey", "navy", "cream"];
    let color = undefined;
    for (const c of colorsList) {
      if (raw.includes(c)) {
        color = c;
        break;
      }
    }

    // Parse occasions
    const occasionsList = ["wedding", "party", "office", "casual", "college", "festival"];
    let occasion = undefined;
    for (const o of occasionsList) {
      if (raw.includes(o)) {
        occasion = o;
        break;
      }
    }

    setTimeout(() => {
      onVoiceResult({
        platform,
        category,
        color,
        occasion,
        rawText: text,
      });
      onClose();
    }, 1500);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-IN"; // Supports English and Hindi combinations beautifully

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
          setTranscript("Listening... Speak now 🎤");
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          if (event.error === "not-allowed") {
            setError("Microphone permission denied. Please allow micro access.");
          } else {
            setError("Could not hear anything clearly. Please try again.");
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onresult = (event: any) => {
          const speechToText = event.results[0][0].transcript;
          setTranscript(speechToText);
          parseAndSubmit(speechToText);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error("Web Speech API is not supported in this browser.");
      return;
    }
    try {
      recognitionRef.current.start();
    } catch {
      recognitionRef.current.stop();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        startListening();
      }, 300);
    } else {
      stopListening();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md glass-card p-6 md:p-8 rounded-3xl border border-white/10 shadow-2xl z-10 text-center space-y-6"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-neon-purple/10 flex items-center justify-center text-neon-purple-light shadow-neon-glow">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Voice styling assistant</h3>
                <p className="text-xs text-white/30">Speak to search clothing sets</p>
              </div>
            </div>

            {/* Listening mic pulsing circle */}
            <div className="flex items-center justify-center h-32 relative">
              <AnimatePresence>
                {isListening && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0.1, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    className="absolute w-24 h-24 rounded-full bg-neon-purple/20 border border-neon-purple/40"
                  />
                )}
              </AnimatePresence>

              <button
                onClick={isListening ? stopListening : startListening}
                className={`w-16 h-16 rounded-full flex items-center justify-center z-10 transition-all ${
                  isListening
                    ? "bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                    : "bg-neon-purple text-white shadow-neon-glow hover:scale-105"
                }`}
              >
                {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>

            {/* Voice Transcript text */}
            <div className="bg-white/5 rounded-2xl p-4 min-h-[70px] flex items-center justify-center text-sm font-medium border border-white/5">
              {error ? (
                <div className="flex items-center gap-2 text-red-400 text-xs text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ) : (
                <p className={transcript.startsWith("Listening") ? "text-white/40 italic" : "text-white font-mono"}>
                  {transcript || "Click mic above to start speaking..."}
                </p>
              )}
            </div>

            <div className="text-[10px] text-white/20 italic">
              Try: "show me black blazer for office on Amazon"
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
