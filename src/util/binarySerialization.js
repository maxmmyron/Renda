import {stringArrayEquals} from "./stringArrayEquals.js";
import {clamp, isUuid} from "./util.js";

/** @typedef {Object.<string, number>} BinarySerializationNameIds */

/**
 * @template {import("./binarySerializationTypes.js").AllowedStructureFormat} T
 * @typedef {Object} ObjectToBinaryOptions
 * @property {T} structure
 * @property {BinarySerializationNameIds} nameIds
 * @property {boolean} [littleEndian = true]
 * @property {boolean} [useHeaderByte = true]
 * @property {BinarySerializationVariableLengthStorageTypes?} [variableLengthStorageTypes = true]
 * @property {ObjectToBinaryTransformValueHook?} [transformValueHook = null]
 * @property {import("../../editor/src/assets/AssetManager.js").AssetManager?} [editorAssetManager = null]
 */

/**
 * @template {import("./binarySerializationTypes.js").AllowedStructureFormat} T
 * @typedef {Omit<ObjectToBinaryOptions<T>,"transformValueHook"> & {transformValueHook?: BinaryToObjectTransformValueHook?}} BinaryToObjectOptions
 */

/**
 * @template {import("./binarySerializationTypes.js").AllowedStructureFormat} T
 * @typedef {Object} BinaryToObjectWithAssetLoaderOptions
 * @property {T} structure
 * @property {BinarySerializationNameIds} nameIds
 * @property {boolean} [littleEndian = true]
 */

/**
 * @typedef {Object} BinarySerializationVariableLengthStorageTypes
 * @property {AllStorageTypes} [refId = StorageType.NULL]
 * @property {AllStorageTypes} [array = StorageType.UINT8]
 * @property {AllStorageTypes} [string = StorageType.UINT16]
 * @property {AllStorageTypes} [arrayBuffer = StorageType.UINT16]
 */

/**
 * @typedef {Object} BinaryToObjectTransformValueHookArgs
 * @property {unknown} value The value of the property before the transformation.
 * @property {StorageType} type The type of the property before the transformation.
 * @property {Object.<string | number, unknown>} placedOnObject The object the property will be placed on, use this with `placedOnKey` if you want to place it yourself in a promise.
 * @property {string | number} placedOnKey The key of the property.
 */

/** @typedef {(opts: BinaryToObjectTransformValueHookArgs) => unknown?} BinaryToObjectTransformValueHook */

/**
 * @typedef {Object} ObjectToBinaryTransformValueHookArgs
 * @property {unknown} value The value of the property before the transformation.
 * @property {StorageType} type The type of the property before the transformation.
 */

/** @typedef {(opts: ObjectToBinaryTransformValueHookArgs) => void} ObjectToBinaryTransformValueHook */

/**
 * @typedef {Object} BinarySerializationBinaryDigestible
 * @property {*} value
 * @property {StorageType} type
 * @property {boolean} [variableArrayLength = false]
 */

/** @typedef {{id: number, type: StorageType}} TraversedLocationData */

/**
 * @typedef BinarySerializationStructureDigestibleBase
 * @property {StorageType} type
 * @property {TraversedLocationData[]} location
 */

/**
 * @typedef {BinarySerializationStructureDigestibleBase & {
 *	structureRef: import("./binarySerializationTypes.js").AllowedStructureFormat,
 * }} BinarySerializationStructureDigestibleReference
 */

/**
 * @typedef {BinarySerializationStructureDigestibleBase & {
 *	arrayType: BinarySerializationStructureDigestible,
 * }} BinarySerializationStructureDigestibleVariableLengthArray
 */

/**
 * @typedef {BinarySerializationStructureDigestibleBase & {
 *	childData: any,
 * }} BinarySerializationStructureDigestibleObjectOrArray
 */

/**
 * @typedef {BinarySerializationStructureDigestibleBase & {
 *	enumStrings: string[],
 * }} BinarySerializationStructureDigestibleEnum
 */

/**
 * @typedef {BinarySerializationStructureDigestibleBase & {
 *	unionDigestables: BinarySerializationStructureDigestible[],
 *	flattenedUnionDigestables?: BinarySerializationStructureDigestible[][],
 *	typeIndexStorageType: AllStorageTypes,
 * }} BinarySerializationStructureDigestibleUnion
 */

/**
 * @typedef {BinarySerializationStructureDigestibleBase | BinarySerializationStructureDigestibleReference | BinarySerializationStructureDigestibleVariableLengthArray | BinarySerializationStructureDigestibleObjectOrArray | BinarySerializationStructureDigestibleEnum | BinarySerializationStructureDigestibleUnion} BinarySerializationStructureDigestible
 */

/**
 * @typedef CollectedReferenceLinkBase
 * @property {number} refId
 * @property {TraversedLocationData[]} location
 * @property {number} injectIntoRefId
 */

/**
 * @typedef {CollectedReferenceLinkBase & {
 *	variableLengthArrayIndex: number,
 * }} CollectedReferenceLinkVariableLengthArray
 */

/** @typedef {CollectedReferenceLinkBase | CollectedReferenceLinkVariableLengthArray} CollectedReferenceLink */

/**
 * @typedef StructureRefData
 * @property {import("./binarySerializationTypes.js").AllowedStructureFormat} structureRef
 * @property {Object | null} [reconstructedData]
 */

/** @typedef {Map<string, number>} NameIdsMap */

/**
 * @readonly
 * @enum {number}
 */
export const StorageType = /** @type {const} */ ({
	INT8: 1,
	INT16: 2,
	INT32: 3,
	UINT8: 4,
	UINT16: 5,
	UINT32: 6,
	FLOAT32: 7,
	FLOAT64: 8,
	ARRAY: 9,
	OBJECT: 10,
	STRING: 11,
	BOOL: 12,
	UUID: 13,
	ASSET_UUID: 14, // same as UUID but will load the asset when binaryToObjectWithAssetLoader() is used
	ARRAY_BUFFER: 15,
	NULL: 16,
	/**
	 * If the first item of a structure array contains this value, the object is expected to have
	 * the type of one of the items in the array.
	 */
	UNION_ARRAY: 17,
});

/**
 * Use this to access the const values of the `StorageType` enum from TypeScript.
 * @typedef {typeof StorageType} StorageTypeEnum
 */
/**
 * A union of all the possible storage types.
 * @typedef {StorageTypeEnum[keyof StorageTypeEnum]} AllStorageTypes
 */

/** @type {Required<BinarySerializationVariableLengthStorageTypes>} */
const defaultVariableLengthStorageTypes = {
	refId: StorageType.NULL,
	array: StorageType.UINT8,
	string: StorageType.UINT16,
	arrayBuffer: StorageType.UINT16,
};

const HeaderBits = {
	hasCustomVariableLengthStorageTypes: 0b00000001,
};

/**
 * @param {import("./util.js").UuidString?} uuidStr
 */
