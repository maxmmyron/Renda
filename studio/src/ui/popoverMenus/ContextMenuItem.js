export class ContextMenuItem {
	/** @type {Set<function(import("./ContextMenu.js").ContextMenuItemClickEvent) : void>} */
	onClickCbs = new Set();

	/** @type {Set<() => void>} */
	onHoverCbs = new Set();

	/**
	 * @param {import("./ContextMenu.js").ContextMenu} containingContextMenu
	 * @param {import("./ContextMenu.js").ContextMenuItemOpts} opts
	 */
	constructor(containingContextMenu, {
		text = "",
		tooltip = "",
		onClick = null,
		onHover = null,
		disabled = false,
		showRightArrow = false,
		horizontalLine = false,
		reserveIconSpace = false,
		showCheckmark = false,
		showBullet = false,
		icon = null,
	} = {}) {
		this.containingContextMenu = containingContextMenu;

		if(horizontalLine) {
			this.el = document.createElement("hr");
			this.el.classList.add("contextMenuDivider");

			// return because rest of constructor is unnecessary;
			// divider is purely semantic and doesn't have icons, text, etc.
			return;
		} else {
			this.el = document.createElement("button");
			this.el.classList.add("contextMenuItem");
			this.el.disabled = disabled;

			this.contentEl = document.createElement("div");
			this.contentEl.classList.add("contextMenuItemContent");

			this.el.appendChild(this.contentEl);
		}

		this.pictureEl = document.createElement("picture");
		this.pictureEl.classList.add("contextMenuIcon");

		this.iconEl = document.createElement("img");
		// use empty alt to convey as decorative image
		this.iconEl.alt = "";

		this.pictureEl.appendChild(this.iconEl);
		this.contentEl.appendChild(this.pictureEl);

		this.textEl = document.createElement("span");
		this.textEl.textContent = text;
		this.textEl.title = tooltip;
		this.textEl.classList.add("contextMenuItemText");

		this.contentEl.appendChild(this.textEl);

		if (showRightArrow) {
			const arrowEl = document.createElement("div");
			arrowEl.classList.add("rightArrow");
			this.el.appendChild(arrowEl);
		}

		this._reserveIconSpace = reserveIconSpace;
		this._showCheckmark = showCheckmark;
		this._showBullet = showBullet;
		this._icon = icon;
		this.disabled = disabled;
		this.updateIconStyle();

		if (onClick) this.onClick(onClick);
		if (onHover) this.onHover(onHover);

		this.el.addEventListener("click", () => {
			if (this.disabled) return;
			let preventMenuClose = false;
			for (const cb of this.onClickCbs) {
				/** @type {import("./ContextMenu.js").ContextMenuItemClickEvent} */
				const event = {
					item: this,
					preventMenuClose: () => {
						preventMenuClose = true;
					},
				};
				cb(event);
			}
			if (!preventMenuClose) {
				this.containingContextMenu.onItemClicked();
			}
		});

		this.el.addEventListener("mouseenter", () => {
			if (this.disabled) return;
			for (const cb of this.onHoverCbs) {
				cb();
			}
		});
	}

	get reserveIconSpace() {
		return this._reserveIconSpace;
	}

	set reserveIconSpace(value) {
		this._reserveIconSpace = value;
		this.containingContextMenu.updateHasReservedIconSpaceItem();
	}

	get showCheckmark() {
		return this._showCheckmark;
	}

	set showCheckmark(value) {
		this._showCheckmark = value;
		this.updateIconStyle();
	}

	get showBullet() {
		return this._showBullet;
	}

	set showBullet(value) {
		this._showBullet = value;
		this.updateIconStyle();
	}

	get icon() {
		return this._icon;
	}

	set icon(value) {
		this._icon = value;
		this.updateIconStyle();
	}

	updateIconStyle() {
		const needsSpace = this.containingContextMenu.hasResevedIconSpaceItem || this.showCheckmark || this.showBullet || this.icon;

		if(!this.iconEl) return;

		this.iconEl.classList.toggle("hidden", !needsSpace);
		let iconUrl = null;
		if (this.showCheckmark) {
			iconUrl = "static/icons/contextMenuCheck.svg";
		} else if (this.showBullet) {
			iconUrl = "static/icons/contextMenuBullet.svg";
		} else if (this.icon) {
			iconUrl = this.icon;
		}
		if (iconUrl) {
			this.iconEl.src = iconUrl;
		} else {
			this.iconEl.src = "";
		}
	}

	destructor() {
		this.onClickCbs.clear();
	}

	/**
	 * @param {string} text
	 */
	setText(text) {
		if(this.textEl) this.textEl.textContent = text;
	}

	/**
	 * @param {function(import("./ContextMenu.js").ContextMenuItemClickEvent) : void} cb
	 */
	onClick(cb) {
		this.onClickCbs.add(cb);
	}

	/**
	 * @param {() => void} cb
	 */
	onHover(cb) {
		this.onHoverCbs.add(cb);
	}
}
