// Five-question Demo. Rules use only the selected answers; no network or AI calls.
const guidedQuestions = {
  work: { title: "這次最想改善哪一類工作？", options: [
    ["search", "查找文件"], ["document", "製作文件或報表"], ["reply", "回覆客戶"], ["systems", "跨系統處理資料"], ["other", "其他"], ["undecided", "還沒決定"]
  ] },
  goal: { title: "如果這件工作改善了，你最希望看到什麼變化？", options: [
    ["time", "完成時間縮短"], ["quality", "錯誤與重做減少"], ["waiting", "等待回覆縮短"], ["handoff", "重複操作與交接減少"], ["undecided", "尚未決定"]
  ] },
  stage: { title: "針對這類工作，你們目前實際用 AI 到哪一步？", options: [
    ["none", "還沒試過"], ["individual", "個別人員測試"], ["pilot", "團隊小範圍試用"], ["daily", "日常使用"], ["unknown", "我不清楚"]
  ] },
  preparation: { title: "目前準備到哪一步，可以開始討論一個小範圍測試？", options: [
    ["no-work", "還沒選定一件具體工作"], ["no-sample", "已選定工作，但還沒找到實際範例"], ["no-criteria", "有實際範例，但還不知道怎樣算做好"], ["ready", "有實際範例，也知道預期要得到什麼結果"], ["unknown", "我不清楚目前準備了哪些內容"]
  ] },
  observation: { title: "回想最近一件使用 AI 的工作，從開始到完成，最接近哪種情況？",
    hint: "若同時符合多項，選造成最多額外處理的一項。",
    options: [
      ["usable", "AI 的結果可以直接採用，工作能順利完成"],
      ["modify", "必須修改 AI 產出的內容，才能採用"],
      ["review", "內容大致可用，主要還需要人工核對或核准"],
      ["transfer", "主要還需要轉換格式、搬資料或重新輸入"],
      ["blocked", "工作卡住，最後沒有完成"],
      ["unknown", "我沒有看過完整過程／目前不清楚"]
    ]
  },
  person: { title: "誰能提供一件最近做過的工作，作為討論範例？", options: [
    ["self", "我自己就能提供"], ["colleague", "可以請執行工作的同事提供"], ["contact", "需要另找窗口"], ["unknown", "我不清楚"]
  ] },
  samples: { title: "這件工作的實際範例，目前在哪裡？", options: [
    ["located", "知道位置，還沒整理"], ["scattered", "分散在不同人或系統"], ["absent", "目前沒有留下範例"], ["unknown", "我不清楚"]
  ] },
  judge: { title: "這件工作通常由誰判斷是否完成、能不能採用？", options: [
    ["worker", "執行工作的人"], ["reviewer", "指定的審核人"], ["multiple", "多人各自判斷"], ["absent", "尚未指定"], ["unknown", "我不清楚"]
  ] },
  permission: { title: "這些範例是否已確認可以用在預計的 AI 測試中？", options: [
    ["allowed", "已確認可用"], ["conditional", "有使用條件，尚未完成"], ["denied", "目前不允許使用"], ["unchecked", "尚未確認"], ["unknown", "我不清楚"]
  ] },
  contact: { title: "誰能協助確認目前準備了哪些內容？", options: [
    ["user", "實際使用者"], ["owner", "工作負責人"], ["technical", "技術或資料窗口"], ["unknown", "尚不知道找誰"]
  ] },
  time: { title: "把後續人工處理也算進去，這件工作與原本做法相比，總時間如何？",
    hint: "以同類工作、相同完成標準比較；沒有可比較的紀錄也可以直接選。",
    options: [
      ["shorter", "有紀錄顯示較短"], ["same", "有紀錄顯示差不多"], ["longer", "有紀錄顯示較長"], ["feeling", "只有感覺，沒有可比較的紀錄"], ["uncompared", "尚未比較"]
    ]
  },
  cause: { title: "最近一次修改，是因為什麼？", options: [
    ["execution", "沒照已有的正確資料或規則處理"], ["source", "原始資料缺漏或過期"], ["standard", "大家對可接受結果的標準不同"], ["unchecked", "還沒核對原因"], ["unknown", "我不清楚"]
  ] },
  operations: { title: "這些後續操作通常依什麼方式處理？", options: [
    ["format", "每次照固定欄位或格式處理"], ["system", "依固定規則搬到另一個系統"], ["judgment", "每件都需要人員判斷"], ["mixed", "幾種情況混在一起"], ["unknown", "我不清楚"]
  ] },
  wait: { title: "最近這件工作，等待主要發生在哪裡？", options: [
    ["smooth", "沒有明顯等待，核對按預期完成"], ["queue", "等指定的人處理"], ["owner", "找不到可以決定的人"], ["data", "等補齊資料"], ["checking", "實際核對本身耗時"], ["unknown", "沒有紀錄，無法判斷"]
  ] },
  evaluation: { title: "目前用什麼確認它有達到你想改善的目標？", options: [
    ["comparable", "有同類工作的前後紀錄"], ["different", "有紀錄，但工作不容易比較"], ["feeling", "只有使用者感受"], ["unconfirmed", "還沒確認"], ["unknown", "我不清楚"]
  ] },
  block: { title: "這件工作最後停在哪一步？", options: [
    ["data", "取得資料"], ["content", "產生可用內容"], ["system", "操作其他系統"], ["people", "等待人員處理"], ["unknown", "不知道"]
  ] },
  trace: { title: "目前找得到什麼資料，可以還原一件工作的過程？", options: [
    ["complete", "完整處理紀錄"], ["partial", "只有輸入與結果"], ["person", "只能請實際使用者說明"], ["absent", "目前找不到"], ["unknown", "我不清楚"]
  ] }
};

