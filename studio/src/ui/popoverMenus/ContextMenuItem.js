export class ContextMenuItem {
	#shouldReserveIconSpace = false;

	/**
	 * The icon source as set in the constructor.
	 *
	 * @type {string | null}
	 */
	#icon = null;

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
		hasRightArrow = false,
		icon = null,
		iconSrc = null,
		isDivider = false,
		submenu = null,
	} = {}) {
		this.containingContextMenu = containingContextMenu;

		if(isDivider) {
			this.el = document.createElement("hr");
			this.el.classList.add("contextMenuItemHorizontalLine");

			// Wo break out of the constructor here because we don't want to add extraneous elements to what would otherwise
			// be a purely thematic break in the menu content.
			return;
		} else {
			this.el = document.createElement("button");
			this.el.classList.add("contextMenuItem");
			this.el.disabled = disabled;

			// TODO: we can remove this class and instead style based on the disabled attribute.
			this.el.classList.toggle("disabled", disabled);

			/**
			 * this.contentEL represents a container element that holds the primary icon and text content of a menu item.
			 * This is used to prevent justify-content: space-between from pushing the text content to the right side of the
			 * menu
			 */
			this.contentEl = document.createElement("div");
			this.contentEl.classList.add("contextMenuItemContent");

			this.el.appendChild(this.contentEl);
		}

		this.iconEl = document.createElement("picture");
		this.iconEl.classList.add("contextMenuItemIcon");

		this.textEl = document.createElement("span");
		this.textEl.title = tooltip;
		this.textEl.classList.add("contextMenuItemText");

		this.contentEl.appendChild(this.iconEl);
		this.contentEl.appendChild(this.textEl);

		this.#icon = this.#resolveIcon(icon, iconSrc);

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

		if (hasRightArrow) {
			const arrowEl = document.createElement("div");
			arrowEl.classList.add("rightArrow");
			this.el.appendChild(arrowEl);
		}

		this.setText(text);
	}

	/**
	 * @param {"checkmark" | "bullet" | null} icon
	 * @param {string | null} iconSrc
	 */
	#resolveIcon(icon, iconSrc) {
		if (iconSrc) {
			return iconSrc;
		}

		switch(icon) {
			case "checkmark":
				return "static/icons/contextMenuCheck.svg";
			case "bullet":
				return "static/icons/contextMenuBullet.svg";
			default:
				return null;
		}
	}

	get icon() {
		return this.#icon;
	}

	/**
	 * @param {"checkmark" | "bullet" | null} value
	 */
	setIcon(value) {
		this.#icon = this.#resolveIcon(value, null);
		this.updateIconStyle();
	}

	/**
	 * @param {string | null} iconSrc
	 */
	setIconSrc(iconSrc) {
		this.#icon = iconSrc;
	}

	updateIconStyle() {
		const needsSpace = this.containingContextMenu.hasReservedIconSpace || this.#icon;

		if(!this.iconEl) {
			throw new Error("Icon element is not defined. This is likely because the ContextMenuItem is a divider.");
		}

		this.iconEl.classList.toggle("hidden", !needsSpace);
		let iconURL = null;
		this.iconEl.style.backgroundImage = iconURL ? `url(${iconURL})` : "";
	}

	destructor() {
		this.onClickCbs.clear();
	}

	/**
	 * @param {string} text
	 */
	setText(text) {
		if(!this.textEl) {
			throw new Error("Text element is not defined. This is likely because the ContextMenuItem is a divider.");
		}
		this.textEl.textContent = text;
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
