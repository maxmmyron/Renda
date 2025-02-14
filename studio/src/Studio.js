import {WindowManager} from "./windowManagement/WindowManager.js";
import {autoRegisterContentWindows} from "./windowManagement/autoRegisterContentWindows.js";
import {SelectionManager} from "./misc/SelectionManager.js";
import {PopoverManager} from "./ui/popoverMenus/PopoverManager.js";
import {KeyboardShortcutManager} from "./keyboardShortcuts/KeyboardShortcutManager.js";
import {autoRegisterShortcutCommands} from "./keyboardShortcuts/autoRegisterShortcutCommands.js";
import {autoRegisterShortcutConditions} from "./keyboardShortcuts/autoRegisterShortcutConditions.js";
import {PropertiesWindowContentManager} from "./propertiesWindowContent/PropertiesWindowContentManager.js";
import {ProjectAssetTypeManager} from "./assets/ProjectAssetTypeManager.js";
import {TaskManager} from "./tasks/TaskManager.js";
import {HistoryManager} from "./misc/HistoryManager.js";
import {ComponentGizmosManager} from "./componentGizmos/ComponentGizmosManager.js";
import {MaterialMapTypeSerializerManager} from "./assets/MaterialMapTypeSerializerManager.js";
import {ProjectManager} from "./projectSelector/ProjectManager.js";
import {BuiltInDefaultAssetLinksManager} from "./assets/BuiltInDefaultAssetLinksManager.js";
import {BuiltInAssetManager} from "./assets/BuiltInAssetManager.js";
import {DragManager} from "./misc/DragManager.js";
import {ColorizerFilterManager} from "./util/colorizerFilters/ColorizerFilterManager.js";
import {ServiceWorkerManager} from "./misc/ServiceWorkerManager.js";
import {IS_DEV_BUILD} from "./studioDefines.js";
import {DevSocketManager} from "./network/DevSocketManager.js";
import {ComponentTypeManager} from "../../src/components/ComponentTypeManager.js";
import {AssetLoader, EngineAssetsManager, IndexedDbUtil, ShaderBuilder, WebGpuRenderer, builtInComponents} from "../../src/mod.js";
import {ProjectAssetTypeShaderSource} from "./assets/projectAssetType/ProjectAssetTypeShaderSource.js";
import {PreferencesManager} from "./preferences/PreferencesManager.js";
import {autoRegisterPreferences} from "./preferences/autoRegisterPreferences.js";
import {GlobalPreferencesLocation} from "./preferences/preferencesLocation/GlobalPreferencesLocation.js";
import {GestureInProgressManager} from "./misc/GestureInProgressManager.js";

export class Studio {
	constructor() {
		this.engineAssetManager = new EngineAssetsManager(new AssetLoader());
		this.renderer = new WebGpuRenderer(this.engineAssetManager);
		this.webGpuShaderBuilder = new ShaderBuilder();
		/**
		 * A general purpose IndexedDb for storing data across sessions.
		 */
		this.indexedDb = new IndexedDbUtil("studioStorage");

		this.windowManager = new WindowManager();
		for (const w of autoRegisterContentWindows) {
			this.windowManager.registerContentWindow(w);
		}

		/** @type {PreferencesManager<typeof autoRegisterPreferences>} */
		this.preferencesManager = new PreferencesManager();
		this.preferencesManager.registerPreferences(autoRegisterPreferences);
		this.preferencesManager.addLocation(new GlobalPreferencesLocation(this.indexedDb));

		this.selectionManager = new SelectionManager();
		this.colorizerFilterManager = new ColorizerFilterManager();
		this.popoverManager = new PopoverManager(this.colorizerFilterManager);
		this.gestureInProgressManager = new GestureInProgressManager();

		this.keyboardShortcutManager = new KeyboardShortcutManager();
		for (const [name, options] of Object.entries(autoRegisterShortcutConditions)) {
			this.keyboardShortcutManager.registerCondition(name, options);
		}
		this.keyboardShortcutManager.registerCommands(autoRegisterShortcutCommands);

		this.propertiesWindowContentManager = new PropertiesWindowContentManager(this.windowManager);
		this.projectAssetTypeManager = new ProjectAssetTypeManager();
		this.taskManager = new TaskManager();
		this.historyManager = new HistoryManager(this.keyboardShortcutManager);
		this.componentGizmosManager = new ComponentGizmosManager();
		this.materialMapTypeSerializerManager = new MaterialMapTypeSerializerManager();
		this.projectManager = new ProjectManager();
		this.builtInDefaultAssetLinksManager = new BuiltInDefaultAssetLinksManager();
		this.builtInAssetManager = new BuiltInAssetManager(this.projectAssetTypeManager);
		this.dragManager = new DragManager();
		this.serviceWorkerManager = new ServiceWorkerManager();

		if (IS_DEV_BUILD) {
			this.devSocket = new DevSocketManager();
		}

		this.componentTypeManager = new ComponentTypeManager();
		for (const component of builtInComponents) {
			this.componentTypeManager.registerComponent(component);
		}
	}

	/**
	 * This serves as both a convencience function for quicly accessing selected
	 * objects from the console using `studio.selected` and is also used in e2e
	 * tests for getting access to objects.
	 */
	get selected() {
		const selectionGroup = this.selectionManager.activeGroup;
		const selected = selectionGroup?.currentSelectedObjects ?? [];
		if (selected.length == 0) return null;
		if (selected.length == 1) return selected[0];
		return [...selected];
	}

	init() {
		if (IS_DEV_BUILD && this.devSocket) {
			this.builtInAssetManager.init(this.devSocket);
		}
		this.engineAssetManager.addGetAssetHandler(async uuid => {
			await this.builtInAssetManager.waitForLoad();
			await this.projectManager.waitForAssetListsLoad();
			const projectAsset = this.builtInAssetManager.assets.get(uuid);
			if (!projectAsset) return null;
			return await projectAsset.getLiveAsset();
		});
		if (IS_DEV_BUILD) {
			this.builtInAssetManager.onAssetChange(uuid => {
				this.engineAssetManager.notifyAssetChanged(uuid);
			});
		}

		this.renderer.init();
		this.windowManager.init();
		this.propertiesWindowContentManager.init();
		this.projectAssetTypeManager.init();
		this.taskManager.init();
		this.componentGizmosManager.init();
		this.materialMapTypeSerializerManager.init();
		this.builtInDefaultAssetLinksManager.init();
		this.serviceWorkerManager.init();

		this.webGpuShaderBuilder.onShaderUuidRequested(async uuid => {
			const assetManager = await this.projectManager.getAssetManager();
			const projectAsset = await assetManager.getProjectAssetFromUuid(uuid, {
				assertAssetType: ProjectAssetTypeShaderSource,
			});
			if (projectAsset) {
				if (projectAsset.assetType == "renda:shaderSource") {
					return await projectAsset.readAssetData();
				}
			}
			return null;
		});

		this.projectManager.onFileChange(async e => {
			const assetManager = await this.projectManager.getAssetManager();
			const uuid = await assetManager.getAssetUuidFromPath(e.path);
			this.webGpuShaderBuilder.invalidateShader(uuid);
		});
	}
}
