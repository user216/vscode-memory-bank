import type { ItemType, ParsedItem } from "./types.js";
export declare function deriveId(filePath: string): string;
export declare function deriveType(filePath: string): ItemType;
export declare function deriveTitle(id: string, content: string): string;
export declare function extractMetadata(content: string): Record<string, string>;
export declare function extractSections(content: string): Record<string, string>;
export declare function extractCrossRefs(content: string): string[];
export declare function parseMarkdownFile(filePath: string, content: string): ParsedItem;
export declare function isIndexFile(filePath: string): boolean;
