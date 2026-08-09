import { sendMessageAsUser, Generate, token, chat } from '../../../../script.js';

const API_BASE = '/api/plugins/dlg-workbench';

const state = {
    dlgRel: null,
    normPath: null,
};

// ---------- 指令模板 ----------

const REWRITE_PROMPT = `请改写我刚刚给出的 DLG 文件。只写玩家可见文本，保留节点、跳转、事件和 @call/@set 等系统调用不变。

默认处理（没有特别要求就按此执行）：
- 演出模式：传统交谈；玩家操控角色默认按本 DLG 的说话人判断；
- 台词口语化：像符合角色身份的日常话语，用碎句、语气词、省略号、重复和结巴承载情绪；不写“念状况”式报幕、记账式书面句，不对物体或动物下冷静指令；
- 环境与台词结合：环境描写只负责搭台与转折，不一句环境一句对白工整交替；日常段落允许连续对白，环境信息尽量由台词承担；紧张段落对白变短、环境变碎；
- 演出描述行以 > 开头，不用“她/他”指代中心角色或玩家操控角色；角色名只用于开场定位、消除歧义与关键定格，连续动作省略主语；
- 不照搬我提供的示例原句，示例只作风格校准，须换说法重写。

请在下方补充本次改写信息，补完直接发送（留空则按默认处理，不逐项追问）：
【触发前背景/已发生行为】例如：小芽在斜阳村外采完车前草，正要收拾药篓回村
【玩家操控角色】如不是本 DLG 主要说话人，请注明
【本次想解决的创作问题】例如：扩写成有画面感的场景对话，不要太短
【不可改/不可新增】

只有缺失会改变核心因果、角色声音或输出结构时，才列出已知与缺失并提最多三个成组问题；可自行判断的空白直接按默认处理。`;

function toNormPrompt(targetRel) {
    return `请把我们刚才讨论确定下来的改写内容整理为规范文本。规范文本是与 DLG 同名的写作稿，格式如下：
- 第一行写 # 标题；
- 每个对话节点用 === 节点名 === 标记（开头节点必须是 === start ===）；
- 对白行写“角色: 台词”；
- 玩家选项行写“-> 选项文本 => 跳转节点名”；
- 演出/流程/条件指令行原样保留（如 @wait、@shake、@set 变量 值、@call 函数 参数、@if/@elif/@else/@endif、@end），文件末尾写单独一行 ===；
输出时用 \`\`\`norm 代码块完整包裹规范文本，代码块外只保留一句话说明，不要输出其它内容。
这份规范文本对应 DLG：${targetRel}。你没有保存文件的能力，不要声称“已保存”；请在回复末尾提醒我点击「保存规范文本」按钮来完成保存。`;
}

function writePrompt(normPath, content) {
    return `请按 DLG 写入规范复检下面这份规范文本（文件：${normPath}）。检查项：
1) 演出呈现：允许 > 旁白行作为演出描述（环境、动作、氛围等）；旁白不得替玩家角色做决定、表态或叙述其内心；
2) 玩家代理权：台词和选项没有替玩家角色决定未授权的移动、停留、身体感受或价值判断；
3) 选项跳转：每个 -> 选项 => 目标 的跳转目标节点必须存在且可达；
4) @end 可达：所有节点都能到达结束；
5) 固定主角声音：日常问答、事实说明等应为符合声音的固定台词，停顿、纯反应不写成选项；选项只用于真正改变策略、关系、分支或结果的决定。

如果通过，请回复【复检通过】并输出最终 DLG（用 \`\`\`dlg 代码块包裹）；如果不通过，逐条列出问题，不要输出最终 DLG。

规范文本内容：
\`\`\`norm
${content}
\`\`\``;
}

// ---------- 工具 ----------

function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
}

async function apiGet(url) {
    const res = await fetch(url);
    return res.json();
}

async function apiPost(url, body) {
    const csrfHeaders = token ? { 'X-CSRF-Token': token } : {};
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify(body || {}),
    });
    return res.json();
}

function lastAssistantMessage() {
    for (let i = chat.length - 1; i >= 0; i--) {
        if (!chat[i].is_user && !chat[i].is_system) return chat[i];
    }
    return null;
}

function extractNormBlock(text) {
    const m = String(text || '').match(/```norm\s*([\s\S]*?)```/);
    return m ? m[1].trim() : null;
}

function setStatus(text, isError = false) {
    const s = document.getElementById('dlg-workbench-status');
    if (s) {
        s.textContent = text;
        s.classList.toggle('error', isError);
    }
    console.log(`[DLG Workbench] ${text}`);
}

