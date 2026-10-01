# ② 公開網站

[開啟網站](https://dimension-ai-agent.github.io/ai-marketing-website-public/) · [私人素材提交入口（限團隊）](https://github.com/Dimension-AI-Agent/ai-marketing-website)

本 repository 放網站前端及已核准公開的內容；任何人都能查看檔案與提交紀錄。

團隊從私人表單交件，Mark 確認後，由私人專案的發布程式複製附件並更新這裡的素材清單。GitHub Pages 會發布到同一個網址。系統只有確認公開網站出現相同版本，才回報已上站。

**自動發布仍需在私人專案完成授權設定及真實附件驗證。** 詳情見私人專案的 SETUP.md。

對外摘要、正文、公開連結和已核准附件可以出現在網站；原始來源與內部備註不會由發布程式帶入。圖片、音訊、影片提供預覽及檔案連結，其他文件提供開啟／下載。

首頁以摘要卡片列出已核准文章，點入後以獨立頁面閱讀。`data/site.json` 的 `featuredMaterialId` 指定唯一焦點文章；目前由 Mark 決定，變更時走網站設計 PR。文章直達連結使用 `?article=material-編號`，舊版發布通知的 `#material-編號` 連結仍可開啟同一篇文章。

首頁右側的文章清單可接入 `data/article-views.json` 中最近 30 天的單篇點閱數，依次數排序並只顯示已核准文章。目前尚未接入流量分析工具，因此以「從這幾篇開始」呈現閱讀起點；接入真實點閱資料後才會顯示「熱門文章」。資料格式與更新條件見 [發布說明](PUBLISHING.md)。

網站設計或程式變更走 Pull Request；經 Mark 確認的素材更新由發布程式直接提交 main。參閱 [發布說明](PUBLISHING.md)。
