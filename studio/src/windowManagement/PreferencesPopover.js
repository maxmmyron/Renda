import {DropDownGui} from "../ui/DropDownGui.js";
import {Popover} from "../ui/popoverMenus/Popover.js";
import {PropertiesTreeView} from "../ui/propertiesTreeView/PropertiesTreeView.js";

/**
 * @typedef {typeof Popover} args
 * @param {import("../preferences/PreferencesManager.js").PreferencesManager<any>} preferencesManager
 * @param {string[]} preferenceIds
 * @param {HTMLElement} buttonEl
 * @param {import("../../../src/mod.js").UuidString} contentWindowUuid
 */

export class PreferencesPopover extends Popover {
	/** @type {import("../preferences/PreferencesManager.js").PreferencesManager<any>?} */
	#preferencesManager = null;
	/** @type {import("../../../src/mod.js").UuidString?} */
	#contentWindowUuid = null;

	/**
	 * @typedef CreatedEntryData
	 * @property {import("../preferences/PreferencesManager.js").PreferenceValueTypes} type
	 * @property {import("../ui/propertiesTreeView/PropertiesTreeViewEntry.js").PropertiesTreeViewEntryAny} entry
	 */

	/** @type {Map<string, CreatedEntryData>} */
	#createdEntries = new Map();
	#isLoadingValues = false;

	locationDropDown;

	/**
	 * @param {ConstructorParameters<typeof Popover>} popoverArgs
	 * @param {import("../ui/popoverMenus/PopoverArgs.js").PopoverConstructorArgs<PreferencesPopover>} preferencesPopoverArgs
	 */
	constructor(popoverArgs, preferencesPopoverArgs) {
		super(...popoverArgs);

		const topBarEl = document.createElement("div");
		topBarEl.classList.add("preferences-popover-top-bar");
		this.el.appendChild(topBarEl);

		this.locationDropDown = new DropDownGui({
			items: [
				"Default",
				"Global",
				"Workspace",
				"Version Control",
				"Project",
				"Window - Workspace",
				"Window - Project",
			],
			defaultValue: 0,
		});
		this.locationDropDown.onValueChange(() => {
			this.#updateEntryValues();
		});
		topBarEl.appendChild(this.locationDropDown.el);

		this.preferencesTreeView = new PropertiesTreeView();
		this.el.appendChild(this.preferencesTreeView.el);

		if (this.#preferencesManager) {
			throw new Error("Already initialized");
		}

		this.#preferencesManager = preferencesPopoverArgs.preferencesManager;
		this.#contentWindowUuid = preferencesPopoverArgs.contentWindowUuid;

		if(!this.#preferencesManager) {
			throw new Error("PreferencesManager is required");
		}

		for (const id of preferencesPopoverArgs.preferenceIds) {
			const {uiName, type} = this.#preferencesManager.getPreferenceConfig(id);
			if (type == "unknown") {
				throw new Error("Preferences with unknown type can not be added to PreferencesPopovers.");
			}
			const entry = this.preferencesTreeView.addItem({
				type,
				guiOpts: {
					label: uiName,
				},
			});
			entry.onValueChange(() => {
				if (this.#isLoadingValues) return;

				if (!this.#preferencesManager || !this.#contentWindowUuid) {
					throw new Error("Assertion failed, popover has not been initialized");
				}

				this.#preferencesManager.set(id, entry.getValue(), {
					location: this.#getCurrentLocation(),
					contentWindowUuid: this.#contentWindowUuid,
				});
			});
			this.#createdEntries.set(id, {
				type,
				entry,
			});
		}

		this.#updateEntryValues();

		this.setPos(preferencesPopoverArgs.buttonEl);
	}

	#getCurrentLocation() {
		const index = this.locationDropDown.getValue({getAsString: false}) - 1;
		/**
		 * @type {import("../preferences/preferencesLocation/PreferencesLocation.js").PreferenceLocationTypes[]}
		 */
		const locationTypes = [
			"global",
			"workspace",
			"version-control",
			"project",
			"contentwindow-workspace",
			"contentwindow-project",
		];
		if (index < 0 || index > locationTypes.length - 1) return null;
		return locationTypes[index];
	}

	#updateEntryValues() {
		if (!this.#preferencesManager || !this.#contentWindowUuid) {
			throw new Error("Assertion failed, popover has not been initialized");
		}

		this.#isLoadingValues = true;
		const location = this.#getCurrentLocation();
		for (const [id, {entry, type}] of this.#createdEntries) {
			let value = this.#preferencesManager.getUiValueAtLocation(id, location, {
				contentWindowUuid: this.#contentWindowUuid,
			});
			if (value == null) {
				if (type == "boolean") {
					value = false;
				} else if (type == "number") {
					value = 0;
				} else if (type == "string") {
					value = "";
				}
			}
			entry.setValue(value);
		}
		this.#isLoadingValues = false;
	}
}
