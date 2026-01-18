import type { BackupParser } from "./types"
import { TmbBackupParser } from "./tmb"
import { DokushoBackupParser } from "./dokusho"
import { TachiyomiBackupParser } from "./tachiyomi"

export * from "./types"

/**
 * Registry of all available backup parsers
 */
const parsers: Map<string, BackupParser> = new Map()

// Register built-in parsers
registerParser(new TmbBackupParser())
registerParser(new DokushoBackupParser())
registerParser(new TachiyomiBackupParser())

/**
 * Register a backup parser
 */
export function registerParser(parser: BackupParser): void {
	parsers.set(parser.type, parser)
}

/**
 * Get a parser by type
 */
export function getParser(type: string): BackupParser | undefined {
	return parsers.get(type)
}

/**
 * Get all registered parsers
 */
export function getAllParsers(): BackupParser[] {
	return [...parsers.values()]
}

/**
 * Find a parser by file extension
 */
export function getParserByExtension(filename: string): BackupParser | undefined {
	const lowerFilename = filename.toLowerCase()
	for (const parser of parsers.values()) {
		if (parser.extensions.some(ext => lowerFilename.endsWith(ext))) {
			return parser
		}
	}
	return undefined
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
	const extensions: string[] = []
	for (const parser of parsers.values()) {
		extensions.push(...parser.extensions)
	}
	return extensions
}
