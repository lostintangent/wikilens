import { observable, runInAction } from "mobx";
import { Location, Range, Uri, workspace } from "vscode";
import { store, treeStore, WikiDirectory, WikiItem, WikiPage } from ".";
import {
  areEqualUris,
  byteArrayToString,
  findLinks,
  getPageFromLink,
} from "../utils";

async function getBackLinks({ uri, contents }: WikiPage) {
  const documentLinks = [...findLinks(contents!)];
  return Promise.all(
    documentLinks.map(async ({ title, contentStart, contentEnd }) => {
      const document = await workspace.openTextDocument(uri);
      const start = document.positionAt(contentStart);
      const end = document.positionAt(contentEnd);

      return {
        title,
        linePreview: document.lineAt(start).text,
        location: new Location(uri, new Range(start, end)),
      };
    })
  );
}

function createPage(uri: Uri) {
  const path = workspace.asRelativePath(uri, false);

  return observable({
    uri,
    path,
    name: path.split("/").pop()!.replace(".md", ""),
  });
}

function getPage(uri: Uri) {
  return store.pages.find((page) => page.uri.toString() === uri.toString());
}

async function updatePageContents(page: WikiPage) {
  page.contents = byteArrayToString(await workspace.fs.readFile(page.uri));

  const match = page.contents.match(/^(?:#+\s*)(.+)$/m);
  page.title = match ? match[1].trim() : undefined;
}

async function updatePageBacklinks(page: WikiPage) {
  const linkedPages = store.pages.filter(
    (linkedPage) =>
      linkedPage.backLinks &&
      linkedPage.backLinks.some((link) =>
        areEqualUris(link.location.uri, page.uri)
      )
  );

  const newLinks = await getBackLinks(page);

  runInAction(() => {
    for (const linkedPage of linkedPages) {
      linkedPage.backLinks = linkedPage.backLinks!.filter(
        (link) => !areEqualUris(link.location.uri, page.uri)
      );
    }

    for (let link of newLinks) {
      const page = getPageFromLink(link.title);
      if (page) {
        if (!page.backLinks) {
          page.backLinks = [];
        }

        page.backLinks.push(link);
      }
    }
  });
}

async function addPageToDirectory(page: WikiPage, tree: WikiItem[]) {
  const pathParts = page.path.split("/");
  pathParts.splice(-1, 1);

  let parent: WikiDirectory | undefined;
  for (let pathPart of pathParts) {
    const items: WikiItem[] = parent ? parent.pages : tree;
    let directory = items.find(
      (item) => (item as WikiPage).uri === undefined && item.name === pathPart
    );
    if (directory) {
      parent = directory as WikiDirectory;
    } else {
      const pathSuffix = parent ? `${parent.path}/` : "";
      directory = <WikiDirectory>{
        name: pathPart,
        path: `${pathSuffix}${pathPart}`,
        pages: [],
      };

      items.push(directory);
      parent = directory;
    }
  }

  parent!.pages.push(page);
}

function getDirectory(path: string) {
  const pathParts = path.split("/");

  let parent: WikiDirectory | undefined;
  for (let pathPart of pathParts) {
    const items: WikiItem[] = parent ? parent.pages : treeStore.tree!;
    parent = items.find(
      (item) => (item as WikiPage).uri === undefined && item.name === pathPart
    ) as WikiDirectory;
  }

  return parent;
}

async function removePageFromDirectory(page: WikiPage) {
  const pathParts = page.path.split("/");
  pathParts.splice(-1, 1);

  const directory = getDirectory(pathParts.join("/"));
  directory!.pages = directory!.pages.filter((p) => p.path !== page.path);

  if (directory!.pages.length === 0) {
    if (directory!.path.includes("/")) {
      const directoryPathParts = directory!.path.split("/");
      directoryPathParts.splice(-1, 1);
      const parentDirectory = getDirectory(directoryPathParts.join("/"));
      parentDirectory!.pages = directory!.pages.filter(
        (p) => p.path !== directory!.path
      );

      // TODO: Support multiple levels of directories
      // TODO: Delete an empty directory from the filesystem??
    } else {
      treeStore.tree = treeStore.tree!.filter(
        (p) => p.path !== directory!.path
      );
    }
  }
}

export async function updateWiki() {
  const pageUris = await workspace.findFiles(
    `**/*.md`,
    "**/node_modules/**",
    500
  );

  const pages = pageUris.map((uri) => createPage(uri));

  const tree: WikiItem[] = [];
  for (const page of pages) {
    if (!page.path.includes("/")) {
      tree.push(page);
    } else {
      await addPageToDirectory(page, tree);
    }
  }

  store.pages = pages;
  treeStore.tree = tree;

  store.isLoading = false;

  await Promise.all(pages.map((page) => updatePageContents(page)));
  await Promise.all(pages.map((page) => updatePageBacklinks(page)));
}

export async function initializeWiki(workspaceRoot: string) {
  store.isLoading = true;

  updateWiki();

  const watcher = workspace.createFileSystemWatcher("**/**.md");

  watcher.onDidCreate(async (uri) => {
    const page = createPage(uri);

    await updatePageContents(page);
    await updatePageBacklinks(page);

    if (page.path.includes("/")) {
      await addPageToDirectory(page, treeStore.tree!);
    } else {
      treeStore.tree!.push(page);
    }

    store.pages.push(page);
  });

  watcher.onDidDelete(async (uri) => {
    const page = getPage(uri);
    if (!page) return;

    const linkedPages = store.pages.filter(
      (page) =>
        page.backLinks &&
        page.backLinks.find((link) => areEqualUris(link.location.uri, uri))
    );

    for (const page of linkedPages) {
      page.backLinks = page.backLinks!.filter(
        (link) => !areEqualUris(link.location.uri, uri)
      );
    }

    if (page.path.includes("/")) {
      await removePageFromDirectory(page);
    } else {
      treeStore.tree = treeStore.tree!.filter(
        (item) =>
          !(item as WikiPage).uri ||
          ((item as WikiPage).uri &&
            (item as WikiPage).uri.toString() !== uri.toString())
      );
    }

    store.pages = store.pages.filter((page) => !areEqualUris(page.uri, uri));
  });

  watcher.onDidChange(async (uri) => {
    const page = getPage(uri);
    if (!page) return;

    await updatePageContents(page);
    await updatePageBacklinks(page);
  });
}
