// Free usage limit — tracked in localStorage
// Format: { count: number, date: "YYYY-MM-DD" }
// Unlocked users (paid via Razorpay) bypass the limit entirely

import { useState, useEffect, useCallback } from "react";
import { isUnlocked } from "@/lib/razorpay";

const STORAGE_KEY = "writeright.usage";
const FREE_DAILY_LIMIT = 3;

function todayStr(): string {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}

interface UsageRecord {
  count: number;
  date: string;
}

function readUsage(): UsageRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: todayStr() };
    const parsed: UsageRecord = JSON.parse(raw);
    // New day — reset count
    if (parsed.date !== todayStr()) {
      return { count: 0, date: todayStr() };
    }
    return parsed;
  } catch {
    return { count: 0, date: todayStr() };
  }
}

function writeUsage(record: UsageRecord): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage full or blocked — fail silently
  }
}

export function useUsage() {
  const [usage, setUsage] = useState<UsageRecord>(() => readUsage());

  // Sync on mount in case another tab updated it
  useEffect(() => {
    setUsage(readUsage());
  }, []);

  const recordUsage = useCallback(async () => {
    const current = readUsage(); // always read fresh in case date changed
    const updated: UsageRecord = {
      count: current.count + 1,
      date: todayStr(),
    };
    writeUsage(updated);
    setUsage(updated);
  }, []);

  const fetchUsage = useCallback(async () => {
    setUsage(readUsage());
  }, []);

  const usedToday = usage.count;
  const unlocked = isUnlocked();
  const canGenerate = unlocked || usedToday < FREE_DAILY_LIMIT;
  const remaining = unlocked ? Infinity : Math.max(0, FREE_DAILY_LIMIT - usedToday);

  return {
    usedToday,
    canGenerate,
    remaining,
    unlocked,
    recordUsage,
    fetchUsage,
    FREE_DAILY_LIMIT,
  };
}
