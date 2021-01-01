import PropertiesAssetContent from "./PropertiesAssetContent.js";
import {Mesh, WebGpuVertexState} from "../../../src/index.js";
import BinaryComposer from "../../../../src/Util/BinaryComposer.js";

export default class PropertiesAssetContentMesh extends PropertiesAssetContent{
	constructor(){
		super();

		this.meshSettingsTree = this.treeView.addCollapsable("mesh settings");

		this.meshSettingsStructure = {
			vertexState: {
				type: WebGpuVertexState,
				guiOpts: {
					storageType: "liveAsset",
				},
			},
			attributes: {
				type: Array,
				arrayOpts: {
					type: Array.from(Object.keys(Mesh.AttributeTypes)),
				},
			}
		};

		this.meshSettingsTree.generateFromSerializableStructure(this.meshSettingsStructure);
		this.meshSettingsTree.onChildValueChange(_ => {
			if(this.isUpdatingUi) return;
			this.saveAsset();
		});

		this.isUpdatingUi = false;
	}

	async loadAssetData(){
		//todo: handle multiple selected items or no selection

		const asset = this.currentSelection[0];
		const liveAsset = await asset.getLiveAsset();
		this.isUpdatingUi = true;

		if(liveAsset){
			const attributeNames = [];
			for(const attributeType of liveAsset.getBufferTypes()){
				if(attributeType == Mesh.AttributeTypes.INDEX) continue;
				const name = Mesh.getAttributeNameForType(attributeType);
				attributeNames.push(name);
			}
			this.meshSettingsTree.fillSerializableStructureValues({
				vertexState: liveAsset.getVertexState(),
				attributes: attributeNames,
			});
		}

		this.isUpdatingUi = false;
	}

	async saveAsset(){
		const settings = this.meshSettingsTree.getSerializableStructureValues(this.meshSettingsStructure);

		//todo: handle multiple selected items or no selection
		const asset = this.currentSelection[0];
		const liveAsset = await asset.getLiveAsset();
		if(liveAsset){
			liveAsset.setVertexState(settings.vertexState);
			await asset.saveLiveAsset();
		}
	}

	async selectionUpdated(selectedAssets){
		super.selectionUpdated(selectedAssets);
		this.loadAssetData();
	}
}
