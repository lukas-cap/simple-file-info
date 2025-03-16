import { Plugin } from 'obsidian';
import { VIEW_TYPE_FILE_INFO, FileInfoView } from 'source/fileInfoView';

export default class FileInfoPlugin extends Plugin {
	private lastRefreshTime: number = 0;
	private readonly REFRESH_INTERVAL = 5000; // 5 seconds

	async onload() {
		this.registerView(
            VIEW_TYPE_FILE_INFO,
            (leaf) => new FileInfoView(leaf)
        );

		this.addCommand({
			id: 'show-file-info',
			name: 'Show file info',
			callback: async () => {
				await this.app.workspace.ensureSideLeaf(VIEW_TYPE_FILE_INFO, 'right', {
					reveal: true,
				});
			},
		});

		this.app.workspace.onLayoutReady(async () => {
			await this.app.workspace.ensureSideLeaf(VIEW_TYPE_FILE_INFO, 'right', {
				reveal: false,
				active: false,
			});
        });

		// Listen for both file-open and active-leaf-change events
		this.registerEvent(
			this.app.workspace.on("file-open", () => {
				this.refreshViews()
			})
		);

		// Watch for file modifications
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				const activeFile = this.app.workspace.getActiveFile();
				if (file === activeFile) {
					this.debouncedRefresh();
				}
			})
		);
	}

	private debouncedRefresh() {
		const now = Date.now();
		if (now - this.lastRefreshTime >= this.REFRESH_INTERVAL) {
			this.refreshViews();
			this.lastRefreshTime = now;
		}
	}

	private refreshViews() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FILE_INFO);
		leaves.forEach(leaf => {
			if (leaf.view instanceof FileInfoView) {
				leaf.view.refreshFileInfo();
			}
		});
	}
}