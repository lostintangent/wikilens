import {
  Comment,
  CommentAuthorInformation,
  CommentController,
  CommentMode,
  comments,
  CommentThreadCollapsibleState,
  MarkdownString,
  Range,
  Uri,
  window,
  workspace,
} from "vscode";
import { store, WikiPageBackLink } from "../store";
import { isWikiDocument } from "../utils";

export class WikiBacklinksComments implements Comment {
  public body: string | MarkdownString;
  public mode: CommentMode = CommentMode.Preview;
  public author: CommentAuthorInformation;

  constructor(backlinks: WikiPageBackLink[]) {
    const content = backlinks
      .map((link) => {
        const page = store.pages?.find(
          (page) => page.uri.toString() === link.location.uri.toString()
        );

        const title = page!.title || page!.path;
        const args = [
          link.location.uri,
          {
            selection: {
              start: {
                line: link.location.range.start.line,
                character: link.location.range.start.character,
              },
              end: {
                line: link.location.range.end.line,
                character: link.location.range.end.character,
              },
            },
          },
        ];
        const command = `command:vscode.open?${encodeURIComponent(
          JSON.stringify(args)
        )}`;
        return `### [${title}](${command} 'Open the "${title}" page')
        
   \`\`\`markdown
   ${link.linePreview}
   \`\`\``;
      })
      .join("\r\n");

    const markdown = new MarkdownString(content);
    markdown.isTrusted = true;

    this.body = markdown;

    this.author = {
      name: "WikiLens (Backlinks)",
      iconPath: Uri.parse(
        "https://cdn.jsdelivr.net/gh/lostintangent/wikilens/icon.png"
      ),
    };
  }
}

let controller: CommentController | undefined;
export function registerCommentController() {
  window.onDidChangeActiveTextEditor((e) => {

    if (!e || !isWikiDocument(e.document)) {
      return;
    }

    const page = store.pages?.find(
      (page) => page.uri.toString() === e.document.uri.toString()
    );
    if (!page || !page.backLinks || page.backLinks.length === 0) {
      return;
    }

    if (controller) {
      controller.dispose();
      controller = undefined;
    }

    controller = comments.createCommentController(
      "wikilens.backlinks",
      "WikiLens"
    );
    const comment = new WikiBacklinksComments(page.backLinks);
    const thread = controller.createCommentThread(
      e.document.uri,
      new Range(e.document.lineCount, 0, e.document.lineCount, 0),
      [comment]
    );

    thread.label = "WikiLens";
    thread.canReply = false;
    thread.collapsibleState = CommentThreadCollapsibleState.Expanded;

    workspace.onDidChangeTextDocument((change) => {
      if (change.document.uri.toString() === e.document.uri.toString()) {
        thread.range = new Range(
          e.document.lineCount,
          0,
          e.document.lineCount,
          0
        );
      }
    });
  });
}
