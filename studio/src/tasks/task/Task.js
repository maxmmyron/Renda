/**
 * @typedef {new (...args: ConstructorParameters<typeof Task>) => Task} TaskConstructor
 */

/**
 * @template [TCustomData = unknown]
 * @typedef RunTaskReturn
 * @property {RunTaskCreateAssetData[]} [writeAssets] A list of assets that this task should create when done running.
 * This is useful if you want to modify files in a very basic way. The assets will be created and written to the output location.
 * If the task is run programmatically, nothing is written and the program running the task can handle the result accordingly.
 * Note that if you are not writing some assets as a result of caching, but might write them in the future, you should add them to the `touchedAssets` list.
 * This way other tasks can trigger this task to run if it depends on them.
 * If you need more control over how assets are written, such as writing to a file stream, you can write them manually using
 * the current studio file system. But be sure to list the changed assets in `touchedAssets` as well. Though when using this
 * method, the task won't be able to be used programmatically. Unless you handle this case specifically when the `needsAlltouchedAssets`
 * flag is set to true.
 * @property {import("../../../../src/mod.js").UuidString[]} [touchedAssets] A list of assets that this task touched, or
 * might touch when the task is run a second time. This is used by other tasks for determining if this task needs to run before them.
 * @property {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath[]} [touchedPaths] A list of paths that this task touched, or
 * might touch when the task is run a second time. This is used by other tasks for determining if this task needs to run before them.
 * @property {TCustomData} [customData] Custom data that a task might return, this is only useful when a task is run from a script.
 */

/**
 * @template [TCustomData = unknown]
 * @typedef RunTaskCreateAssetData
 * @property {import("../../util/fileSystems/StudioFileSystem.js").StudioFileSystemPath} path The location where the fileData
 * should be written to in the project.
 * @property {string} [assetType] The type of the asset, for example "renda:javascript"
 * @property {import("../../util/fileSystems/StudioFileSystem.js").AllowedWriteFileTypes} fileData The file data to write to disk.
 * @property {TCustomData} [customData] Custom data related to this file that a task can provide.
 */

/**
 * Options passed into {@linkcode Task.runTask}. This is generally only created
 * by the task manager. Rather than being called directly.
 * @template TTaskConfig
 * @typedef RunTaskOptions
 * @property {TTaskConfig} [config]
 * @property {boolean} allowDiskWrites If false, the caller of the task has requested no data to be written to disk.
 * In this case the task should return changes in `writeAssets` instead of writing to disk manually.
 * If for some reason using `writeAssets` is not feasible, the task implementation should throw an error.
 * @property {import("../TaskManager.js").ReadAssetFromPathSignature} readAssetFromPath Reads an asset from the file system.
 * If the asset was built by another task, the other task will run first in order to update the asset.
 * @property {import("../TaskManager.js").ReadAssetFromUuidSignature} readAssetFromUuid Reads an asset from the file system.
 * If the asset was built by another task, the other task will run first in order to update the asset.
 * @property {import("../TaskManager.js").RunDependencyTaskAssetSignature} runDependencyTaskAsset Runs a task, taking into account
 * that it is a dependency task of the task that this was called from.
 * When using this function, running tasks are properly reflected in the task ui.
 * @property {import("../TaskManager.js").RunDependencyTaskSignature} runChildTask Runs another task task.
 * Environment variables and some other options are automatically inherited from the parent task.
 * Use this to make child tasks appear correctly in the ui.
 * This does not mark the task as a dependency because you don't pass in the uuid of a task asset.
 * Instead, you provide the task type and task config directly.
 */

/**
 * @template [TTaskConfig = unknown]
 * @template [TCustomData = unknown]
 */
export class Task {
	/**
	 * Name that will be shown in the studio ui.
	 * @type {string}
	 */
	static uiName = "";

	/**
	 * This is used for identifying the task type in configuration files.
	 * This should have the format "namespace:taskType", for example: "renda:bundleScripts".
	 * @type {import("../../../../src/util/mod.js").UuidString}
	 */
	static type = "";

	/**
	 * The main entry point of the worker that should be created for running
	 * tasks of this type.
	 * @type {URL?}
	 */
	static workerUrl = null;

	/** @type {Worker?} */
	#worker = null;

	get worker() {
		if (!this.#worker) {
			throw new Error("This task does not have a worker. If you wish to use a worker, make sure the the static workerUrl property is set.");
		}
		return this.#worker;
	}

	/**
	 * The structure of the ui that should be rendered in the properties content window.
	 * @type {import("../../ui/propertiesTreeView/types.js").PropertiesTreeViewStructure?}
	 */
	static configStructure = null;

	/**
	 * Gets called when the configuration is changed in ui. You can use this
	 * to transform the data returned by the PropertiesTreeView before it gets
	 * saved to disk.
	 * @param {unknown} uiConfigData
	 */
	static transformUiToAssetData(uiConfigData) {
		return uiConfigData;
	}

	/**
	 * Gets called when the configuration data from disk is loaded into the ui.
	 * Use this in combination with {@linkcode transformUiToAssetData}.
	 * @param {unknown} assetConfigData
	 */
	static transformAssetToUiData(assetConfigData) {
		return assetConfigData;
	}

	/**
	 * @param {import("../../Studio.js").Studio} studioInstance
	 */
	constructor(studioInstance) {
		this.studioInstance = studioInstance;

		const castConstructor = /** @type {typeof Task} */ (this.constructor);
		if (castConstructor.workerUrl) {
			this.#worker = new Worker(castConstructor.workerUrl, {
				type: "module",
			});
		}
	}

	/**
	 * @param {RunTaskOptions<TTaskConfig>} options
	 * @returns {Promise<RunTaskReturn<TCustomData>>}
	 */
	async runTask(options) {
		throw new Error(`Task "${this.constructor.name}" does not implement runTask().`);
	}
}
