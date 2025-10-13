import { useState, useEffect } from "react";

export interface PromptHistoryItem {
  id: string;
  username: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
}

const STORAGE_KEY = "xpic-prompt-history";
const MAX_HISTORY_ITEMS = 50;

export function usePromptHistory() {
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error("Failed to load prompt history:", error);
      setHistory([]);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Failed to save prompt history:", error);
      // Handle quota exceeded error
      if (error instanceof Error && error.name === "QuotaExceededError") {
        // Remove oldest items and try again
        const reducedHistory = history.slice(0, Math.floor(MAX_HISTORY_ITEMS / 2));
        setHistory(reducedHistory);
      }
    }
  }, [history]);

  const addToHistory = (item: Omit<PromptHistoryItem, "id" | "createdAt">) => {
    const newItem: PromptHistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev];
      // Keep only the most recent items
      return updated.slice(0, MAX_HISTORY_ITEMS);
    });
  };

  const deleteFromHistory = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const getHistoryItem = (id: string) => {
    return history.find((item) => item.id === id);
  };

  return {
    history,
    addToHistory,
    deleteFromHistory,
    clearHistory,
    getHistoryItem,
  };
}

