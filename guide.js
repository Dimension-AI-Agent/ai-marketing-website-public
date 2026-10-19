// Five-question guide. Rules use only the selected answers; no network or AI calls.
// Question 1 picks the work type; questions 2 and 3 are asked per work type
// (the bottleneck and where the needed data lives); questions 4 and 5 are shared.
// The report's core finding comes from questions 1 + 2; the other answers adjust
// the starting point, the first step, the stage note and the reading list.
const guideStorageKey = "dimension-guide-v2";

const guidedQuestions = {
  work: { title: "這次最想改善哪一類工作？", options: [
    ["search", "查找文件"], ["document", "製作文件或報表"], ["reply", "回覆客戶"], ["systems", "跨系統處理資料"], ["undecided", "還沒確定／不在上面"]
  ] },
  pain: {
    search: { title: "找資料時，最常卡在哪裡？", options: [
      ["where", "不知道資料放在哪，要問人"],
      ["version", "找到好幾份，不確定哪份最新、最正確"],
      ["extract", "找到了，但要從很長的文件裡讀出需要的段落"],
      ["access", "有些資料要申請權限，或要找有權限的人"]
    ] },
    document: { title: "做這份文件或報表，最花時間的是哪一段？", options: [
      ["gather", "從不同來源收集、整理數字和資料"],
      ["format", "套範本、排版、調整格式"],
      ["write", "撰寫說明、摘要或分析文字"],
      ["revise", "反覆核對修改，或被退回重做"]
    ] },
    reply: { title: "回覆一則客戶問題，最花時間的是哪一段？", options: [
      ["find", "找答案，要翻文件或問同事"],
      ["lookup", "查這位客戶的訂單、合約或帳務狀態"],
      ["confirm", "等其他部門或主管確認"],
      ["compose", "答案知道了，但要寫成正確又得體的回覆"]
    ] },
    systems: { title: "處理這些資料時，最花時間的是哪一段？", options: [
      ["rekey", "同一筆資料要在不同系統重複輸入"],
      ["convert", "各系統格式不同，要先轉換整理"],
      ["reconcile", "資料有錯或兜不起來，要人工比對修正"],
      ["judge", "每筆都要有人判斷後才能處理"]
    ] },
    undecided: { title: "以下哪個情況，在你們團隊最常見？", options: [
      ["search-where", "常常要問人，才知道資料在哪或哪份最新"],
      ["document-gather", "定期文件或報表要花很多時間整理"],
      ["reply-find", "客戶問題常要轉好幾手才回得了"],
      ["systems-rekey", "同一筆資料要在不同系統輸入好幾次"],
      ["general", "都不太像"]
    ] }
  },
  source: {
    search: { title: "這些文件目前主要放在哪裡？", options: [
      ["central", "集中在一兩個地方，例如共用雲端硬碟或文件系統"],
      ["scattered", "分散在多個系統、信件和個人電腦"],
      ["tacit", "很多答案只在資深同事腦中"],
      ["unsure", "說不上來"]
    ] },
    document: { title: "這份文件依據的資料，通常來自哪裡？", options: [
      ["export", "固定的系統或報表匯出"],
      ["mixed", "多個系統，加上人工整理的試算表"],
      ["unstructured", "會議紀錄、信件等沒有固定格式的內容"],
      ["varies", "每次來源都不一樣"]
    ] },
    reply: { title: "回覆時依據的答案或規則，主要在哪裡？", options: [
      ["faq", "有整理好的 FAQ 或規則文件"],
      ["scattered", "散在信件、聊天紀錄和資深同事的經驗裡"],
      ["system", "在系統裡，要逐筆查詢"],
      ["case", "幾乎每件都要個案判斷"]
    ] },
    systems: { title: "這些系統能匯出、匯入資料，或已有串接嗎？", options: [
      ["export", "都能匯出成 Excel 或 CSV"],
      ["api", "部分系統有 API 或既有串接"],
      ["screen", "只能在系統畫面上操作"],
      ["unsure", "不清楚"]
    ] },
    general: { title: "這件工作需要的資料或答案，目前大多在哪裡？", options: [
      ["organized", "已整理在文件或系統裡"],
      ["scattered", "散在不同人和不同地方"],
      ["people", "主要在同事的經驗裡"],
      ["unsure", "說不上來"]
    ] }
  },
  frequency: { title: "這類工作大概多常發生？", options: [
    ["daily", "每天好幾件"], ["weekly", "每週幾件"], ["bulk", "每月幾次，但每次份量很大"], ["irregular", "不固定"]
  ] },
  stage: { title: "目前團隊在這類工作上，用 AI 到什麼程度？", options: [
    ["none", "還沒開始"], ["personal", "有人自己用 ChatGPT 等通用工具"], ["team", "團隊有導入的 AI 工具"], ["connected", "已接上公司內部資料或系統"], ["unsure", "不清楚"]
  ] }
};

