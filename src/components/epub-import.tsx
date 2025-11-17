"use client";

import { useState, memo, useCallback } from "react";
import { useRouter } from "next/navigation";

export const EpubImport = memo(function EpubImport() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setStatus("Uploading...");

      try {
        const filename = file.name || "upload.epub";
        const contentType = file.type || "application/epub+zip";

        const uploadUrlResponse = await fetch("/api/import/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, contentType }),
        });

        if (!uploadUrlResponse.ok) {
          const data = (await uploadUrlResponse.json().catch(() => ({}))) as {
            error?: string;
          };
          setStatus(data.error || "Failed to prepare upload.");
          setIsUploading(false);
          input.value = "";
          return;
        }

        const { uploadUrl, key } = (await uploadUrlResponse.json()) as {
          uploadUrl: string;
          key: string;
        };

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: file,
        });

        if (!uploadResponse.ok) {
          setStatus("Upload failed. Please try a smaller file.");
          setIsUploading(false);
          input.value = "";
          return;
        }

        setStatus("Importing...");

        const importResponse = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, filename }),
        });

        if (!importResponse.ok) {
          const data = (await importResponse.json().catch(() => ({}))) as {
            error?: string;
          };
          setStatus(data.error || "Import failed.");
          setIsUploading(false);
        } else {
          setStatus("Imported");
          router.refresh();
          setTimeout(() => {
            setStatus(null);
            setIsUploading(false);
          }, 2000);
        }
      } catch {
        setStatus("Network error. Please try again.");
        setIsUploading(false);
      }

      input.value = "";
    },
    [router]
  );

  return (
    <label className={`relative flex w-full flex-col gap-1.5 md:gap-2 border border-zinc-800 bg-black/40 px-3 md:px-5 py-4 md:py-6 text-xs md:text-sm text-zinc-400 transition ${
      isUploading ? "cursor-wait opacity-60" : "cursor-pointer hover:border-zinc-200 hover:text-zinc-100"
    }`}>
      <input
        type="file"
        name="file"
        accept=".epub,application/epub+zip"
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />
      <span className="text-[0.6rem] md:text-xs uppercase tracking-[0.25em] md:tracking-[0.3em] text-zinc-500">
        import
      </span>
      <span className="text-xs md:text-sm">{isUploading ? "Importing..." : "Tap to choose an EPUB file"}</span>
      {status && <span className="text-xs text-zinc-300">{status}</span>}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
        </div>
      )}
    </label>
  );
});
