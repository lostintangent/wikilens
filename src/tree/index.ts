import { reaction } from "mobx";
import {
  Event,
  EventEmitter,
  ProviderResult,
  TreeDataProvider,
  TreeItem,
  window,
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { store, WikiDirectory, WikiItem, WikiPage } from "../store";
import { WikiBackLinkNode, WikiDirectoryNode, WikiPageNode } from "./nodes";

class WikiTreeProvider implements TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData = new EventEmitter<void>();
  public readonly onDidChangeTreeData: Event<void> =
    this._onDidChangeTreeData.event;

  constructor() {
    reaction(
      () => [
        store.isLoading,
        store.pages
          ? store.pages.map((page) => [
              page.title,
              page.backLinks
                ? page.backLinks.map((link) => link.linePreview)
                : null,
            ])
          : null,
      ],
      () => {
        this._onDidChangeTreeData.fire();
      }
    );
  }

  getBackLinkNodes(node: WikiPageNode) {
    return node.page.backLinks!.map(
      (backLink) => new WikiBackLinkNode(backLink)
    );
  }

  getFileNodes(items: WikiItem[] | null = store.tree) {
    return items!
      .sort((a, b) => {
        if (
          ((a as WikiPage).uri && (b as WikiPage).uri) ||
          (!(a as WikiPage).uri && !(b as WikiPage).uri)
        ) {
          return a.name.localeCompare(b.name);
        } else if ((a as WikiPage).uri && !(b as WikiPage).uri) {
          return 1;
        } else {
          return -1;
        }
      })
      .map((item) => {
        if ((item as WikiPage).uri) {
          return new WikiPageNode(item as WikiPage);
        } else {
          return new WikiDirectoryNode(item as WikiDirectory);
        }
      });
  }

  getTreeItem = (node: TreeItem) => node;

  getChildren(element?: TreeItem): ProviderResult<TreeItem[]> {
    if (!element) {
      if (store.isLoading) {
        return [new TreeItem("Loading wiki...")];
      }

      const fileNodes = this.getFileNodes();
      if (fileNodes) {
        return fileNodes;
      } else {
        const addFileItem = new TreeItem("Add new page");
        addFileItem.command = {
          command: `${EXTENSION_NAME}.addWikiPage`,
          title: "Add new page",
        };

        return [addFileItem];
      }
    } else if (element instanceof WikiDirectoryNode) {
      return this.getFileNodes(element.directory.pages);
    } else if (element instanceof WikiPageNode && element.page.backLinks) {
      return this.getBackLinkNodes(element);
    }
  }
}

export function registerTreeProvider() {
  window.createTreeView(`${EXTENSION_NAME}.wiki`, {
    showCollapseAll: true,
    treeDataProvider: new WikiTreeProvider(),
    canSelectMany: true,
  });
}
