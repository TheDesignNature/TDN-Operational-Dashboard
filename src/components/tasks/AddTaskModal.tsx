"use client";

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { addTask } from "@/services/tasksService";
import { cn } from "@/lib/cn";
import type { Task, TaskPriority, TaskStatus } from "@/types";

const CLIENTS = [
  { id: "powershift", name: "Powershift" },
  { id: "kkcs", name: "KKCS" },
  { id: "caloundra-city-auto", name: "Caloundra City Auto" },
  { id: "caloundra-mazda", name: "Caloundra Mazda" },
  { id: "foundation-home", name: "Foundation Home Mods" },
  { id: "sell-a-car", name: "Sell a Car" },
  { id: "study-hub", name: "Study Hub" },
];

interface AddTaskModalProps {
  onClose: () => void;
  onCreated: (task: Task) => void;
  defaultClientId?: string;
}

export function AddTaskModal({ onClose, onCreated, defaultClientId }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);

  // Focus title on mount
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Task title is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const task = await addTask({
        title: title.trim(),
        clientId: clientId || null,
        priority,
        status: "todo" as TaskStatus,
        dueDate: dueDate || null,
        source: "manual",
        notes: notes.trim() || null,
        estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      });
      onCreated(task);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create task");
      setSaving(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-teal/20 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-card shadow-card-hover w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sand/50">
          <h2 className="font-heading text-base font-semibold text-teal tracking-wide">
            Add task
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal/40 hover:text-teal hover:bg-stone transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-teal/60 mb-1.5">
              Task title <span className="text-status-action">*</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="input-base"
            />
          </div>

          {/* Client + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-teal/60 mb-1.5">
                Client
              </label>
              <select
                value={clientId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setClientId(e.target.value)}
                className="input-base"
              >
                <option value="">No client</option>
                {CLIENTS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-teal/60 mb-1.5">
                Priority
              </label>
              <div className="flex gap-1.5">
                {(["high", "medium", "low"] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-colors",
                      priority === p
                        ? p === "high"
                          ? "bg-status-action-bg text-status-action border-status-action-border"
                          : p === "medium"
                          ? "bg-status-watch-bg text-status-watch border-status-watch-border"
                          : "bg-teal-pale text-teal border-teal/20"
                        : "bg-stone text-teal/40 border-sand/60 hover:border-sand"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due date + Effort */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-teal/60 mb-1.5">
                Due date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDueDate(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-teal/60 mb-1.5">
                Estimated effort (minutes)
              </label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEstimatedMinutes(e.target.value)}
                placeholder="e.g. 30"
                min="5"
                step="5"
                className="input-base"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-teal/60 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              placeholder="Any context, links, or reminders..."
              rows={3}
              className="input-base resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-status-action bg-status-action-bg border border-status-action-border rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Add task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