function histText(history) {
    if (!history) return '';
    if (history.error) return `（版本记录失败：${history.error}）`;
    return history.recorded
        ? `（已记录 V${history.version}：${history.path}）`
        : `（版本无变化，当前 V${history.version}，未重复记录）`;
}

// ---------- 文件选择弹窗 ----------

function openPicker(kind, onPick) {
    const overlay = el('div', 'dlgwb-overlay');
    const modal = el('div', 'dlgwb-modal');
    const header = el('div', 'dlgwb-modal-header', kind === 'dlg' ? '选择 DLG 文件' : '选择规范文本');
    const search = el('input', 'text_pole');
    search.placeholder = kind === 'dlg'
        ? '搜索文件名，或直接输入相对路径，如 xiao_ya/dialog_xxx.dlg'
        : '搜索文件名，或直接输入相对路径，如 xiao_ya/dialog_xxx.md';
    const listBox = el('div', 'dlgwb-filelist');
    const footer = el('div', 'dlgwb-modal-footer');
    const cancelBtn = el('button', 'menu_button', '取消');
    const okBtn = el('button', 'menu_button', '确定');
    let picked = null;

    function render(files) {
        listBox.innerHTML = '';
        const q = search.value.trim().toLowerCase();
        const filtered = files.filter(f => f.toLowerCase().includes(q));
        if (filtered.length === 0) {
            listBox.appendChild(el('div', 'dlgwb-empty', q ? '没有匹配的文件' : '目录为空'));
            return;
        }
        let lastDir = null;
        for (const f of filtered) {
            const parts = f.split('/');
            const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '（根目录）';
            if (dir !== lastDir) {
                listBox.appendChild(el('div', 'dlgwb-group', dir));
                lastDir = dir;
            }
            const item = el('div', 'dlgwb-item', parts[parts.length - 1]);
            item.title = f;
            if (picked === f) item.classList.add('picked');
            item.addEventListener('click', () => {
                picked = f;
                listBox.querySelectorAll('.dlgwb-item').forEach(n => n.classList.remove('picked'));
                item.classList.add('picked');
            });
            listBox.appendChild(item);
        }
    }

    search.addEventListener('input', () => render(allFiles));
    cancelBtn.addEventListener('click', () => overlay.remove());
    okBtn.addEventListener('click', () => {
        const value = (picked || search.value.trim()).replace(/\\/g, '/').replace(/^\/+/, '');
        if (!value) return;
        overlay.remove();
        onPick(value);
    });

    let allFiles = [];
    const listUrl = kind === 'dlg' ? `${API_BASE}/dlg/list` : `${API_BASE}/norm/list`;
    apiGet(listUrl).then(data => {
        if (data.ok) {
            allFiles = data.files;
            render(allFiles);
        } else {
            listBox.appendChild(el('div', 'dlgwb-empty', data.message || '加载列表失败'));
        }
    });

    modal.appendChild(header);
    modal.appendChild(search);
    modal.appendChild(listBox);
    footer.appendChild(cancelBtn);
    footer.appendChild(okBtn);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    search.focus();
}

// ---------- 各按钮动作 ----------

async function readDlg() {
    openPicker('dlg', async rel => {
        if (!rel.toLowerCase().endsWith('.dlg')) {
            setStatus('只能读取 .dlg 文件', true);
            return;
        }
        const data = await apiGet(`${API_BASE}/dlg/read?path=${encodeURIComponent(rel)}`);
        if (!data.ok) {
            setStatus(data.message || '读取 DLG 失败', true);
            return;
        }
        state.dlgRel = rel;
        await sendMessageAsUser(`【DLG 文件】${data.name}\n\`\`\`dlg\n${data.content}\n\`\`\``);
        setStatus(`已读取：${rel}。可点「改写」把改写提示填入输入框${histText(data.history)}`);
    });
}

async function rewriteDlg() {
    if (!state.dlgRel) {
        setStatus('请先点「读取 DLG」选择文件', true);
        return;
    }
    const ta = document.querySelector('#send_textarea');
    if (!ta) {
        setStatus('未找到输入框', true);
        return;
    }
    ta.value = REWRITE_PROMPT;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    setStatus(`改写提示已填入输入框：${state.dlgRel}。补充背景等信息后发送`);
}

