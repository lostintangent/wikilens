import * as vscode from "vscode";
import { getPageFromLink, getUriFromLink, isWikiDocument } from "../utils";

export function extendMarkdownIt(md: any) {
  return md
    .use(require("markdown-it-regex").default, {
      name: "wikilens-links",
      regex: /(?<!\!)(?:\[\[)([^\]]+?)(?:\]\])/,
      replace: (link: string) => {
        if (!isWikiDocument(vscode.window.activeTextEditor!.document)) {
          return;
        }

        const linkUri = getUriFromLink(link);
        const args = encodeURIComponent(JSON.stringify([linkUri]));
        const href = `command:vscode.open?${args}`;

        return `[[<a href=${href} title=${link}>${link}</a>]]`;
      },
    })
    .use(require("markdown-it-regex").default, {
      name: "wikilens-embeds",
      regex: /(?:\!\[\[)([^\]]+?)(?:\]\])/,
      replace: (link: string) => {
        if (!isWikiDocument(vscode.window.activeTextEditor!.document)) {
          return;
        }

        console.log("GW Displaying link");

        const page = getPageFromLink(link);
        if (page) {
          console.log("GW Got page: ", page);
          const markdown = require("markdown-it")();
          markdown.renderer.rules.heading_open = (
            tokens: any,
            index: number,
            options: any,
            env: any,
            self: any
          ) => {
            tokens[index].attrSet(
              "style",
              "text-align: center; border: 0; margin: 10px 0 5px 0"
            );
            return self.renderToken(tokens, index, options, env, self);
          };

          const htmlContent = markdown.render(page.contents);
          return `<div>
<hr />
${htmlContent}
<hr />
</div>`;
        }
      },
    });
}