// Core findings: work type × bottleneck. `articles` lists at most two; the
// first is always shown. `consult` marks cases articles cannot settle alone.
// `skipPrefix` lists starting points whose prerequisite repeats this action.
const guideFindings = {
  "search.where": {
    title: "資料找不到，問題通常在「沒有人知道誰有」，不在搜尋工具不好。",
    why: "要問人才找得到資料，代表知識存在，只是沒有大家都知道的入口。每次詢問都會打斷另一位同事，資深同事越忙，等待就越久。",
    help: "建立內部知識查詢助理，讓同事用平常的說法提問，AI 從已整理的文件中找出答案並附上出處。前提是文件要先放在 AI 讀得到、權限也正確的地方。",
    action: "記錄這一週同事之間「某某資料在哪」的詢問，至少 10 則。每則寫下：問了什麼、最後在哪裡找到、花了多久。",
    progress: "同一個問題第二次出現時，不用再問人就找得到。",
    articles: ["material-34"], topic: "enterprise-adoption"
  },
  "search.version": {
    title: "找到好幾份卻不敢用，要先解決「哪一份算數」，再談 AI。",
    why: "同一份資料有多個版本時，人要花時間比對，AI 也會被舊版本誤導，而且會很有把握地引用過期內容。這個問題接上 AI 之後通常更明顯，不會自己消失。",
    help: "先決定每類文件的正式版本放在哪裡，再讓 AI 只讀那個位置。AI 回答時附上出處與更新日期，讓人一眼就能判斷能不能用。",
    action: "挑出最常被問的 3 類文件，例如報價規則、產品規格、作業流程。每類確定一個正式存放位置，以及負責更新的人。",
    progress: "同事被問到時，能直接指出「以這裡為準」。",
    articles: ["material-34"], topic: "ai-security"
  },
  "search.extract": {
    title: "這是 AI 最容易先做出成果的情況。",
    why: "資料已經找得到，只是卡在讀長文件。從長文件中找出相關段落並整理重點，是 AI 擅長的工作，結果也容易由人核對。",
    help: "讓 AI 讀指定文件後回答問題，並標出答案出自原文哪一段，方便核對。",
    action: "找出 3 份最常需要翻閱的長文件，每份寫下 3 個實際會被問到的問題。用公司允許使用的 AI 工具試問，檢查答案和標出的段落是否正確。",
    progress: "查一個問題，從讀整份文件變成核對一段原文。",
    articles: ["material-29"], topic: "ai-security"
  },
  "search.access": {
    title: "卡在權限，代表資料的分享規則需要先說清楚；AI 不能、也不該繞過它。",
    why: "權限是刻意設下的保護。AI 若讀得到所有文件，等於繞過原本的權限；完全讀不到，又幫不上忙。關鍵是讓 AI 回答時，仍然依照提問者本人的權限。",
    help: "建立依權限回答的查詢助理：同一個問題，不同部門的人看到的答案範圍不同。這需要和公司既有的帳號與權限系統整合。",
    action: "列出最常需要跨部門申請的 5 類資料。每類寫下：誰有權限、申請通常要多久、哪些內容其實可以開放給更多人。",
    progress: "能清楚分出「可以開放」和「必須保留權限」的資料。",
    articles: ["material-34", "material-26"], topic: "ai-security", consult: true
  },
  "document.gather": {
    title: "時間花在收資料，該先處理的是資料來源，而不是寫作。",
    why: "報表本身也許一小時就寫完，收集資料卻要花上大半天。每次從不同地方複製貼上，也是數字出錯的主要來源。只請 AI 幫忙寫，省不到最花時間的那一段。",
    help: "先把固定的收集步驟流程化：從固定來源取數、整理成固定格式，再交給 AI 撰寫說明。資料來源越固定，越容易自動化。",
    action: "拿最近一份報表，列出每個數字的來源（哪個系統、哪個檔案、誰提供），並標出哪些每次都一樣。",
    progress: "每次都一樣的數字，不再需要手動複製。",
    articles: ["material-41"], topic: "enterprise-adoption"
  },
  "document.format": {
    title: "格式最花時間時，不一定要等 AI，用範本通常就能先解決一大半。",
    why: "很多格式問題用固定範本、樣式或報表工具就能處理，不需要 AI。AI 適合的是「內容長短不一、需要整理成固定結構」的那一部分。",
    help: "版面交給範本；AI 負責把整理好的內容，依固定的段落結構和用語產出初稿。",
    action: "收集最近 3 份被要求修改格式的文件，列出每次被改的項目。能固定的寫進範本，剩下的才是 AI 可以幫忙的部分。",
    progress: "同一類文件不再因為格式被退回。",
    articles: ["material-41"], topic: "enterprise-adoption"
  },
  "document.write": {
    title: "撰寫是 AI 最能幫上忙的地方，關鍵在於給它好的參考。",
    why: "寫說明、摘要和分析是 AI 的強項。寫出來品質不好，原因通常不是 AI 不會寫，而是沒有給它過去寫得好的範例、公司慣用的說法和判斷標準。",
    help: "準備 2 到 3 份過去寫得好的文件當範例，連同固定資料交給 AI 產出初稿；人負責判斷內容和修改結論。",
    action: "挑一份下次要寫的文件，用公司允許使用的 AI 工具，附上一份過去的好範例試寫一次，記下哪些地方需要修改。",
    progress: "修改從「整段重寫」變成「調整結論和用語」。",
    articles: ["material-44"], topic: "enterprise-adoption"
  },
  "document.revise": {
    title: "反覆被退回，通常是標準沒有說清楚，不是寫的人不夠用心。",
    why: "退回多半是因為審閱者心中的標準沒有寫下來。這時用 AI 產出更多版本，只會讓退回次數變多。先把標準寫清楚，人和 AI 才都有依據。",
    help: "把審閱標準寫成檢查清單，讓 AI 在送審前依清單先檢查一次，提早抓出常見問題。",
    action: "拿最近 3 次被退回的文件，列出退回原因，整理成一份不超過 10 項的送審檢查清單，再請審閱者確認。",
    progress: "同一個退回原因不再重複出現。",
    articles: ["material-35"], topic: "benefit-assessment"
  },
  "reply.find": {
    title: "回覆慢的主因是答案散落各處；先把常見問題集中，AI 才有東西可以查。",
    why: "要翻文件、問同事才找得到答案，代表答案存在，只是沒有集中。AI 只能回答它讀得到的內容；答案沒整理好時，AI 只會用通用說法帶過，被修改的機率很高。",
    help: "建立客服知識查詢助理：同事輸入客戶的問題，AI 從整理好的 FAQ 和規則中找出答案並附上出處，同事確認後再回覆。",
    action: "挑最近 20 則客戶問題依主題分類，找出最常出現的 5 類，寫下每一類的標準答案和依據文件。",
    progress: "最常見的問題，不用再問同事就能回答。",
    articles: ["material-41"], topic: "enterprise-adoption", skipPrefix: ["scattered"]
  },
  "reply.lookup": {
    title: "時間花在查客戶資料，關鍵是讓 AI 讀得到系統裡的狀態。",
    why: "答案取決於這位客戶的訂單、合約或帳務狀態，光靠 FAQ 回答不了。要省下這段時間，AI 必須在回覆時查得到系統資料，這屬於系統串接的範圍。",
    help: "讓 AI 依客戶身分查詢相關系統、整理出狀態摘要，再草擬回覆。訊達的智慧維修 AI Agent 示範是類似做法：依報修內容串接 CRM、ERP 等系統，產出建議後由人審核。",
    action: "列出回覆時最常需要查的 3 個系統，以及每次要看哪些欄位。",
    progress: "回覆一則問題前，需要切換的系統變少。",
    articles: ["material-13", "material-27"], topic: "on-prem-integration", consult: true, skipPrefix: ["system"]
  },
  "reply.confirm": {
    title: "等確認是決策流程的問題，AI 寫得再快，也縮短不了等待。",
    why: "回覆卡在等其他部門或主管點頭，時間花在排隊，不在寫字。只讓 AI 把回覆寫得更快，客戶等待的時間不會變短。",
    help: "兩件事。第一，把「哪些情況不需確認就能回覆」寫成規則，讓第一線直接處理。第二，讓 AI 在送確認時，先把確認者需要的資訊整理好，減少來回追問。",
    action: "拿最近 10 件需要等確認的回覆，分成「規則其實很清楚、可以直接回」和「真的需要判斷」兩類。",
    progress: "需要等確認的件數變少，送出確認後被追問的次數也變少。",
    articles: ["material-50", "material-46"], topic: "enterprise-adoption", skipPrefix: ["case"]
  },
  "reply.compose": {
    title: "知道答案卻要花時間寫，這是 AI 最容易幫上忙的情況。",
    why: "答案已經有了，卡在寫成正確又得體的文字。草擬回覆正是 AI 的強項，而且同事本來就知道正確答案，核對起來很快。",
    help: "準備幾則過去寫得好的回覆當範例，讓 AI 依問題和答案要點草擬回覆，同事確認後送出。",
    action: "挑 5 則過去寫得好的回覆當範例，用公司允許使用的 AI 工具，為本週 10 則新問題草擬回覆，記下每則需要修改的地方。",
    progress: "大部分草稿只需要小幅修改就能送出。",
    articles: ["material-29"], topic: "ai-security"
  },
  "systems.rekey": {
    title: "重複輸入是規則固定的工作，最適合交給自動化流程。",
    why: "重複輸入的規則通常很固定，人工處理容易打錯，又沒有判斷的價值。這類工作不一定每一步都需要大型語言模型，有時傳統的自動化就夠了。",
    help: "把「從 A 系統取資料、填進 B 系統」做成自動化流程；欄位不符或缺值時交給人處理。訊達自己的報價流程就是一例：針對部分固定客戶，由 AI 直接產生報價單並寄出。",
    action: "拿一筆最近處理的資料，把原始資料和最後填好的系統畫面放在一起，標出每個欄位的來源。",
    progress: "不需要手動輸入的欄位越來越多。",
    articles: ["material-53", "material-28"], topic: "enterprise-adoption"
  },
  "systems.convert": {
    title: "格式轉換很適合先用 AI 試，因為規則看得到，結果也好核對。",
    why: "各系統格式不同，但轉換規則通常寫得下來。日期寫法、名稱縮寫、欄位順序這類不一致，AI 處理得不錯，轉換結果也能逐欄比對。",
    help: "先讓 AI 依寫好的轉換規則處理一批資料，人工抽查；規則穩定後，再做成固定流程。",
    action: "收集 20 筆原始資料和轉換後的結果，寫下轉換規則。用公司允許使用的工具試轉一次，逐欄比對。",
    progress: "抽查時發現的錯誤越來越少。",
    articles: ["material-44"], topic: "enterprise-adoption"
  },
  "systems.reconcile": {
    title: "資料兜不起來時，要先找出錯誤從哪裡開始。",
    why: "比對修正很花時間，代表源頭的資料就有問題，例如同一位客戶在兩個系統裡的名稱不同。AI 可以幫忙找出不一致，但源頭不處理，每次都得重修一遍。",
    help: "讓 AI 先比對，列出可能不一致的資料和原因，人確認後再修正；同時記下最常出錯的欄位，回頭處理源頭。",
    action: "拿最近一次比對修正的紀錄，找出最常出錯的 3 個欄位，以及錯誤是在哪個系統產生的。",
    progress: "同類錯誤在源頭就被擋下，比對時找到的錯誤變少。",
    articles: ["material-41"], topic: "enterprise-adoption"
  },
  "systems.judge": {
    title: "每筆都要人判斷時，先把判斷依據寫下來，再決定哪些可以交給 AI。",
    why: "需要判斷的工作，不適合一次全部交給 AI。但「需要判斷」裡常常混著已經有固定規則的部分，只是規則還留在資深同事的腦中。",
    help: "把判斷拆成三類：規則固定的交給自動化；需要整理資訊的，由 AI 先整理並提出建議；真正需要決定的，保留給人。AI 提供建議，人做決定。",
    action: "請負責判斷的同事拿最近 10 筆案例，逐筆說明判斷依據，把重複出現的依據寫成規則。",
    progress: "能自動處理或只需要快速確認的案件越來越多。",
    articles: ["material-46", "material-28"], topic: "enterprise-adoption"
  },
  general: {
    title: "先挑一件具體的工作，AI 才有地方幫得上忙。",
    why: "「導入 AI」本身不是一件工作。從一件會重複發生、做起來很費力的具體工作開始，比較容易看出 AI 能不能幫上忙。",
    help: "選定工作後，回到這裡重新回答一次，就能得到針對那件工作的判斷。",
    action: "請團隊各自寫下「這週最花時間、而且下週還會再做一次的事」，從中挑出一件。",
    progress: "團隊對「先從哪一件工作開始」有共識。",
    articles: ["material-30"], topic: "enterprise-adoption", consult: true
  }
};

