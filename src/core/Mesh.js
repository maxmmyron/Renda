import {DEBUG_INCLUDE_ERROR_MESSAGES, DEBUG_INCLUDE_ERROR_THROWS} from "../studioDefines.js";
import {neverNoOp} from "../util/neverNoOp.js";
import {MeshAttributeBuffer} from "./MeshAttributeBuffer.js";

/**
 * @readonly
 * @enum {number}
 */
const AttributeType = /** @type {const} */ ({
	POSITION: 0,
	NORMAL: 1,
	COLOR: 2,
	UV1: 3,
	UV2: 4,
	TANGENT: 5,
	BITANGENT: 6,
});

/**
 * @readonly
 * @enum {number}
 */
const AttributeFormat = /** @type {const} */({
	INT8: 0,
	INT16: 1,
	INT32: 2,
	FLOAT16: 3,
	FLOAT32: 4,
	NORM8: 5,
	NORM16: 6,
});

/**
 * @readonly
 * @enum {number}
 */
const IndexFormat = /** @type {const} */({
	NONE: 0,
	UINT_16: 1,
	UINT_32: 2,
});


/** @typedef {typeof AttributeType} AttributeTypeEnum */
/** @typedef {AttributeTypeEnum[keyof AttributeTypeEnum]} AllAttributeTypes */
/** @typedef {typeof AttributeFormat} AttributeFormatEnum */
/** @typedef {AttributeFormatEnum[keyof AttributeFormatEnum]} AllAttributeFormats */
/** @typedef {typeof IndexFormat} IndexFormatEnum */
/** @typedef {IndexFormatEnum[keyof IndexFormatEnum]} AllIndexFormats */

/**
 * @typedef UnusedAttributeBufferOptions
 * @property {AllAttributeFormats} [unusedFormat = Mesh.AttributeFormat.FLOAT32]
 * @property {number} [unusedComponentCount = 3]
 */

/** @typedef {() => void} OnIndexBufferChangeCallback */

export class Mesh {
	constructor() {
		/** @type {MeshAttributeBuffer[]} */
		this._buffers = [];
		/** @type {Map<number, MeshAttributeBuffer>} */
		this._unusedBuffers = new Map();
		/** @type {import("../rendering/VertexState.js").VertexState?} */
		this._vertexState = null;
		this.indexBuffer = new ArrayBuffer(0);
		/** @type {ArrayBuffer?} */
		this._currentDataViewIndexBuffer = null;
		this._dataView = null;

		/** @type {AllIndexFormats} */
		this.indexFormat = IndexFormat.UINT_16;
		/**
		 * The total number of incices in the index buffer.
		 */
		this.indexCount = 0;

		this.vertexCount = 0;

		/** @type {Set<OnIndexBufferChangeCallback>} */
		this.onIndexBufferChangeCbs = new Set();
	}

	destructor() {
		for (const buffer of this.getBuffers()) {
			buffer.destructor();
		}
	}

	/**
	 * @returns {AttributeTypeEnum}
	*/
	static get AttributeType() {
		return AttributeType;
	}

	/**
	 * @returns {IndexFormatEnum}
	 */
	static get IndexFormat() {
		return IndexFormat;
	}

	/**
	 * @returns {AttributeFormatEnum}
	 */
	static get AttributeFormat() {
		return AttributeFormat;
	}

	/**
	 * @param {AllAttributeFormats} format
	 */
	static getByteLengthForAttributeFormat(format) {
		typeof format === "string" && (format = Mesh.AttributeFormat[format]);
		switch (format) {
			case Mesh.AttributeFormat.INT8:
				return 1;
			case Mesh.AttributeFormat.INT16:
			case Mesh.AttributeFormat.FLOAT16:
				return 2;
			case Mesh.AttributeFormat.INT32:
			case Mesh.AttributeFormat.FLOAT32:
				return 4;
			default:
				if (DEBUG_INCLUDE_ERROR_THROWS) {
					if (DEBUG_INCLUDE_ERROR_MESSAGES) {
						console.log(format, Mesh.AttributeFormat);
						throw new Error(`Invalid attribute format: ${format}`);
					} else {
						throw null;
					}
				} else {
					neverNoOp();
				}
		}
	}

	/**
	 * @param {AttributeFormatEnum[keyof AttributeFormatEnum]} format
	 */
	static getBitLengthForAttributeFormat(format) {
		return Mesh.getByteLengthForAttributeFormat(format) * 8;
	}