export function uuidToBinary(uuidStr) {
	const buffer = new ArrayBuffer(16);
	if (!uuidStr) return buffer;
	if (!isUuid(uuidStr)) {
		throw new Error(`Failed to serialize uuid, string is not a valid uuid: "${uuidStr}"`);
	}
	let i = 0; let j = 0;
	const view = new DataView(buffer);
	while (i < uuidStr.length) {
		if (uuidStr[i] == "-") i++;
		const hex = uuidStr.slice(i, i + 2);
		const int = parseInt(hex, 16);
		view.setUint8(j++, int);
		i += 2;
	}
	return buffer;
}

/**
 * Converts binary data to a uuid string. The provided buffer must be at least
 * 16 bytes long. If an offset is provided, the buffer must be at least
 * offset + 16 bytes long. Otherwise the function will throw.
 * @param {ArrayBufferLike & {buffer?: undefined}} buffer
 */
export function binaryToUuid(buffer, offset = 0) {
	offset = clamp(offset, 0, buffer.byteLength);
	const viewByteLength = clamp(buffer.byteLength - offset, 0, 16);
	const bufferView = new Uint8Array(buffer, offset, viewByteLength);
	if (bufferView.byteLength != 16) {
		throw new Error(`Failed to deserialize uuid, buffer is ${bufferView.byteLength} bytes long, uuid buffers need to be at least 16 bytes long.`);
	}
	let allZeros = true;
	let str = "";
	for (let i = 0; i < 16; i++) {
		const intValue = bufferView[i];
		if (intValue != 0) allZeros = false;
		str += intValue.toString(16).padStart(2, "0");
		if (i == 3 || i == 5 || i == 7 || i == 9) str += "-";
	}
	if (allZeros) return null;
	return str;
}

/**
 * Helper function to create a ObjectToBinaryOptions object.
 * In JavaScript, this simply returns the object you pass in.
 * But in TypeScript the returned type will be one that you can use for
 * {@linkcode objectToBinary} or {@linkcode binaryToObject}.
 * The benefit of this function is that you'll get autocomplete when composing
 * the options object, while still getting a meaningful return type.
 *
 * @template {import("./binarySerializationTypes.js").AllowedStructureFormat} T
 * @param {ObjectToBinaryOptions<T>} options
 * @returns {ObjectToBinaryOptions<T>}
 */
export function createObjectToBinaryOptions(options) {
	return options;
}

/**
 * @template {import("./binarySerializationTypes.js").AllowedStructureFormat} T
 * @param {import("./binarySerializationTypes.js").StructureToObject<T, true>} data
 * @param {ObjectToBinaryOptions<T>} opts
 * @returns {ArrayBuffer}
 */
export function objectToBinary(data, {
	structure,
	nameIds,
	littleEndian = true,
	useHeaderByte = true,
	variableLengthStorageTypes = null,
	transformValueHook = null,
	editorAssetManager = null,
}) {
	const nameIdsMap = new Map(Object.entries(nameIds));

	const castData = /** @type {import("./binarySerializationTypes.js").AllowedStructureFormat} */ (data);
	const reoccurringDataReferences = collectReoccurringReferences(castData, nameIdsMap, false);
	// const reoccurringStructureReferences = collectReoccurringReferences(structure, nameIdsMap, true);

	const referencesAndStructures = getStoreAsReferenceItems(reoccurringDataReferences, castData, structure, nameIdsMap);

	const referenceIds = new Map();
	const sortedReferences = [];
	for (const [ref, structure] of referencesAndStructures) {
		const id = sortedReferences.length;
		referenceIds.set(ref, id);
		sortedReferences.push({ref, structure});
	}

	const highestReferenceId = sortedReferences.length - 1;
	const {type: refIdStorageType} = requiredStorageTypeForUint(highestReferenceId);

	/** @type {BinarySerializationBinaryDigestible[]} */
	const binaryDigestable = [];
	for (const {ref, structure} of sortedReferences) {
		const digestable = generateBinaryDigestable(ref, structure, {referenceIds, nameIdsMap, isInitialItem: true});
		binaryDigestable.push(digestable);
	}

	const biggestVariableArrayLength = findBiggestVariableArrayLength(binaryDigestable);
	const dataContainsVariableLengthArrays = biggestVariableArrayLength >= 0;
	const {type: arrayLengthStorageType} = requiredStorageTypeForUint(biggestVariableArrayLength);

	const biggestStringLength = 600; // todo
	const {type: stringLengthStorageType, bytes: stringLengthByteLength} = requiredStorageTypeForUint(biggestStringLength);

	const biggestArrayBufferLength = 600; // todo
	const {type: arrayBufferLengthStorageType, bytes: arrayBufferLengthByteLength} = requiredStorageTypeForUint(biggestArrayBufferLength);

	const flattened = Array.from(flattenBinaryDigestable(binaryDigestable, arrayLengthStorageType));
	// console.log(flattened);

	for (const item of flattened) {
		if (item.type == StorageType.OBJECT || item.type == StorageType.ARRAY) {
			item.type = refIdStorageType;
		}
	}

	const textEncoder = new TextEncoder();
	let totalByteLength = 0;
	let hasCustomVariableLengthStorageTypes = false;
	if (useHeaderByte) {
		totalByteLength++;
		variableLengthStorageTypes = {
			...defaultVariableLengthStorageTypes,
			...variableLengthStorageTypes,
		};
		hasCustomVariableLengthStorageTypes =
				refIdStorageType != variableLengthStorageTypes.refId ||
				(arrayLengthStorageType != variableLengthStorageTypes.array && dataContainsVariableLengthArrays) ||
				stringLengthStorageType != variableLengthStorageTypes.string ||
				arrayBufferLengthStorageType != variableLengthStorageTypes.arrayBuffer;

		if (hasCustomVariableLengthStorageTypes) totalByteLength++;
	}
	for (const item of flattened) {
		if (transformValueHook) {
			item.value = transformValueHook({type: item.type, value: item.value});
		}
		const {length, value} = getStructureTypeLength(item.type, {
			value: item.value,
			textEncoder, stringLengthByteLength, arrayBufferLengthByteLength,
		});
		totalByteLength += length;
		if (value) item.value = value;
	}

	const buffer = new ArrayBuffer(totalByteLength);
	const dataView = new DataView(buffer);
	let byteOffset = 0;

	if (useHeaderByte) {
		let headerByte = 0;

		if (hasCustomVariableLengthStorageTypes) {
			headerByte |= HeaderBits.hasCustomVariableLengthStorageTypes;
		}

		byteOffset += setDataViewValue(dataView, headerByte, StorageType.UINT8, byteOffset, {littleEndian});

		if (hasCustomVariableLengthStorageTypes) {
			const refIdStorageTypeBits = variableLengthStorageTypeToBits(refIdStorageType);
			const arrayLengthStorageTypeBits = variableLengthStorageTypeToBits(arrayLengthStorageType);
			const stringLengthStorageTypeBits = variableLengthStorageTypeToBits(stringLengthStorageType);
			const arrayBufferLengthStorageTypeBits = variableLengthStorageTypeToBits(arrayBufferLengthStorageType);

			let customStorageTypesByte = 0;
			customStorageTypesByte |= refIdStorageTypeBits;
			customStorageTypesByte |= arrayLengthStorageTypeBits << 2;
			customStorageTypesByte |= stringLengthStorageTypeBits << 4;
			customStorageTypesByte |= arrayBufferLengthStorageTypeBits << 6;

			byteOffset += setDataViewValue(dataView, customStorageTypesByte, StorageType.UINT8, byteOffset, {littleEndian});
		}
	}

	for (const item of flattened) {
		const bytesMoved = setDataViewValue(dataView, item.value, item.type, byteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, editorAssetManager});
		byteOffset += bytesMoved;
	}

	return buffer;
}

