import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import path from "path";
import { load } from "cheerio";
import sanitizeHtml from "sanitize-html";

type ChapterPayload = {
  title: string;
  content: string;
};

export type ParsedEpub = {
  title: string;
  author?: string;
  description?: string;
  coverImage?: string;
  chapters: ChapterPayload[];
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  allowBooleanAttributes: true,
});

const extendedTags = [
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "figure",
  "figcaption",
  "center",
  "span",
  "div",
  "hr",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "col",
  "colgroup",
  "pre",
  "code",
  "sup",
  "sub",
  "u",
  "s",
  "mark",
  "ins",
  "del",
  "svg",
  "path",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "g",
  "defs",
  "use",
  "image",
  "text",
  "tspan",
];

const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: Array.from(new Set([...sanitizeHtml.defaults.allowedTags, ...extendedTags])),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["class", "style", "id", "title", "align", "valign"],
    a: ["href", "name", "target", "title"],
    img: ["src", "alt", "title", "width", "height", "class", "style", "id"],
    svg: ["width", "height", "viewBox", "xmlns", "class", "style", "id"],
    path: ["d", "fill", "stroke", "stroke-width", "class", "style", "id"],
    g: ["fill", "stroke", "stroke-width", "transform", "class", "style", "id"],
    circle: ["cx", "cy", "r", "fill", "stroke", "stroke-width", "class", "style", "id"],
    rect: ["x", "y", "width", "height", "fill", "stroke", "stroke-width", "class", "style", "id"],
    image: ["href", "xlink:href", "x", "y", "width", "height", "class", "style", "id"],
    td: ["colspan", "rowspan", "align", "valign", "width", "height"],
    th: ["colspan", "rowspan", "align", "valign", "width", "height"],
    table: ["border", "cellpadding", "cellspacing", "width", "height"],
  },
  allowedStyles: {
    "*": {
      color: [/^.+$/],
      "background-color": [/^.+$/],
      "background-image": [/^.+$/],
      "background-size": [/^.+$/],
      "background-position": [/^.+$/],
      "background-repeat": [/^.+$/],
      "text-align": [/^left$|^right$|^center$|^justify$/],
      "font-weight": [/^.+$/],
      "font-style": [/^.+$/],
      "font-size": [/^.+$/],
      "font-family": [/^.+$/],
      "text-decoration": [/^.+$/],
      "text-transform": [/^.+$/],
      "letter-spacing": [/^.+$/],
      "line-height": [/^.+$/],
      "margin": [/^.+$/],
      "margin-top": [/^.+$/],
      "margin-bottom": [/^.+$/],
      "margin-left": [/^.+$/],
      "margin-right": [/^.+$/],
      "padding": [/^.+$/],
      "padding-top": [/^.+$/],
      "padding-bottom": [/^.+$/],
      "padding-left": [/^.+$/],
      "padding-right": [/^.+$/],
      border: [/^.+$/],
      "border-top": [/^.+$/],
      "border-bottom": [/^.+$/],
      "border-left": [/^.+$/],
      "border-right": [/^.+$/],
      "width": [/^.+$/],
      "height": [/^.+$/],
      "max-width": [/^.+$/],
      "max-height": [/^.+$/],
      "min-width": [/^.+$/],
      "min-height": [/^.+$/],
      "display": [/^.+$/],
      "position": [/^.+$/],
      "top": [/^.+$/],
      "bottom": [/^.+$/],
      "left": [/^.+$/],
      "right": [/^.+$/],
      "float": [/^.+$/],
      "clear": [/^.+$/],
      "vertical-align": [/^.+$/],
      "opacity": [/^.+$/],
      "visibility": [/^.+$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto", "tel", "data"],
  // Don't enforce allowedSchemes for data URIs in img src
  enforceHtmlBoundary: true,
};

type ManifestItem = {
  "@_id"?: string;
  "@_href"?: string;
  "@_media-type"?: string;
  "@_properties"?: string;
};

type SpineItem = {
  "@_idref"?: string;
  "@_linear"?: string;
};

type MetaTag = {
  "@_name"?: string;
  "@_content"?: string;
  "@_property"?: string;
  "#text"?: string;
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

const resolveZipPath = (baseDir: string, href: string): string => {
  const normalized = href.replace(/\\/g, "/");
  if (!baseDir || baseDir === ".") {
    return normalized;
  }
  
  // Handle absolute paths (starting with /)
  if (normalized.startsWith("/")) {
    return normalized.substring(1); // Remove leading slash for zip file paths
  }
  
  // Use path.posix.join instead of resolve to keep paths relative
  // resolve() creates absolute paths which breaks zip file lookups
  const joined = path.posix.join(baseDir, normalized).replace(/\\/g, "/");
  
  // Remove leading slash if present (zip paths shouldn't have leading slashes)
  // Also normalize .. references manually to avoid absolute paths
  const parts = joined.split("/").filter(p => p !== "." && p !== "");
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }
  
  return resolved.join("/");
};

const detectMimeFromExt = (href: string): string => {
  const ext = path.extname(href).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".bmp":
      return "image/bmp";
    default:
      return "application/octet-stream";
  }
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
  const metadataMeta = normalizeArray<MetaTag>(metadata?.meta);
  const manifestMap = new Map(manifest.map((item) => [item?.["@_id"], item]));
  const baseDir = path.posix.dirname(rootFilePath);
  const manifestHrefMap = new Map<string, ManifestItem>();

  for (const item of manifest) {
    const href = item?.["@_href"];
    if (href) {
      manifestHrefMap.set(resolveZipPath(baseDir, href), item);
    }
  }

  const chapters: ChapterPayload[] = [];

  const getResourceDataUri = async (resourcePath: string): Promise<string | null> => {
    // Remove fragment and query string for file lookup
    let cleanPath = resourcePath.split("#")[0].split("?")[0];
    
    // Decode URL-encoded characters (e.g., %20 -> space)
    try {
      cleanPath = decodeURIComponent(cleanPath);
    } catch {
      // If decoding fails, use original
    }
    
    // Try multiple path resolution strategies
    const pathVariations = [
      cleanPath,
      encodeURI(cleanPath), // Try encoded version too
      cleanPath.replace(/^\//, ""), // Remove leading slash
      encodeURI(cleanPath).replace(/^\//, ""),
      cleanPath.replace(/^\.\//, ""), // Remove ./ prefix
      encodeURI(cleanPath).replace(/^\.\//, ""),
      // Also try with spaces as %20 (in case original was encoded)
      cleanPath.replace(/\s/g, "%20"),
    ];
    
    let file = null;
    let foundPath = null;
    
    for (const pathVar of pathVariations) {
      file = zip.file(pathVar);
      if (file) {
        foundPath = pathVar;
        break;
      }
    }
    
    // Also try looking up in manifest href map for exact matches
    if (!file) {
      for (const [manifestPath, manifestItem] of manifestHrefMap.entries()) {
        const manifestHref = manifestItem?.["@_href"];
        if (manifestHref) {
          const resolvedManifestPath = resolveZipPath(baseDir, manifestHref);
          if (resolvedManifestPath === cleanPath || 
              resolvedManifestPath === decodeURIComponent(cleanPath) ||
              resolvedManifestPath.endsWith(cleanPath) ||
              resolvedManifestPath.endsWith(decodeURIComponent(cleanPath))) {
            file = zip.file(resolvedManifestPath);
            if (file) {
              foundPath = resolvedManifestPath;
              break;
            }
          }
        }
      }
    }
    
    if (!file) return null;
    
    const base64 = await file.async("base64");
    const manifestEntry = foundPath ? manifestHrefMap.get(foundPath) : null;
    const mediaType =
      manifestEntry?.["@_media-type"] ?? detectMimeFromExt(foundPath || cleanPath);
    return `data:${mediaType};base64,${base64}`;
  };

  const substituteCssUrls = async (
    css: string,
    cssDir: string
  ): Promise<string> => {
    let updated = css;
    const urlMatches = Array.from(css.matchAll(/url\(([^)]+)\)/g));
    for (const match of urlMatches) {
      const rawRef = match[1]?.trim().replace(/^['"]|['"]$/g, "");
      if (!rawRef || rawRef.startsWith("data:") || /^https?:\/\//i.test(rawRef)) {
        continue;
      }
      const resourcePath = resolveZipPath(cssDir, rawRef);
      const dataUri = await getResourceDataUri(resourcePath);
      if (dataUri) {
        updated = updated.replace(match[0], `url(${dataUri})`);
      }
    }

    const importMatches = Array.from(
      css.matchAll(/@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?;/g)
    );
    for (const match of importMatches) {
      const rawRef = match[1]?.trim();
      if (!rawRef || rawRef.startsWith("data:") || /^https?:\/\//i.test(rawRef)) {
        continue;
      }
      const resourcePath = resolveZipPath(cssDir, rawRef);
      const file = zip.file(resourcePath) || zip.file(decodeURIComponent(resourcePath));
      if (!file) continue;
      const importedCss = await file.async("text");
      const substituted = await substituteCssUrls(
        importedCss,
        path.posix.dirname(resourcePath)
      );
      updated = updated.replace(match[0], substituted);
    }

    return updated;
  };

  for (let index = 0; index < spine.length; index += 1) {
    const itemRef = spine[index];
    const idRef = itemRef?.["@_idref"];
    if (!idRef) continue;

    if (typeof itemRef?.["@_linear"] === "string" && itemRef["@_linear"]?.toLowerCase() === "no") {
      continue;
    }

    const manifestItem = manifestMap.get(idRef);
    if (!manifestItem) continue;

    const mediaType: string | undefined = manifestItem?.["@_media-type"];
    if (!mediaType || !mediaType.includes("html")) continue;

    const href: string | undefined = manifestItem?.["@_href"];
    if (!href) continue;

    let resolvedPath = resolveZipPath(baseDir, href);
    
    // Ensure resolvedPath is always relative (no leading slash, no drive letters)
    if (resolvedPath.startsWith("/")) {
      resolvedPath = resolvedPath.substring(1);
    }
    if (/^[A-Za-z]:/.test(resolvedPath)) {
      // Remove Windows drive letter if somehow present
      resolvedPath = resolvedPath.replace(/^[A-Za-z]:/, "").replace(/^\\/, "").replace(/^\//, "");
    }

    const file = zip.file(resolvedPath) || zip.file(decodeURIComponent(resolvedPath));
    if (!file) continue;

    const rawHtml = await file.async("text");
    const $ = load(rawHtml);
    $("script").remove();

    // Get directory of the HTML file within the EPUB (relative to EPUB root)
    // Ensure it's a relative path, not absolute
    let htmlDir = path.posix.dirname(resolvedPath);
    // Remove any absolute path components (shouldn't happen, but be safe)
    if (htmlDir.startsWith("/") || /^[A-Za-z]:/.test(htmlDir)) {
      // If somehow absolute, try to make it relative
      htmlDir = htmlDir.replace(/^[^/]*/, "").replace(/^\//, "");
    }
    const resourceTasks: Promise<void>[] = [];

    $("link[rel='stylesheet']").each((_, element) => {
      const link = $(element);
      const href = link.attr("href");
      if (!href || href.startsWith("data:") || /^https?:\/\//i.test(href)) {
        return;
      }
      const resourcePath = resolveZipPath(htmlDir, href);
      const task = (async () => {
        const cssFile = zip.file(resourcePath) || zip.file(decodeURIComponent(resourcePath));
        if (!cssFile) return;
        const css = await cssFile.async("text");
        const substituted = await substituteCssUrls(
          css,
          path.posix.dirname(resourcePath)
        );
        link.replaceWith(`<style>${substituted}</style>`);
      })();
      resourceTasks.push(task);
    });

    $("style").each((_, element) => {
      const styleNode = $(element);
      const css = styleNode.html();
      if (!css) return;
      const task = (async () => {
        const substituted = await substituteCssUrls(css, htmlDir);
        styleNode.text(substituted);
      })();
      resourceTasks.push(task);
    });

    $("img").each((_, element) => {
      const img = $(element);
      const src = img.attr("src");
      if (src && !src.startsWith("data:") && !/^https?:\/\//i.test(src)) {
        const resourcePath = resolveZipPath(htmlDir, src);
        const task = (async () => {
          const dataUri = await getResourceDataUri(resourcePath);
          if (dataUri) {
            img.attr("src", dataUri);
          } else {
            // Try to find the image in the manifest
            const foundInManifest = Array.from(manifestHrefMap.entries()).find(([path, item]) => {
              const href = item?.["@_href"];
              return href && (href.endsWith(src) || href.includes(src));
            });
            if (foundInManifest) {
              const [manifestPath, manifestItem] = foundInManifest;
              const manifestHref = manifestItem?.["@_href"];
              if (manifestHref) {
                const correctPath = resolveZipPath(baseDir, manifestHref);
                const dataUri2 = await getResourceDataUri(correctPath);
                if (dataUri2) {
                  img.attr("src", dataUri2);
                  console.log(`[EPUB] Found image via manifest: ${src} -> ${correctPath}`);
                  return;
                }
              }
            }
            console.warn(`[EPUB] Failed to resolve image: ${src} (htmlDir: ${htmlDir}, resolved to: ${resourcePath})`);
          }
        })();
        resourceTasks.push(task);
      }

      const srcset = img.attr("srcset");
      if (srcset) {
        const entries = srcset.split(",").map((entry) => entry.trim()).filter(Boolean);
        if (entries.length) {
          const task = (async () => {
            const transformed: string[] = [];
            for (const entry of entries) {
              const [url, descriptor] = entry.split(/\s+/, 2);
              if (!url) continue;
              if (url.startsWith("data:") || /^https?:\/\//i.test(url)) {
                transformed.push(entry);
                continue;
              }
              const resourcePath = resolveZipPath(htmlDir, url);
              const dataUri = await getResourceDataUri(resourcePath);
              if (dataUri) {
                transformed.push([dataUri, descriptor].filter(Boolean).join(" "));
              }
            }
            if (transformed.length) {
              img.attr("srcset", transformed.join(", "));
            }
          })();
          resourceTasks.push(task);
        }
      }
    });

    // Handle SVG image elements (inside SVG)
    $("svg image, image").each((_, element) => {
      const image = $(element);
      const href = image.attr("href") || image.attr("xlink:href");
      if (href && !href.startsWith("data:") && !/^https?:\/\//i.test(href)) {
        const resourcePath = resolveZipPath(htmlDir, href);
        const task = (async () => {
          const dataUri = await getResourceDataUri(resourcePath);
          if (dataUri) {
            // Use href for SVG 2.0, xlink:href for SVG 1.1
            if (image.attr("href")) {
              image.attr("href", dataUri);
            }
            if (image.attr("xlink:href")) {
              image.attr("xlink:href", dataUri);
            }
          } else {
            console.warn(`[EPUB] Failed to resolve SVG image: ${href} (resolved to: ${resourcePath})`);
          }
        })();
        resourceTasks.push(task);
      }
    });

    $("[style]").each((_, element) => {
      const styled = $(element);
      const styleValue = styled.attr("style");
      if (!styleValue || !styleValue.includes("url(")) {
        return;
      }
      const matches = Array.from(styleValue.matchAll(/url\(([^)]+)\)/g));
      if (!matches.length) return;
      const task = (async () => {
        let updated = styleValue;
        for (const match of matches) {
          const rawRef = match[1]?.trim().replace(/^['"]|['"]$/g, "");
          if (!rawRef || rawRef.startsWith("data:") || /^https?:\/\//i.test(rawRef)) {
            continue;
          }
          const resourcePath = resolveZipPath(htmlDir, rawRef);
          const dataUri = await getResourceDataUri(resourcePath);
          if (dataUri) {
            updated = updated.replace(match[0], `url(${dataUri})`);
          }
        }
        styled.attr("style", updated);
      })();
      resourceTasks.push(task);
    });

    if (resourceTasks.length) {
      await Promise.all(resourceTasks);
    }

    // Debug: Check if images were processed
    const imgCount = $("img").length;
    const imgWithDataUri = $("img[src^='data:']").length;
    const svgCount = $("svg").length;
    if (imgCount > 0) {
      console.log(`[EPUB] Chapter ${index + 1}: Found ${imgCount} images, ${imgWithDataUri} with data URIs`);
      if (imgCount > imgWithDataUri) {
        $("img").each((_, el) => {
          const src = $(el).attr("src");
          if (src && !src.startsWith("data:") && !/^https?:\/\//i.test(src)) {
            console.warn(`[EPUB] Image without data URI: ${src}`);
          }
        });
      }
    }
    if (svgCount > 0) {
      console.log(`[EPUB] Chapter ${index + 1}: Found ${svgCount} SVG elements`);
    }

    let title =
      $("title").first().text().trim() ||
      $("[class*=title]").first().text().trim() ||
      `Chapter ${index + 1}`;
    
    // Get HTML with all attributes preserved - use body if available, otherwise root
    // After processing images, we need to get the updated HTML from cheerio
    let bodyHtml = "";
    
    // Try to get body content first
    if ($("body").length > 0) {
      const bodyContent = $("body").html();
      bodyHtml = bodyContent || "";
    }
    
    // If body is empty or doesn't exist, try root
    if (!bodyHtml || bodyHtml.trim().length === 0) {
      const rootHtml = $.html();
      if (rootHtml) {
        // Extract body content from full HTML if present
        const bodyMatch = rootHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          bodyHtml = bodyMatch[1];
        } else {
          // No body tag, use the root content but strip html/head tags
          let cleaned = rootHtml;
          // Remove DOCTYPE
          cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/i, "");
          // Remove html tag wrapper
          cleaned = cleaned.replace(/<\/?html[^>]*>/gi, "");
          // Remove head tag and its content
          cleaned = cleaned.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
          bodyHtml = cleaned.trim();
        }
      }
    }
    
    // Final fallback - if still empty, log warning
    if (!bodyHtml || bodyHtml.trim().length === 0) {
      console.error(`[EPUB] Chapter ${index + 1}: CRITICAL - bodyHtml is empty! Images found: ${imgCount}, SVG found: ${svgCount}`);
      // Try one more time with a different approach
      const allContent = $.root().html();
      if (allContent) {
        bodyHtml = allContent;
        console.log(`[EPUB] Chapter ${index + 1}: Using root content as fallback (${bodyHtml.length} chars)`);
      }
    }
    
    // Debug: Check HTML before sanitization
    const hasDataUriInHtml = bodyHtml ? bodyHtml.includes("data:image") : false;
    if (bodyHtml && imgCount > 0) {
      console.log(`[EPUB] Chapter ${index + 1}: HTML contains data URIs: ${hasDataUriInHtml}, HTML length: ${bodyHtml.length}`);
    }
    
    // For chapters with images/SVG, skip aggressive sanitization and use cheerio HTML directly
    // We've already removed scripts and processed images, so we can trust the content
    let content = "";
    
    // Check if chapter has visual content before sanitization
    const hasVisualContentBeforeSanitize = imgCount > 0 || svgCount > 0 || $("[style*='background-image']").length > 0;
    
    if (hasVisualContentBeforeSanitize) {
      // Use cheerio HTML directly for visual content - it's already been processed
      if ($("body").length > 0) {
        content = $("body").html() || "";
      } else {
        content = $.html() || "";
        // Clean up HTML wrapper if present
        const bodyMatch = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        if (bodyMatch) {
          content = bodyMatch[1];
        } else {
          // Remove DOCTYPE and html/head tags
          content = content.replace(/<!DOCTYPE[^>]*>/i, "")
            .replace(/<\/?html[^>]*>/gi, "")
            .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "")
            .trim();
        }
      }
      
      // We've already removed scripts with $("script").remove(), so we can skip sanitization
      // for chapters with visual content to preserve images and ornaments
      // Just do a basic check to ensure no scripts slipped through
      if (content.includes("<script") || content.includes("javascript:")) {
        console.warn(`[EPUB] Chapter ${index + 1}: Found script tags, removing them`);
        const cleaned = load(content);
        cleaned("script").remove();
        cleaned("[onclick]").removeAttr("onclick");
        cleaned("[onerror]").removeAttr("onerror");
        content = cleaned.html() || content;
      }
      
      console.log(`[EPUB] Chapter ${index + 1}: Using unsanitized HTML for visual content. Length: ${content.length}, Images: ${(content.match(/<img/g) || []).length}, SVG: ${(content.match(/<svg/g) || []).length}, Data URIs: ${content.includes("data:image")}`);
    } else {
      // For text-only chapters, use normal sanitization
      content = bodyHtml ? sanitizeHtml(bodyHtml, sanitizeOptions) : "";
    }

    if (!content || content.trim().length === 0) {
      console.warn(`[EPUB] Chapter ${index + 1}: Content is empty after processing`);
      continue;
    }

    const contentDoc = load(content);
    const headingTitle = contentDoc("h1, h2, h3").first().text().trim();
    if (headingTitle) {
      title = headingTitle;
    }

    const plainText = contentDoc.text().replace(/\s+/g, " ").trim();
    const lowerTitle = title.toLowerCase();
    const isFrontMatter =
      lowerTitle.includes("contents") ||
      lowerTitle.includes("table") ||
      lowerTitle.includes("cover") ||
      lowerTitle.includes("title page") ||
      lowerTitle.includes("copyright") ||
      lowerTitle.includes("introduction");

    // Check if chapter has images, SVG, or other visual content
    let hasImages = contentDoc("img").length > 0;
    let hasSvg = contentDoc("svg").length > 0;
    let hasVisualContent = hasImages || hasSvg || contentDoc("[style*='background-image']").length > 0;
    
    // Verify images are present with data URIs if we expected them
    let finalHasImages = hasImages;
    let finalContentDoc = contentDoc;
    if (imgCount > 0 && !hasImages) {
      console.error(`[EPUB] Chapter ${index + 1}: WARNING - Expected ${imgCount} images but found ${hasImages ? contentDoc("img").length : 0} in final content!`);
      // Try to get content directly from cheerio one more time
      const directContent = $("body").length > 0 ? $("body").html() : $.html();
      if (directContent && directContent.includes("data:image")) {
        console.log(`[EPUB] Chapter ${index + 1}: Recovering content from cheerio directly`);
        content = directContent;
        // Reload contentDoc with recovered content
        finalContentDoc = load(content);
        finalHasImages = finalContentDoc("img").length > 0;
      }
    }
    
    // Don't filter out chapters with visual content, even if text is short
    // Only filter front matter if it has no visual content AND is very short
    if (plainText.length < 120 && isFrontMatter && !hasVisualContent) {
      console.log(`[EPUB] Skipping front matter chapter: ${title} (${plainText.length} chars, no visual content)`);
      continue;
    }

    // Update hasImages/hasSvg if we recovered content
    if (finalContentDoc !== contentDoc) {
      hasImages = finalHasImages;
      hasSvg = finalContentDoc("svg").length > 0;
    }
    // Recalculate hasVisualContent based on current state
    hasVisualContent = hasImages || hasSvg || finalContentDoc("[style*='background-image']").length > 0;
    
    // Debug: Log chapter info
    if (hasVisualContent) {
      const finalImgCount = finalContentDoc("img").length;
      const finalSvgCount = finalContentDoc("svg").length;
      const hasDataUris = content.includes("data:image");
      console.log(`[EPUB] Chapter ${index + 1} "${title}": ${plainText.length} chars, ${finalImgCount} images, ${finalSvgCount} SVG, data URIs: ${hasDataUris}`);
    }

    chapters.push({
      title,
      content,
    });
  }

  let coverId =
    metadataMeta.find(
      (meta) => meta["@_name"]?.toLowerCase() === "cover" || meta["@_property"]?.toLowerCase() === "cover"
    )?.["@_content"] || readText(metadata?.cover);
  coverId = coverId?.trim();

  const coverItem =
    (coverId && manifest.find((item) => item["@_id"] === coverId)) ||
    manifest.find((item) => item["@_properties"]?.includes("cover-image")) ||
    manifest.find((item) => item["@_media-type"]?.startsWith("image/"));

  let coverImage: string | undefined;

  if (coverItem && coverItem["@_href"]) {
    const coverPath = resolveZipPath(baseDir, coverItem["@_href"]);
    const coverFile = zip.file(coverPath) || zip.file(decodeURIComponent(coverPath));
    if (coverFile) {
      const base64 = await coverFile.async("base64");
      const mediaType = coverItem["@_media-type"] || detectMimeFromExt(coverPath);
      coverImage = `data:${mediaType};base64,${base64}`;
    }
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
    coverImage,
    chapters,
  };
}
