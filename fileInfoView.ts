import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import * as ExifReader from 'exifreader';

export const VIEW_TYPE_FILE_INFO = "file-info-view";

export class FileInfoView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType() {
        return VIEW_TYPE_FILE_INFO;
    }

    getIcon() {
        return "info";
    }

    getDisplayText(): string {
        return "File info";
    }

    async onClose() {
        // Nothing to clean up
    }

    async onOpen() {
        await this.refreshFileInfo();
    }

    private formatFileSize(bytes: number): string {
        const units = ['bytes', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1000 && unitIndex < units.length - 1) {
            size /= 1000;
            unitIndex++;
        }

        // Round to 2 decimal places for KB/MB/GB, but show bytes as whole numbers
        const formattedSize = unitIndex === 0 ? 
            Math.round(size) : 
            Math.round(size * 100) / 100;

        return `${formattedSize} ${units[unitIndex]}`;
    }

    async refreshFileInfo() {
        const { workspace } = this.app;
        const { vault } = this.app;

        const createInfoItem = (label: string, value: string) => {
            const item = paneContent.createDiv('tree-item');
            const self = item.createDiv('tree-item-self is-clickable');
            self.createDiv({
                cls: 'tree-item-inner',
                text: label
            });
            const flairOuter = self.createDiv('tree-item-flair-outer');
            const flair = flairOuter.createSpan({
                cls: 'tree-item-flair',
                text: value
            });
            flair.setAttribute('title', value);

            // Add click-to-copy functionality
            self.addEventListener('click', async () => {
                await navigator.clipboard.writeText(value);
                new Notice(`Copied ${label.toLowerCase()} to clipboard`);
            });
        };

        const createHeaderItem = (label: string) => {
            const item = paneContent.createDiv('tree-item file-info-header');
            const self = item.createDiv('tree-item-self');
            self.createDiv({
                cls: 'tree-item-inner',
                text: label
            });
        };

        const container = this.containerEl.children[1];
        container.empty();

        const paneContent = container.createDiv('file-info-pane');

        const activeFile = workspace.getActiveFile();
        if (activeFile) {
            createHeaderItem('General');

            createInfoItem('File name', activeFile.name);
            createInfoItem('Vault path', activeFile.path);

            const stats = activeFile.stat;
            const createdDate = new Date(stats.ctime);
            const modifiedDate = new Date(stats.mtime);

            createInfoItem('Created', createdDate.toLocaleString());
            createInfoItem('Modified', modifiedDate.toLocaleString());
            createInfoItem('Size', this.formatFileSize(stats.size));

            // Check if file is an image
            // We don't want to waste time loading the file if it's not an image
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];
            if (imageExtensions.some(ext => activeFile.path.toLowerCase().endsWith(ext))) {
                const arrayBuffer = await vault.readBinary(activeFile);
                const blob = new Blob([arrayBuffer]);
                const url = URL.createObjectURL(blob);

                const tags = ExifReader.load(arrayBuffer);

                createHeaderItem('Image');

                if (tags?.FileType) {
                    createInfoItem('Format', tags.FileType.description)
                }

                // For image width, height, check if we have info in any of the relevant tags
                // Different formats can store this info in different tags
                const width = tags?.["Image Width"] ?? tags?.["ImageWidth"];
                const height = tags?.["Image Height"] ?? tags?.["ImageHeight"];
                
                if (width && height) {
                    createInfoItem('Width', width.description);
                    createInfoItem('Height', height.description);
                }

                const colorSpace = tags?.ColorSpace ?? tags?.["Color Space"] ?? tags?.["Color Type"];
                if (colorSpace) {
                    createInfoItem('Color Space', colorSpace.description);
                }
                
                URL.revokeObjectURL(url);
            }
        } else {
            createHeaderItem('No file open');
        }
    }
}