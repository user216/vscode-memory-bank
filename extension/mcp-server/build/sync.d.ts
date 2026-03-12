import * as fs from "node:fs";
export declare function syncAllFiles(memoryBankPath: string): number;
export declare function syncSingleFile(memoryBankPath: string, filePath: string): void;
export declare function watchMemoryBank(memoryBankPath: string): fs.FSWatcher;