// Starting points from question 3. A prefix is added before the week's action
// unless the starting point is already in place ("ready").
const guideSources = {
  search: {
    central: { text: "文件已經集中，是很好的起點，可以直接從這個位置挑文件開始試。" },
    scattered: { text: "文件分散在多處，AI 能讀的範圍會受限。不必一次全部整理，先從一個位置開始。", prefix: "先選定一個資料夾或系統，作為試做範圍。" },
    tacit: { text: "很多答案只在資深同事腦中，AI 沒有東西可讀，第一步是把經驗寫下來。", prefix: "請資深同事挑出最常被問的 10 個問題，用口述或錄音說明答案，再整理成文件。" },
    unsure: { text: "先花五分鐘問一位常找資料的同事：「最常去哪裡找？找不到時問誰？」答案會告訴你資料是集中、分散，還是在人腦中。", prefix: "先問一位常找資料的同事：最常去哪裡找？找不到時問誰？" }
  },
  document: {
    export: { text: "資料來自固定的匯出，是自動化最好的起點，收集步驟很可能可以直接流程化。" },
    mixed: { text: "人工試算表通常最容易出錯，也最難自動化。", prefix: "先找出試算表中哪些欄位是人工加上去的，那些就是需要另外處理的部分。" },
    unstructured: { text: "AI 很擅長整理這類沒有固定格式的內容，但要先確定它讀得到。", prefix: "先決定把這些內容集中存放在哪裡。" },
    varies: { text: "每次來源都不同時很難流程化。比較實際的做法是讓 AI 協助整理每次拿到的資料，而不是追求全自動。", prefix: "先找出「每次都會用到」的那一小部分，從那裡開始。" }
  },
  reply: {
    faq: { text: "AI 有現成的依據，可以直接試做；開始前確認文件內容是最新的。" },
    scattered: { text: "答案散在各處。不必整理全部歷史資料，從最近的問題開始。", prefix: "先整理最近 20 則客戶問題的答案。" },
    system: { text: "答案在系統裡，代表 AI 要接上系統才幫得上忙；做法取決於你們系統的實際狀況。", prefix: "先列出要查的系統和欄位，再和熟悉系統的人一起評估。", consult: true },
    case: { text: "每件都要個案判斷時，AI 比較適合當助手：整理客戶背景、找出類似的過去案例，由人做決定。", prefix: "先挑出「其實有固定答案」的案件。" }
  },
  systems: {
    export: { text: "可以先用匯出檔試做轉換或比對，不必一開始就串接系統。" },
    api: { text: "自動化的條件不錯；要確認 AI 使用的帳號只拿到需要的權限。" },
    screen: { text: "只能在畫面上操作時，自動化的難度較高，做法也取決於系統本身。", prefix: "先記下要操作的畫面和欄位，再和系統窗口一起評估。", consult: true },
    unsure: { text: "先問系統管理人：「這些系統能匯出資料，或有 API 嗎？」答案決定要從匯出檔試做，還是評估系統串接。", prefix: "先問系統管理人：這些系統能匯出資料，或有 API 嗎？" }
  },
  general: {
    organized: { text: "資料已經整理好，選定工作後可以直接拿來試。" },
    scattered: { text: "資料分散在不同地方，選定工作後，先從其中一個範圍開始。" },
    people: { text: "答案主要在同事的經驗裡，選定工作後，第一步是把經驗寫下來。" },
    unsure: { text: "還不清楚資料在哪也沒關係，選定工作後再確認。" }
  }
};