let guidedAnswers = [];

function guideQuestion(answers) {
  let id;
  if (answers.length < 3) id = ["work", "goal", "stage"][answers.length];
  else if (answers.length === 3) id = answers[2] === "none" ? "preparation" : "observation";
  else if (answers.length === 4) {
    const [, goal, stage, observation] = answers;
    if (stage === "none") id = { "no-work": "person", "no-sample": "samples", "no-criteria": "judge", ready: "permission", unknown: "contact" }[observation];
    else if (observation === "usable") id = "evaluation";
    else if (observation === "blocked") id = "block";
    else if (observation === "unknown") id = "trace";
    else if (goal === "time") id = "time";
    else id = { modify: "cause", transfer: "operations", review: "wait" }[observation];
  }
  if (!id) return null;
  const question = { ...guidedQuestions[id], id };
  if (id === "stage" && answers[0] === "undecided") question.title = "先不限定工作，你知道團隊目前使用 AI 到哪一步嗎？";
  if (id === "observation" && (answers[0] === "undecided" || answers[2] === "unknown")) question.title = "就你知道的最近一件 AI 使用經驗而言，最接近哪種情況？";
  if (id === "evaluation" && answers[1] === "undecided") question.title = "目前有哪些資料，能用來討論 AI 是否有幫上忙？";
  if (id === "wait" && answers[1] !== "waiting") question.title = "最近這件工作，核對或核准的過程如何？";
  return question;
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
    const answers = JSON.parse(sessionStorage.getItem("dimension-guide-demo-v1") || "[]");
    return Array.isArray(answers) && answers.length <= 5 && guideAnswerHistory(answers) ? answers : [];
  } catch {
    return [];
  }
}

function saveGuideAnswers() {
  try {
    if (guidedAnswers.length) sessionStorage.setItem("dimension-guide-demo-v1", JSON.stringify(guidedAnswers));
    else sessionStorage.removeItem("dimension-guide-demo-v1");
  } catch {
    // Storage may be disabled; the current page remains fully usable.
  }
}

