---
name: 訊達 AI 內容專欄
description: 以明亮的系統剖面與編輯式閱讀節奏，串連企業 AI 的應用、整合與基礎架構。
colors:
  ink: "#102b39"
  muted: "#52616b"
  paper: "#fcfaf3"
  white: "#ffffff"
  coral: "#ff7455"
  violet: "#8352e9"
  infrastructure: "#1d4650"
  hpe-green: "#08b584"
  hpe-wash: "#f2faf6"
  line: "#d9dedb"
typography:
  display:
    fontFamily: "Noto Sans TC, sans-serif"
    fontSize: "clamp(44px, 3.54vw, 58px)"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Noto Sans TC, sans-serif"
    fontSize: "clamp(34px, 3.2vw, 52px)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Noto Sans TC, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Noto Sans TC, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.95
  label:
    fontFamily: "Noto Sans TC, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    lineHeight: 1.5
rounded:
  label: "4px"
  path: "6px"
  panel: "8px"
  pill: "100px"
  circle: "50%"
spacing:
  xs: "8px"
  sm: "10px"
  md: "20px"
  lg: "24px"
  xl: "32px"
components:
  primary-action:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "{rounded.path}"
  layer-navigation:
    textColor: "{colors.infrastructure}"
    activeUnderline: "{colors.coral}"
  search-input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.path}"
    height: "61px"
  search-topic-chip:
    backgroundColor: "{colors.white}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
  article-row:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
  hpe-panel:
    backgroundColor: "{colors.hpe-wash}"
    textColor: "{colors.ink}"
---

# Design System: 訊達 AI 內容專欄

## Overview

**Creative North Star: "可探索的 AI 系統剖面"**

網站像一張可閱讀的企業 AI 系統剖面：暖紙色提供輕盈底色，清楚的文字、細線與少量立體陰影讓層次易於辨認。珊瑚、紫與深青綠分別標示應用、導入整合與基礎架構。首頁以三層主圖、互動引導與搜尋構成獨立 View；HPE 專區和訊達成功案例各自是獨立 View，不把兩區內容穿插在首頁。

閱讀與尋找文章同樣重要。全站搜尋在輸入關鍵字或選分類後才顯示最多三篇相符文章；沒有匹配時不補文章。HPE 專區使用獨立的白綠色調，但整站仍以訊達的內容專欄作為主體。

**Key Characteristics:**

- 暖象牙色、深青墨色與大面積留白，形成親切而明快的探索感。
- 三色只標示有意義的系統層次；細線、節點與剖面圖提供關係線索。
- 搜尋結果採易掃讀的文章列，閱讀頁採寬正文與條件式延伸閱讀。
- HPE 使用清楚分區的白與綠，不把品牌綠套用到其他主題。

## Colors

配色以柔和紙面承載內容，用高辨識度的層次色引導選題；色彩角色比裝飾面積更重要。

### Primary

- **深青墨 Ink** (`#102b39`)：主文字、深色篩選狀態、搜尋提交與頁尾，維持資訊對比。
- **暖象牙 Paper** (`#fcfaf3`)：首頁主底色及搜尋欄的暖色表面。

### Secondary

- **應用珊瑚 Coral** (`#ff7455`)：應用層標籤、節點、搜尋圓形按鈕及導向箭頭。
- **整合紫 Violet** (`#8352e9`)：整合層標籤、強調文字、細部主題與全站鍵盤焦點輪廓。

### Tertiary

- **基礎深青 Infrastructure** (`#1d4650`)：基礎架構層標籤；其圖示在現有首頁採更深的青色。
- **HPE 綠 HPE Green** (`#08b584`)：HPE 專區的識別色，搭配淡綠底色 (`#f2faf6`) 和白色卡面。

### Neutral

- **白 White** (`#ffffff`)：主題入口、文章附屬元件及 HPE 卡面。
- **次要文字 Muted** (`#52616b`)：說明文字與較低層級資訊。
- **分隔線 Line** (`#d9dedb`)：內容段落、欄位與清單的輕量邊界。

**The Layer Color Rule.** 珊瑚、紫與深青綠對應三個系統層；不要讓同一層在同一閱讀流程中任意換色。

**The HPE Boundary Rule.** HPE 白綠色只用於獨立專區；首頁搜尋仍可找到 HPE 文章。

## Typography

**Display Font:** Noto Sans TC (fallback: sans-serif)
**Body Font:** Noto Sans TC (fallback: sans-serif)
**Label Font:** Noto Sans TC (fallback: sans-serif)

**Character:** 同一套繁中字體透過字重、行高和寬裕間距建立編輯感。大標題緊湊，內文舒展，短標籤清楚而節制。

### Hierarchy

