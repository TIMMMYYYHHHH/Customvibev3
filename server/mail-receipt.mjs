// Provider receipt identifiers are opaque, bounded values, never delivery evidence.
// Pure and shared by the initial/manual server paths and private state writers.
export const validProviderMessageId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(value);
