import { commands, ExtensionContext, Uri, window, workspace } from "vscode";
import { config } from "./config";
import { EXTENSION_NAME } from "./constants";
import { store } from "./store";
import { updateWiki } from "./store/actions";
import { WikiDirectoryNode, WikiPageNode } from "./tree/nodes";
import { getPageFilePath, stringToByteArray, withProgress } from "./utils";

import moment = require("moment");
const { titleCase } = require("title-case");

async function createWikiPage(name: string, filePath: string) {
  const title = titleCase(name);
  let fileHeading = `# ${title}

`;

  const pageUri = Uri.joinPath(workspace.workspaceFolders![0].uri, filePath);
  return workspace.fs.writeFile(pageUri, stringToByteArray(fileHeading));
}

export function registerCommands(context: ExtensionContext) {
  // This is a private command that handles dynamically
  // creating wiki documents, when the user auto-completes
  // a new document link that doesn't exist.
  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}._createWikiPage`,
      async (name: string) => {
        const fileName = getPageFilePath(name);
        await createWikiPage(name, fileName);

        // Automatically save the current, in order to ensure
        // the newly created backlink is discovered.
        await window.activeTextEditor?.document.save();
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.addWikiPage`,
      async (node?: WikiDirectoryNode) => {
        const input = window.createInputBox();
        input.title = `Add wiki page`;
        input.prompt = "Enter the name of the new page you'd like to create";

        input.onDidAccept(async () => {
          input.hide();

          if (input.value) {
            const path = getPageFilePath(input.value);
            const filePath = node ? `${node.directory.path}/${path}` : path;

            await withProgress("Adding new page...", async () =>
              createWikiPage(input.value, filePath)
            );
            const pageUri = Uri.joinPath(
              workspace.workspaceFolders![0].uri,
              filePath
            );
            window.showTextDocument(pageUri);
          }
        });

        input.show();
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.deleteWikiPage`,
      async (node: WikiPageNode) => {
        if (
          await window.showInformationMessage(
            `Are you sure that you want to delete the "${
              node.page.title || node.page.name
            }" page?`,
            "Delete"
          )
        ) {
          await withProgress("Deleting page...", async () =>
            workspace.fs.delete(node.page.uri)
          );
        }
      }
    )
  );

  context.subscriptions.push(
    commands.registerCommand(`${EXTENSION_NAME}.refreshWiki`, async () => {
      store.isLoading = true;
      updateWiki();
    })
  );

  context.subscriptions.push(
    commands.registerCommand(
      `${EXTENSION_NAME}.openTodayPage`,
      async (displayProgress: boolean = true) => {
        const sharedMoment = moment();
        const fileName = sharedMoment.format("YYYY-MM-DD");
        const filePath = getPageFilePath(fileName);

        const titleFormat = config.dailyTitleFormat;
        const pageTitle = sharedMoment.format(titleFormat);

        const pageUri = Uri.joinPath(
          workspace.workspaceFolders![0].uri,
          filePath
        );

        try {
          await workspace.fs.stat(pageUri);
        } catch {
          const writeFile = async () => createWikiPage(pageTitle, filePath);

          if (displayProgress) {
            await withProgress("Adding new page...", writeFile);
          } else {
            await writeFile();
          }
        }

        window.showTextDocument(pageUri);
      }
    )
  );
}
