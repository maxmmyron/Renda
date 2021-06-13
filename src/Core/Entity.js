import {Vec3, Quaternion, Mat4} from "../Math/Math.js";
import {Component, defaultComponentTypeManager} from "../Components/Components.js";

export default class Entity{
	constructor(opts){
		if(typeof opts == "string"){
			opts = {
				name: opts,
			}
		}
		opts = {...{
			name: "Entity",
			matrix: null,
			parent: null,
		}, ...opts}
		this.name = opts.name;
		this._parent = null;
		this._children = [];
		this.components = [];

		this.localMatrixDirty = false;
		this.boundMarkLocalMatrixDirty = this.markLocalMatrixDirty.bind(this);
		this.worldMatrixDirty = false;
		this._localMatrix = new Mat4();
		this._worldMatrix = new Mat4();
		this._pos = new Vec3();
		this._pos.onChange(this.boundMarkLocalMatrixDirty);
		this._rot = new Quaternion();
		this._rot.onChange(this.boundMarkLocalMatrixDirty);
		this._scale = Vec3.one;
		this._scale.onChange(this.boundMarkLocalMatrixDirty);

		this.setParent(opts.parent, false);

		if(opts.matrix) this.localMatrix = opts.matrix;
	}

	destructor(){
		this.setParent(null, false);
		for(const child of this._children){
			child.destructor();
		}
		this._children = [];
		for(const component of this.components){
			component.destructor();
		}

		//todo: remove transformation listeners from rot pos scale etc
	}

	//if the argument already is a component, it will be detached
	//from the old entity and attached it to this one
	addComponent(component){
		if(!(component instanceof Component)){
			component = new Component(...arguments);
		}

		this.components.push(component);
		component.attachedToEntity(this);
		return component;
	}

	*getComponentsByType(type, componentTypeManager = defaultComponentTypeManager){
		const component = componentTypeManager.getComponentFromData(type, false);
		const uuid = component.uuid;
		for(const component of this.components){
			if(component.componentUuid == uuid && component.componentTypeManager == componentTypeManager){
				yield component;
			}
		}
	}

	*getChildComponentsByType(type, componentTypeManager = defaultComponentTypeManager){
		for(const child of this.traverseDown()){
			for(const component of child.getComponentsByType(type, componentTypeManager)){
				yield component;
			}
		}
	}

	get parent(){
		return this._parent;
	}

	set parent(newParent){
		this.setParent(newParent);
	}

	get pos(){
		return this._pos;
	}

	set pos(value){
		this._pos.set(value);
	}

	get rot(){
		return this._rot;
	}

	set rot(value){
		this._rot.set(value);
	}

	get scale(){
		return this._scale;
	}

	set scale(value){
		this._scale.set(value);
	}

	get localMatrix(){
		if(this.localMatrixDirty){
			this._localMatrix = Mat4.createPosRotScale(this.pos, this.rot, this.scale);
			this.localMatrixDirty = false;
		}
		return this._localMatrix;
	}

	set localMatrix(value){
		this._localMatrix.set(value);
		const {pos, rot, scale} = this._localMatrix.decompose();
		this.pos = pos;
		this.rot = rot;
		this.scale = scale;
		this.localMatrixDirty = false;
		this.worldMatrixDirty = true;
	}

	get worldMatrix(){
		if(this.localMatrixDirty || this.worldMatrixDirty){
			if(this.parent){
				this._worldMatrix = Mat4.multiplyMatrices(this.localMatrix, this.parent.worldMatrix);
			}else{
				this._worldMatrix = this.localMatrix.clone();
			}
			this.worldMatrixDirty = false;
		}
		return this._worldMatrix;
	}

	markLocalMatrixDirty(){
		this.localMatrixDirty = true;
		for(const child of this.traverseDown()){
			child.worldMatrixDirty = true;
		}
	}

	setParent(newParent, keepWorldPosition = false){
		if(this._parent){
			//todo: use slice?
			this._parent._children = this._parent._children.filter(c => c != this);
		}
		this._parent = newParent;
		if(newParent){
			newParent._children.push(this);
		}
	}

	detachParent(){
		this.setParent(null);
	}

	add(child, keepWorldPosition = false){
		child.setParent(this, keepWorldPosition);
	}

	remove(child){
		if(child.parent != this) return;
		child.setParent(null);
	}

	*getChildren(){
		for(const child of this._children){
			yield child;
		}
	}

	get children(){
		return Array.from(this.getChildren());
	}

	getRoot(){
		let lastParent = this;
		while(true){
			if(lastParent.parent){
				lastParent = lastParent.parent;
			}else{
				break;
			}
		}
		return lastParent;
	}

	*traverseDown(){
		yield this;
		for(const child of this._children){
			for(const c of child.traverseDown()){
				yield c;
			}
		}
	}

	*traverseUp(){
		yield this;
		if(this.parent){
			for(const entity of this.parent.traverseUp()){
				yield entity;
			}
		}
	}

	containsChild(child){
		for(const parent of child.traverseUp()){
			if(parent == this) return true;
		}
		return false;
	}

	getEntityByIndicesPath(indexPath, startFrom = 0){
		if(startFrom >= indexPath.length) return this;
		let index = indexPath[startFrom];
		let child = this.children[index];
		return child.getEntityByIndicesPath(indexPath, startFrom + 1);
	}

	getEntityByName(name){
		for(const child of this.traverseDown()){
			if(child.name == name) return child;
		}
		return null;
	}

	toJson(editorOpts = null){
		let json = {
			name: this.name,
			matrix: this.localMatrix.getFlatArray(),
			components: [],
			children: [],
		}
		for(const component of this.components){
			json.components.push(component.toJson(editorOpts));
		}
		for(const child of this.getChildren()){
			json.children.push(child.toJson(editorOpts));
		}
		if(json.components.length <= 0) delete json.components;
		if(json.children.length <= 0) delete json.children;
		return json;
	}
}
