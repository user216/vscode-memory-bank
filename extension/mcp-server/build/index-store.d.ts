import * as fs from "node:fs";
import MiniSearch from "minisearch";
import type { ParsedItem } from "./types.js";
export interface LinkEntry {
    target: string;
    relation: string;
}
export interface IncomingLinkEntry {
    source: string;
    relation: string;
}
export interface IndexStore {
    items: Map<string, ParsedItem>;
    search: MiniSearch;
    outgoing: Map<string, LinkEntry[]>;
    incoming: Map<string, IncomingLinkEntry[]>;
    tags: Map<string, Set<string>>;
    memoryBankPath: string;
}
export declare function getStore(): IndexStore;
export declare function initStore(memoryBankPath: string): IndexStore;
export declare function addItemToStore(s: IndexStore, parsed: ParsedItem): void;
export declare function removeItemFromStore(s: IndexStore, id: string): void;
export declare function addLinkToStore(s: IndexStore, source: string, target: string, relation: string): boolean;
export declare function removeLinkFromStore(s: IndexStore, source: string, target: string, relation: string): boolean;
export declare function reindexFile(s: IndexStore, filePath: string): void;
export declare function generateExcerpt(content: string, query: string, maxLength?: number): string;
export declare function watchMemoryBank(s: IndexStore): fs.FSWatcher;
