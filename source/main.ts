import { debounce, Plugin } from 'obsidian';
import { VIEW_TYPE_FILE_INFO, FileInfoView } from 'source/fileInfoView';

export default class FileInfoPlugin extends Plugin {
	private readonly REFRESH_INTERVAL = 5000; // 5 seconds
	private debouncedRefresh: () => void;

	async onload() {
		this.debouncedRefresh = debounce(() => this.refreshViews(), this.REFRESH_INTERVAL, false)

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

		// Refresh without debouncing when a file is opened / active file is changed.
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
					// Refresh on modify event at most every REFRESH_INTERVAL ms.
					this.debouncedRefresh();
				}
			})
		);
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