	// TODO: switched to null, ensure tests pass!
	/**
	 * @param {AttributeFormatEnum[keyof AttributeFormatEnum]} typeId
	 */
	static getAttributeNameForType(typeId) {
		for (const [name, type] of Object.entries(Mesh.AttributeType)) {
			if (type == typeId) return name;
		}
		return null;
	}

	/**
	 * This changes the index format of the mesh. If an index buffer has already
	 * been set, it will be converted to the new format.
	 * @param {AllIndexFormats} indexFormat
	 */
	setIndexFormat(indexFormat) {
		if (indexFormat == this.indexFormat) return;

		if (this.indexBuffer.byteLength > 0) {
			let typedArray;
			switch (this.indexFormat) {
				case Mesh.IndexFormat.UINT_32:
					typedArray = Uint16Array.from(new Uint32Array(this.indexBuffer));
					break;
				case Mesh.IndexFormat.UINT_16:
					typedArray = Uint32Array.from(new Uint16Array(this.indexBuffer));
					break;
				default:
					throw new Error("Invalid index format.");
			}

			this.setIndexData(typedArray);
		} else {
			this.indexFormat = indexFormat;
		}
	}

	getDataView() {
		if (this._currentDataViewIndexBuffer != this.indexBuffer) {
			this._dataView = null;
		}
		if (!this._dataView) {
			this._dataView = new DataView(this.indexBuffer);
			this._currentDataViewIndexBuffer = this.indexBuffer;
		}
		return this._dataView;
	}

	/**
	 * @param {ArrayBufferLike | number[]} data
	 */
	setIndexData(data) {
		if (this.indexFormat == Mesh.IndexFormat.NONE) throw new Error("Invalid index format.");

		// assume data has the correct format
		if (data instanceof ArrayBuffer) {
			this.indexCount = data.byteLength / (2 * this.indexFormat);
			this.indexBuffer = data;
		} else if (ArrayBuffer.isView(data)) {
			let byteCount = 0;
			if (data instanceof Uint16Array) {
				this.indexFormat = Mesh.IndexFormat.UINT_16;
				byteCount = 2;
			} else if (data instanceof Uint32Array) {
				this.indexFormat = Mesh.IndexFormat.UINT_32;
				byteCount = 4;
			} else {
				throw new TypeError(`Unsupported TypedArray type, received a ${data.constructor.name} but only Uint16Array and Uint32Array are supported.`);
			}
			const slicedData = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
			this.indexCount = slicedData.byteLength / byteCount;
			this.indexBuffer = slicedData;
		} else if (Array.isArray(data)) {
			if(this.indexFormat !== Mesh.IndexFormat.UINT_16 && this.indexFormat !== Mesh.IndexFormat.UINT_32) throw new Error("Invalid index format.");

			let valueByteSize;
			let setFunction;
			this.indexCount = data.length;
			let bufferLength = 0;

			bufferLength = data.length * this.indexFormat * 2;
			valueByteSize = this.indexFormat * 2;

			this.indexBuffer = new ArrayBuffer(bufferLength);
			const dataView = this.getDataView();

			if (this.indexFormat == Mesh.IndexFormat.UINT_16) setFunction = dataView.setUint16.bind(dataView);
			else setFunction = dataView.setUint32.bind(dataView);

			for (let i = 0; i < data.length; i++) {
				setFunction(i * valueByteSize, data[i], true);
			}
		} else {
			throw new TypeError("invalid data type");
		}
		this.fireIndexBufferChanged();
	}

	*getIndexData() {
		const dataView = this.getDataView();
		let getFunction;
		let valueByteSize = 4;

		if(this.indexFormat == Mesh.IndexFormat.NONE) throw new Error("Invalid index format.");
		if (this.indexFormat == Mesh.IndexFormat.UINT_16) getFunction = dataView.getUint16.bind(dataView);
		else getFunction = dataView.getUint32.bind(dataView);

		valueByteSize = this.indexFormat * 2;

		let i = 0;
		while (i < this.indexBuffer.byteLength) {
			yield getFunction(i, true);
			i += valueByteSize;
		}
	}

	/**
	 * @param {number} vertexCount
	 */
	setVertexCount(vertexCount) {
		this.vertexCount = vertexCount;
		for (const buffer of this.getBuffers()) {
			buffer.setVertexCount(vertexCount);
		}
	}