async function toNorm() {
    const target = prompt('目标 DLG 相对路径（data/dialogues 下），规范文本将同名保存：', state.dlgRel || '');
    if (!target || !target.trim()) return;
    const rel = target.trim().replace(/\\/g, '/');
    state.dlgRel = rel.replace(/\.dlg$/i, '') + '.dlg';
    setStatus(`已请文心整理规范文本：${state.dlgRel}。文心回复后点「保存规范文本」`);
    await sendMessageAsUser(toNormPrompt(state.dlgRel));
    await Generate('normal');
}

async function saveNorm() {
    const msg = lastAssistantMessage();
    if (!msg) {
        setStatus('聊天里没有文心的回复', true);
        return;
    }
    let block = extractNormBlock(msg.mes);
    if (!block) {
        setStatus('文心回复里没有 ```norm 代码块，请手动粘贴（已打开编辑框）', true);
        const manual = prompt('没有找到 ```norm 代码块。请把规范文本内容粘贴到这里：', '');
        if (!manual) return;
        block = manual.trim();
    }
    if (!state.dlgRel) {
        setStatus('缺少目标 DLG 相对路径，请先点「读取 DLG」', true);
        return;
    }
    const data = await apiPost(`${API_BASE}/norm/save`, { dlgRel: state.dlgRel, content: block });
    if (data.ok) {
        state.normPath = data.path;
        setStatus(`规范文本已保存：${data.path}。可点「写入 DLG」`);
    } else {
        setStatus(data.message || '保存规范文本失败', true);
    }
}

async function writeDlg() {
    openPicker('norm', async normPath => {
        state.normPath = normPath;
        const data = await apiPost(`${API_BASE}/dlg/validate`, { normPath });
        if (!data.ok) {
            const detail = (data.errors && data.errors.length)
                ? data.errors.join('\n')
                : (data.message || '规范文本解析失败');
            setStatus(`规范文本结构校验未通过，未进入复检：\n${detail}`, true);
            return;
        }
        const normData = await apiGet(`${API_BASE}/norm/read?path=${encodeURIComponent(normPath)}`);
        if (!normData.ok) {
            setStatus(normData.message || '读取规范文本失败', true);
            return;
        }
        setStatus(`结构校验通过，已请文心复检：${normPath}。文心通过后点「确认写入」`);
        await sendMessageAsUser(writePrompt(normPath, normData.content));
        await Generate('normal');
    });
}

async function confirmWrite() {
    if (!state.normPath) {
        setStatus('请先点「写入 DLG」选择规范文本', true);
        return;
    }
    const data = await apiPost(`${API_BASE}/dlg/write`, { normPath: state.normPath });
    if (data.ok) {
        setStatus(`已写入 DLG：${data.path}（回读验证通过）${histText(data.history)}`);
    } else {
        const detail = (data.errors && data.errors.length)
            ? data.errors.join('\n')
            : (data.message || '写入 DLG 失败');
        setStatus(`未写入：${detail}`, true);
    }
}

// ---------- 挂载 UI ----------

export function init() {
    jQuery(function () {
        const sendForm = document.getElementById('send_form');
        if (!sendForm) return;
    
        const bar = el('div', 'dlgwb-bar');
        const label = el('span', 'dlgwb-label', 'DLG 工作台');
        const btnRead = el('button', 'menu_button', '📂 读取 DLG');
        const btnRewrite = el('button', 'menu_button', '✏️ 改写');
        const btnToNorm = el('button', 'menu_button', '📄 写为规范文本');
        const btnSaveNorm = el('button', 'menu_button', '💾 保存规范文本');
        const btnWrite = el('button', 'menu_button', '💾 写入 DLG');
        const btnConfirm = el('button', 'menu_button', '✅ 确认写入');
        const status = el('span', 'dlgwb-status');
        status.id = 'dlg-workbench-status';
    
        btnRead.addEventListener('click', readDlg);
        btnRewrite.addEventListener('click', rewriteDlg);
        btnToNorm.addEventListener('click', toNorm);
        btnSaveNorm.addEventListener('click', saveNorm);
        btnWrite.addEventListener('click', writeDlg);
        btnConfirm.addEventListener('click', confirmWrite);
    
        bar.appendChild(label);
        bar.appendChild(btnRead);
        bar.appendChild(btnRewrite);
        bar.appendChild(btnToNorm);
        bar.appendChild(btnSaveNorm);
        bar.appendChild(btnWrite);
        bar.appendChild(btnConfirm);
        bar.appendChild(status);
        sendForm.parentElement.insertBefore(bar, sendForm);
    });
}