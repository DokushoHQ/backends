/**
 * Find the position of the fingerprint sequence in the collected IDs.
 * Returns the index where the fingerprint starts, or -1 if not found.
 */
export function findFingerprintPosition(collectedIds: string[], fingerprint: string[]): number {
	if (fingerprint.length === 0) return -1

	for (let i = 0; i <= collectedIds.length - fingerprint.length; i++) {
		let match = true
		for (let j = 0; j < fingerprint.length; j++) {
			if (collectedIds[i + j] !== fingerprint[j]) {
				match = false
				break
			}
		}
		if (match) return i
	}
	return -1
}