	/**
	 * @param {AllAttributeTypes} attributeType
	 * @param {ArrayBufferLike | number[] | import("../math/Vec2.js").Vec2[] | import("../math/Vec3.js").Vec3[]} data
	 * @param {UnusedAttributeBufferOptions} [opts]
	 */
	setVertexData(attributeType, data, opts) {
		const buffer = this.getBufferForAttributeType(attributeType, opts);
		buffer.setVertexData(attributeType, data);
	}

	// TODO: change the signature so that you can only provide an ArrayBuffer
	// I don't think it makes sense to expose isUnused functionality here.
	/**
	 * @param {ConstructorParameters<typeof MeshAttributeBuffer>[1]} attributeBufferOpts
	 */
	copyBufferData(attributeBufferOpts) {
		const attributeBuffer = new MeshAttributeBuffer(this, attributeBufferOpts);
		this.copyAttributeBufferData(attributeBuffer);
	}

	/**
	 * @param {MeshAttributeBuffer} attributeBuffer
	 */
	copyAttributeBufferData(attributeBuffer) {
		// todo: there's probably still some performance that can be gained here
		// currently it's decomposing the buffer into vectors and turning
		// it back into a buffer, if the buffer doesn't need to be changed it
		// can simply copy or move all the bytes at once

		for (const attribute of attributeBuffer.attributes) {
			if (attribute.attributeType == null) {
				// TODO: handle converting attribute data when the attribute type is not specified
				continue;
			}
			const array = Array.from(attributeBuffer.getVertexData(attribute.attributeType));
			const castArray = /** @type {number[] | import("../math/Vec2.js").Vec2[] | import("../math/Vec3.js").Vec3[]} */ (array);
			this.setVertexData(attribute.attributeType, castArray, {
				unusedFormat: attribute.format,
				unusedComponentCount: attribute.componentCount,
			});
		}
	}

	/**
	 * @param {AllAttributeTypes} attributeType
	 * @param {UnusedAttributeBufferOptions} options
	 */
	getBufferForAttributeType(attributeType, {
		unusedFormat = Mesh.AttributeFormat.FLOAT32,
		unusedComponentCount = 3,
	} = {}) {
		for (const buffer of this.getBuffers()) {
			if (buffer.hasAttributeType(attributeType)) {
				return buffer;
			}
		}

		const unusedBuffer = new MeshAttributeBuffer(this, {
			attributes: [
				{
					offset: 0,
					format: unusedFormat,
					componentCount: unusedComponentCount,
					attributeType,
				},
			],
			isUnused: true,
		});
		unusedBuffer.setVertexCount(this.vertexCount);
		this._unusedBuffers.set(attributeType, unusedBuffer);
		return unusedBuffer;
	}

	/**
	 * @param {boolean} includeUnused
	 * @returns {Generator<MeshAttributeBuffer>}
	 */
	*getBuffers(includeUnused = true) {
		for (const buffer of this._buffers) {
			yield buffer;
		}
		if (includeUnused) {
			for (const buffer of this._unusedBuffers.values()) {
				yield buffer;
			}
		}
	}

	get vertexState() {
		return this._vertexState;
	}

	/**
	 * @param {import("../rendering/VertexState.js").VertexState?} vertexState
	 */
	setVertexState(vertexState) {
		this._vertexState = vertexState;

		const oldBuffers = Array.from(this.getBuffers());
		this._buffers = [];
		this._unusedBuffers.clear();

		if (vertexState) {
			for (const bufferDescriptor of vertexState.buffers) {
				const attributes = [];
				for (const attribute of bufferDescriptor.attributes.values()) {
					const attributeType = attribute.attributeType;
					attributes.push({
						offset: attribute.offset,
						format: attribute.format,
						componentCount: attribute.componentCount,
						attributeType,
					});
				}
				const buffer = new MeshAttributeBuffer(this, {
					arrayStride: bufferDescriptor.arrayStride,
					attributes,
				});
				if (this.vertexCount) buffer.setVertexCount(this.vertexCount);
				this._buffers.push(buffer);
			}
		}

		for (const buffer of oldBuffers) {
			this.copyAttributeBufferData(buffer);
		}
	}

	/**
	 * @param {OnIndexBufferChangeCallback} cb
	 */
	onIndexBufferChange(cb) {
		this.onIndexBufferChangeCbs.add(cb);
	}

	fireIndexBufferChanged() {
		for (const cb of this.onIndexBufferChangeCbs) {
			cb();
		}
	}
}
