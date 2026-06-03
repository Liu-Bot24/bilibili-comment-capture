# Privacy Policy

B站评论导出助手 processes Bilibili video comment data locally in the user's browser.

## Data Collected

The extension reads the current active tab URL when the user opens the side panel, only to detect whether the page is a Bilibili video page.

When the user starts a capture, the extension requests public comment data from Bilibili APIs for the selected video. The exported files may include public comment text, public usernames, user ids, like counts, reply counts, timestamps, and Bilibili reply ids.

When the user clicks AI analysis, the extension opens `https://danmu.liu-qi.cn/result` with video identifiers in the URL query, such as BV id, cid, page number, source, and analysis mode. Captured comment text is not sent by this extension during that jump.

## Data Storage

The extension stores capture settings and the latest capture summary in Chrome local extension storage. Full captured comment exports are generated in memory and downloaded only when the user clicks an export button.

## Data Sharing

The extension does not send captured comment data to any third-party server. The AI analysis button only opens the external analysis page with video identifiers in the URL. The extension does not include analytics, tracking, advertising SDKs, or remote code.

## Permissions

- `activeTab`: detects the current Bilibili video page after the user opens the extension side panel.
- `sidePanel`: opens the extension controls in Chrome's side panel.
- `storage`: saves local capture settings and the latest capture summary.
- `https://www.bilibili.com/*`: reads the active video page context.
- `https://api.bilibili.com/*`: requests Bilibili video metadata, comments, and nested replies.

## Contact

For issues or privacy questions, use the support channel listed on the extension store page or project repository.
