const IMG_PATH = "./pethead/";
let fullDatabase = null;
let activeTabIdx = 0;
let activeBondIdx = 0;
let activeTimers = [];

const tabsEl = document.getElementById('category-tabs');
const contentEl = document.getElementById('content-root');
const searchEl = document.getElementById('search-input');
const modal = document.getElementById('spirit-modal');
const modalBody = document.getElementById('modal-body');

// 🚩 更新：加入 UNAVAILABLE 頁籤
const categories = [
    { id: "home", name: "HOME // 主頁", layout: "home" },
    { id: "oracle", name: "ORACLE // 神諭覺醒", layout: "list" },
    { id: "bond", name: "BOND // 契約夥伴", layout: "bond" },
    { id: "evolution", name: "EVOLUTION // 全新進化", layout: "list" },
    { id: "newform", name: "NEW_FORM // 全新型態", layout: "list" },
    { id: "removed", name: "UNAVAILABLE // 絕版下架", layout: "list" }
];

async function loadDatabase() {
    try {
        const response = await fetch('log.json?t=' + new Date().getTime());
        fullDatabase = await response.json();
        initTabs();
        update();
    } catch (err) {
        console.error("無法讀取資料庫:", err);
        contentEl.innerHTML = `<div class="home-section"><div class="home-title" style="color:var(--red)">ERROR</div>系統無法讀取 log.json。</div>`;
    }
}

function getBadgeHtml(status) {
    if (!status) return "";
    let cls = "b-permanent";
    if (status === "進行中") cls = "b-ongoing";
    if (status === "下期預告") cls = "b-upcoming";
    // 🚩 只要包含「已結束」或「下架」，就會自動套用紅色閃爍標籤
    if (status.includes("已結束") || status.includes("下架")) cls = "b-ended";
    return `<span class="badge ${cls}">${status}</span>`;
}

function getNameClass(s) {
    const isPaid = s.acquisition && s.acquisition.includes('付費精靈');
    return isPaid ? 'card-name paid-name' : 'card-name';
}

function getAutoTags(s) {
    let tags = "";
    if (s.notes && s.notes.includes('台服尚未推出')) {
        tags += '<span class="badge b-ended">台服未推出</span>';
    }
    if (s.acquisition) {
        if (s.acquisition.includes('沒有常駐入手手段')) {
            tags += '<span class="badge b-deprecated b-flash-warn">暫時絕版</span>';
        } else if (s.acquisition.includes('下架') || s.acquisition.includes('改為')) {
            if (s.acquisition.includes('沒有穩定入手手段')) {
                tags += '<span class="badge b-ended">獲取方式異動且不穩定</span>';
            } else if(s.status.includes('下架')){
                tags += '<span class="badge b-ended">原關卡已下架</span>';
            } else {
                tags += '<span class="badge b-changed b-flash-info">獲取方式異動</span>';
            }
        }
    }
    if (s.newSkill && s.newSkill.includes('有')) {
        tags += '<span class="badge b-ongoing">新技能</span>';
    }
    return tags;
}

