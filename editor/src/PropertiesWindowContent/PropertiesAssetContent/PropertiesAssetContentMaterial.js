import {PropertiesAssetContent} from "./PropertiesAssetContent.js";
import {ContentWindowEntityEditor} from "../../windowManagement/contentWindows/ContentWindowEntityEditor.js";
import {MaterialMap} from "../../../../src/Rendering/MaterialMap.js";

/**
 * @typedef {Object} MaterialAssetData
 * @property {import("../../../../src/util/mod.js").UuidString} [map]
 * @property {Object.<string, *>} [properties]
 */

/**
 * @extends {PropertiesAssetContent<import("../../assets/projectAssetType/ProjectAssetTypeMaterial.js").ProjectAssetTypeMaterial>}
 */
export class PropertiesAssetContentMaterial extends PropertiesAssetContent {
	/**
	 * @param {ConstructorParameters<typeof PropertiesAssetContent>} args
	 */
	constructor(...args) {
		super(...args);

		const materialTree = this.treeView.addCollapsable("material");
		this.mapTreeView = materialTree.addItem({
			type: "droppable",
			guiOpts: {
				supportedAssetTypes: [MaterialMap],
				label: "Map",
			},
		});
		this.mapTreeView.onValueChange(async () => {
			if (this.isUpdatingUi) return;

			// todo: support multiselect
			const asset = this.currentSelection[0];
			const {liveAsset} = await asset.getLiveAssetData();
			const liveMaterial = /** @type {import("../../../../src/Rendering/Material.js").Material} */ (liveAsset);

			const mapAsset = this.mapTreeView.getValue({purpose: "script"});
			liveMaterial.setMaterialMap(mapAsset);

			await this.loadMapValues();
			this.notifyEntityEditorsMaterialChanged();
			this.saveAsset();
		});

		this.mapValuesTreeView = materialTree.addCollapsable("map values");

		this.isUpdatingUi = false;
	}

	/**
	 * @returns {Promise<import("../../../../src/Rendering/Material.js").Material>}
	 */
	async getFirstSelectedLiveAsset() {
		const asset = this.currentSelection[0];
		const liveAsset = await asset.getLiveAsset();
		const material = /** @type {import("../../../../src/Rendering/Material.js").Material} */ (liveAsset);
		return material;
	}

	async loadAsset() {
		// todo: handle multiple selected items or no selection

		this.isUpdatingUi = true;

		const material = await this.getFirstSelectedLiveAsset();
		this.mapTreeView.gui.setValue(material.materialMap);
		await this.loadMapValues();

		this.isUpdatingUi = false;
	}

	async saveAsset() {
		// todo: handle multiple selected items or no selection
		const asset = this.currentSelection[0];
		const {liveAsset} = await asset.getLiveAssetData();
		if (liveAsset) {
			await asset.saveLiveAssetData();
		}
	}

	/**
	 * @override
	 * @param {import("../../assets/ProjectAsset.js").ProjectAsset<any>[]} selectedMaterials
	 */
	async selectionUpdated(selectedMaterials) {
		super.selectionUpdated(selectedMaterials);
		this.loadAsset();
	}

	async loadMapValues() {
		this.mapValuesTreeView.clearChildren();
		const material = await this.getFirstSelectedLiveAsset();
		/** @type {Object.<string, unknown>} */
		const currentMaterialValues = {};
		for (const [key, value] of material.getAllProperties()) {
			currentMaterialValues[key] = value;
		}
		if (!this.mapTreeView.value) return;

		const mappableValues = await this.editorInstance.materialMapTypeManager.getMapValuesForMapAssetUuid(this.mapTreeView.value);
		/** @type {import("../../UI/propertiesTreeView/types.js").PropertiesTreeViewStructure} */
		for (const valueData of mappableValues) {
			/** @type {import("../../UI/propertiesTreeView/types.js").PropertiesTreeViewEntryOptionsGeneric<any>} */
			const addItemOpts = {
				type: valueData.type,
				guiOpts: {
					label: valueData.name,
					defaultValue: valueData.defaultValue,
				},
			};
			const entry = this.mapValuesTreeView.addItem(addItemOpts);
			const value = currentMaterialValues[valueData.name];
			if (value !== undefined) {
				entry.setValue(value);
			}
			entry.onValueChange(async newValue => {
				if (this.isUpdatingUi) return;

				// todo: support multiselect
				const asset = this.currentSelection[0];
				const {liveAsset} = await asset.getLiveAssetData();
				const liveMaterial = /** @type {import("../../../../src/Rendering/Material.js").Material} */ (liveAsset);
				liveMaterial.setProperties({
					[valueData.name]: newValue,
				});

				this.notifyEntityEditorsMaterialChanged();
				this.saveAsset();
			});
		}
	}

	notifyEntityEditorsMaterialChanged() {
		for (const entityEditor of this.editorInstance.windowManager.getContentWindowsByConstructor(ContentWindowEntityEditor)) {
			entityEditor.notifyMaterialChanged();
		}
	}
}
