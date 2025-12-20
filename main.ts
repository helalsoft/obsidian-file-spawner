import { App, Modal, Notice, Plugin, Setting, TFolder } from 'obsidian';

export default class FileSpawnerPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'spawn-new-file',
			name: 'Spawn new file and embed',
			callback: () => {
				new FileSpawnerModal(this.app, async (name, extension) => {
					await this.createAndEmbedFile(name, extension);
				}).open();
			}
		});
	}

	async createAndEmbedFile(name: string, extension: string) {
		const { vault, workspace } = this.app;
		
		// Clean extension
		extension = extension.startsWith('.') ? extension.slice(1) : extension;
		const fileName = `${name}.${extension}`;
		
		// Determine folder of the current file
		const activeFile = workspace.getActiveFile();
		let folderPath = '/';
		if (activeFile && activeFile.parent instanceof TFolder) {
			folderPath = activeFile.parent.path;
		}

		const filePath = folderPath === '/' ? fileName : `${folderPath}/${fileName}`;

		try {
			// Check if file already exists
			const existingFile = vault.getAbstractFileByPath(filePath);
			if (existingFile) {
				new Notice(`File ${fileName} already exists.`);
			} else {
				await vault.create(filePath, '');
			}

			// Insert wiki link at cursor position
			const activeView = workspace.getActiveViewOfType(require('obsidian').MarkdownView);
			if (activeView) {
				const editor = activeView.editor;
				const cursor = editor.getCursor();
				const wikiLink = `![[${fileName}]]`;
				editor.replaceRange(wikiLink, cursor);
			} else {
				new Notice('No active markdown editor to insert the link.');
			}
		} catch (error) {
			console.error('Error spawning custom file:', error);
			new Notice('Failed to spawn file. Check console for details.');
		}
	}
}

class FileSpawnerModal extends Modal {
	name: string = '';
	extension: string = '';
	onSubmit: (name: string, extension: string) => void;

	constructor(app: App, onSubmit: (name: string, extension: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Spawn New File' });

		new Setting(contentEl)
			.setName('File Name')
			.addText((text) =>
				text.onChange((value) => {
					this.name = value;
				}));

		new Setting(contentEl)
			.setName('File Extension')
			.setDesc('e.g., pdf, zip, txt')
			.addText((text) =>
				text.onChange((value) => {
					this.extension = value;
				}));

		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Spawn')
					.setCta()
					.onClick(() => {
						if (!this.name || !this.extension) {
							new Notice('Please provide both name and extension.');
							return;
						}
						this.close();
						this.onSubmit(this.name, this.extension);
					}));
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