function openModal(s, type) {
    const fullImg = `${IMG_PATH}Seeravatar${s.id}.png`;
    const fallback = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3MCIgaGVpZ2h0PSI3MCI+PHJlY3Qgd2lkdGg9IjcwIiBoZWlnaHQ9IjcwIiBmaWxsPSIjMWUxZTFlIi8+PC9zdmc+`;
    const nameCls = getNameClass(s) === 'card-name paid-name' ? 'm-profile-name paid-name' : 'm-profile-name';

    const statusBadge = ((type === 'evolution' || type === 'newform') && s.status === "已常駐") ? "" : (s.status ? getBadgeHtml(s.status) : "");

    let contentHtml = `
        <div class="m-profile">
            <img src="${fullImg}" class="m-avatar" onerror="this.src='${fallback}'">
            <div class="m-profile-info">
                <div class="m-profile-id">PET_NO: ${s.id}</div>
                <div class="${nameCls}" style="font-size:2.2rem; line-height:1.2;">${s.name}</div>
                <div class="m-profile-status">${statusBadge}</div>
            </div>
        </div>`;

    if (s.evolution) {
        const evoLabel = s.evolution.typeText || "進化";
        contentHtml += `
            <div class="evo-chain-box">
                <div class="evo-node">
                    <img src="${IMG_PATH}Seeravatar${s.evolution.fromId}.png" onerror="this.src='${fallback}'">
                    <span>#${s.evolution.fromId} ${s.evolution.fromName}</span>
                </div>
                <div class="evo-arrow">❯❯ ${evoLabel} ❯❯</div>
                <div class="evo-node active">
                    <img src="${fullImg}" onerror="this.src='${fallback}'">
                    <span>#${s.id} ${s.name}</span>
                </div>
            </div>`;
    }

    contentHtml += `<div class="m-data-grid">`;
    if (s.nickname) contentHtml += renderDataBox("NICKNAME / 暱稱", s.nickname);

    if (type === 'oracle') {
        contentHtml += renderDataBox("WIKI / 詳細數據", s.newSkill || '請參閱圖鑑');
    } else if (type === 'bond') {
        contentHtml += renderDataBox("NEW_SKILL / 新技能", s.newSkill || '無', !s.nickname);
    } else if (type === 'evolution') {
        contentHtml += renderDataBox("EVO_DATA / 進化資訊", s.front || '已是最終型態');
    } else if (type === 'newform') {
        contentHtml += renderDataBox("FORM_DATA / 型態資訊", s.pay || '全新型態，不需要前置');
    } else if (type === 'removed') {
        // 🚩 下架精靈專屬標籤
        contentHtml += renderDataBox("REMOVED_DATA / 下架資訊", s.status || '挑戰關卡已關閉，目前無法穩定獲取',true);
    }

    if (type !== 'removed') {
        contentHtml += renderDataBox("ACQUISITION / 獲取方式", s.acquisition || '未知', true);
    }
    if (s.notes) contentHtml += renderDataBox("NOTES / 附加備註", s.notes, true);

    contentHtml += `</div>`;
    modalBody.innerHTML = contentHtml;
    modal.classList.add('show');
}

function renderDataBox(label, value, isFullWidth = false) {
    return `<div class="m-data-box ${isFullWidth ? 'full-width' : ''}"><div class="m-label">${label}</div><div class="m-value">${value}</div></div>`;
}

function renderHome() {
    contentEl.innerHTML = `<div class="home-container">
        <div class="home-section">
            <div class="home-title">數據終端介面說明</div>
            <p style="font-size:1.1rem; border-left:2px solid var(--cyan); padding-left:15px;">問就是還在整理，資料量非常多。</p>
        </div>
        <div class="home-section">
            <div class="home-title">各模塊檢索指南</div>
            <div style="margin-bottom:15px;"><span style="color:var(--cyan); font-weight:bold;">[神諭覺醒]</span><br>舊有精靈追加種族值與新技能。</div>
            <div style="margin-bottom:15px;"><span style="color:var(--cyan); font-weight:bold;">[契約夥伴]</span><br>特定的精靈組合強化。</div>
            <div style="margin-bottom:15px;"><span style="color:var(--cyan); font-weight:bold;">[全新進化]</span><br>精靈型態轉換，通常消耗前置型態。</div>
            <div style="margin-bottom:15px;"><span style="color:var(--cyan); font-weight:bold;">[全新型態]</span><br>精靈之全新表現方式，許多可以不消耗前置。</div>
            <div style="margin-bottom:15px;"><span style="color:var(--red); font-weight:bold;">[絕版下架]</span><br>歷年來已關閉挑戰關卡，目前無法穩定獲取的精靈名單。</div>
        </div>
    </div>`;
}

// 🚩 下架精靈專屬渲染函數：會根據日期自動分區
function renderRemovedList(spirits, type) {
    activeTimers.forEach(t => clearInterval(t));
    activeTimers = [];

    if (spirits.length === 0) {
        contentEl.innerHTML = `<div class="home-section">NO_DATA // 查無相關下架數據</div>`;
        return;
    }

    const groups = {};
    const order = [];
    
    // 根據狀態(日期)分組
    spirits.forEach(s => {
        const date = s.status || "早期下架";
        if (!groups[date]) {
            groups[date] = [];
            order.push(date);
        }
        groups[date].push(s);
    });

    // 依序渲染各個日期區塊
    order.forEach(date => {
        createStandardSection(`ARCHIVE // ${date}`, groups[date], type);
    });
}

