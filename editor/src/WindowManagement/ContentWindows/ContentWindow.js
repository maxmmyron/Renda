export default class ContentWindow{
	constructor(){
		this.el = document.createElement("div");
		this.el.classList.add("editorContentWindow");

		this.topButtonBar = document.createElement("div");
		this.topButtonBar.classList.add("editorContentWindowTopButtonBar");
		this.el.appendChild(this.topButtonBar);

		this.tabSelectorSpacer = document.createElement("div");
		this.tabSelectorSpacer.classList.add("editorContentWindowTopButtonBarSpacer");
		this.topButtonBar.appendChild(this.tabSelectorSpacer);

		this.contentEl = document.createElement("div");
		this.contentEl.classList.add("editorContentWindowContent");
		this.el.appendChild(this.contentEl);
	}

	setVisible(visible){
		this.el.classList.toggle("hidden", !visible);
	}

	static get windowName(){
		return "Empty";
	}

	updateTabSelectorSpacer(w, h){
		this.tabSelectorSpacer.style.width = w+"px";
		this.tabSelectorSpacer.style.height = h+"px";
	}

	setContentBehindTopBar(value){
		this.contentEl.classList.toggle("behindTopButtonBar", value);
	}
}
