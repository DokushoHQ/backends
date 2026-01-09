import { FlowProducer } from "bullmq"

let _flowProducer: FlowProducer | null = null

export function getFlowProducer(): FlowProducer {
	if (!_flowProducer) {
		const config = useRuntimeConfig()
		_flowProducer = new FlowProducer({
			connection: {
				url: config.redisUrl,
				maxRetriesPerRequest: null,
			},
		})
	}
	return _flowProducer
}

export async function closeFlowProducer(): Promise<void> {
	if (_flowProducer) {
		await _flowProducer.close()
		_flowProducer = null
	}
}