function renderStandardList(spirits, type) {
    activeTimers.forEach(t => clearInterval(t));
    activeTimers = [];
    const sorted = [...spirits].sort((a, b) => parseInt(a.id) - parseInt(b.id));

    const ongoingGroup = sorted.filter(s => (s.status || "") === "進行中");
    const upcomingGroup = sorted.filter(s => (s.status || "") === "下期預告");
    const combined = [...ongoingGroup, ...upcomingGroup];
    const groupEnded = sorted.filter(s => (s.status || "").includes("已結束"));
    const groupPermanent = sorted.filter(s => (s.status || "") === "已常駐" || (!s.status && type !== 'bond'));

    if (combined.length > 0) {
        const head = document.createElement('div');
        head.className = 'section-header';
        head.innerText = "ACTIVE & UPCOMING // 進行中與預告";
        contentEl.appendChild(head);
        const grid = document.createElement('div');
        grid.className = 'combined-grid';
        combined.forEach(s => {
            const card = document.createElement('div');
            card.className = 'tech-card';
            card.onclick = () => openModal(s, type);
            card.innerHTML = `<img src="${IMG_PATH}Seeravatar${s.id}.png" class="card-img"><div class="card-info"><div class="card-id">#${s.id}</div><div class="${getNameClass(s)}">${s.name}</div><div class="status-row">${getBadgeHtml(s.status)}${getAutoTags(s)}${s.deadline ? `<div class="timer-display" id="timer-${s.id}"><span class="timer-countdown">SYNCING...</span></div>` : ''}</div></div>`;
            grid.appendChild(card);
            if (s.deadline) startTimer(s.deadline, s.id);
        });
        contentEl.appendChild(grid);
    }

    let permHeader = "PERMANENT // 已常駐";
    if (type === 'evolution') permHeader = "EVOLUTION ARCHIVE // 進化檔案";
    if (type === 'newform') permHeader = "FORM ARCHIVE // 型態檔案";

    createStandardSection("ENDED // 尚未常駐", groupEnded, type);
    createStandardSection(permHeader, groupPermanent, type);
}

function createStandardSection(title, groupSpirits, type) {
    if (groupSpirits.length === 0) return;
    const head = document.createElement('div'); head.className = 'section-header'; head.innerText = title; contentEl.appendChild(head);
    const grid = document.createElement('div'); grid.className = 'spirit-grid';
    groupSpirits.forEach(s => {
        const card = document.createElement('div'); card.className = 'tech-card'; card.onclick = () => openModal(s, type);

        // 🚩 如果是下架模式，列表上不需要顯示重複的下架標籤 (因為標題已經寫了)
        let statusBadge = getBadgeHtml(s.status);
        if ((type === 'evolution' || type === 'newform') && s.status === "已常駐") statusBadge = "";
        if (type === 'removed') statusBadge = ""; 

        card.innerHTML = `<img src="${IMG_PATH}Seeravatar${s.id}.png" class="card-img"><div class="card-info"><div class="card-id">#${s.id}</div><div class="${getNameClass(s)}">${s.name}</div><div class="status-row">${statusBadge}${getAutoTags(s)}</div></div>`;
        grid.appendChild(card);
    });
    contentEl.appendChild(grid);
}

function startTimer(deadline, spiritId) {
    const target = new Date(deadline).getTime();
    const update = () => {
        const container = document.getElementById(`timer-${spiritId}`);
        if (!container) return;
        const countdownEl = container.querySelector('.timer-countdown');
        const now = new Date().getTime();
        const diff = target - now;
        if (diff <= 0) { countdownEl.innerHTML = `<span style="color:var(--cyan)">SEQUENCE_COMPLETE</span>`; return; }
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        countdownEl.innerText = `${d.toString().padStart(2, '0')}天 ${h.toString().padStart(2, '0')}小時${m.toString().padStart(2, '0')}分鐘${s.toString().padStart(2, '0')}秒`;
    };
    update(); activeTimers.push(setInterval(update, 1000));
}