/**
 * @template {import("./binarySerializationTypes.js").AllowedStructureFormat} T
 * @param {ArrayBuffer} buffer
 * @param {BinaryToObjectOptions<T>} opts
 * @returns {import("./binarySerializationTypes.js").StructureToObject<T>}
 */
export function binaryToObject(buffer, {
	structure,
	nameIds,
	littleEndian = true,
	useHeaderByte = true,
	variableLengthStorageTypes = null,
	transformValueHook = null,
}) {
	const nameIdsMap = new Map(Object.entries(nameIds));
	const nameIdsMapInverse = new Map(Object.entries(nameIds).map(([k, v]) => [v, k]));

	const reoccurringStructureReferences = collectReoccurringReferences(structure, nameIdsMap, true);
	/** @type {Set<import("./binarySerializationTypes.js").AllowedStructureFormat>} */
	const references = new Set([structure, ...reoccurringStructureReferences]);

	/** @type {Map<any,BinarySerializationStructureDigestible[]>} */
	const structureDigestables = new Map();
	for (const structureRef of references) {
		const digestable = generateStructureDigestable(structureRef, [], {nameIdsMap, reoccurringStructureReferences, isInitialItem: true});
		const flattened = Array.from(flattenStructureDigestable(digestable));
		structureDigestables.set(structureRef, flattened);
	}

	/** @type {Required<BinarySerializationVariableLengthStorageTypes>} */
	const useVariableLengthStorageTypes = {
		...defaultVariableLengthStorageTypes,
		...variableLengthStorageTypes,
	};
	let refIdStorageType = useVariableLengthStorageTypes.refId;
	let arrayLengthStorageType = useVariableLengthStorageTypes.array;
	let stringLengthStorageType = useVariableLengthStorageTypes.string;
	let arrayBufferLengthStorageType = useVariableLengthStorageTypes.arrayBuffer;

	const dataView = new DataView(buffer);
	let byteOffset = 0;
	if (useHeaderByte) {
		const {value: headerByte, bytesMoved} = getDataViewValue(dataView, StorageType.UINT8, byteOffset, {littleEndian});
		byteOffset += bytesMoved;

		const hasCustomVariableLengthStorageTypes = !!(headerByte & HeaderBits.hasCustomVariableLengthStorageTypes);

		if (hasCustomVariableLengthStorageTypes) {
			const {value: customStorageTypesByte, bytesMoved} = getDataViewValue(dataView, StorageType.UINT8, byteOffset, {littleEndian});
			byteOffset += bytesMoved;

			const refIdStorageTypeBits = (customStorageTypesByte) & 0b00000011;
			const arrayLengthStorageTypeBits = (customStorageTypesByte >> 2) & 0b00000011;
			const stringLengthStorageTypeBits = (customStorageTypesByte >> 4) & 0b00000011;
			const arrayBufferLengthStorageTypeBits = (customStorageTypesByte >> 6) & 0b00000011;

			refIdStorageType = variableLengthBitsToStorageType(refIdStorageTypeBits);
			arrayLengthStorageType = variableLengthBitsToStorageType(arrayLengthStorageTypeBits);
			stringLengthStorageType = variableLengthBitsToStorageType(stringLengthStorageTypeBits);
			arrayBufferLengthStorageType = variableLengthBitsToStorageType(arrayBufferLengthStorageTypeBits);
		}
	}
	const textDecoder = new TextDecoder();
	/** @type {Map<number, StructureRefData>} */
	const structureDataById = new Map();
	structureDataById.set(0, {structureRef: structure});

	/** @type {CollectedReferenceLink[]} */
	const collectedReferenceLinks = [];

	const unparsedStructureIds = new Set([0]);
	let parsingStructureId = 0;
	while (unparsedStructureIds.size > 0) {
		const structureData = structureDataById.get(parsingStructureId);
		if (!structureData) {
			throw new Error(`Assertion failed, no structure data for id ${parsingStructureId}`);
		}
		const structureRef = structureData.structureRef;
		let reconstructedData = null;

		const digestables = structureDigestables.get(structureRef);
		if (!digestables) throw new Error("Assertion error, no digestables found for structureRef");
		for (const digestable of digestables) {
			const {newByteOffset, newReconstructedData} = parseStructureDigestable({
				digestable,
				reconstructedData,
				dataView,
				byteOffset,
				littleEndian,
				textDecoder,
				nameIdsMapInverse,
				transformValueHook,
				collectedReferenceLinks,
				parsingStructureId,
				refIdStorageType,
				structureDataById,
				unparsedStructureIds,
				arrayLengthStorageType,
				stringLengthStorageType,
				arrayBufferLengthStorageType,
			});
			byteOffset = newByteOffset;
			reconstructedData = newReconstructedData;
		}

		structureData.reconstructedData = reconstructedData;

		unparsedStructureIds.delete(parsingStructureId);
		parsingStructureId++;
	}

	for (const referenceLink of collectedReferenceLinks) {
		const {refId, location, injectIntoRefId} = referenceLink;
		let variableLengthArrayIndex;
		if ("variableLengthArrayIndex" in referenceLink) {
			variableLengthArrayIndex = referenceLink.variableLengthArrayIndex;
		} else {
			variableLengthArrayIndex = undefined;
		}
		const structureData = structureDataById.get(refId);
		if (!structureData) throw new Error(`Assertion failed, no structure data found for id ${refId}`);
		const value = structureData.reconstructedData;
		const injectIntoStructureData = structureDataById.get(injectIntoRefId);
		if (!injectIntoStructureData) throw new Error(`Assertion failed, no structure data found for id ${injectIntoRefId}`);
		let injectIntoRef = injectIntoStructureData.reconstructedData;
		injectIntoRef = resolveBinaryValueLocation(injectIntoRef || null, {nameIdsMapInverse, value, location, variableLengthArrayIndex});
		injectIntoStructureData.reconstructedData = injectIntoRef;
	}

	const structureData = structureDataById.get(0);
	if (!structureData) throw new Error("Assertion failed, no structure data found for id 0");
	if (!structureData.reconstructedData) throw new Error("Assertion failed, structure data for id 0 has no reconstructed data");
	return /** @type {any} */ (structureData.reconstructedData);
}

/**
 * Similar to binaryToObject() but replaces all uuids with assets.
 * @template {import("./binarySerializationTypes.js").AllowedStructureFormat} T
 * @param {ArrayBuffer} buffer
 * @param {import("../assets/AssetLoader.js").AssetLoader} assetLoader
 * @param {BinaryToObjectWithAssetLoaderOptions<T>} options
 */
