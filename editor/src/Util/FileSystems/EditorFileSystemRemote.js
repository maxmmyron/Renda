import EditorFileSystem from "./EditorFileSystem.js";

export default class EditorFileSystemRemote extends EditorFileSystem {
	constructor() {
		super();

		this.connection = null;
		this.connected = false;
		this.onConnectedCbs = new Set();
	}
	/**
	 * @param {import("../../Network/EditorConnections/EditorConnection.js").default} connection
	 */
	setConnection(connection) {
		this.connection = connection;
		this.updateConnected();
		connection.onConnectionStateChange(() => this.updateConnected());
	}

	updateConnected() {
		const connected = this.connection && this.connection.connectionState == "connected";
		if (connected != this.connected) {
			this.connected = connected;
			if (connected) {
				this.onConnectedCbs.forEach(cb => cb());
			}
		}
	}

	async waitForConnection() {
		if (this.connected) return;
		await new Promise(r => this.onConnectedCbs.add(r));
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @returns {Promise<import("./EditorFileSystem.js").EditorFileSystemReadDirResult>}
	 */
	async readDir(path = []) {
		await this.waitForConnection();
		return await this.connection.call("fileSystem.readDir", path);
	}

	/**
	 * @override
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @returns {Promise<void>}
	 */
	async createDir(path = []) {
		await this.waitForConnection();
		return await this.connection.call("fileSystem.createDir", path);
	}

	/**
	 * @param {import("./EditorFileSystem.js").EditorFileSystemPath} path
	 * @returns {Promise<File>}
	 */
	async readFile(path = []) {
		await this.waitForConnection();
		return await this.connection.call("fileSystem.readFile", path);
	}
}