const guideFrequency = {
  daily: "這件工作每天發生好幾次，省下的時間累積得很快，值得投資做成穩定的流程。",
  weekly: "每週幾件的頻率，適合先由 AI 協助、人工確認；效果穩定後，再考慮更完整的自動化。",
  bulk: "次數不多但每次份量大，適合讓 AI 協助處理每次的大批工作，例如一次整理或比對大量資料。",
  irregular: "發生時間不固定時，建議先用現成的 AI 工具輔助，不急著建置專屬系統。"
};

const guideStages = {
  none: { text: "還沒開始也沒關係。先用上面這件真實工作確認方向，再談工具。", article: "material-30" },
  personal: { text: "已經有人在用是好的起點，但要留意同事是否把公司或客戶資料貼進外部工具。下一步是把好用的做法整理成大家共用的方式，並確認哪些資料可以使用。", article: "material-29" },
  team: { text: "下一步是確認工具真的有幫上忙：用同一批真實案例比較使用前後，看完成的比例和需要修改的程度。", article: "material-35" },
  connected: { text: "重點轉為穩定運作：權限、操作紀錄、版本更新，以及出問題時由誰接手。", article: "material-45", consult: true },
  unsure: { text: "先問負責這類工作的同事：「做這件事時有用 AI 工具嗎？會把公司資料放進去嗎？」", article: "material-29" }
};

