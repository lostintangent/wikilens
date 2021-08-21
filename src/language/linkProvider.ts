import {
  CancellationToken,
  commands,
  DocumentLink,
  DocumentLinkProvider,
  languages,
  Range,
  TextDocument,
  Uri,
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import {
  findLinks,
  getPageFromLink,
  LINK_SELECTOR,
  withProgress,
} from "../utils";

class WikiDocumentLink extends DocumentLink {
  constructor(public title: string, range: Range, target?: Uri) {
    super(range, target);
  }
}

class WikiDocumentLinkProvider implements DocumentLinkProvider {
  public provideDocumentLinks(
    document: TextDocument
  ): WikiDocumentLink[] | undefined {
    const documentLinks = [...findLinks(document.getText())];
    return documentLinks.map(({ title, contentStart, contentEnd }) => {
      const linkRange = new Range(
        document.positionAt(contentStart),
        document.positionAt(contentEnd)
      );

      const treeItem = getPageFromLink(title);
      const linkUri = treeItem ? treeItem.uri : undefined;

      return new WikiDocumentLink(title, linkRange, linkUri);
    });
  }

  async resolveDocumentLink(link: WikiDocumentLink, token: CancellationToken) {
    const treeItem = getPageFromLink(link.title);
    link.target = treeItem.uri;

    if (!treeItem) {
      await withProgress("Creating page...", async () =>
        commands.executeCommand(`${EXTENSION_NAME}._createWikiPage`, link.title)
      );
    }

    return link;
  }
}

export function registerDocumentLinkProvider() {
  languages.registerDocumentLinkProvider(
    LINK_SELECTOR,
    new WikiDocumentLinkProvider()
  );
}
