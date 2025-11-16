import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import path from "path";
import { load } from "cheerio";

type ChapterPayload = {
  title: string;
  content: string;
};

export type ParsedEpub = {
  title: string;
  author?: string;
  description?: string;
  chapters: ChapterPayload[];
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  allowBooleanAttributes: true,
});

type ManifestItem = {
  "@_id"?: string;
  "@_href"?: string;
  "@_media-type"?: string;
};

type SpineItem = {
  "@_idref"?: string;
};

const normalizeArray = <T>(value: T | T[] | undefined | null): T[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const readText = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return readText(value[0]);
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const text = record["#text"];
    if (typeof text === "string") {
      return text;
    }
  }

  return undefined;
};

export async function parseEpub(buffer: Buffer, fallbackTitle: string): Promise<ParsedEpub> {
  const zip = await JSZip.loadAsync(buffer);
  const container = await zip.file("META-INF/container.xml")?.async("text");

  if (!container) {
    throw new Error("Invalid EPUB: missing container.");
  }

  const containerDoc = xmlParser.parse(container);
  const rootFilePath = containerDoc?.container?.rootfiles?.rootfile?.["@_full-path"];

  if (!rootFilePath) {
    throw new Error("Invalid EPUB: missing manifest path.");
  }

  const opfContent = await zip.file(rootFilePath)?.async("text");

  if (!opfContent) {
    throw new Error("Invalid EPUB: missing package definition.");
  }

  const opf = xmlParser.parse(opfContent);
  const metadata = opf?.package?.metadata ?? {};
  const manifest = normalizeArray<ManifestItem>(opf?.package?.manifest?.item);
  const spine = normalizeArray<SpineItem>(opf?.package?.spine?.itemref);
  const manifestMap = new Map(manifest.map((item) => [item?.["@_id"], item]));

  const baseDir = path.posix.dirname(rootFilePath);

  const chapters: ChapterPayload[] = [];

  for (let index = 0; index < spine.length; index += 1) {
    const itemRef = spine[index];
    const idRef = itemRef?.["@_idref"];
    if (!idRef) continue;

    const manifestItem = manifestMap.get(idRef);
    if (!manifestItem) continue;

    const mediaType: string | undefined = manifestItem?.["@_media-type"];
    if (!mediaType || !mediaType.includes("html")) continue;

    const href: string | undefined = manifestItem?.["@_href"];
    if (!href) continue;

    const resolvedPath =
      baseDir && baseDir !== "."
        ? path.posix.join(baseDir, href).replace(/\\/g, "/")
        : href.replace(/\\/g, "/");

    const file = zip.file(resolvedPath) || zip.file(decodeURIComponent(resolvedPath));
    if (!file) continue;

    const html = await file.async("text");
    const $ = load(html);
    $("script, style, svg, img").remove();
    const title =
      $("title").first().text().trim() ||
      $("[class*=title]").first().text().trim() ||
      `Chapter ${index + 1}`;
    const content = $("body").html()?.trim() || $.root().text().trim();

    if (!content) continue;

    chapters.push({
      title,
      content,
    });
  }

  const title =
    readText(normalizeArray(metadata?.["dc:title"])[0]) ||
    readText(metadata?.title) ||
    fallbackTitle.replace(/\.epub$/i, "");

  const author =
    readText(normalizeArray(metadata?.["dc:creator"])[0]) ||
    readText(metadata?.creator) ||
    undefined;

  const description =
    readText(normalizeArray(metadata?.["dc:description"])[0]) ||
    readText(metadata?.description) ||
    undefined;

  if (!chapters.length) {
    throw new Error("No readable chapters found.");
  }

  return {
    title,
    author,
    description,
    chapters,
  };
}
