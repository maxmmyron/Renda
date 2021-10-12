export {StorageType, default as BinaryComposer} from "./BinaryComposer.js";
export {default as BinaryDecomposer} from "./BinaryDecomposer.js";
export {default as MultiKeyWeakMap} from "./MultiKeyWeakMap.js";
export {default as OrbitControls} from "./OrbitControls.js";
export {default as SingleInstancePromise} from "./SingleInstancePromise.js";

export async function *streamAsyncIterator(stream) {
	const reader = stream.getReader();
	try {
		while (true) {
			const {done, value} = await reader.read();
			if (done) return;
			yield value;
		}
	} finally {
		reader.releaseLock();
	}
}

export function isUuid(uuidStr) {
	const re = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gmi;
	return re.test(uuidStr);
}

export function arrayBufferToBase64(buffer) {
	let binaryStr = "";
	const bytes = new Uint8Array(buffer);
	const length = bytes.byteLength;
	for (let i = 0; i < length; i++) {
		binaryStr += String.fromCharCode(bytes[i]);
	}
	return btoa(binaryStr);
}

export function base64ToArrayBuffer(base64) {
	const binaryStr = atob(base64);
	const length = binaryStr.length;
	const bytes = new Uint8Array(length);
	for (let i = 0; i < length; i++) {
		bytes[i] = binaryStr.charCodeAt(i);
	}
	return bytes.buffer;
}
