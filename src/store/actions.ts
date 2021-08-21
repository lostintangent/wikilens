import { observable, runInAction } from "mobx";
import { Location, Range, Uri, workspace } from "vscode";
import { store, WikiDirectory, WikiItem, WikiPage } from ".";
import { byteArrayToString, findLinks, getPageFromLink } from "../utils";

async function getBackLinks(uri: Uri, contents: string) {
  const documentLinks = [...findLinks(contents)];
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
  const links = await getBackLinks(page.uri, page.contents!);
  for (const link of links) {
    const page = getPageFromLink(link.title);
    if (page) {
      if (page.backLinks) {
        const linkMatch = page.backLinks.find(
          (l) =>
            l.location.uri.toString() === link.location.uri.toString() &&
            l.location.range.isEqual(link.location.range)
        );

        if (linkMatch) {
          linkMatch.linePreview = link.linePreview;
        } else {
          page.backLinks.push(link);
        }
      } else {
        page.backLinks = [link];
      }
    }
  }

  // TODO: Remove backlinks that were removed
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

async function removePageFromDirectory(page: WikiPage, tree: WikiItem[]) {
  const pathParts = page.path.split("/");
  pathParts.splice(-1, 1);

  let parent: WikiDirectory | undefined;
  for (let pathPart of pathParts) {
    const items: WikiItem[] = parent ? parent.pages : tree;
    parent = items.find(
      (item) => (item as WikiPage).uri === undefined && item.name === pathPart
    ) as WikiDirectory;
  }

  parent!.pages = parent!.pages.filter((p) => p.path !== page.path);
}

async function updateWiki(batchUpdates: boolean = false) {
  const pageUris = await workspace.findFiles(
    `**/*.md`,
    "**/node_modules/**",
    500
  );

  const pages: WikiPage[] = pageUris.map((uri): WikiPage => createPage(uri));

  const tree: WikiItem[] = [];
  for (const page of pages) {
    if (!page.path.includes("/")) {
      tree.push(page);
    } else {
      addPageToDirectory(page, tree);
    }
  }

  store.pages = pages;
  store.tree = tree;

  store.isLoading = false;

  await Promise.all(
    pages.map(async (page) => runInAction(() => updatePageContents(page)))
  );
  await Promise.all(
    pages.map(async (page) => runInAction(() => updatePageBacklinks(page)))
  );
}

export async function initializeWiki(workspaceRoot: string) {
  store.isLoading = true;

  updateWiki();

  const watcher = workspace.createFileSystemWatcher("**/**.md");

  watcher.onDidCreate(async (uri) => {
    const page = createPage(uri);

    await updatePageContents(page);

    if (page.path.includes("/")) {
      await addPageToDirectory(page, store.tree!);
    } else {
      store.tree!.push(page);
    }

    store.pages.push(page);
  });

  watcher.onDidDelete(async (uri) => {
    const page = getPage(uri);
    if (!page) return;

    for (let page of store.pages.filter(
      (page) =>
        page.backLinks &&
        page.backLinks.find(
          (link) => link.location.uri.toString() === uri.toString()
        )
    )) {
      page.backLinks = page.backLinks!.filter(
        (link) => link.location.uri.toString() !== uri.toString()
      );
    }

    if (page.path.includes("/")) {
      await removePageFromDirectory(page, store.tree!);
    } else {
      store.tree = store.tree!.filter(
        (item) =>
          !(item as WikiPage).uri ||
          ((item as WikiPage).uri &&
            (item as WikiPage).uri.toString() !== uri.toString())
      );
    }

    store.pages = store.pages.filter(
      (page) => page.uri.toString() !== uri.toString()
    );
  });

  watcher.onDidChange(async (uri) => {
    const page = getPage(uri);
    if (!page) return;

    await updatePageContents(page);
    await updatePageBacklinks(page);
  });
}