const guideConsult = {
  text: "你的情況涉及自家系統的實際狀況，文章只能提供原則，沒辦法替你判斷具體做法。如果想直接討論，可以聯絡訊達。",
  phone: "02-2501-5568",
  tel: "+886225015568",
  extensions: "分機 2591、2586",
  hours: "服務時間 10:00–18:00"
};

const guideWorkTypes = ["search", "document", "reply", "systems"];

let guidedAnswers = [];

// Resolves which work type and bottleneck the first two answers point to.
// "undecided" users pick a situation that maps to one of the four types.
function guideFocus(answers) {
  const [work, pain] = answers;
  if (guideWorkTypes.includes(work)) return { work, pain, mapped: false };
  if (work !== "undecided" || !pain) return null;
  if (pain === "general") return { work: null, pain: "general", mapped: false };
  const [mappedWork, mappedPain] = pain.split("-");
  return guideWorkTypes.includes(mappedWork) ? { work: mappedWork, pain: mappedPain, mapped: true } : null;
}

function guideQuestion(answers) {
  let id, question;
  if (answers.length === 0) { id = "work"; question = guidedQuestions.work; }
  else if (answers.length === 1) {
    const work = answers[0];
    if (!guidedQuestions.pain[work]) return null;
    id = "pain-" + work; question = guidedQuestions.pain[work];
  } else if (answers.length === 2) {
    const focus = guideFocus(answers);
    if (!focus) return null;
    const key = focus.work || "general";
    id = "source-" + key; question = guidedQuestions.source[key];
  } else if (answers.length === 3) { id = "frequency"; question = guidedQuestions.frequency; }
  else if (answers.length === 4) { id = "stage"; question = guidedQuestions.stage; }
  if (!question) return null;
  return { ...question, id };
}

