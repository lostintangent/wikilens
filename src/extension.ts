import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { registerLinkCompletionProvider } from "./language/completionProvider";
import { registerHoverProvider } from "./language/hoverProvider";
import { registerDocumentLinkProvider } from "./language/linkProvider";
import { registerCommentController } from "./links/comments";
import { registerLinkDecorator } from "./links/decorator";
import { extendMarkdownIt } from "./links/markdownPreview";
import { initializeWiki } from "./store/actions";
import { registerTreeProvider } from "./tree";

export function activate(context: vscode.ExtensionContext) {
  registerCommands(context);
  registerLinkDecorator();
  registerHoverProvider();
  registerLinkCompletionProvider();
  registerDocumentLinkProvider();
  registerCommentController();
  registerTreeProvider();

  const workspace = vscode.workspace.workspaceFolders?.[0];
  if (
    workspace //&&
    //workspace.uri.scheme === "vscode-vfs" &&
    //workspace.uri.authority === "github"
  ) {
    vscode.commands.executeCommand(
      "setContext",
      "wikilens:isWikiWorkspace",
      true
    );
    initializeWiki(vscode.workspace.workspaceFolders![0].uri.path);
  }

  return {
    extendMarkdownIt,
  };
}
