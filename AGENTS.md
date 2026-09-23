# 公開網站協作規則

這個 repository 及其 GitHub Pages 網站完全公開。所有新增檔案、文案、網址和 Git 提交紀錄都可能被外部訪客看到。

- 此處只維護網站框架及經 Mark 或主題負責人確認可對外使用的內容。原始投稿與待確認素材放在私人 repository `Dimension-AI-Agent/ai-marketing-website` 的 Issue，不要直接放在此處。
- 素材形式不限；保留來源並避免杜撰產品主張、案例成果或授權狀態。上架前確認文字、圖片、影音及外部連結都適合公開。
- 新增公開素材時，將其放入 `data/materials.json`，子題 ID 必須存在於 `data/site.json`；網站需要的本機檔案放入 `assets/`。每筆公開素材的 `status` 設為 `已核准`。
- 先以 Pull Request 提交變更，經確認後合併至 `main`。GitHub Pages 會將同一個公開網址更新為新版本。
- 不要加入私人 Issue 附件網址、憑證、客戶機敏資料或未取得分享許可的內容。
