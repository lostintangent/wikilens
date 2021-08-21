import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { store, WikiDirectory, WikiPage, WikiPageBackLink } from "../store";

export class WikiDirectoryNode extends TreeItem {
  constructor(public directory: WikiDirectory) {
    super(directory.name, TreeItemCollapsibleState.Collapsed);

    this.iconPath = ThemeIcon.Folder;
    this.description = directory.pages.length.toString();
    this.contextValue = `wikilens.directory`;
  }
}

export class WikiPageNode extends TreeItem {
  constructor(public page: WikiPage) {
    super(
      page.title || page.name,
      page.backLinks && page.backLinks.length > 0
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.None
    );

    this.iconPath = ThemeIcon.File;
    this.resourceUri = page.uri;
    this.contextValue = "wikilens.page";

    this.command = {
      command: "vscode.open",
      title: "Open file",
      arguments: [page.uri],
    };

    if (page.backLinks && page.backLinks.length > 0) {
      this.description = page.backLinks.length.toString();
    }
  }
}

function getbackLinkDisplayName(uri: Uri) {
  const page = store.pages?.find(
    (page) => page.uri.toString() === uri.toString()
  );
  return page!.title || page!.path || "";
}

export class WikiBackLinkNode extends TreeItem {
  constructor(public backLink: WikiPageBackLink) {
    super(
      getbackLinkDisplayName(backLink.location.uri),
      TreeItemCollapsibleState.None
    );

    this.description = backLink.linePreview;
    this.tooltip = backLink.linePreview;

    this.command = {
      command: "vscode.open",
      arguments: [
        backLink.location.uri,
        { selection: backLink.location.range },
      ],
      title: "Open File",
    };

    this.contextValue = "wikilens.backLink";
  }
}
