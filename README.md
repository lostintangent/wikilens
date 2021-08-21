# 🔎 WikiLens

WikiLens is a VS Code extension that adds a Roam/Obsidian-like editing experience on top of a GitHub repo and markdown files. This provides an excellent companion to [github.dev](https://twitter.com/github/status/1425505817827151872), and allows you to manage your notes/knowledge base, directly from the browser and using your existing/customized editor setup (e.g. Vim bindings, color theme) 🚀

## Features

1. 📄 Page-centric file explorer
   1. Filtered to markdown files
   1. Pages are displayed by title (`# Heading`), not filename
1. 📆 Daily pages
1. ⬅️ Backlinks (`[[Page Name]]`)
   1. Auto-completion for pages
   1. Hover support for links
   1. Inline backlinks view within files
   1. Tags (`#page-name`, `#[[Page Name]]`)
1. 🖇️ [Page embeds](#embedding-pages) (`![[Page Name]]`)

## Pages

Wikis are composed of "pages", which are markdown files that are identified using their `# Heading`, not their underlying file name. As a result, when you add a new page to a wiki, you simply give it a title/heading (e.g. `Todo List`), as opposed to a file path. Behind the scenes, WikiLens will create a new markdown file and pre-populate file name and `# Heading` using the specified title. To make it really simple to add a new wiki page, you can either run the `WikiLens: Add Page` command, or click the `+` button in the `Wiki` view.

## Daily Pages

In addition to being able to create topic-oriented pages, WikiLens allows you to open your "today page" at any time, which makes it easy to keep track of your daily progress and/or journal. To open your current daily page (that represents today), simply click on the calendar icon to the right of the repo node in the `Wiki` tree. This will open a new page, that is titled based on the current date (e.g. `June 24, 2020`), and placed in a directory named `Daily`. If this page doesn't exist, WikiLens will create it, otherwise, it will open the existing one. Additionally, to make it really simple to open your "today page", you can also run the `WikiLens: Open Today Page` command

> If you'd like to change the name of the directory that daily pages are stored in, you can set the `WikiLens > Daily: Directory Name` setting. Furthermore, if you want to change the format that is used to title daily pages, you can set the `WikiLens > Daily: Title Format` setting.

## Backlinks

In order to create connections between pages, you can add `[[links]]` to a page. When you type `[[`, WikiLens will display a completion list of the name of all existing pages. Furthermore, you can type a new topic/page title, and WikiLens will automatically create that page for you.

When a page includes `[[links]]`, they will be syntax highlighted, and you can hover over them to quickly see the context of the referenced page. Furthermore, you can `cmd+click` the link in order to directly jump to that page. If the page doesn't already exit, then `cmd+clicking` it will automatically create the page before opening it. This workflow makes it easy to author and navigate the set of pages within your wiki.

## Navigating Links

When you add `[[links]]` to a page, the referenced page automatically detects the "back link", and displays it as a child node of the page in the `Wiki` tree. This allows you to navigate `[[links]]` bi-directionallly, and allows your wiki to form a "network" of information. Each back link displays a line preview of the reference, and when clicked will automatically navigate you to the page location that references the selected page.

Furthermore, when you open a page that contains backlinks, the set of backlinks will be displayed at the bottom of the page, including a line preview of the backlink. This makes it possible to have pages that don't actually include content themselves, but rather, are simply "topic aggregators" to view the connections between pages in the same wiki.

## Embedding Pages

In addition to adding links to pages, it's sometimes valuable to embed the contents of another page directly into a note, so that you can easily read them together. To do this, you can use the `![[link]]` syntax, where you'll recieve auto-completion support just like regular links. When you use an embed link, the target page's contents will be displayed within the note whenever you view it's markdown preview.

## Contributed Commands

When you install WikiLens, the following commands are available in the command palette, whenever you have a workspace open and

- `WikiLens: Add Page` - Creates a new page using the specified title.

- `WikiLens: Open Today Page` - Opens the daily page that represents today. If the page doesn't exist, then it will create it automatically.

- `WikiLens: Refresh` - Refreshes the `Wiki` tree view.

## Contributed Settings

The following settings can be used to control the behavior of the WikiLens extension:

- `WikiLens: Daily > Directory Name` - Specifies the name of the directory that daily pages are organized within. Defaults to `"Daily"`.

- `WikiLens: Daily > Title Format` - Specifies the date format (using Moment.js syntax) that is used to for the title of daily pages. Defaults to `"LL"`.

- `WikiLens: Enabled` - Specifies whether to enable the wiki for the current workspace. Defaults to `true`.