function guideAnswerHistory(answers) {
  const history = [];
  for (let index = 0; index < answers.length; index++) {
    const question = guideQuestion(answers.slice(0, index));
    const option = question?.options.find(([value]) => value === answers[index]);
    if (!option) return null;
    history.push({ question: question.title, answer: option[1] });
  }
  return history;
}

// Keep only option IDs in this tab, so reading an article does not discard the report.
function readGuideAnswers() {
  try {
    const answers = JSON.parse(sessionStorage.getItem(guideStorageKey) || "[]");
    return Array.isArray(answers) && answers.length <= 5 && guideAnswerHistory(answers) ? answers : [];
  } catch {
    return [];
  }
}

function saveGuideAnswers() {
  try {
    if (guidedAnswers.length) sessionStorage.setItem(guideStorageKey, JSON.stringify(guidedAnswers));
    else sessionStorage.removeItem(guideStorageKey);
  } catch {
    // Storage may be disabled; the current page remains fully usable.
  }
}

function guideReport(answers) {
  const history = guideAnswerHistory(answers);
  if (!history || history.length !== 5) return null;
  const focus = guideFocus(answers);
  if (!focus) return null;
  const [, , sourceId, frequencyId, stageId] = answers;
  const findingId = focus.work ? focus.work + "." + focus.pain : "general";
  const finding = guideFindings[findingId];
  const source = guideSources[focus.work || "general"][sourceId];
  const stage = guideStages[stageId];
  if (!finding || !source || !stage || !guideFrequency[frequencyId]) return null;

  const actions = [];
  if (source.prefix && !(finding.skipPrefix || []).includes(sourceId)) actions.push(source.prefix);
  actions.push(finding.action);

  const candidates = [finding.articles[0], stage.article, ...finding.articles.slice(1)];
  const articles = candidates.filter((id, index) => id && candidates.indexOf(id) === index).slice(0, 3);

  const workLabel = focus.work ? guidedQuestions.work.options.find(([value]) => value === focus.work)[1] : "";
  const painLabel = focus.work ? guidedQuestions.pain[focus.work].options.find(([value]) => value === focus.pain)[1] : "";
  const context = !focus.work ? "還沒對應到特定的工作類型，以下先談怎麼起步。" :
    focus.mapped ? "依你選的情況，先以「" + workLabel + "」來看：" + painLabel + "。" :
    "你想改善「" + workLabel + "」，最花時間的是：" + painLabel + "。";

  return {
    id: findingId,
    title: finding.title,
    context,
    why: finding.why,
    help: finding.help + guideFrequency[frequencyId],
    start: source.text,
    actions,
    progress: finding.progress,
    stage: stage.text,
    articles,
    consult: Boolean(finding.consult || source.consult || stage.consult),
    browseTopic: finding.topic,
    limit: "這份判斷依你的五個回答整理，用來決定第一步，不代表對整個團隊的完整評估。"
  };
}

