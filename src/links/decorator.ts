// This file is heavily copied from https://github.com/svsool/vscode-memo/blob/master/src/extensions/syntaxDecorations.ts

import {
  Range,
  TextDocument,
  TextEditor,
  TextEditorDecorationType,
  window,
  workspace,
} from "vscode";
import { isWikiDocument } from "../utils";

const decorationTypes: { [type: string]: TextEditorDecorationType } = {
  gray: window.createTextEditorDecorationType({
    rangeBehavior: 1,
    dark: { color: "#636363" },
    light: { color: "#CCC" },
  }),
  lightBlue: window.createTextEditorDecorationType({
    color: "#4080D0",
  }),
};

const regexToDecorationTypes: { [regexp: string]: (string | null)[] } = {
  ["(\\s|^)(\\[\\[)([^\\[\\]]+?)(\\]\\])"]: [null, "gray", "lightBlue", "gray"],
  ["(\\s|^)([\\!\\#])(\\[\\[)([^\\[\\]]+?)(\\]\\])"]: [
    null,
    "gray",
    "gray",
    "lightBlue",
    "gray",
  ],
  ["(\\s|^)(#)([^\\s#`,]+)"]: [null, "gray", "lightBlue"],
};

function getDecorations(document: TextDocument) {
  const decors: { [decorTypeName: string]: Range[] } = {};

  Object.keys(decorationTypes).forEach((decorTypeName) => {
    decors[decorTypeName] = [];
  });

  document
    .getText()
    .split(/\r?\n/g)
    .forEach((lineText, lineNum) => {
      Object.keys(regexToDecorationTypes).forEach((reText) => {
        const decorTypeNames = regexToDecorationTypes[reText];
        const regex = new RegExp(reText, "g");

        let match: RegExpExecArray | null;
        while ((match = regex.exec(lineText)) !== null) {
          let startIndex = match.index;

          for (let i = 0; i < decorTypeNames.length; i++) {
            const decorTypeName = decorTypeNames[i];
            const matchGroup = match[i + 1];

            if (!decorTypeName) {
              startIndex += matchGroup.length;
              continue;
            }

            const range = new Range(
              lineNum,
              startIndex,
              lineNum,
              startIndex + matchGroup.length
            );

            startIndex += matchGroup.length;
            decors[decorTypeName].push(range);
          }
        }
      });
    });

  return decors;
}

function updateDecorations(textEditor?: TextEditor) {
  const editor = textEditor || window.activeTextEditor;
  const doc = editor?.document;

  if (!editor || !doc) {
    return;
  }

  const decors = getDecorations(editor.document);
  Object.keys(decors).forEach((decorTypeName) => {
    editor &&
      editor.setDecorations(
        decorationTypes[decorTypeName],
        decors[decorTypeName]
      );
  });
}

export function registerLinkDecorator() {
  window.onDidChangeActiveTextEditor((editor) => {
    if (editor && isWikiDocument(editor.document)) {
      updateDecorations(editor);
    }
  });

  workspace.onDidChangeTextDocument((event) => {
    const editor = window.activeTextEditor;
    if (!isWikiDocument(editor!.document)) {
      return;
    }

    let timeout: NodeJS.Timer | null = null;
    const triggerUpdateDecorations = (editor: TextEditor) => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => updateDecorations(editor), 1000);
    };

    if (editor !== undefined && event.document === editor.document) {
      triggerUpdateDecorations(editor);
    }
  });

  if (
    window.activeTextEditor &&
    isWikiDocument(window.activeTextEditor.document)
  ) {
    updateDecorations(window.activeTextEditor);
  }
}