// The fifth answer discriminates between explanations. Earlier answers set the
// scope, branch and success measure; no score is inferred from adoption stage.
function guideReport(answers) {
  const history = guideAnswerHistory(answers);
  if (!history || history.length !== 5) return null;
  const [work, goal, stage, observation, evidence] = answers;
  const question = guideQuestion(answers.slice(0, 4)).id;
  let result;
  function finding(id, title, interpretation, alternative, actions, articles, browseTopic = "enterprise-adoption") {
    return { id, title, interpretation, alternative, actions, articles, browseTopic };
  }
  if (question === "person") {
    const contact = { self: "拿出自己最近完成的一件工作", colleague: "請執行同事帶一件最近完成的工作", contact: "先找工作負責人，請他協助安排實際執行者", unknown: "先向團隊確認誰實際執行這類工作" }[evidence];
    result = finding("scope", "先把改善方向縮成一件可觀察的工作",
      "目前的資訊足以表達改善意願，但還不能界定 AI 要接手哪一步。先取得一個真實例子，比直接比較工具更容易找出可測試的範圍。",
      "也可能同事已經有明確需求，只是尚未彙整到你這裡；先核對現有討論，避免重做。",
      [contact + "，說明從收到需求到交付結果的過程。", "圈出其中一個可單獨檢查輸入、輸出與完成標準的步驟。"],
      ["material-30", work === "systems" ? "material-41" : "material-53"]);
  } else if (question === "samples") {
    const plans = {
      located: ["sample-located", "可先把已知範例整理成一組測試材料", "你已知道範例位置，下一個可驗證的缺口是：這些範例是否包含完整輸入與可接受結果。", "整理一件完整範例，保留原始輸入、最後採用結果與中途修改。"],
      scattered: ["sample-scattered", "先還原跨人員或系統的一件完整工作", "資料分散可能讓測試只看見工作的一段，導致工具表現不差、完整任務卻無法完成。", "請各段負責人拼出同一件工作的輸入、交接與最後結果。"],
      absent: ["sample-absent", "先留下一件真實工作的完整範例", "目前沒有留下範例，測試容易只能靠想像情境評價；先建立可重做的例子，才能比對前後結果。", "在取得資料使用同意後，記錄下一件實際工作的輸入、處理步驟與最後結果。"],
      unknown: ["sample-unknown", "先確認範例是否已存在", "你目前不知道範例位置，還不能推論團隊沒有資料或必須重新蒐集。", "請工作執行者確認既有文件、系統紀錄或已交付結果的位置。"]
    }[evidence];
    result = finding(plans[0], plans[1], plans[2], "範例也可能已足夠，只缺整理或使用確認；不能把找不到直接視為資料品質差。",
      [plans[3], "確認範例能否用於預計的測試，並註記缺少哪一段。"], ["material-44", "material-41"]);
  } else if (question === "judge") {
    const multiple = evidence === "multiple";
    const known = ["worker", "reviewer"].includes(evidence);
    result = finding(multiple ? "criteria-alignment" : known ? "criteria-capture" : evidence === "absent" ? "criteria-owner-absent" : "criteria-owner-unknown",
      multiple ? "先讓不同判斷者對齊同一個範例" : known ? "把判斷者的標準寫成可檢查的條件" : "先確認誰能判斷測試結果",
      multiple ? "同一份結果由多人各自判斷，可能讓測試的好壞隨評審改變。需要先確認差異來自合理的角色需求，還是標準尚未談攏。" : known ? "已知道誰判斷完成，但尚未說清楚怎樣算做好。把隱性的判斷寫下來，才能分辨 AI 的問題與驗收標準的問題。" : evidence === "absent" ? "尚未指定判斷者，測試即使產出結果，也可能無法決定是否採用。" : "目前不清楚判斷者是誰，不能據此認定團隊沒有負責人。",
      "不同角色可能本來就有不同的驗收要求；可以分開列出，未必需要合併成單一標準。",
      ["找出能決定結果是否採用的人，對同一個範例逐項說明接受與退回原因。", "寫下必要條件與可接受差異，再用另一件範例確認是否能一致判斷。"],
      multiple || !known ? ["material-50", "material-44"] : ["material-44", "material-35"]);
  } else if (question === "permission") {
    if (evidence === "allowed") {
      result = finding("small-pilot", "已有條件規劃一次小範圍驗證",
        "有範例、預期結果，也確認可用於測試，表示可以把討論推進到可重做的驗證。這仍不足以判定適合正式上線。",
        "範例可能只涵蓋順利情況；遇到缺漏資料或例外需求時，結果可能不同。",
        ["用已確認可用的範例測試一個步驟，記錄輸入、結果與人工修改。", "再選一件條件不同的範例，檢查相同標準是否仍成立。"], ["material-44", "material-35"]);
    } else if (evidence === "unknown") {
      result = finding("permission-unknown", "先查明是否已有資料使用確認紀錄",
        "你不清楚範例能否用於測試，這只表示目前掌握的資訊不足，不能據此認定團隊尚未確認或資料禁止使用。",
        "資料可能已由同事確認可用，只是適用範圍與條件尚未傳遞給你。",
        ["請資料負責人查明是否已有使用確認紀錄，以及涵蓋的範例、帳號與環境。", "依查到的條件規劃測試；未取得明確確認前，不使用這批範例。"],
        ["material-26", "material-34"], "ai-security");
    } else {
      const denied = evidence === "denied";
      const conditional = evidence === "conditional";
      result = finding(denied ? "permission-denied" : conditional ? "permission-conditional" : "permission-unchecked",
        denied ? "先換成獲准使用的測試資料" : conditional ? "先完成資料使用條件" : "先確認資料能否進入預計的測試環境",
        denied ? "目前這批範例不允許使用，限制的是這條測試路徑，不能由此推論 AI 不適合這件工作。" : conditional ? "已有使用條件但尚未完成；先釐清剩餘條件，比開始測試後再重做資料處理更直接。" : "範例與預期結果已具備，但使用許可尚未確認。這是待查明的前提，並不等於資料被禁止使用。",
        "限制可能只針對特定資料、帳號或環境；改用已核准的範例可能仍可測試。",
        [denied ? "不要使用目前不被允許的範例；請資料負責人提供已獲准的替代資料。" : "請資料負責人確認可用資料範圍、測試環境、帳號及保存條件。", "條件確認後，用不同身分檢查是否只能取得各自允許的資料。"],
        ["material-26", "material-34"], "ai-security");
    }
  } else if (question === "contact") {
    const person = { user: "實際使用者", owner: "工作負責人", technical: "技術或資料窗口", unknown: "能找到實際執行者的工作負責人" }[evidence];
    result = finding("preparation-unknown", "先補齊準備狀態，再決定測試起點",
      "目前的資訊缺口是你還不知道團隊準備到哪一步，不能直接判定缺資料、缺標準或缺工具。",
      "同事可能已準備部分材料，只是還沒有共同整理。",
      ["請" + person + "說明目前選定的工作、範例及判斷完成的方式。", "逐項區分「已確認」「還沒做」與「不知道」，只補真正缺少的前提。"], ["material-30", "material-44"]);
  } else if (question === "time") {
    const downstream = { modify: "修改內容", review: "核對或核准", transfer: "搬資料或轉換格式" }[observation];
    const entries = {
      shorter: ["time-shorter", "現有紀錄支持：後續人工處理後仍有省時",
        "你回報同類工作在計入" + downstream + "後，總時間仍較短。因此目前證據支持淨省時，人工處理本身不代表導入失敗。",
        "也可能這次工作較容易，或完成品質不同；單次比較還不能代表穩定成效。"],
      same: ["time-offset", "先確認省下的時間是否被後續處理抵銷",
        "你希望縮短完成時間，但計入" + downstream + "後，總時間差不多。可能只是把原本的工作，轉成另一段人工處理；需要拆開紀錄才能確認。",
        "也可能工作品質提高或難度增加，使總時間看起來沒有變；目前不能直接判定 AI 沒有價值。"],
      longer: ["time-longer", "先找出讓完整工作變慢的那一段",
        "你回報同類工作的總時間較長，且仍需" + downstream + "。這表示目前的做法尚未達成省時目標，但還不能把增加的時間全歸因於 AI。",
        "首次學習、較難的案件或更嚴格的檢查，也可能增加時間；要與日常穩定使用分開看。"],
      feeling: ["time-unmeasured", "先確認：時間真的省下來，還是移到後續處理？",
        "目前知道仍需" + downstream + "，但省時只有感受。可以形成「工作可能轉移到後段」的假設，還不能判定總時間增加或減少。",
        "核對或整理也可能原本就必須做，AI 仍可能省下更多前段時間。"],
      uncompared: ["time-uncompared", "先比較完整工時，才能判斷是否省時",
        "你尚未比較總時間，只知道還有" + downstream + "。目前可以界定要量測哪一段，還不足以判斷時間被省下或轉移。",
        "這些後續工作可能原本就存在；只看到人工介入，不能推論沒有省時。"]
    }[evidence];
    result = finding(...entries,
      ["找一件同類、相近難度的工作，以相同完成標準比較原做法與 AI 做法。", "分別記錄準備、AI 處理、" + downstream + "和交付的時間，檢查增加或減少發生在哪一段。"],
      ["material-35", observation === "review" ? "material-46" : "material-41"], "benefit-assessment");
  } else if (question === "cause") {
    const entries = {
      execution: ["execution-gap", "先檢查正確資料如何到達最後結果",
        "已有正確資料或規則，結果卻未依它處理，問題可能出在取用資料、理解規則或執行過程。這不足以直接判定模型能力不夠。",
        "也可能正確資料沒有實際送入這次任務，或規則的表達讓人與 AI 都會誤解。",
        "比對這次真正提供的資料與規則、AI 輸出、人工修正，找出最早出現差異的一步。"],
      source: ["source-gap", "先修正這個範例的來源，再測一次",
        "這次修改涉及來源缺漏或過期，AI 可能在不完整前提下產出結果；只調整生成方式，不一定能修復來源問題。",
        "來源問題與處理錯誤可能同時存在，補齊資料後仍要重測，不能保證結果就會正確。",
        "確認正確來源與版本，補齊這個範例所需資訊，再以相同任務重測。"],
      standard: ["criteria-alignment", "先對齊可接受結果，再比較工具表現",
        "修改來自對結果標準的分歧，這時同一份產出可能被不同人判為好或壞。先把差異說清楚，才能識別真正的處理錯誤。",
        "分歧可能反映不同角色的合理要求，也可能結果確實同時有錯誤。",
        "請判斷者對同一份產出逐項標記接受或退回原因，寫成可檢查條件。"],
      unchecked: ["cause-unchecked", "先核對一次修改的原因",
        "已知道必須修改內容，但還沒比對原因。不能由修改這個現象，直接推論缺資料、模型不夠好或工具選錯。",
        "修改可能只是表達偏好，也可能涉及事實錯誤，兩者需要不同的改善方式。",
        "保留原始資料、AI 產出與最後採用版本，逐項標記修改原因。"],
      unknown: ["cause-unknown", "先請修改者說明這次改了什麼",
        "目前不知道修改原因，資訊還不足以定位來源、處理能力或驗收標準的問題。",
        "原因可能已被執行者查明，只是尚未傳遞給你。",
        "請實際修改者帶同一件工作的修改前後版本，指出必改與可選的差異。"]
    }[evidence];
    result = finding(...entries.slice(0, 4), [entries[4], "重做同一個範例，觀察原本需要修改的部分是否再次出現。"],
      evidence === "source" ? ["material-26", "material-35"] : ["material-35", evidence === "standard" ? "material-50" : "material-44"],
      evidence === "source" ? "ai-security" : "enterprise-adoption");
  } else if (question === "operations") {
    const entries = {
      format: ["format-handoff", "先驗證固定格式這一段能否直接接續",
        "後續處理依固定欄位或格式，可能是輸出與下一步要求不一致。可以先測清楚格式契約，不必由此推論需要更複雜的 Agent。",
        "格式看似固定，內容仍可能需要人工判斷或有例外。",
        "列出一件工作的必要欄位、格式與缺值處理，再檢查 AI 輸出能否直接採用。"],
      system: ["system-handoff", "先拆出固定的跨系統交接",
        "AI 之後仍按固定規則搬到另一系統，可能是局部步驟完成了，交接卻還沒接上。先確認欄位與操作規則，才有依據討論整合。",
        "系統可能本來就要求人工批准，或限制自動寫入；不能只憑搬資料就認定應全自動。",
        "以一件工作列出來源欄位、目標欄位、允許操作與失敗時的處理方式。"],
      judgment: ["human-judgment", "先分清楚人工判斷與重複操作",
        "每件後續工作都需要人員判斷，這段可能是必要的決策，而不是單純可以省掉的搬資料。",
        "也可能只是規則尚未寫下來；問清判斷依據後，部分步驟仍可能固定化。",
        "請執行者說明一件工作的判斷依據，分開列出固定規則、例外與必須由人決定的事項。"],
      mixed: ["mixed-operations", "先拆開可固定處理與需要判斷的步驟",
        "固定操作與人員判斷混在一起，直接把整段交給 AI 容易漏掉例外；可先選一小段規則穩定的操作驗證。",
        "看似不同的操作可能共用同一套規則，需要用實例核對。",
        "逐步標記一件工作：固定格式、跨系統搬移、人員判斷，再選一段單獨測試。"],
      unknown: ["operations-unknown", "先觀察後續操作，避免過早選整合方案",
        "目前只知道需要人工搬移或整理，不知道規則是否固定，還不足以決定應用格式調整、自動化或人工交接。",
        "同事可能已有固定處理規則，不一定需要重新設計流程。",
        "請執行者示範一件完整工作，記下每次搬移、修改與判斷的原因。"]
    }[evidence];
    result = finding(...entries.slice(0, 4), [entries[4], "檢查下一步是否能接受結果，並確認例外時由誰接手。"],
      ["material-41", evidence === "system" ? "material-27" : "material-46"], "on-prem-integration");
  } else if (question === "wait") {
    const entries = {
      smooth: ["review-smooth", "目前的核對不一定是需要排除的瓶頸",
        "你回報核對按預期完成、沒有明顯等待，這不支持把人工核對直接當成瓶頸。接下來應檢查它是否協助達成原本的改善目標。",
        "核對仍可能花費不少實際工時；沒有等待不等於零成本，也不代表品質已改善。",
        "保留這次核對發現的問題與最後採用結果，確認哪些檢查提供了必要的品質保障。"],
      queue: ["review-queue", "先把等待接手與實際處理時間分開",
        "已知道要等指定的人，延遲可能發生在排隊或交接，而不在 AI 產出本身。更快產生內容未必能縮短這段等待。",
        "也可能處理者工作量大，或這次案件需要更審慎檢查，不能只歸因於流程。",
        "記錄提交、開始處理與完成的時間，分開計算排隊及核對。"],
      owner: ["review-owner", "先確認誰能做最後決定",
        "這次工作找不到可以決定的人，可能是交接時缺少明確的決策權。增加 AI 產出速度，未必能推進最後一步。",
        "負責人可能已存在，只是聯絡方式或代理安排不清楚。",
        "對這一類結果指定核准者與代理人，確認可接受、退回及轉交的條件。"],
      data: ["review-data", "先確認審核需要的資料是否一起交付",
        "等待發生在補資料，可能是前段交付不完整，讓後段反覆追問。需要先辨認缺的是必要資訊，還是可省略的補充。",
        "資料也可能臨時才產生，無法在前段取得，不一定是交付疏漏。",
        "回看這次被要求補交的資料，列出哪些可以在送出前一併提供。"],
      checking: ["review-work", "先找出核對為什麼費時",
        "時間花在實際核對，可能需要更多可追溯的來源或更清楚的驗收條件。不能直接把核對視為可取消的負擔。",
        "這也可能是原本就必要的品質或風險控制，AI 在其他步驟仍有幫助。",
        "請核對者指出最費時的一項：找來源、比對內容、確認規則或處理例外。"],
      unknown: ["review-unknown", "先分辨等待與核對的時間",
        "目前沒有可辨識等待位置的紀錄，尚不能判斷是排隊、責任不明、缺資料或實際核對耗時。",
        "也可能等待只發生在這件特殊案例，並非日常瓶頸。",
        "為下一件工作記下送出、接手、補資料及完成的時間。"]
    }[evidence];
    result = finding(...entries.slice(0, 4), [entries[4], evidence === "smooth" ? "以另一件同類工作核對，確認處理方式與完成品質是否一致。" : "拿另一件同類工作核對，看延遲是否仍出現在同一步。"], ["material-46", evidence === "smooth" ? "material-35" : "material-50"]);
  } else if (question === "evaluation") {
    const entries = {
      comparable: ["value-comparable", "已有比較材料，下一步是檢查目標是否改善",
        "結果能直接採用，又有同類工作的前後紀錄，已具備檢查成效的基礎。但有紀錄不等於已有改善，仍需核對差異與完成品質。",
        "工作量、案件難度或其他流程變動也可能造成差異。"],
      different: ["value-not-comparable", "先找到可相比的工作，避免誤判成效",
        "結果能使用，但前後工作不容易比較。直接比平均時間或件數，可能把案件差異當成 AI 的效果。",
        "若能按工作類型或難度分組，現有紀錄可能仍可用。"],
      feeling: ["value-perceived", "可用的感受還需要對照工作目標",
        "目前有使用者感受，也有一次能直接採用的經驗，但尚不足以判定原先想改善的事情已發生。",
        "感受可能捕捉到紀錄沒涵蓋的幫助，也可能受新鮮感影響。"],
      unconfirmed: ["value-unconfirmed", "先確認完成工作之外，目標有沒有改善",
        "這次工作能完成，表示工具在這個情境中可用；但你還沒確認成效，不能把「做得出來」當成「已有幫助」。",
        "改善可能已發生，只是沒有對照；也可能沒有改善原本最在意的部分。"],
      unknown: ["value-unknown", "先確認成效資料由誰掌握",
        "你不知道目前的確認方式，不能推論團隊沒有量測，也不能認定已達成目標。",
        "資料可能由使用者、主管或系統管理者保管。"]
    }[evidence];
    result = finding(...entries,
      [evidence === "unknown" ? "先詢問工作負責人是否已有成效紀錄，確認它記錄的是什麼。" : "找同類、相近難度與相同完成標準的工作，整理原做法及 AI 做法的結果。", "一併核對完成品質與人工補做，避免只比較生成的速度或次數。"],
      goal === "undecided" ? ["material-31", "material-35"] : ["material-35", "material-31"], "benefit-assessment");
  } else if (question === "block") {
    const entries = {
      data: ["blocked-data", "先還原取得資料這一步",
        "工作停在取資料，後續生成能力還沒有被完整檢驗；先讓這一步可重現，比直接更換模型更能縮小問題範圍。",
        "可能是資料位置、連線、查詢條件或權限，尚不能只選定其中一種原因。",
        "記下要取的資料、使用身分與實際失敗訊息，請資料負責人核對。"],
      content: ["blocked-content", "先定義這次結果為何不能採用",
        "工作停在產生可用內容，可能涉及來源、規則或驗收標準；目前只能定位失敗步驟，尚不能確定原因。",
        "範例本身也可能缺少必要資訊，或要求無法同時滿足。",
        "保留輸入與輸出，由判斷者標記哪個必要條件未達成。"],
      system: ["blocked-system", "先重現跨系統操作的失敗點",
        "工作停在操作其他系統，可能是生成結果尚未成功轉成可執行的系統操作。需要檢查這次實際送出的內容與回應。",
        "格式、權限、連線或系統限制都可能造成失敗，不能直接認定缺少某種產品。",
        "在允許的測試環境記錄輸入欄位、目標操作與錯誤回應，核對系統允許的用法。"],
      people: ["blocked-people", "先確認交給人之後停在哪裡",
        "工作在等待人員處理時中止，AI 的產出尚未完成整個工作。下一步需要分辨未接手、無法決定或缺少必要資料。",
        "這次也可能是特殊例外或人員暫時不在，不一定代表普遍流程缺陷。",
        "請接手人說明收到什麼、還缺什麼，以及誰能決定接受或退回。"],
      unknown: ["blocked-unknown", "先定位未完成工作的最後一步",
        "只知道工作沒有完成，尚不知道停在哪裡，不能可靠地推薦資料整理、模型調整或系統整合中的任何一項。",
        "失敗原因可能已記錄在系統或執行者的紀錄中。",
        "請執行者用同一件工作指出最後成功的一步及下一步的失敗情況。"]
    }[evidence];
    result = finding(...entries.slice(0, 4), [entries[4], "針對這一步重測一次，確認可完成後再檢查後續流程。"],
      evidence === "system" ? ["material-27", "material-41"] : evidence === "people" ? ["material-46", "material-50"] : evidence === "data" ? ["material-26", "material-41"] : ["material-35", "material-41"],
      evidence === "system" ? "on-prem-integration" : "enterprise-adoption");
  } else if (question === "trace") {
    const entries = {
      complete: ["trace-complete", "先讀完一件工作的完整紀錄",
        "你尚未看過完整過程，但已找得到紀錄，代表可以補上觀察；目前不能把不了解過程當成流程本身有缺陷。",
        "紀錄可能未含線下處理或人工修改，需要由執行者補充。",
        "選一件完整紀錄，請執行者一起標記輸入、AI 處理、人工介入與最後交付。"],
      partial: ["trace-partial", "先補上輸入與結果之間的過程",
        "只有輸入與結果，容易看不見中間的重試、人工修正或等待，因此暫時無法定位負擔發生在哪裡。",
        "中間過程也可能很順利；缺少紀錄不等於一定有問題。",
        "請執行者依這一件輸入與結果，補述中間的操作與例外。"],
      person: ["trace-person", "先用一次工作示範取得觀察",
        "目前能取得使用者說明，但沒有完整過程可核對。先請對方還原一次工作，才能分辨主要負擔。",
        "口頭回憶可能偏向印象深刻的案例，宜再看一次實際操作。",
        "請實際使用者示範一件工作，逐步記下人工介入與等待。"],
      absent: ["trace-absent", "先建立一件工作的可追溯紀錄",
        "目前找不到可以還原過程的資料，難以判斷哪一段需要改善。先留下一個完整例子，比推測原因更有依據。",
        "資料仍可能留在其他人或系統中；先確認再開始重新記錄。",
        "詢問執行者是否另有紀錄；若仍沒有，在允許範圍內記錄下一件工作。"],
      unknown: ["trace-unknown", "先確認有哪些證據可以取得",
        "目前連可取得的紀錄都不清楚，資訊不足以定位問題。這是判讀的限制，不代表團隊缺乏能力或導入失敗。",
        "現場可能已有順利的流程或可用紀錄，只是你尚未接觸。",
        "先找實際使用者或工作負責人，確認是否有完整紀錄、輸入輸出或可安排的示範。"]
    }[evidence];
    result = finding(...entries.slice(0, 4), [entries[4], "有一件可核對的工作後，再區分修改、核對、搬移與等待發生在哪一步。"], ["material-41", "material-35"]);
  }
  if (!result) return null;
  const taskExamples = { search: "一次查找文件並交付答案的工作", document: "一份文件或報表的製作", reply: "一則客戶問題從收到到回覆的過程", systems: "一筆資料從來源到目標系統的處理", other: "一件你選定的工作", undecided: "一件先與執行者選定的具體工作" };
  const measures = {
    time: "比較從開始到交付的總時間，包含人工補做與等待。",
    quality: "以同一套接受標準，記錄錯誤、退回與重做的項目。",
    waiting: "分開記錄等待接手與實際處理的時間。",
    handoff: "記錄重複輸入、人工搬移與交接的次數及原因。",
    undecided: "先選一項最想改善的結果，寫下現在怎麼判斷，暫不下成效結論。"
  };
  if (question === "time") {
    result.actions[0] = "以" + taskExamples[work] + "為單位，找相近難度、相同完成標準的例子，比較原做法與 AI 做法。";
  } else {
    result.actions.push("以" + taskExamples[work] + "為單位，" + measures[goal]);
  }
  result.evidence = [
    (stage === "none" ? "測試準備：" : "最近一次觀察：") + history[3].answer + "。",
    history[4].question + " 你選擇「" + history[4].answer + "」。"
  ];
  const stageText = { none: "尚未試用", individual: "由個別人員測試", pilot: "在團隊小範圍試用", daily: "已用於日常工作", unknown: "實際使用階段尚不清楚" }[stage];
  result.context = (work === "undecided" ? "尚未選定工作；以下暫依你知道的使用經驗整理。" : "這次聚焦「" + history[0].answer + "」，目前" + stageText + "。") +
    (goal === "undecided" ? "改善目標仍待確認。" : "想達成的是「" + history[1].answer + "」。");
  result.limit = stage === "none" ? "這份判讀針對測試準備，尚不能判斷實際使用成效。" : "這份判讀依你提供的一次經驗，尚不能代表整個團隊的長期表現。";
  return result;
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
  }).slice(0, 2).map(link => {
    const article = content.items.find(item => item.id === link.id);
    return '<a href="' + articleUrl(article) + '"><strong>' + escapeHtml(article.title) + ' ↗</strong><small>' + escapeHtml(link.why) + '</small></a>';
  }).join("");
  const topic = content.topics?.get(result.browseTopic);
  const count = topic ? content.items.filter(item => item.status === "已核准" && item.topicId === result.browseTopic).length : 0;
  const href = count ? "./?topic=" + encodeURIComponent(result.browseTopic) + "#all-articles" : "./#all-articles";
  const label = count ? "閱讀" + topic.title + "（" + count + " 篇） →" : "瀏覽所有文章 →";
  return (links ? '<div class="guided-reading"><h4>對應文章</h4><div>' + links + '</div></div>' : "") +
    '<p class="guided-browse"><a href="' + href + '">' + escapeHtml(label) + '</a></p>';
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
  root.innerHTML = '<section class="guided-report" aria-labelledby="guide-current-title"><p class="guided-report-label">初步判讀</p><h3 id="guide-current-title" tabindex="-1">' +
    escapeHtml(result.title) + '</h3><p class="guided-report-context">' + escapeHtml(result.context) + '</p><p class="guided-interpretation">' + escapeHtml(result.interpretation) +
    '</p><div class="guided-report-grid"><section class="guided-report-reasons"><h4>支持依據</h4><ul>' +
    result.evidence.map(text => '<li>' + escapeHtml(text) + '</li>').join("") +
    '</ul><h4>其他可能解釋</h4><p>' + escapeHtml(result.alternative) +
    '</p></section><section class="guided-report-action-section"><h4>最小驗證行動</h4><ol class="guided-report-actions">' +
    result.actions.map(text => '<li>' + escapeHtml(text) + '</li>').join("") +
    '</ol></section></div>' + guideReading(result) + '<p class="guided-report-limit">' + escapeHtml(result.limit) +
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
