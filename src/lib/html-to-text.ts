export function htmlToPlainText(html: string): string {
  if (typeof window === "undefined") return "";

  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  const elementsToRemove = tempDiv.querySelectorAll("script, style, img, svg");
  elementsToRemove.forEach((el) => el.remove());

  const text = tempDiv.textContent || "";
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