export async function binaryToObjectWithAssetLoader(buffer, assetLoader, {
	structure,
	nameIds,
	littleEndian = true,
}) {
	// TODO: Make BinaryToObjectWithAssetLoaderOptions and ObjectToBinaryOptions the
	// same object and pass all options to the call below. Only change the transformValueHook

	// TODO: Call transformValueHook from the provided options inside the newly created
	// transformValueHook.

	/** @type {Promise<void>[]} */
	const promises = [];
	const obj = binaryToObject(buffer, {
		structure, nameIds, littleEndian,
		transformValueHook: ({value, type, placedOnObject, placedOnKey}) => {
			if (type != StorageType.ASSET_UUID) return value;
			if (value == null) return null;
			const castValue = /** @type {import("./util.js").UuidString} */ (value);
			const promise = (async () => {
				const asset = await assetLoader.getAsset(castValue);
				placedOnObject[placedOnKey] = asset;
			})();
			promises.push(promise);
			return null;
		},
	});
	await Promise.all(promises);
	return /** @type {import("./binarySerializationTypes.js").StructureToObjectWithAssetLoader<T>} */ (obj);
}

/**
 * Returns a Set of objects references that occur more than once in the data.
 * Only items that exist in the nameIdsMap will be parsed.
 * @param {import("./binarySerializationTypes.js").AllowedStructureFormat} data Either the data that needs to be converted or its structure.
 * @param {NameIdsMap} nameIdsMap
 * @param {boolean} isStructure Whether the first argument is the structure.
 * @returns {Set<import("./binarySerializationTypes.js").AllowedStructureFormat>} A set of objects that occur more than once in the data.
 */
function collectReoccurringReferences(data, nameIdsMap, isStructure) {
	const occurringReferences = new Set(); // references that have occured once
	const reoccurringReferences = new Set(); // references that have occured at least twice
	let prevReferences = [data];
	while (prevReferences.length > 0) {
		const newReferences = [];
		for (const ref of prevReferences) {
			if (typeof ref == "object" && ref != null) {
				if (occurringReferences.has(ref)) {
					reoccurringReferences.add(ref);
				} else {
					occurringReferences.add(ref);

					if (Array.isArray(ref)) {
						if (ref.length == 1 && isStructure) {
							// If the array structure only has one item, this array is expected
							// to have an arbitrary number of items, so it could have the same
							// reference in the data twice. Therefore we will assume arrays
							// with one item to always contain reoccurring references, even if
							// it occurs only once.
							newReferences.push(ref[0], ref[0]);
						} else {
							for (const item of ref) {
								newReferences.push(item);
							}
						}
					} else {
						for (const [key, val] of Object.entries(ref)) {
							if (nameIdsMap.has(key)) {
								newReferences.push(val);
							}
						}
					}
				}
			}
		}
		prevReferences = newReferences;
	}

	return reoccurringReferences;
}

/**
 * @private
 * @param {Object} options
 * @param {any} options.data
 * @param {import("./binarySerializationTypes.js").AllowedStructureFormat} options.structure
 * @param {NameIdsMap} options.nameIdsMap
 * @param {Map<Object, import("./binarySerializationTypes.js").AllowedStructureFormat>[]} options.existingItems
 * @param {Map<Object, import("./binarySerializationTypes.js").AllowedStructureFormat>} options.collectedItems
 * @param {Set<import("./binarySerializationTypes.js").AllowedStructureFormat>} options.forceUseAsReferences
 * @param {boolean} [options.isInitialItem]
 */
function collectStoredAsReferenceItems({data, structure, nameIdsMap, existingItems, collectedItems, forceUseAsReferences, isInitialItem = false}) {
	if (!isInitialItem) {
		for (const existingItemList of existingItems) {
			if (existingItemList.has(data)) return;
		}

		if (forceUseAsReferences.has(data)) {
			collectedItems.set(data, structure);
			return;
		}
	}

	if (typeof data == "object" && data != null) {
		if (Array.isArray(data)) {
			if (!(structure instanceof Array)) {
				throw new Error("The object provided contains an array where the structe does not.");
			}
			if (structure.length == 1) {
				const structureItem = structure[0];
				// todo: add some sort of way to store arrays with variable length with
				// the value in place rather than as reference
				if (typeof structureItem == "object" && structureItem != null) {
					for (const item of data) {
						collectedItems.set(item, structureItem);
					}
				}
			} else {
				for (let i = 0; i < data.length; i++) {
					const item = data[i];
					const structureItem = structure[i];
					if (typeof structureItem == "string") {
						throw new Error("The structure contains an array of strings where the object does not have an enum as value.");
					}
					collectStoredAsReferenceItems({
						data: item,
						structure: structureItem,
						nameIdsMap, existingItems, collectedItems, forceUseAsReferences,
					});
				}
			}
		} else {
			for (const [key, val] of Object.entries(data)) {
				if (nameIdsMap.has(key)) {
					const castStructure = /** @type {Object.<string, import("./binarySerializationTypes.js").AllowedStructureFormat>} */ (structure);
					const structureItem = castStructure[key];
					collectStoredAsReferenceItems({
						data: val,
						structure: structureItem,
						nameIdsMap, collectedItems, existingItems, forceUseAsReferences,
					});
				}
			}
		}
	}
}

/**
 * @param {Set<import("./binarySerializationTypes.js").AllowedStructureFormat>} reoccurringDataReferences A set of objects that occur more than once in the data.
 * @param {Object} data The object that needs to be converted to binary.
 * @param {import("./binarySerializationTypes.js").AllowedStructureFormat} structure
 * @param {NameIdsMap} nameIdsMap
 * @returns {Map<*,*>} A mapping of the reoccurring data references and their respective Structure references.
 */
function getStoreAsReferenceItems(reoccurringDataReferences, data, structure, nameIdsMap) {
	/** @type {Map<Object, import("./binarySerializationTypes.js").AllowedStructureFormat>} */
	const unparsedReferences = new Map();
	unparsedReferences.set(data, structure);

	const parsedReferences = new Map();

	while (unparsedReferences.size > 0) {
		const [ref, structureRef] = unparsedReferences.entries().next().value;

		/** @type {Map<object, import("./binarySerializationTypes.js").AllowedStructureFormat>} */
		const collectedItems = new Map();
		collectStoredAsReferenceItems({
			data: ref,
			structure: structureRef,
			nameIdsMap, collectedItems,
			existingItems: [parsedReferences, unparsedReferences],
			forceUseAsReferences: reoccurringDataReferences,
			isInitialItem: true,
		});

		for (const [item, structureItem] of collectedItems) {
			unparsedReferences.set(item, structureItem);
		}
		parsedReferences.set(ref, structureRef);
		unparsedReferences.delete(ref);
	}
	return parsedReferences;
}

/**
 * Takes an integer and finds the required storage type that would be needed
 * to fit this value.
 * @param {number} int
 */