- **Display** (900, `clamp(44px, 3.54vw, 58px)`, 1.2)：首頁主標；手機版使用較大的視窗比例重新縮放。
- **Headline** (700, `clamp(34px, 3.2vw, 52px)`, 1.25)：首頁後續段落標題。
- **Title** (700, `19px`, 1.45)：文章列標題；長標題允許換行。
- **Body** (400, `17px`, 1.95)：單篇文章正文；主閱讀欄在桌機不超過 760px。
- **Label** (800, `12px`, 1.5)：主題、焦點標示與輔助分類；英文 eyebrow 可加大字距。

**The Reading Rhythm Rule.** 內文使用寬行距；標題以字重及上下空間建立層級，不靠頻繁換色。

## Layout

一般內容置於最大約 1220px 的容器內。首頁首屏採左側情境敘述與右側三層剖面圖；往下依序是問題引導與搜尋。HPE 專區及訊達成功案例從頂部導覽切換，三個 View 的主要內容互不混排。

桌機閱讀頁採最多 760px 正文與較窄側欄，間距為兩欄之間約 10%。窄螢幕時首頁轉為單欄：文字、剖面圖、問題引導、搜尋；HPE 卡片改為上下排列。文章閱讀頁的延伸閱讀在有編輯確認的連結時才顯示，窄螢幕置於正文後方。

## Elevation & Depth

深度主要來自剖面插圖、紙面與白卡的色差，以及細邊線。搜尋結果保持平面，僅以邊線和留白區分。

### Shadow Vocabulary

- **層標籤** (`0 5px 13px #16333e18`)：讓小型彩色標籤從插圖中辨認出來。

**The Quiet Depth Rule.** 內容清單不加陰影；用線條與留白區分項目。

## Shapes

幾何感來自剖面層、細直線與圓形節點。層標籤使用小圓角，HPE 專區卡面使用溫和圓角；分類提示維持膠囊形。搜尋欄與文章列採清楚的細框，不用大量同形卡片鋪滿首頁。

## Components

### Buttons

- **Shape:** 首屏搜尋提交是圓形 (47×47px)；文章搜尋提交為膠囊輸入右端的深青色方段；文字動作以底線標示。
- **Primary:** 首屏提交鍵使用珊瑚底與白色箭頭；文章搜尋提交鍵使用深青墨底與白字。
- **Hover / Focus:** 鍵盤焦點統一使用紫色 3px 輪廓與 4px 外距；可點選入口使用短距位移或亮度變化。

### Chips

- **Style:** 主題篩選與細部主題篩選是白底、細框、膠囊形；細部主題字級更小。
- **State:** 選取時轉為深青墨底與白字，HPE 選取狀態獨立轉為綠底白字；使用 `aria-pressed` 表示狀態。

### Cards / Containers

- **Search results:** 搜尋框直接顯示在首頁；分類提示可點選，結果最多三篇。沒有查詢時不預先列出全部文章。
- **Guided discovery:** 保留經審閱的互動引導與推薦資料；結果文章須仍為已核准的對應版本。
- **Article row:** 用分隔線構成的橫向資訊列，標籤、標題、兩行摘要、箭頭各有清楚位置；hover 以淺色紙面提示可點選。
- **HPE view:** 頂部導覽切換至獨立專區；機櫃插圖放在白綠專區內，文章列用白底和綠色文字細節。

### Inputs / Fields

- **Style:** 首頁搜尋使用清楚標籤與細框輸入欄，分類提示提供直接開始搜尋的入口。
- **Focus:** 表單內的輸入框不另畫內框；可見焦點使用外層可辨識的紫色輪廓規則。

### Navigation

- **Style:** 品牌名稱與三個 View 的頂部導覽保持固定資訊層級；文章頁以 breadcrumb、返回搜尋或 HPE 專區及條件式延伸閱讀接續路徑。

## Do's and Don'ts

### Do:

- **Do** 讓應用、整合、基礎架構的色彩對應在入口、標籤和節點中一致。
- **Do** 讓首頁聚焦三層主題、問題引導與搜尋，文章結果只在有相關條件時出現。
- **Do** 在 HPE 獨立專區維持白綠分區，並讓一般內容維持訊達專欄的主視覺。
- **Do** 在窄螢幕把閱讀與搜尋入口排成單欄，保留可點選路徑。

### Don't:

- **Don't** 把首頁的三欄剖面構圖當成所有頁面的固定版型。
- **Don't** 以大量同形卡片取代目前按主題和資訊層級組織的文章橫列。
- **Don't** 用裝飾性科技圖案、虛構數字或未核准案例填補視覺空間。
- **Don't** 將 HPE 綠當作一般主題的第四個層次色。
