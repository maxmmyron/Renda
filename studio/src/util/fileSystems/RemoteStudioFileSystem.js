import {StudioFileSystem} from "./StudioFileSystem.js";

export class RemoteStudioFileSystem extends StudioFileSystem {
	constructor() {
		super();

		this.connection = null;
		this.connected = false;
		/** @type {Set<() => void>} */
		this.onConnectedCbs = new Set();
	}
	/**
	 * @param {import("../../network/studioConnections/StudioConnection.js").StudioConnection} connection
	 */
	setConnection(connection) {
		this.connection = connection;
		this.updateConnected();
		connection.onConnectionStateChange(() => this.updateConnected());
	}

	updateConnected() {
		const connected = !!this.connection && this.connection.connectionState == "connected";
		if (connected != this.connected) {
			this.connected = connected;
			if (connected) {
				this.onConnectedCbs.forEach(cb => cb());
			}
		}
	}

	async waitForConnection() {
		if (this.connected && this.connection) return this.connection;
		/** @type {Promise<void>} */
		const promise = new Promise(r => this.onConnectedCbs.add(r));
		await promise;
		if (!this.connection) throw new Error("Assertion failed: Connection doesn't exist.");
		return this.connection;
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 */
	async readDir(path) {
		const connection = await this.waitForConnection();
		return await connection.call("fileSystem.readDir", path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<void>}
	 */
	async createDir(path) {
		const connection = await this.waitForConnection();
		return await connection.call("fileSystem.createDir", path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<File>}
	 */
	async readFile(path) {
		const connection = await this.waitForConnection();
		return await connection.call("fileSystem.readFile", path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isFile(path) {
		const connection = await this.waitForConnection();
		return await connection.call("fileSystem.isFile", path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async isDir(path) {
		const connection = await this.waitForConnection();
		return await connection.call("fileSystem.isDir", path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @returns {Promise<boolean>}
	 */
	async exists(path) {
		const connection = await this.waitForConnection();
		return await connection.call("fileSystem.exists", path);
	}

	/**
	 * @override
	 * @param {import("./StudioFileSystem.js").StudioFileSystemPath} path
	 * @param {import("./StudioFileSystem.js").AllowedWriteFileTypes} file
	 */
	async writeFile(path, file) {
		const connection = await this.waitForConnection();
		return await connection.call("fileSystem.writeFile", path, file);
	}
}