function requiredStorageTypeForUint(int) {
	const minBytes = Math.ceil(Math.log2(int + 1) / 8);
	let bytes = 0;
	/** @type {StorageTypeEnum["NULL"] | StorageTypeEnum["UINT8"] | StorageTypeEnum["UINT16"] | StorageTypeEnum["UINT32"]} */
	let type = StorageType.NULL;
	if (minBytes == 1) {
		type = StorageType.UINT8;
		bytes = 1;
	} else if (minBytes == 2) {
		type = StorageType.UINT16;
		bytes = 2;
	} else if (minBytes > 2) {
		type = StorageType.UINT32;
		bytes = 4;
	}
	return {type, bytes};
}

/**
 * @param {StorageType} storageType
 */
function variableLengthStorageTypeToBits(storageType) {
	switch (storageType) {
		case StorageType.NULL:
			return 0b00;
		case StorageType.UINT8:
			return 0b01;
		case StorageType.UINT16:
			return 0b10;
		case StorageType.UINT32:
			return 0b11;
		default:
			throw new Error(`Unknown storage type: ${storageType}`);
	}
}

/**
 * @param {number} bits
 */
function variableLengthBitsToStorageType(bits) {
	switch (bits) {
		case 0b00:
			return StorageType.NULL;
		case 0b01:
			return StorageType.UINT8;
		case 0b10:
			return StorageType.UINT16;
		case 0b11:
			return StorageType.UINT32;
		default:
			throw new Error(`Unknown storage type bits: ${bits}`);
	}
}

/**
 * @param {Object} obj The object that needs be converted to binary.
 * @param {import("./binarySerializationTypes.js").AllowedStructureFormat} structure The structure that belongs to this object.
 * @param {Object} opts
 * @param {Map<*,number>} opts.referenceIds A mapping of objects and an id that they will be using in the binary representation.
 * @param {Map<string,number>} opts.nameIdsMap
 * @param {boolean} [opts.isInitialItem] Whether this is the root item of the object.
 * @returns {BinarySerializationBinaryDigestible}
 */
function generateBinaryDigestable(obj, structure, {referenceIds, nameIdsMap, isInitialItem = false}) {
	if (typeof structure == "object" && structure != null) {
		if (!obj) {
			if (Array.isArray(structure)) {
				obj = [];
			} else {
				obj = {};
			}
		}
		if (!isInitialItem && referenceIds.has(obj)) {
			const refId = referenceIds.get(obj);
			const type = Array.isArray(obj) ? StorageType.ARRAY : StorageType.OBJECT;
			return {value: refId, type};
		}

		if (Array.isArray(structure)) {
			if (typeof structure[0] == "string") {
				// structure is an array of strings, treat it as an enum
				const castStructure1 = /** @type {unknown} */ (structure);
				const castStructure2 = /** @type {string[]} */ (castStructure1);
				if (typeof obj != "string") {
					throw new Error("Tried to serialize an enum, but the provided object is not a string");
				}
				const value = castStructure2.indexOf(obj) + 1; // use 0 if the enum value is invalid
				const {type} = requiredStorageTypeForUint(castStructure2.length);
				return {value, type};
			} else if (structure[0] == StorageType.UNION_ARRAY) {
				const [, ...possibleStructures] = structure;
				const unionMatchIndex = getUnionMatchIndex(obj, possibleStructures);
				const type = requiredStorageTypeForUint(structure.length).type;
				return {
					value: [
						{value: unionMatchIndex, type}, // union type
						generateBinaryDigestable(obj, structure[unionMatchIndex + 1], {referenceIds, nameIdsMap, isInitialItem}), // union value
					],
					type: StorageType.UNION_ARRAY,
				};
			} else {
				const arr = [];
				const variableArrayLength = structure.length == 1;
				if (!Array.isArray(obj)) {
					throw new Error("The provided structure contains an array but the object is not an array");
				}
				for (let i = 0; i < obj.length; i++) {
					const structureIndex = variableArrayLength ? 0 : i;
					arr.push(generateBinaryDigestable(obj[i], structure[structureIndex], {referenceIds, nameIdsMap}));
				}
				return {value: arr, type: StorageType.ARRAY, variableArrayLength};
			}
		} else {
			const arr = [];
			const castObj = /** @type {Object.<string, Object>} */ (obj);
			const castStructure = /** @type {Object.<string, import("./binarySerializationTypes.js").AllowedStructureFormat>} */ (structure);
			for (const key of Object.keys(structure)) {
				if (nameIdsMap.has(key)) {
					const val = castObj[key];
					arr.push({
						...generateBinaryDigestable(val, castStructure[key], {referenceIds, nameIdsMap}),
						nameId: /** @type {number} */ (nameIdsMap.get(key)),
					});
				}
			}
			sortNameIdsArr(arr);
			return {value: arr, type: StorageType.OBJECT};
		}
	} else {
		const castStructure = /** @type {StorageType} */ (structure);
		return {value: obj, type: castStructure};
	}
}

/**
 * @param {{type: number, nameId: number}[]} arr
 */
function sortNameIdsArr(arr) {
	arr.sort((a, b) => {
		if (a.type != b.type) {
			return a.type - b.type;
		}
		return a.nameId - b.nameId;
	});
}

/**
 * Matches `object` against all the structures in `possibleStructures` and returns
 * the index that most closely matches the properties of the object.
 * The returned index can be included in the serialized binary data, so that the
 * correct structure can be used to deserialize the object.
 *
 * For now only top level properties are looked at for matching, and only their
 * presence is checked. In the future we might also check for the types of these
 * properties.
 * Support could also be added for checking if one of the structures contains a
 * property that is of type string, rather than a `StorageType`, and if the object
 * has the same property and string value, we could match that structure.
 *
 * If no structures can be matched, an error will be thrown.
 * @param {Object} object
 * @param {import("./binarySerializationTypes.js").AllowedStructureFormat[]} possibleStructures
 */
function getUnionMatchIndex(object, possibleStructures) {
	const keys = Object.keys(object);
	keys.sort();
	const matchingStructures = possibleStructures.filter(structure => {
		const structureKeys = Object.keys(structure);
		structureKeys.sort();
		return stringArrayEquals(structureKeys, keys);
	});
	if (matchingStructures.length == 0) {
		throw new Error("No structures matched the provided object, make sure your list of union structures contains exactly one structure that matches the provided object.");
	} else if (matchingStructures.length > 1) {
		throw new Error("Multiple structures matched the provided object, make sure your list of union structures contains at least some different properties so that the object can be matched to a single structure.");
	}
	return possibleStructures.indexOf(matchingStructures[0]);
}

/**
 * @param {BinarySerializationBinaryDigestible[]} binaryDigestableArray
 * @returns {number}
 */
function findBiggestVariableArrayLength(binaryDigestableArray) {
	let foundHighest = -1;
	for (const item of binaryDigestableArray) {
		if (item.type == StorageType.ARRAY && item.variableArrayLength) {
			foundHighest = Math.max(foundHighest, item.value.length);
		}
		if (Array.isArray(item.value)) {
			const highest = findBiggestVariableArrayLength(item.value);
			foundHighest = Math.max(foundHighest, highest);
		}
	}
	return foundHighest;
}