function renderBonds(groups) {
    if (!groups || groups.length === 0) return;
    contentEl.innerHTML = "";
    const bondBrowser = document.createElement('div');
    bondBrowser.className = 'bond-browser';
    const nav = document.createElement('div');
    nav.className = 'bond-nav';
    groups.forEach((g, i) => {
        const btn = document.createElement('div');
        btn.className = `bond-group-btn ${i === activeBondIdx ? 'active' : ''}`;
        btn.innerHTML = `<div class="g-name">${g.groupName}</div><div class="g-badge">${g.badge}</div>`;
        btn.onclick = () => { activeBondIdx = i; update(); };
        nav.appendChild(btn);
    });
    const display = document.createElement('div');
    display.className = 'bond-display-area';
    const activeGroup = groups[activeBondIdx];
    const grid = document.createElement('div');
    grid.className = 'spirit-grid';
    activeGroup.spirits.forEach(s => {
        const card = document.createElement('div');
        card.className = 'tech-card';
        card.onclick = () => openModal(s, 'bond');
        card.innerHTML = `<img src="${IMG_PATH}Seeravatar${s.id}.png" class="card-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI3MCIgaGVpZ2h0PSI3MCI+PHJlY3Qgd2lkdGg9IjcwIiBoZWlnaHQ9IjcwIiBmaWxsPSIjMWUxZTFlIi8+PC9zdmc+ '"><div class="card-info"><div class="card-id">#${s.id}</div><div class="${getNameClass(s)}">${s.name}</div><div class="status-row">${getAutoTags(s)}</div></div>`;
        grid.appendChild(card);
    });
    display.appendChild(grid);
    bondBrowser.appendChild(nav);
    bondBrowser.appendChild(display);
    contentEl.appendChild(bondBrowser);
}

function update() {
    if (!fullDatabase) return;
    contentEl.innerHTML = "";
    const cat = categories[activeTabIdx];
    const search = searchEl.value.toLowerCase();

    if (cat.id === "home") {
        renderHome();
    } else if (cat.id === "oracle") {
        const filtered = (fullDatabase.oracle || []).filter(s => s.name.includes(search) || s.id.includes(search) || (s.nickname && s.nickname.includes(search)));
        renderStandardList(filtered, 'oracle');
    } else if (cat.id === "bond") {
        const filtered = (fullDatabase.bond || []).filter(g =>
            g.groupName.includes(search) ||
            g.spirits.some(s => s.name.toLowerCase().includes(search) || (s.nickname && s.nickname.toLowerCase().includes(search)))
        );
        if (search && filtered.length > 0 && activeBondIdx >= filtered.length) activeBondIdx = 0;
        renderBonds(filtered);
    } else if (cat.id === "evolution") {
        const filtered = (fullDatabase.evolution || []).filter(s => s.name.includes(search) || s.id.includes(search) || (s.nickname && s.nickname.includes(search)));
        renderStandardList(filtered, 'evolution');
    } else if (cat.id === "newform") {
        const filtered = (fullDatabase.newform || []).filter(s => s.name.includes(search) || s.id.includes(search) || (s.nickname && s.nickname.includes(search)));
        renderStandardList(filtered, 'newform');
    } else if (cat.id === "removed") {
        // 🚩 處理 下架數據檢索
        const filtered = (fullDatabase.removed || []).filter(s => s.name.includes(search) || s.id.includes(search) || (s.nickname && s.nickname.includes(search)));
        renderRemovedList(filtered, 'removed');
    }
}

function initTabs() {
    tabsEl.innerHTML = "";
    categories.forEach((cat, i) => {
        const btn = document.createElement('div');
        btn.className = `tab-btn ${i === activeTabIdx ? 'active' : ''}`;
        btn.innerText = cat.name;
        btn.onclick = () => { activeTabIdx = i; activeBondIdx = 0; initTabs(); update(); };
        tabsEl.appendChild(btn);
    });
}
document.querySelector('.close-btn').onclick = () => modal.classList.remove('show');
window.onclick = (e) => { if (e.target === modal) modal.classList.remove('show'); };
searchEl.oninput = () => update();
loadDatabase();