"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EpubImport() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setStatus("importing...");
    const payload = new FormData();
    payload.append("file", file);

    const response = await fetch("/api/import", {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      setStatus(data.error || "Import failed.");
    } else {
      setStatus("imported");
      router.refresh();
      setTimeout(() => setStatus(null), 2000);
    }

    input.value = "";
  };

  return (
    <label className="relative flex w-full cursor-pointer flex-col gap-2 border border-zinc-800 bg-black/40 px-5 py-6 text-sm text-zinc-400 transition hover:border-zinc-200 hover:text-zinc-100">
      <input
        type="file"
        name="file"
        accept=".epub,application/epub+zip"
        className="hidden"
        onChange={handleChange}
      />
      <span className="text-xs uppercase tracking-[0.3em] text-zinc-500">
        import
      </span>
      <span>Drop an EPUB here or tap to choose one.</span>
      {status && <span className="text-xs text-zinc-300">{status}</span>}
    </label>
  );
}