/**
 *
 * @param {BinarySerializationBinaryDigestible[]} binaryDigestableArray
 * @param {StorageType} arrayLengthStorageType
 * @returns {Generator<BinarySerializationBinaryDigestible>}
 */
function *flattenBinaryDigestable(binaryDigestableArray, arrayLengthStorageType) {
	for (const item of binaryDigestableArray) {
		if (Array.isArray(item.value)) {
			if (item.variableArrayLength) {
				yield {value: item.value.length, type: arrayLengthStorageType};
			}
			for (const item2 of flattenBinaryDigestable(item.value, arrayLengthStorageType)) {
				yield item2;
			}
		} else {
			yield item;
		}
	}
}

/**
 * @private
 * @param {StorageType} type
 * @param {Object} options
 * @param {unknown} options.value
 * @param {TextEncoder} options.textEncoder
 * @param {number} options.stringLengthByteLength
 * @param {number} options.arrayBufferLengthByteLength
 */
function getStructureTypeLength(type, {
	value,
	textEncoder,
	stringLengthByteLength,
	arrayBufferLengthByteLength,
}) {
	if (type == StorageType.INT8) {
		return {length: 1};
	} else if (type == StorageType.INT16) {
		return {length: 2};
	} else if (type == StorageType.INT32) {
		return {length: 4};
	} else if (type == StorageType.UINT8) {
		return {length: 1};
	} else if (type == StorageType.UINT16) {
		return {length: 2};
	} else if (type == StorageType.UINT32) {
		return {length: 4};
	} else if (type == StorageType.FLOAT32) {
		return {length: 4};
	} else if (type == StorageType.FLOAT64) {
		return {length: 8};
	} else if (type == StorageType.STRING) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		const encoded = textEncoder.encode(castValue);
		return {length: encoded.byteLength + stringLengthByteLength, value: encoded};
	} else if (type == StorageType.BOOL) {
		return {length: 1};
	} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
		return {length: 16};
	} else if (type == StorageType.ARRAY_BUFFER) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		return {length: castValue.byteLength + arrayBufferLengthByteLength};
	} else if (type == StorageType.NULL) {
		return {length: 0};
	}
	return {length: 0};
}

/**
 * @private
 * @param {DataView} dataView
 * @param {unknown} value
 * @param {StorageType} type
 * @param {number} [byteOffset]
 * @param {Object} [options]
 * @param {boolean} [options.littleEndian]
 * @param {StorageType} [options.stringLengthStorageType]
 * @param {StorageType} [options.arrayBufferLengthStorageType]
 * @param {import("../../editor/src/assets/AssetManager.js").AssetManager?} [options.editorAssetManager]
 */
function setDataViewValue(dataView, value, type, byteOffset = 0, {
	littleEndian = true,
	stringLengthStorageType = StorageType.UINT8,
	arrayBufferLengthStorageType = StorageType.UINT8,
	editorAssetManager = null,
} = {}) {
	let bytesMoved = 0;
	if (type == StorageType.INT8) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		dataView.setInt8(byteOffset, castValue);
		bytesMoved = 1;
	} else if (type == StorageType.INT16) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		dataView.setInt16(byteOffset, castValue, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.INT32) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		dataView.setInt32(byteOffset, castValue, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.UINT8) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		dataView.setUint8(byteOffset, castValue);
		bytesMoved = 1;
	} else if (type == StorageType.UINT16) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		dataView.setUint16(byteOffset, castValue, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.UINT32) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		dataView.setUint32(byteOffset, castValue, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT32) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		dataView.setFloat32(byteOffset, castValue, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT64) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		dataView.setFloat64(byteOffset, castValue, littleEndian);
		bytesMoved = 8;
	} else if (type == StorageType.STRING) {
		// string values have already been converted to a buffer in a previous pass.
		// See `getStructureTypeLength()`.
		const castValue = /** @type {Uint8Array} */ (value);
		bytesMoved = insertLengthAndBuffer(dataView, castValue, byteOffset, stringLengthStorageType, {littleEndian});
	} else if (type == StorageType.BOOL) {
		dataView.setUint8(byteOffset, value ? 1 : 0);
		bytesMoved = 1;
	} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		if (type == StorageType.ASSET_UUID && editorAssetManager) {
			value = editorAssetManager.resolveDefaultAssetLinkUuid(castValue);
		}
		const binaryUuid = uuidToBinary(castValue);
		const view = new Uint8Array(dataView.buffer);
		view.set(new Uint8Array(binaryUuid), byteOffset);
		bytesMoved = 16;
	} else if (type == StorageType.ARRAY_BUFFER) {
		const castValue = /** @type {import("./binarySerializationTypes.js").StructureItemToObject<typeof type>} */ (value);
		bytesMoved = insertLengthAndBuffer(dataView, castValue, byteOffset, arrayBufferLengthStorageType, {littleEndian});
	} else if (type == StorageType.NULL) {
		bytesMoved = 0;
	}
	return bytesMoved;
}

/**
 * @param {DataView} dataView
 * @param {ArrayBuffer} buffer
 * @param {number} byteOffset
 * @param {StorageType} lengthStorageType
 * @param {Object} options
 * @param {boolean} options.littleEndian
 */
function insertLengthAndBuffer(dataView, buffer, byteOffset, lengthStorageType, {littleEndian}) {
	let bytesMoved = setDataViewValue(dataView, buffer.byteLength, lengthStorageType, byteOffset, {littleEndian});
	byteOffset += bytesMoved;
	const view = new Uint8Array(dataView.buffer);
	view.set(new Uint8Array(buffer), byteOffset);
	bytesMoved += buffer.byteLength;
	return bytesMoved;
}

/**
 * @param {import("./binarySerializationTypes.js").AllowedStructureFormat | number} structure
 * @param {TraversedLocationData[]} traversedLocationPath
 * @param {Object} opts
 * @param {NameIdsMap} opts.nameIdsMap
 * @param {Set<*>} opts.reoccurringStructureReferences
 * @param {boolean} [opts.isInitialItem]
 * @returns {BinarySerializationStructureDigestible}
 */
