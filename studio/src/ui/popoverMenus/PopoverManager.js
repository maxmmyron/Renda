import {waitForEventLoop} from "../../../../src/util/util.js";
import { PreferencesPopover } from "../../windowManagement/PreferencesPopover.js";
import {ContextMenu} from "./ContextMenu.js";
import {Popover} from "./Popover.js";

export class PopoverManager {
	/**
	 * @type {Popover[]}
	 */
	#activePopovers = [];

	/**
	 * @param {import("../../util/colorizerFilters/ColorizerFilterManager.js").ColorizerFilterManager} colorizerFilterManager
	 */
	constructor(colorizerFilterManager) {
		this.curtainEl = document.createElement("div");
		this.curtainEl.classList.add("popover-curtain");

		const iconDefaultColorFilter = colorizerFilterManager.getFilter("var(--text-color-level0)");
		const iconHoverColorFilter = colorizerFilterManager.getFilter("var(--selected-text-color)");

		// References are kept around to ensure the filters don't get garbage collected.
		this.iconDefaultColorFilterRef = iconDefaultColorFilter.getUsageReference();
		this.iconHoverColorFilterRef = iconHoverColorFilter.getUsageReference();

		const styleBlock = document.createElement("style");
		styleBlock.textContent = `
			.contextMenuItemIcon {
				filter: url(#${iconDefaultColorFilter.getFilterId()});
			}
			.contextMenuItem:hover:not(.disabled) .contextMenuItemIcon {
				filter: url(#${iconHoverColorFilter.getFilterId()});
			}
		`;
		document.head.appendChild(styleBlock);

		this.#updateCurtainActive();
	}

	/**
	 * @template {Popover} T
	 *
	 * @param {(new (popoverArgs: ConstructorParameters<typeof Popover>, args?: import("./PopoverArgs.js").PopoverConstructorArgs<T>) => T)?} PopoverConstructor
	 * @param {any | boolean} popoverConstructorArgs
	 * @param {import("./Popover.js").PopoverOptions} options
	 * @returns {T | Popover}
	 */
	addPopover(PopoverConstructor = null, popoverConstructorArgs = false, options = {}) {
		/**
		 * @type {T | Popover}
		 */
		let popover;

		if (PopoverConstructor === null) {
			// infer PopoverConstructor as Popover base class
			popover = new Popover(this);
		} else {
			if (popoverConstructorArgs === false) {
				popover = new PopoverConstructor([this, options]);
			} else {
				popover = new PopoverConstructor([this, options], ...popoverConstructorArgs);
			}
		}

		popover.onNeedsCurtainChange(this.#updateCurtainActive);
		this.#activePopovers.push(popover);
		this.#updateCurtainActive();

		// If a popover is opened as part of clicking a button, the click event will fire on the body immediately
		// after clicking that button. This would cause the popover to immediately close again.
		// To prevent this, we run this code in the next event loop.
		waitForEventLoop().then(() => {
			this.#updateBodyClickListener();
		});

		return /** @type {T} */ (popover);
	}

	/**
	 * @param {import("./ContextMenu.js").ContextMenuStructure?} structure
	 * @returns {ContextMenu}
	 */
	createContextMenu(structure = null) {
		const contextMenu = new ContextMenu(this, {structure});

		contextMenu.onNeedsCurtainChange(this.#updateCurtainActive);
		this.#activePopovers.push(contextMenu);
		this.#updateCurtainActive();

		// If a popover is opened as part of clicking a button, the click event will fire on the body immediately
		// after clicking that button. This would cause the popover to immediately close again.
		// To prevent this, we run this code in the next event loop.
		waitForEventLoop().then(() => {
			this.#updateBodyClickListener();
		});

		return contextMenu;
	}

	getLastPopover() {
		if(this.#activePopovers.length === 0) {
			throw new Error("Error retrieving last popover from manager: No popovers exist");
		}
		return this.#activePopovers.at(-1);
	}

	/**
	 * Removes the specified popover from the manager.
	 *
	 * @param {Popover} popover
	 * @returns {boolean} Returns true if the popover was successfully removed, false otherwise
	 */
	removePopover(popover) {
		const idx = this.#activePopovers.indexOf(popover);

		if (idx === -1) {
			return false;
		}

		this.#activePopovers.splice(idx, 1);
		this.#updateCurtainActive();
		this.#updateBodyClickListener();
		return true;
	}

	#updateBodyClickListener() {
		const needsListener = Boolean(this.#activePopovers.length);
		if (needsListener == this.#hasBodyClickListener) return;
		if (needsListener) {
			document.body.addEventListener("click", this.#onBodyClick);
		} else {
			document.body.removeEventListener("click", this.#onBodyClick);
		}
		this.#hasBodyClickListener = needsListener;
	}

	#hasBodyClickListener = false;

	/**
	 * @param {MouseEvent} e
	 */
	#onBodyClick = e => {
		if (this.#activePopovers.length === 0) return;

		this.#activePopovers.forEach(p => {
			p.close();
		});
	};

	#updateCurtainActive = () => {
		const needsCurtains = this.#activePopovers.some(p => p.needsCurtain);
		if (needsCurtains) {
			document.body.appendChild(this.curtainEl);
		} else {
			this.curtainEl.remove();
		}
	};
}
