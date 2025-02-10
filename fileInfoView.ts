import { ItemView, Notice, WorkspaceLeaf } from "obsidian";

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

            const fileStats = await vault.adapter.stat(activeFile.path);
            if (fileStats) {
                const createdDate = new Date(fileStats.ctime);
                const modifiedDate = new Date(fileStats.mtime);

                createInfoItem('Created', createdDate.toLocaleString());
                createInfoItem('Modified', modifiedDate.toLocaleString());
                createInfoItem('Size', this.formatFileSize(fileStats.size));

                // Check if file is an image
                const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'];
                if (imageExtensions.some(ext => activeFile.path.toLowerCase().endsWith(ext))) {
                    const arrayBuffer = await vault.readBinary(activeFile);
                    const blob = new Blob([arrayBuffer]);
                    const url = URL.createObjectURL(blob);
                    
                    // Create image and wait for it to load
                    const img = new Image();
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = reject;
                        img.src = url;
                    });

                    createHeaderItem('Image');
                    createInfoItem('Width', `${img.naturalWidth}px`);
                    createInfoItem('Height', `${img.naturalHeight}px`);
                    
                    URL.revokeObjectURL(url);
                }
            }
        } else {
            createHeaderItem('No file open');
        }
    }
}