function generateStructureDigestable(structure, traversedLocationPath, {nameIdsMap, reoccurringStructureReferences, isInitialItem = false}) {
	if (typeof structure == "object" && structure != null) {
		if (!isInitialItem && reoccurringStructureReferences.has(structure)) {
			const type = Array.isArray(structure) ? StorageType.ARRAY : StorageType.OBJECT;
			return {type, structureRef: structure, location: traversedLocationPath};
		}
		if (Array.isArray(structure)) {
			if (typeof structure[0] == "string") {
				const castStructure1 = /** @type {unknown[]} */ (structure);
				const castStructure2 = /** @type {string[]} */ (castStructure1);
				// structure is an array of strings, treat it as an enum
				const {type} = requiredStorageTypeForUint(structure.length);
				return {type, location: traversedLocationPath, enumStrings: castStructure2};
			} else if (structure[0] == StorageType.UNION_ARRAY) {
				const typeIndexStorageType = requiredStorageTypeForUint(structure.length).type;
				const unionDigestables = [];
				for (let i = 1; i < structure.length; i++) {
					const unionStructure = structure[i];
					const digestable = generateStructureDigestable(unionStructure, traversedLocationPath, {nameIdsMap, reoccurringStructureReferences, isInitialItem});
					unionDigestables.push(digestable);
				}
				return {type: StorageType.UNION_ARRAY, location: traversedLocationPath, unionDigestables, typeIndexStorageType};
			} else {
				const castStructure = /** @type {import("./binarySerializationTypes.js").AllowedStructureFormat[] | number[]} */ (structure);
				const variableArrayLength = castStructure.length == 1;
				if (variableArrayLength) {
					const newTraversedLocationPath = [...traversedLocationPath, {id: -1, type: StorageType.ARRAY}];
					const arrayType = generateStructureDigestable(castStructure[0], newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences});
					return {type: StorageType.ARRAY, arrayType, location: traversedLocationPath};
				} else {
					const arr = [];
					for (const [i, arrayItem] of castStructure.entries()) {
						const newTraversedLocationPath = [...traversedLocationPath, {id: i, type: StorageType.ARRAY}];
						arr.push(generateStructureDigestable(arrayItem, newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences}));
					}
					return {type: StorageType.ARRAY, childData: arr, location: traversedLocationPath};
				}
			}
		} else {
			const arr = [];
			for (const [key, typeData] of Object.entries(structure)) {
				if (nameIdsMap.has(key)) {
					const nameId = /** @type {number} */ (nameIdsMap.get(key));
					const newTraversedLocationPath = [...traversedLocationPath, {id: nameId, type: StorageType.OBJECT}];
					arr.push({
						...generateStructureDigestable(typeData, newTraversedLocationPath, {nameIdsMap, reoccurringStructureReferences}),
						nameId,
					});
				}
			}
			sortNameIdsArr(arr);
			return {type: StorageType.OBJECT, childData: arr, location: traversedLocationPath};
		}
	} else {
		const castStructure = /** @type {StorageType} */ (structure);
		return {type: castStructure, location: traversedLocationPath};
	}
}

/**
 * @param {BinarySerializationStructureDigestible} digestable
 * @returns {Generator<BinarySerializationStructureDigestible>}
 */
function *flattenStructureDigestable(digestable) {
	if (digestable.type == StorageType.OBJECT || digestable.type == StorageType.ARRAY) {
		// TODO: I think this might be broken when using a closure compiler build
		if ("childData" in digestable) {
			for (const item of digestable.childData) {
				for (const childDigestable of flattenStructureDigestable(item)) {
					yield childDigestable;
				}
			}
		} else if ("arrayType" in digestable || "structureRef" in digestable) {
			yield digestable;
		}
	} else if (digestable.type == StorageType.UNION_ARRAY && "unionDigestables" in digestable) {
		const newUnionDigestables = [];
		for (const unionDigestable of digestable.unionDigestables) {
			const digestables = Array.from(flattenStructureDigestable(unionDigestable));
			newUnionDigestables.push(digestables);
		}
		yield {...digestable, flattenedUnionDigestables: newUnionDigestables};
	} else {
		yield digestable;
	}
}

/**
 * @typedef ParseStructureDigestableResult
 * @property {number} newByteOffset
 * @property {Object | null} newReconstructedData
 */

/**
 * @param {Object} options
 * @param {BinarySerializationStructureDigestible} options.digestable
 * @param {Object | null} options.reconstructedData
 * @param {DataView} options.dataView
 * @param {number} options.byteOffset
 * @param {boolean} options.littleEndian
 * @param {TextDecoder} options.textDecoder
 * @param {Map<number, string>} options.nameIdsMapInverse
 * @param {BinaryToObjectTransformValueHook | null} options.transformValueHook
 * @param {CollectedReferenceLink[]} options.collectedReferenceLinks
 * @param {number} options.parsingStructureId
 * @param {Map<number, StructureRefData>} options.structureDataById
 * @param {Set<number>} options.unparsedStructureIds
 * @param {AllStorageTypes} options.refIdStorageType
 * @param {AllStorageTypes} options.arrayLengthStorageType
 * @param {AllStorageTypes} options.stringLengthStorageType
 * @param {AllStorageTypes} options.arrayBufferLengthStorageType
 * @returns {ParseStructureDigestableResult}
 */
function parseStructureDigestable(options) {
	const {
		digestable,
		reconstructedData,
		dataView,
		byteOffset,
		littleEndian,
		textDecoder,
		nameIdsMapInverse,
		transformValueHook,
		collectedReferenceLinks,
		parsingStructureId,
		structureDataById,
		unparsedStructureIds,
		refIdStorageType,
		arrayLengthStorageType,
		stringLengthStorageType,
		arrayBufferLengthStorageType,
	} = options;
	let newByteOffset = byteOffset;
	let newReconstructedData = reconstructedData;
	// TODO: I think the in operator doesn't work in closure compiler builds
	if ("arrayType" in digestable) {
		const {value: arrayLength, bytesMoved} = getDataViewValue(dataView, arrayLengthStorageType, newByteOffset, {littleEndian});
		newByteOffset += bytesMoved;
		if (arrayLength == 0) {
			newReconstructedData = resolveBinaryValueLocation(newReconstructedData, {
				nameIdsMapInverse,
				value: [],
				location: digestable.location,
				transformValueHook,
				transformValueHookType: digestable.type,
			});
		} else if ("structureRef" in digestable.arrayType) {
			for (let i = 0; i < arrayLength; i++) {
				const {value: refId, bytesMoved} = getDataViewValue(dataView, refIdStorageType, newByteOffset, {littleEndian});
				newByteOffset += bytesMoved;
				if (!structureDataById.has(refId)) structureDataById.set(refId, {structureRef: digestable.arrayType.structureRef});
				unparsedStructureIds.add(refId);
				collectedReferenceLinks.push({refId, location: digestable.arrayType.location, injectIntoRefId: parsingStructureId, variableLengthArrayIndex: i});
			}
		} else {
			for (let i = 0; i < arrayLength; i++) {
				const {value, bytesMoved} = getDataViewValue(dataView, digestable.arrayType.type, newByteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder});
				newByteOffset += bytesMoved;
				newReconstructedData = resolveBinaryValueLocation(newReconstructedData, {
					nameIdsMapInverse, value,
					location: digestable.arrayType.location,
					variableLengthArrayIndex: i,
					transformValueHook,
					transformValueHookType: digestable.arrayType.type,
				});
			}
		}
	} else if ("unionDigestables" in digestable) {
		const {value: unionIndex, bytesMoved} = getDataViewValue(dataView, digestable.typeIndexStorageType, newByteOffset, {littleEndian});
		newByteOffset += bytesMoved;
		const flattenedUnionDigestables = digestable.flattenedUnionDigestables;
		if (!flattenedUnionDigestables) throw new Error("Assertion failed flattenedUnionDigestables doesn't exist");
		const pickedUnionDigestables = flattenedUnionDigestables[unionIndex];
		for (const digestable of pickedUnionDigestables) {
			const {newByteOffset: newNewByteOffset, newReconstructedData: newNewReconstructedData} = parseStructureDigestable({
				...options,
				digestable,
				byteOffset: newByteOffset,
				reconstructedData: newReconstructedData,
			});
			newByteOffset = newNewByteOffset;
			newReconstructedData = newNewReconstructedData;
		}
	} else if ("structureRef" in digestable) {
		const {value: refId, bytesMoved} = getDataViewValue(dataView, refIdStorageType, newByteOffset, {littleEndian});
		newByteOffset += bytesMoved;
		if (!structureDataById.has(refId)) structureDataById.set(refId, {structureRef: digestable.structureRef});
		unparsedStructureIds.add(refId);
		collectedReferenceLinks.push({refId, location: digestable.location, injectIntoRefId: parsingStructureId});
	} else {
		let {value, bytesMoved} = getDataViewValue(dataView, digestable.type, newByteOffset, {littleEndian, stringLengthStorageType, arrayBufferLengthStorageType, textDecoder});
		newByteOffset += bytesMoved;
		if ("enumStrings" in digestable) {
			value = digestable.enumStrings[value - 1];
		}
		newReconstructedData = resolveBinaryValueLocation(newReconstructedData, {
			nameIdsMapInverse, value,
			location: digestable.location,
			transformValueHook,
			transformValueHookType: digestable.type,
		});
	}

	return {
		newByteOffset,
		newReconstructedData,
	};
}

