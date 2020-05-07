export function encode_string (str: string): Uint8Array {
	// TODO add support for unicode ( yes I know it should already... )
	const chars = [...str];
	const result = new Uint8Array(chars.length);
	
	for (let i = 0; i < chars.length; i++) {
		const code = chars[i].charCodeAt(0);
		if (code > 127) {
			throw new Error("Unable to encode non-ascii characters");
		}
		result[i] = code;
	}
	
	return result;
}