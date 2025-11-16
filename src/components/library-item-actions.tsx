"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LibraryItemActionsProps = {
  novelId: string;
  title: string;
};

export function LibraryItemActions({ novelId, title }: LibraryItemActionsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    setValue(title);
  }, [title]);

  const toggleEditing = () => {
    setError(null);
    setIsEditing((prev) => {
      if (!prev) {
        setValue(title);
      }
      return !prev;
    });
  };

  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setError(null);

    const response = await fetch(`/api/novels/${novelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value.trim() }),
    });

    setIsBusy(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Unable to update title.");
      return;
    }

    setIsEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this import? This removes all chapters.")) {
      return;
    }
    setIsBusy(true);
    const response = await fetch(`/api/novels/${novelId}`, {
      method: "DELETE",
    });
    setIsBusy(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Unable to delete.");
      return;
    }

    router.refresh();
  };

  if (isEditing) {
    return (
      <form onSubmit={handleRename} className="flex flex-col gap-2 text-xs text-zinc-500">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="border border-zinc-800 bg-black/40 px-2 py-1 text-sm text-zinc-100 focus:border-zinc-200 focus:outline-none"
          disabled={isBusy}
          maxLength={200}
        />
        {error && <span className="text-red-400">{error}</span>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isBusy || value.trim().length === 0}
            className="uppercase tracking-[0.2em] text-zinc-300 transition hover:text-white disabled:opacity-40"
          >
            save
          </button>
          <button
            type="button"
            onClick={toggleEditing}
            className="uppercase tracking-[0.2em] text-zinc-500 transition hover:text-white"
          >
            cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-1 text-xs uppercase tracking-[0.3em] text-zinc-500">
      {error && <span className="text-red-400 normal-case tracking-normal">{error}</span>}
      <button
        type="button"
        onClick={toggleEditing}
        className="text-left transition hover:text-white"
        disabled={isBusy}
      >
        rename
      </button>
      <button
        type="button"
        onClick={handleDelete}
        className="text-left transition hover:text-white"
        disabled={isBusy}
      >
        delete
      </button>
    </div>
  );
}
