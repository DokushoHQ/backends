/**
 * Local test script to validate chapter numbering with real WeebCentral series.
 *
 * Usage: pnpm dlx tsx test/local/chapter-numbering.ts
 */

import { WeebCentral } from "../../server/lib/scrapers/weebcentral"

const SEASON_SERIE_ID = "01J76XYESZW6RJD0T705G7W34J"
const NORMAL_SERIE_ID = "01J76XY7GSC6DZ9HPGAJ6TCC3Q"

async function testSerie(name: string, serieId: string) {
	console.log(`\n${"=".repeat(60)}`)
	console.log(`Testing: ${name}`)
	console.log(`Serie ID: ${serieId}`)
	console.log("=".repeat(60))

	const weebcentral = new WeebCentral({
		ENABLED_LANGUAGE: ["en"],
	})

	console.log(`\nFetching chapters from WeebCentral...`)
	const result = await weebcentral.fetchSerieChapters(serieId)

	console.log(`\nTotal chapters: ${result.chapters.length}`)
	console.log(`Missing chapters: ${result.missingChapters.length}`)

	// Show first 10 and last 10 chapters
	const first10 = result.chapters.slice(0, 10)
	const last10 = result.chapters.slice(-10)

	console.log(`\n--- First 10 chapters ---`)
	for (const ch of first10) {
		const title = Object.values(ch.title).flat()[0] ?? "?"
		const vol = ch.volumeNumber !== undefined ? ` (Vol ${ch.volumeNumber})` : ""
		console.log(`  #${ch.chapterNumber}${vol}: ${title}`)
	}

	if (result.chapters.length > 20) {
		console.log(`  ... (${result.chapters.length - 20} more chapters) ...`)
	}

	console.log(`\n--- Last 10 chapters ---`)
	for (const ch of last10) {
		const title = Object.values(ch.title).flat()[0] ?? "?"
		const vol = ch.volumeNumber !== undefined ? ` (Vol ${ch.volumeNumber})` : ""
		console.log(`  #${ch.chapterNumber}${vol}: ${title}`)
	}

	// Check for duplicate chapter numbers
	const chapterNumbers = result.chapters.map(c => c.chapterNumber)
	const duplicates = chapterNumbers.filter((num, idx) => chapterNumbers.indexOf(num) !== idx)
	if (duplicates.length > 0) {
		console.log(`\n⚠️  Duplicate chapter numbers found: ${[...new Set(duplicates)].join(", ")}`)
	} else {
		console.log(`\n✅ No duplicate chapter numbers`)
	}

	// Show missing chapters if any
	if (result.missingChapters.length > 0) {
		const missingPreview = result.missingChapters.slice(0, 20).join(", ")
		const more = result.missingChapters.length > 20 ? ` ... and ${result.missingChapters.length - 20} more` : ""
		console.log(`\n📋 Missing chapters: ${missingPreview}${more}`)
	}
}

async function main() {
	console.log("Chapter Numbering Validation Test")
	console.log("==================================\n")

	await testSerie("Season-based serie", SEASON_SERIE_ID)
	await testSerie("Normal chapter serie", NORMAL_SERIE_ID)

	console.log("\n\nDone!")
}

main().catch(console.error)
