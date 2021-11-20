import {
    CancellationToken, commands, DefinitionProvider,
    languages,
    LocationLink,
    Position, Range,
    TextDocument
} from "vscode";
import { EXTENSION_NAME } from "../constants";
import { getPageFromLink, LINK_PATTERN, LINK_SELECTOR, withProgress } from "../utils";

function findLink(doc: TextDocument, pos: Position) {
    let match;
    let lineText = doc.lineAt(pos).text;
    while ((match = LINK_PATTERN.exec(lineText))) {
        let start = match.index;
        let stop = start + match[0].length;
        if (pos.character >= start && pos.character <= stop) {
            return {
                range: new Range(
                    new Position(pos.line, start),
                    new Position(pos.line, stop)
                ),
                title: match.groups!.page || match.groups!.tag
            };
        }
    }
    return undefined;
}

class WikiDefinitionProvider implements DefinitionProvider {
    public async provideDefinition(
        document: TextDocument,
        position: Position,
        cancel: CancellationToken
    ): Promise<LocationLink[] | undefined> {
        const link = findLink(document, position);
        if (link) {
            let page = getPageFromLink(link.title);
            if (!page) {
                await withProgress("Creating page...", async () =>
                    commands.executeCommand(`${EXTENSION_NAME}._createWikiPage`, link.title)
                );
                page = getPageFromLink(link.title);
            }
            let target = page!.uri;
            return cancel.isCancellationRequested ? undefined : [{
                originSelectionRange: link.range,
                targetRange: new Range(
                    new Position(0, 0),
                    new Position(0, 0)
                ),
                targetUri: target
            }];
        } else {
            return undefined;
        }
    }
}

export function registerDefinitionProvider() {
    languages.registerDefinitionProvider(
        LINK_SELECTOR,
        new WikiDefinitionProvider()
    );
}