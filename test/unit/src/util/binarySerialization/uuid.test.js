import {assertEquals, assertThrows} from "asserts";
import {binaryToUuid, uuidToBinary} from "../../../../../src/mod.js";

Deno.test({
	name: "uuidToBinary()",
	fn() {
		const result = uuidToBinary("01234567-89ab-cdef-0123-456789abcdef");
		const expected = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
		assertEquals(new Uint8Array(result), expected);
	},
});

Deno.test({
	name: "uuidToBinary(), all zeros",
	fn() {
		const result = uuidToBinary("00000000-0000-0000-0000-000000000000");
		const expected = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
		assertEquals(new Uint8Array(result), expected);
	},
});

Deno.test({
	name: "uuidToBinary() with null",
	fn() {
		const result = uuidToBinary(null);
		const expected = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
		assertEquals(new Uint8Array(result), expected);
	},
});

Deno.test({
	name: "uuidToBinary() with an invalid uuid should throw",
	fn() {
		assertThrows(() => {
			uuidToBinary("invalid");
		}, Error, `Failed to serialize uuid, string is not a valid uuid: "invalid"`);
	},
});

Deno.test({
	name: "binaryToUuid() with a buffer",
	fn() {
		const intView = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
		const result = binaryToUuid(intView.buffer);
		assertEquals(result, "01234567-89ab-cdef-0123-456789abcdef");
	},
});

Deno.test({
	name: "binaryToUuid() with a Uint8Array",
	fn() {
		const intView = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
		const result = binaryToUuid(intView);
		assertEquals(result, "01234567-89ab-cdef-0123-456789abcdef");
	},
});

Deno.test({
	name: "binaryToUuid(), with a Uint16Array",
	fn() {
		const int8View = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
		const int16View = new Uint16Array(int8View.buffer);
		const result = binaryToUuid(int16View);
		assertEquals(result, "01234567-89ab-cdef-0123-456789abcdef");
	},
});

Deno.test({
	name: "binaryToUuid(), all zeros",
	fn() {
		const intView = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
		const result = binaryToUuid(intView.buffer);
		assertEquals(result, null);
	},
});

Deno.test({
	name: "binaryToUuid(), invalid buffer length",
	fn() {
		const intView = new Uint8Array([0, 1, 2]);
		assertThrows(() => {
			binaryToUuid(intView.buffer);
		}, Error, "Failed to deserialize uuid, buffer is 3 bytes long, uuid buffers need to be 16 bytes long.");
	},
});