function guideControls() {
  return guidedAnswers.length ? '<div class="guided-controls"><button type="button" data-guide-action="back">← 回上一題</button><button type="button" data-guide-action="reset">重新開始</button></div>' : "";
}

function guideReading(result) {
  const catalog = content.guideRecommendations?.assessment;
  const recommendations = catalog?.version === 1 ? catalog.articles : null;
  const links = result.articles.map(id => recommendations?.[id]).filter(link => {
    if (!link || typeof link.revision !== "string" || !link.revision) return false;
    const article = content.items.find(item => item.id === link.id);
    return article && article.status === "已核准" && !isHpe(article) && article.revision === link.revision;
  }).slice(0, 3).map(link => {
    const article = content.items.find(item => item.id === link.id);
    return '<a href="' + articleUrl(article) + '"><strong>' + escapeHtml(article.title) + ' ↗</strong><small>' + escapeHtml(link.why) + '</small></a>';
  }).join("");
  const topic = content.topics?.get(result.browseTopic);
  const count = topic ? content.items.filter(item => item.status === "已核准" && item.topicId === result.browseTopic).length : 0;
  const href = count ? "./?topic=" + encodeURIComponent(result.browseTopic) + "#all-articles" : "./#all-articles";
  const label = count ? "閱讀" + topic.title + "（" + count + " 篇） →" : "瀏覽所有文章 →";
  return (links ? '<div class="guided-reading"><h4>延伸閱讀</h4><div>' + links + '</div></div>' : "") +
    '<p class="guided-browse"><a href="' + href + '">' + escapeHtml(label) + '</a></p>';
}

function guideConsultBlock(result) {
  if (!result.consult) return "";
  return '<aside class="guided-consult" aria-label="真人諮詢"><h4>想直接討論你們的情況？</h4><p>' + escapeHtml(guideConsult.text) +
    '</p><p class="guided-consult-contact"><a href="tel:' + guideConsult.tel + '">' + escapeHtml(guideConsult.phone) + '</a> ' +
    escapeHtml(guideConsult.extensions) + '<span>' + escapeHtml(guideConsult.hours) + '</span></p></aside>';
}

