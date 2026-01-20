/**
 * Local test script to validate WeebCentral CSS selectors work correctly with Cheerio.
 *
 * This script fetches real HTML from WeebCentral and tests that the CSS selectors
 * (matching Mihon's implementation) correctly extract data.
 *
 * Usage: pnpm dlx tsx test/local/weebcentral-selectors.ts
 */

import { load } from "cheerio"

const BASE_URL = "https://weebcentral.com"
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:71.0) Gecko/20100101 Firefox/77.0"

// Test series - Solo Leveling (popular, has many chapters)
const TEST_SERIE_ID = "01J76XY7GSC6DZ9HPGAJ6TCC3Q"

interface TestResult {
	name: string
	passed: boolean
	message: string
	data?: unknown
}

const results: TestResult[] = []

function logTest(name: string, passed: boolean, message: string, data?: unknown) {
	results.push({ name, passed, message, data })
	const icon = passed ? "✅" : "❌"
	console.log(`${icon} ${name}: ${message}`)
	if (data && !passed) {
		console.log("   Data:", JSON.stringify(data, null, 2).slice(0, 500))
	}
}

async function fetchHtml(url: string): Promise<string> {
	const response = await fetch(url, {
		headers: { "User-Agent": USER_AGENT },
	})
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`)
	}
	return response.text()
}

async function testChapterListSelectors() {
	console.log("\n" + "=".repeat(60))
	console.log("Testing Chapter List Selectors")
	console.log("=".repeat(60) + "\n")

	const url = `${BASE_URL}/series/${TEST_SERIE_ID}/full-chapter-list`
	console.log(`Fetching: ${url}\n`)

	const html = await fetchHtml(url)
	const $ = load(html)

	// Test 1: Main selector - div[x-data] > a
	const chapterLinks = $("div[x-data] > a")
	logTest(
		"Main selector: div[x-data] > a",
		chapterLinks.length > 0,
		`Found ${chapterLinks.length} chapter links`,
	)

	if (chapterLinks.length === 0) {
		// Try alternative selectors to debug
		console.log("\n--- Debugging: Trying alternative selectors ---")
		console.log(`div[x-data]: ${$("div[x-data]").length} elements`)
		console.log(`a[href*="/chapters/"]: ${$("a[href*=\"/chapters/\"]").length} elements`)
		console.log(`div.flex.items-center: ${$("div.flex.items-center").length} elements`)
		return
	}

	// Test first chapter link
	const firstLink = chapterLinks.first()
	const href = firstLink.attr("href")

	// Test 2: href contains /chapters/
	const hasChapterHref = href?.includes("/chapters/")
	logTest(
		"Chapter href pattern",
		!!hasChapterHref,
		hasChapterHref ? `href: ${href}` : `Invalid href: ${href}`,
	)

	// Test 3: Title selector - span.flex > span
	const titleSpan = firstLink.find("span.flex > span").first()
	const titleText = titleSpan.text().trim()
	logTest(
		"Title selector: span.flex > span",
		titleText.length > 0,
		titleText.length > 0 ? `Title: "${titleText}"` : "No title found",
	)

	// Test 4: Date selector - time[datetime]
	const timeElement = firstLink.find("time[datetime]")
	const datetime = timeElement.attr("datetime")
	logTest(
		"Date selector: time[datetime]",
		!!datetime,
		datetime ? `datetime: ${datetime}` : "No datetime found",
	)

	// Test 5: SVG stroke for scanlator detection
	const svg = firstLink.find("svg")
	const stroke = svg.attr("stroke")
	logTest(
		"SVG stroke for scanlator",
		svg.length > 0,
		svg.length > 0 ? `stroke: ${stroke || "(no stroke)"}` : "No SVG found",
	)

	// Show sample of parsed chapters
	console.log("\n--- Sample parsed chapters (first 5) ---")
	chapterLinks.slice(0, 5).each((i, el) => {
		const $el = $(el)
		const chHref = $el.attr("href")
		const chTitle = $el.find("span.flex > span").first().text().trim()
		const chDate = $el.find("time[datetime]").attr("datetime")
		const chStroke = $el.find("svg").attr("stroke")
		const scanlator = chStroke === "#d8b4fe" ? "Official" : chStroke === "#4C4D54" ? "Unknown" : "-"
		console.log(`  ${i + 1}. "${chTitle}" | ${chDate} | ${scanlator} | ${chHref?.split("/").pop()}`)
	})

	// Return a chapter ID for next test
	const chapterMatch = href?.match(/\/chapters\/([^/]+)/)
	return chapterMatch?.[1]
}

async function testChapterImagesSelectors(chapterId: string) {
	console.log("\n" + "=".repeat(60))
	console.log("Testing Chapter Images Selectors")
	console.log("=".repeat(60) + "\n")

	const url = `${BASE_URL}/chapters/${chapterId}/images?is_prev=False&reading_style=long_strip`
	console.log(`Fetching: ${url}\n`)

	const html = await fetchHtml(url)
	const $ = load(html)

	// Test 1: Main selector - section[x-data*=scroll] > img
	// Note: Mihon uses ~= but that matches space-separated words, not substrings
	// WeebCentral's x-data contains "scrollDown()" etc, so we use *= for substring match
	const images = $("section[x-data*=scroll] > img")
	logTest(
		"Main selector: section[x-data*=scroll] > img",
		images.length > 0,
		`Found ${images.length} images`,
	)

	if (images.length === 0) {
		// Debug alternative selectors
		console.log("\n--- Debugging: Trying alternative selectors ---")
		console.log(`section[x-data]: ${$("section[x-data]").length} elements`)
		console.log(`section[x-data] (attrs):`, $("section[x-data]").map((_, el) => $(el).attr("x-data")).get().slice(0, 3))
		console.log(`img: ${$("img").length} elements`)
		console.log(`section > img: ${$("section > img").length} elements`)

		// Try to find the correct attribute
		$("section[x-data]").each((i, el) => {
			const xData = $(el).attr("x-data") || ""
			const imgCount = $(el).find("> img").length
			if (imgCount > 0) {
				console.log(`Found section with ${imgCount} direct img children, x-data="${xData.slice(0, 50)}..."`)
			}
		})
		return
	}

	// Test 2: Image src attribute
	const firstImg = images.first()
	const src = firstImg.attr("src")
	logTest(
		"Image src attribute",
		!!src && src.startsWith("http"),
		src ? `src: ${src.slice(0, 80)}...` : "No src found",
	)

	// Show sample of parsed images
	console.log("\n--- Sample parsed images (first 5) ---")
	images.slice(0, 5).each((i, el) => {
		const imgSrc = $(el).attr("src")
		console.log(`  ${i + 1}. ${imgSrc?.split("/").pop()}`)
	})
}

async function main() {
	console.log("WeebCentral CSS Selector Validation Test")
	console.log("========================================")
	console.log(`Testing with serie: ${TEST_SERIE_ID}`)

	try {
		const chapterId = await testChapterListSelectors()

		if (chapterId) {
			await testChapterImagesSelectors(chapterId)
		}
		else {
			console.log("\n⚠️  Skipping chapter images test - no chapter ID obtained")
		}

		// Summary
		console.log("\n" + "=".repeat(60))
		console.log("SUMMARY")
		console.log("=".repeat(60))
		const passed = results.filter(r => r.passed).length
		const failed = results.filter(r => !r.passed).length
		console.log(`✅ Passed: ${passed}`)
		console.log(`❌ Failed: ${failed}`)

		if (failed > 0) {
			console.log("\nFailed tests:")
			results.filter(r => !r.passed).forEach((r) => {
				console.log(`  - ${r.name}: ${r.message}`)
			})
			process.exit(1)
		}
	}
	catch (error) {
		console.error("\n❌ Test failed with error:", error)
		process.exit(1)
	}
}

main()