/**
 * @param {DataView} dataView
 * @param {StorageType} type
 * @param {number} byteOffset
 * @param {Object} opts
 * @param {boolean} [opts.littleEndian]
 * @param {StorageType} [opts.stringLengthStorageType]
 * @param {StorageType} [opts.arrayBufferLengthStorageType]
 * @param {TextDecoder} [opts.textDecoder]
 * @returns {{value: *, bytesMoved: number}}
 */
function getDataViewValue(dataView, type, byteOffset, {
	littleEndian = true,
	stringLengthStorageType = StorageType.UINT8,
	arrayBufferLengthStorageType = StorageType.UINT8,
	textDecoder = new TextDecoder(),
} = {}) {
	let value = null;
	let bytesMoved = 0;
	if (type == StorageType.INT8) {
		value = dataView.getInt8(byteOffset);
		bytesMoved = 1;
	} else if (type == StorageType.INT16) {
		value = dataView.getInt16(byteOffset, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.INT32) {
		value = dataView.getInt32(byteOffset, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.UINT8) {
		value = dataView.getUint8(byteOffset);
		bytesMoved = 1;
	} else if (type == StorageType.UINT16) {
		value = dataView.getUint16(byteOffset, littleEndian);
		bytesMoved = 2;
	} else if (type == StorageType.UINT32) {
		value = dataView.getUint32(byteOffset, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT32) {
		value = dataView.getFloat32(byteOffset, littleEndian);
		bytesMoved = 4;
	} else if (type == StorageType.FLOAT64) {
		value = dataView.getFloat64(byteOffset, littleEndian);
		bytesMoved = 8;
	} else if (type == StorageType.STRING) {
		const {buffer, bytesMoved: newBytesMoved} = getLengthAndBuffer(dataView, byteOffset, stringLengthStorageType, {littleEndian});
		value = textDecoder.decode(buffer);
		bytesMoved = newBytesMoved;
	} else if (type == StorageType.BOOL) {
		value = !!dataView.getUint8(byteOffset);
		bytesMoved = 1;
	} else if (type == StorageType.UUID || type == StorageType.ASSET_UUID) {
		value = binaryToUuid(dataView.buffer, byteOffset);
		bytesMoved = 16;
	} else if (type == StorageType.ARRAY_BUFFER) {
		const {buffer, bytesMoved: newBytesMoved} = getLengthAndBuffer(dataView, byteOffset, arrayBufferLengthStorageType, {littleEndian});
		value = buffer;
		bytesMoved = newBytesMoved;
	} else if (type == StorageType.NULL) {
		value = null;
		bytesMoved = 0;
	}

	return {value, bytesMoved};
}

/**
 * @param {DataView} dataView
 * @param {number} byteOffset
 * @param {StorageType} lengthStorageType
 * @param {Object} options
 * @param {boolean} options.littleEndian
 */
function getLengthAndBuffer(dataView, byteOffset, lengthStorageType, {littleEndian}) {
	const {value: bufferByteLength, bytesMoved: newBytesMoved} = getDataViewValue(dataView, lengthStorageType, byteOffset, {littleEndian});
	let bytesMoved = newBytesMoved;
	const bufferStart = byteOffset + bytesMoved;
	const buffer = dataView.buffer.slice(bufferStart, bufferStart + bufferByteLength);
	bytesMoved += bufferByteLength;
	return {buffer, length: bufferByteLength, bytesMoved};
}

/**
 * @param {Object?} obj
 * @param {Object} opts
 * @param {unknown} opts.value
 * @param {TraversedLocationData[]} opts.location
 * @param {Map<number, string>} opts.nameIdsMapInverse
 * @param {number} [opts.variableLengthArrayIndex]
 * @param {BinaryToObjectTransformValueHook?} [opts.transformValueHook]
 * @param {StorageType} [opts.transformValueHookType]
 * @param {number} [locationOffset]
 */
function resolveBinaryValueLocation(obj, {
	value, location, nameIdsMapInverse, variableLengthArrayIndex,
	transformValueHook, transformValueHookType,
}, locationOffset = 0) {
	const keyData = location[locationOffset];
	/** @type {string | number} */
	let key = keyData.id;
	if (obj == null) {
		if (keyData.type == StorageType.ARRAY) {
			obj = [];
		} else if (keyData.type == StorageType.OBJECT) {
			obj = {};
		} else {
			throw new Error("Assertion failed: the provided object was null but location data was not of type ARRAY or OBJECT.");
		}
	}
	const castObj = /** @type {Object.<string | number, unknown>} */ (obj);

	if (keyData.type == StorageType.ARRAY) {
		if (key == -1) {
			if (variableLengthArrayIndex == undefined) {
				throw new Error("Assertion failed, variableLengthArrayIndex must be provided when resolving the location of an array element with index -1");
			}
			key = variableLengthArrayIndex;
		}
	} else if (keyData.type == StorageType.OBJECT) {
		const newKey = nameIdsMapInverse.get(keyData.id);
		if (newKey == undefined) {
			throw new Error(`Assertion failed: ${keyData.id} is missing from the inverse nameIds map`);
		}
		key = newKey;
	}

	if (locationOffset >= location.length - 1) {
		if (transformValueHook) {
			if (transformValueHookType == undefined) {
				throw new Error("Assertion failed, transformValueHookType was not provided but the hook could potentially get called.");
			}
			value = transformValueHook({value, type: transformValueHookType, placedOnObject: castObj, placedOnKey: key});
		}
		castObj[key] = value;
	} else {
		let subValue = castObj[key] || null;
		subValue = resolveBinaryValueLocation(subValue, {
			value, location, nameIdsMapInverse, variableLengthArrayIndex,
			transformValueHook, transformValueHookType,
		}, locationOffset + 1);
		castObj[key] = subValue;
	}
	return obj;
}
