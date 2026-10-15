export const ARTWORK_LIMITS=Object.freeze({fileBytes:4000000,requestBytes:32000000,files:60,retainedBytes:500000000,dailyBytes:100000000,monthlyBytes:500000000,dailyRequests:20,monthlyRequests:400,monthlyOperations:10000,retentionSeconds:604800});
export const artworkId=value=>typeof value==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(value);
export const artworkHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
