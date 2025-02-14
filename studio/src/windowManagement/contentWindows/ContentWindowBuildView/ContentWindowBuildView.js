import {ContentWindow} from "../ContentWindow.js";
import {Button} from "../../../ui/Button.js";
import {ButtonGroup} from "../../../ui/ButtonGroup.js";
import {EntryPointPopover, getSelectedEntryPoint} from "./EntryPointPopover.js";
import {TypedMessenger} from "../../../../../src/util/TypedMessenger.js";
import {ProjectAssetTypeJavascript} from "../../../assets/projectAssetType/ProjectAssetTypeJavascript.js";
import {ProjectAssetTypeHtml} from "../../../assets/projectAssetType/ProjectAssetTypeHtml.js";
import {PopoverToggleButton} from "../../../ui/popoverMenus/PopoverToggleButton.js";

/**
 * @typedef {ReturnType<ContentWindowBuildView["getIframeResponseHandlers"]>} BuildViewIframeResponseHandlers
 */

export class ContentWindowBuildView extends ContentWindow {
	static contentWindowTypeId = /** @type {const} */ ("renda:buildView");
	static contentWindowUiName = "Build";
	static contentWindowUiIcon = "static/icons/contentWindowTabs/buildView.svg";
	static scrollable = false;

	/**
	 * @param {ConstructorParameters<typeof ContentWindow>} args
	 */
	constructor(...args) {
		super(...args);

		this.setContentBehindTopBar(true);

		this.isRunning = false;
		this.iframeEl = document.createElement("iframe");
		this.iframeEl.classList.add("buildViewIframe");
		this.contentEl.appendChild(this.iframeEl);

		/** @type {TypedMessenger<{}, BuildViewIframeResponseHandlers>} */
		this.iframeMessenger = new TypedMessenger();
		this.iframeMessenger.setResponseHandlers(this.getIframeResponseHandlers());
		this.iframeMessenger.setSendHandler(data => {
			if (!this.iframeEl.contentWindow) {
				throw new Error("Failed to send message to build view iframe because it hasn't loaded yet.");
			}
			this.iframeEl.contentWindow.postMessage(data.sendData, "*", data.transfer);
		});

		this.studioInstance.gestureInProgressManager.onGestureInProgressChange(this.#onGestureInProgressChange);

		window.addEventListener("message", this.onIframeMessage);

		const colorizerFilterManager = this.studioInstance.colorizerFilterManager;

		const playStateButtonsGroup = new ButtonGroup();
		this.addTopBarEl(playStateButtonsGroup.el);

		this.playButton = new Button({
			icon: "static/icons/buildView/play.svg",
			colorizerFilterManager,
			onClick: () => {
				this.setIsRunning(true);
			},
		});
		playStateButtonsGroup.addButton(this.playButton);

		this.stopButton = new Button({
			icon: "static/icons/buildView/stop.svg",
			colorizerFilterManager,
			onClick: () => {
				this.setIsRunning(false);
			},
		});
		playStateButtonsGroup.addButton(this.stopButton);

		this.reloadButton = new Button({
			icon: "static/icons/buildView/reload.svg",
			colorizerFilterManager,
			onClick: () => {
				this.updateFrameSrc(true);
				this.updateIframeVisibility();
			},
		});
		playStateButtonsGroup.addButton(this.reloadButton);

		this.entryPointButton = new PopoverToggleButton(EntryPointPopover, this.studioInstance.popoverManager, {
			text: "Entry Point",
			hasDownArrow: true,
			colorizerFilterManager,
		});

		this.entryPointButton.onPopoverCreated(popover => {
			const projectSettings = this.studioInstance.projectManager.projectSettings;
			const assetManager = this.studioInstance.projectManager.assetManager;

			if (!projectSettings || !assetManager) {
				throw new Error("Assertion failed, no project settings or asset manager.");
			}

			popover.setNeedsCurtain(false);
			popover.initialize(projectSettings, assetManager, this.persistentData);
			popover.setPos(this.entryPointButton);
		});

		this.addTopBarEl(this.entryPointButton.el);

		this.updateButtonVisibilities();
		this.updateIframeVisibility();
	}

	destructor() {
		super.destructor();
		window.removeEventListener("message", this.onIframeMessage);
	}

	/**
	 * @param {boolean} isRunning
	 */
	setIsRunning(isRunning) {
		this.isRunning = isRunning;
		this.updateButtonVisibilities();
		this.updateIframeVisibility();
		this.updateFrameSrc();
		if (isRunning) {
			this.studioInstance.projectManager.markCurrentProjectAsWorthSaving();
		}
	}

	updateButtonVisibilities() {
		this.playButton.setVisibility(!this.isRunning);
		this.stopButton.setVisibility(this.isRunning);
		this.reloadButton.setVisibility(this.isRunning);
		this.entryPointButton.setVisibility(!this.isRunning);
	}

	async updateFrameSrc(allowReload = false) {
		if (this.isRunning) {
			const projectManager = this.studioInstance.projectManager;
			const assetManager = projectManager.assetManager;
			const projectSettings = projectManager.projectSettings;
			if (!assetManager) {
				throw new Error("Assertion failed, no asset manager");
			}
			if (!projectSettings) {
				throw new Error("Assertion failed, no project settings");
			}
			const entryPointUuid = await getSelectedEntryPoint(projectSettings, this.persistentData);
			if (!entryPointUuid) {
				throw new Error("Assertion failed, no entry point has been selected");
			}
			const projectAsset = await assetManager.getProjectAssetFromUuid(entryPointUuid, {
				assertAssetType: [ProjectAssetTypeJavascript, ProjectAssetTypeHtml],
				assertExists: true,
			});
			const path = projectAsset.path;
			if (!path) {
				throw new Error("Assertion failed, selected entry point doesn't exist or has been removed.");
			}
			const clientId = await this.studioInstance.serviceWorkerManager.getClientId();
			const projectAssetType = await projectAsset.getProjectAssetType();
			const projectAssetTypeAny = /** @type {any} */ (projectAssetType);
			let newSrc;
			if (projectAssetTypeAny instanceof ProjectAssetTypeHtml) {
				newSrc = `sw/clients/${clientId}/projectFiles/${path.join("/")}`;
			} else if (projectAssetTypeAny instanceof ProjectAssetTypeJavascript) {
				newSrc = `sw/clients/${clientId}/getGeneratedHtml?scriptSrc=projectFiles/${path.join("/")}`;
			} else {
				throw new Error(`Unexpected asset type for project asset with uuid "${entryPointUuid}"`);
			}
			if (this.iframeEl.src != newSrc || allowReload) {
				this.iframeEl.src = newSrc;
			}
		} else {
			this.iframeEl.src = "";
		}
	}

	getIframeResponseHandlers() {
		return {
			requestInternalDiscoveryUrl() {
				const url = new URL("internalDiscovery", window.location.href);
				return url.href;
			},
		};
	}

	/**
	 * @param {MessageEvent} e
	 */
	onIframeMessage = e => {
		if (e.source == this.iframeEl.contentWindow) {
			this.iframeMessenger.handleReceivedMessage(e.data);
		}
	};

	updateIframeVisibility() {
		this.iframeEl.style.display = this.isRunning ? "" : "none";
	}

	/**
	 * @param {boolean} gestureInProgress
	 */
	#onGestureInProgressChange = gestureInProgress => {
		this.iframeEl.style.pointerEvents = gestureInProgress ? "none" : "";
	};
}
