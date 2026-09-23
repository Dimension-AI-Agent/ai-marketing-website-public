# 已確認素材如何上站

這份說明給 Mark、主題負責人及協助更新網站的 Codex 使用。素材的**提交入口**是 [私人收集區](https://github.com/Dimension-AI-Agent/ai-marketing-website)；這個公開 repository 只存放可對外顯示的版本。

## 發布流程

1. 在私人 Issue 確認子題、內容、原始來源與對外使用狀態。若仍是「待確認」或「不可對外使用」，先留在私人收集區。
2. 整理要公開的標題、摘要和呈現方式。公開連結必須不依賴私人 GitHub 權限；若是檔案，將已核准的公開版本放入本 repository 的 `assets/`。
3. 在本 repository 建立 Pull Request，修改 `data/materials.json`；網站框架或主題要調整時，也在這裡修改。Pull Request 請註明對應的私人 Issue 編號，讓有權限的團隊成員能追溯來源；不要把未核准的原稿貼進公開討論。
4. Mark 或主題負責人確認 Pull Request 後合併到 `main`。GitHub Pages 隨後更新 [固定網址](https://dimension-ai-agent.github.io/ai-marketing-website-public/)；更新不是即時的。
5. 回到私人 Issue 留下已上站的 Pull Request／網站連結，將標籤改為 `已上站`，再關閉該 Issue。

## 網站資料欄位

每份上站素材在 `data/materials.json` 中是一筆資料。`topicId` 要對應 `data/site.json` 的子題 ID；`url` 或 `file` 至少填一項。`status` 只使用 `已核准`。目前 Demo 顯示素材標題、形式與連結；其他欄位供整理與後續頁面設計使用。

```json
{
  "id": "unique-id",
  "topicId": "hardware",
  "title": "公開素材標題",
  "summary": "公開摘要",
  "format": "文字",
  "url": "https://example.com/public-content",
  "file": "",
  "owner": "提供者",
  "status": "已核准",
  "updatedAt": "2026-09-23"
}
```

`format` 是素材實際形式的描述，不限定影片、照片、音檔或文字。`file` 若使用檔案，請填入 `assets/` 開頭的路徑，並將檔案一併放入本 repository。不要引用私人 Issue 附件或需要登入私人 GitHub 才能開啟的網址。

目前**沒有自動從私人 repository 同步到公開 repository**。私人收集區的新增或修改不會直接影響公開網站；只有此處 `main` 的內容更新才會觸發網站重新發布。
