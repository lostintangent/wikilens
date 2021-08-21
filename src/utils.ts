import {
  DocumentSelector,
  ProgressLocation,
  TextDocument,
  Uri,
  window,
} from "vscode";
import { config } from "./config";
import { store, WikiPage } from "./store";

export function sanitizeName(name: string) {
  return name.replace(/\s/g, "-").replace(/[^\w\d-_]/g, "");
}

export const LINK_SELECTOR: DocumentSelector = [
  {
    language: "markdown",
  },
];

export const LINK_PREFIX = "[[";
export const LINK_SUFFIX = "]]";
const LINK_PATTERN = /(?:#?\[\[)(?<page>[^\]`]+)(?:\]\])|#(?<tag>[^\s#`,]+)/gi;

const DAILY_PATTERN = /\d{4}-\d{2}-\d{2}/;
export function getPageFilePath(name: string) {
  let fileName = sanitizeName(name).toLocaleLowerCase();
  if (!fileName.endsWith(".md")) {
    fileName += ".md";
  }

  if (DAILY_PATTERN.test(fileName)) {
    const pathPrefix = config.dailyDirectName
      ? `${config.dailyDirectName}/`
      : "";
    return `${pathPrefix}${fileName}`;
  } else {
    return fileName;
  }
}

export interface WikiLink {
  title: string;
  start: number;
  end: number;
  contentStart: number;
  contentEnd: number;
}

export function* findLinks(contents: string): Generator<WikiLink> {
  let match;
  while ((match = LINK_PATTERN.exec(contents))) {
    const title = match.groups!.page || match.groups!.tag;
    const start = match.index;
    const end = start + match[0].length;
    const contentStart = start + match[0].indexOf(title);
    const contentEnd = contentStart + title.length;

    yield {
      title,
      start,
      end,
      contentStart,
      contentEnd,
    };
  }
}

export function getPageFromLink(link: string): WikiPage {
  return store.pages!.find(
    (page) =>
      page.title?.toLocaleLowerCase() === link.toLocaleLowerCase() ||
      page.path === link ||
      page.path.replace(".md", "") === link
  )!;
}

export function getUriFromLink(link: string) {
  const page = getPageFromLink(link);
  return page?.uri;
}

export function byteArrayToString(value: Uint8Array) {
  return new TextDecoder().decode(value);
}

export function stringToByteArray(value: string) {
  return new TextEncoder().encode(value);
}

export function withProgress<T>(title: string, action: () => Promise<T>) {
  return window.withProgress(
    {
      location: ProgressLocation.Notification,
      title,
    },
    action
  );
}

export function areEqualUris(uri: Uri, otherUri: Uri) {
  return uri.toString().localeCompare(otherUri.toString()) === 0;
}

export function isWikiDocument(document: TextDocument) {
  return document.uri.path.endsWith(".md");
  //return false;
  // }

  //return (
  //  document.uri.scheme === "vscode-vfs" && document.uri.authority === "github"
  //);
}