function renderGuide() {
  const root = document.querySelector("#guide-content");
  const progress = document.querySelector("#guide-progress");
  if (!root || !progress) return;
  const question = guideQuestion(guidedAnswers);
  if (question) {
    progress.textContent = "第 " + (guidedAnswers.length + 1) + " / 5 題";
    root.innerHTML = '<div class="guided-question"><h3 id="guide-current-title" tabindex="-1">' + escapeHtml(question.title) + '</h3>' +
      (question.hint ? '<p class="guided-hint">' + escapeHtml(question.hint) + '</p>' : "") +
      '<div class="guided-options" role="group" aria-labelledby="guide-current-title">' +
      question.options.map(([value, label]) => '<button type="button" data-guide-option="' + value + '"><span>' + escapeHtml(label) + '</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button>').join("") +
      '</div>' + guideControls() + '</div>';
    return;
  }
  const result = guideReport(guidedAnswers);
  if (!result) {
    progress.textContent = "";
    root.innerHTML = '<p class="guided-error">回答未完整，請回上一題確認。</p>' + guideControls();
    return;
  }
  progress.textContent = "完成 5 / 5 題";
  const history = guideAnswerHistory(guidedAnswers);
  root.innerHTML = '<section class="guided-report" aria-labelledby="guide-current-title"><p class="guided-report-label">初步判斷</p><h3 id="guide-current-title" tabindex="-1">' +
    escapeHtml(result.title) + '</h3><p class="guided-report-context">' + escapeHtml(result.context) + '</p><p class="guided-interpretation">' + escapeHtml(result.why) +
    '</p><div class="guided-report-grid"><section class="guided-report-reasons"><h4>AI 可以怎麼幫</h4><p>' + escapeHtml(result.help) +
    '</p><h4>你的起點</h4><p>' + escapeHtml(result.start) +
    '</p></section><section class="guided-report-action-section"><h4>這週可以做的一件事</h4><ol class="guided-report-actions">' +
    result.actions.map(text => '<li>' + escapeHtml(text) + '</li>').join("") +
    '</ol><h4>怎樣算有進展</h4><p>' + escapeHtml(result.progress) + '</p></section></div>' +
    '<div class="guided-report-stage"><h4>依你們目前的階段</h4><p>' + escapeHtml(result.stage) + '</p></div>' +
    guideReading(result) + guideConsultBlock(result) + '<p class="guided-report-limit">' + escapeHtml(result.limit) +
    '</p><details class="guided-report-answers"><summary>查看或修改回答（5 題）</summary><p>從選定題目重新回答，後面的答案會一併清除。</p><ol>' +
    history.map((item, index) => '<li><span>' + escapeHtml(item.question) + '</span><strong>' + escapeHtml(item.answer) +
      '</strong><button type="button" data-guide-edit="' + index + '" aria-label="修改第 ' + (index + 1) + ' 題">修改</button></li>').join("") +
    '</ol></details><div class="guided-controls"><button type="button" data-guide-action="reset">重新開始</button></div></section>';
}

function handleGuideClick(event) {
  const option = event.target.closest("[data-guide-option]");
  const question = guideQuestion(guidedAnswers);
  if (option && question) {
    const value = option.dataset.guideOption;
    if (!question.options.some(choice => choice[0] === value)) return;
    guidedAnswers.push(value);
  } else {
    const edit = event.target.closest("[data-guide-edit]");
    const action = event.target.closest("[data-guide-action]")?.dataset.guideAction;
    if (edit) {
      const index = Number(edit.dataset.guideEdit);
      if (!Number.isInteger(index) || index < 0 || index >= guidedAnswers.length) return;
      guidedAnswers = guidedAnswers.slice(0, index);
    } else if (action === "back") guidedAnswers = guidedAnswers.slice(0, -1);
    else if (action === "reset") guidedAnswers = [];
    else return;
  }
  saveGuideAnswers();
  renderGuide();
  document.querySelector("#guide-current-title")?.focus();
}
