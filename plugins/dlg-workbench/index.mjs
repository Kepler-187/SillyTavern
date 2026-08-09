import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 主仓库根 = 插件目录向上 5 级（app/plugins/dlg-workbench -> tiny-world）
const projectRoot = path.resolve(__dirname, '../../../../..');
const dlgRoot = path.resolve(__dirname, '../../../../..', 'data', 'dialogues');
const normRoot = path.resolve(__dirname, '../../..', 'data', 'default-user', '规范文本');
const historyRoot = path.resolve(__dirname, '../../..', 'data', 'default-user', 'dlg-history');

export const info = {
    id: 'dlg-workbench',
    name: 'DLG Workbench',
    description: 'Tiny World DLG 读写工作台：读取 DLG、对话式改写、规范文本保存、复检后写入 DLG',
};

function safeResolve(root, rel) {
    const resolved = path.resolve(root, rel);
    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
        throw new Error('非法路径：不允许越出根目录');
    }
    return resolved;
}

function listDlgFiles() {
    const out = [];
    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name.toLowerCase().endsWith('.dlg')) {
                out.push(path.relative(dlgRoot, full).split(path.sep).join('/'));
            }
        }
    }
    walk(dlgRoot);
    return out.sort();
}

function listNormFiles() {
    if (!fs.existsSync(normRoot)) {
        return [];
    }
    const out = [];
    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full);
            } else if (entry.name.toLowerCase().endsWith('.md')) {
                out.push(path.relative(normRoot, full).split(path.sep).join('/'));
            }
        }
    }
    walk(normRoot);
    return out.sort();
}

// ---------- DLG 版本历史 ----------

function normalizeEol(text) {
    return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function readTextIfExists(full) {
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}

// 提取历史文件中最后一段 ```dlg 快照（最新版本内容），没有则返回 null
function latestVersionContent(historyFull) {
    const text = readTextIfExists(historyFull);
    const blocks = [...text.matchAll(/```dlg\s*([\s\S]*?)```/g)];
    if (blocks.length === 0) return null;
    return normalizeEol(blocks[blocks.length - 1][1].trimEnd());
}

// 当前历史最大版本号（无记录返回 0）
function countVersions(historyFull) {
    const text = readTextIfExists(historyFull);
    const nums = [...text.matchAll(/## V(\d+)/g)].map(m => parseInt(m[1], 10));
    return nums.length ? Math.max(...nums) : 0;
}

function timestampNow() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// 记录 DLG 内容版本（镜像目录：dlg-history/<同名>.md）。与最新快照相同则不重复追加。
export function recordVersion(rel, content, note) {
    const historyRel = rel.replace(/\.dlg$/i, '') + '.md';
    const historyFull = safeResolve(historyRoot, historyRel);
    const normalized = normalizeEol(content).trimEnd() + '\n';
    const latest = latestVersionContent(historyFull);
    if (latest !== null && normalizeEol(latest).trimEnd() + '\n' === normalized) {
        return { recorded: false, version: countVersions(historyFull), path: historyRel };
    }
    const version = countVersions(historyFull) + 1;
    const header = version === 1 ? '初版（读取时记录）' : note;
    const block = `## V${version} · ${timestampNow()} · ${header}\n\`\`\`dlg\n${normalized.trimEnd()}\n\`\`\`\n`;
    const existed = readTextIfExists(historyFull) !== '';
    fs.mkdirSync(path.dirname(historyFull), { recursive: true });
    fs.appendFileSync(historyFull, existed ? block : `# DLG 版本历史：${rel}\n\n${block}`, 'utf8');
    const readBack = fs.readFileSync(historyFull, 'utf8');
    if (!readBack.includes(`## V${version} · `)) {
        throw new Error('版本历史写入后回读不一致，未记录');
    }
    return { recorded: true, version, path: historyRel, fullPath: historyFull };
}
// DLG 演出/流程/条件指令关键字，与 addons/asset_manager/dialogue_editor/data/instruction_type.gd 对齐。
// 规范文本中出现的合法指令行原样保留进 DLG；未知指令显式报错，绝不静默丢弃。
const DLG_INSTRUCTION_KEYWORDS = new Set([
    'speaker', 'emotion', 'portrait', 'portrait_hide', 'portrait_move',
    'shake', 'flash', 'fade_in', 'fade_out', 'transition',
    'wait', 'jump', 'end', 'bgm', 'bgm_stop', 'sfx',
    'set', 'call', 'if', 'elif', 'else', 'endif',
]);

/**
 * 规范文本 -> DLG 文本。任何无法识别的行都会显式报错，绝不静默丢弃。
 * 规范文本格式：
 *   第一行 `# 标题`        -> 写入 DLG 第一行
 *   其它 `#` 行            -> 注释，丢弃
 *   `=== 节点名 ===`       -> 节点标记，原样保留
 *   单独一行 `===`          -> 文件尾部收束标记，原样保留
 *   `角色: 台词`           -> 对白行
 *   `-> 选项文本 => 目标`   -> 选项行
 *   `> 旁白行`             -> 保留（内容是否符合 DLG 写作规范（允许 > 旁白，旁白不得替玩家角色做决定）由文心复检把关）
 *   `@指令 ...`            -> 演出/流程/条件指令行（如 @wait、@shake、@set、@call、@if/@elif/@else/@endif、@end），原样保留
 */
export function parseNormToDlg(content) {
    const lines = String(content).split(/\r?\n/);
    const out = [];
    const errors = [];
    let titleLine = null;
    let hasStartNode = false;

    for (const raw of lines) {
        const line = raw.replace(/\s+$/, '');
        if (line.trim() === '') {
            out.push('');
            continue;
        }
        if (line.startsWith('#')) {
            if (titleLine === null && line.trim() !== '') {
                titleLine = line;
                out.push(line);
            }
            continue;
        }
        const trimmed = line.trim();
        if (trimmed.startsWith('===')) {
            if (/^===\s*start\s*===\s*$/.test(trimmed)) {
                hasStartNode = true;
            }
            out.push(line);
            continue;
        }
        if (trimmed.startsWith('@')) {
            const keyword = trimmed.slice(1).trim().split(/\s+/)[0].toLowerCase();
            if (!DLG_INSTRUCTION_KEYWORDS.has(keyword)) {
                errors.push(`无法识别的指令：${trimmed}`);
                continue;
            }
            out.push(line);
            continue;
        }
        if (trimmed.startsWith('>')) {
            out.push(line);
            continue;
        }
        if (trimmed.startsWith('->')) {
            if (!/^->\s*.+?=>\s*\S+\s*$/.test(trimmed)) {
                errors.push(`选项行缺少合法跳转目标：${trimmed}`);
                continue;
            }
            out.push(line);
            continue;
        }
        // 对白行：speaker: 台词
        const m = trimmed.match(/^([^:\s][^:]*):\s*(.+)$/);
        if (m && m[2].trim() !== '') {
            out.push(line);
            continue;
        }
        errors.push(`无法识别的行：${trimmed}`);
    }

    if (!hasStartNode) {
        errors.push('缺少 === start === 节点，无法写入 DLG');
    }
    if (out.filter(l => l.trim() !== '').length === 0) {
        errors.push('规范文本为空，无法写入 DLG');
    }

    return { dlg: out.join('\n'), errors };
}

export async function init(router) {
    // 返回目录配置，供前端展示
    router.get('/config', (req, res) => {
        try {
            res.json({ ok: true, dlgRoot, normRoot });
        } catch (e) {
            res.status(500).json({ ok: false, message: String(e.message || e) });
        }
    });

    // 列出 data/dialogues 下全部 .dlg（相对路径，按目录分组由前端处理）
    router.get('/dlg/list', (req, res) => {
        try {
            res.json({ ok: true, files: listDlgFiles() });
        } catch (e) {
            res.status(500).json({ ok: false, message: String(e.message || e) });
        }
    });

    // 读取指定 DLG（path = 相对 data/dialogues 的路径，如 xiao_ya/dialog_xxx.dlg）
    router.get('/dlg/read', (req, res) => {
        try {
            const rel = String(req.query.path || '').replace(/\\/g, '/').replace(/^\/+/, '');
            if (!rel.toLowerCase().endsWith('.dlg')) {
                return res.status(400).json({ ok: false, message: '只允许读取 .dlg 文件' });
            }
            const full = safeResolve(dlgRoot, rel);
            if (!fs.existsSync(full)) {
                return res.status(404).json({ ok: false, message: `文件不存在：${rel}` });
            }
            const content = fs.readFileSync(full, 'utf8');
            let history = null;
            try {
                history = recordVersion(rel, content, '读取记录');
            } catch (e) {
                history = { recorded: false, error: String(e.message || e) };
            }
            res.json({ ok: true, name: rel, content, history });
        } catch (e) {
            res.status(400).json({ ok: false, message: String(e.message || e) });
        }
    });

    // 列出规范文本文件（相对 规范文本 目录）
    router.get('/norm/list', (req, res) => {
        try {
            res.json({ ok: true, files: listNormFiles() });
        } catch (e) {
            res.status(500).json({ ok: false, message: String(e.message || e) });
        }
    });

    // 读取规范文本
    router.get('/norm/read', (req, res) => {
        try {
            const rel = String(req.query.path || '').replace(/\\/g, '/').replace(/^\/+/, '');
            if (!rel.toLowerCase().endsWith('.md')) {
                return res.status(400).json({ ok: false, message: '只允许读取 .md 规范文本' });
            }
            const full = safeResolve(normRoot, rel);
            if (!fs.existsSync(full)) {
                return res.status(404).json({ ok: false, message: `规范文本不存在：${rel}` });
            }
            res.json({ ok: true, name: rel, content: fs.readFileSync(full, 'utf8') });
        } catch (e) {
            res.status(400).json({ ok: false, message: String(e.message || e) });
        }
    });

    // 保存规范文本。dlgRel = 对应 DLG 的相对路径（不含 .dlg 扩展名或带均可），
    // 规范文本镜像目录结构保存为 <同目录>/<同名>.md，保证与 DLG 一一对应。
    router.post('/norm/save', (req, res) => {
        try {
            let dlgRel = String((req.body && req.body.dlgRel) || '').replace(/\\/g, '/').replace(/^\/+/, '');
            const content = String((req.body && req.body.content) || '');
            if (!dlgRel || !content) {
                return res.status(400).json({ ok: false, message: '缺少 dlgRel 或 content' });
            }
            if (dlgRel.toLowerCase().endsWith('.dlg')) {
                dlgRel = dlgRel.slice(0, -4);
            }
            const base = path.posix.basename(dlgRel);
            if (!/^[^\\/]+$/.test(base) || !/\.dlg$/i.test(base + '.dlg')) {
                return res.status(400).json({ ok: false, message: 'dlgRel 必须是 data/dialogues 下的相对路径' });
            }
            const normRel = path.posix.join(path.posix.dirname(dlgRel), base + '.md');
            const full = safeResolve(normRoot, normRel);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(full, content, 'utf8');
            const readBack = fs.readFileSync(full, 'utf8');
            if (readBack !== content) {
                return res.status(500).json({ ok: false, message: '规范文本写入后回读不一致，未保存' });
            }
            res.json({ ok: true, path: normRel, fullPath: full });
        } catch (e) {
            res.status(400).json({ ok: false, message: String(e.message || e) });
        }
    });

    // 校验规范文本能否转换为 DLG（只解析不写盘）
    router.post('/dlg/validate', (req, res) => {
        try {
            const normRel = String((req.body && req.body.normPath) || '').replace(/\\/g, '/').replace(/^\/+/, '');
            if (!normRel.toLowerCase().endsWith('.md')) {
                return res.status(400).json({ ok: false, message: '只支持 .md 规范文本' });
            }
            const full = safeResolve(normRoot, normRel);
            if (!fs.existsSync(full)) {
                return res.status(404).json({ ok: false, message: `规范文本不存在：${normRel}` });
            }
            const content = fs.readFileSync(full, 'utf8');
            const { dlg, errors } = parseNormToDlg(content);
            if (errors.length > 0) {
                return res.json({ ok: false, errors, dlg: null });
            }
            res.json({ ok: true, errors: [], dlg });
        } catch (e) {
            res.status(400).json({ ok: false, message: String(e.message || e) });
        }
    });

    // 写入 DLG：再次解析校验后写回 data/dialogues 同名文件，回读验证。
    // 只允许写入 .dlg；不触碰 .dlg.import（Godot 会自动重导入）。
    router.post('/dlg/write', (req, res) => {
        try {
            const normRel = String((req.body && req.body.normPath) || '').replace(/\\/g, '/').replace(/^\/+/, '');
            if (!normRel.toLowerCase().endsWith('.md')) {
                return res.status(400).json({ ok: false, message: '只支持 .md 规范文本' });
            }
            const normFull = safeResolve(normRoot, normRel);
            if (!fs.existsSync(normFull)) {
                return res.status(404).json({ ok: false, message: `规范文本不存在：${normRel}` });
            }
            const content = fs.readFileSync(normFull, 'utf8');
            const { dlg, errors } = parseNormToDlg(content);
            if (errors.length > 0) {
                return res.json({ ok: false, errors, written: false });
            }
            const dlgRel = normRel.replace(/\.md$/i, '.dlg');
            const dlgFull = safeResolve(dlgRoot, dlgRel);
            if (!fs.existsSync(dlgFull)) {
                return res.status(404).json({ ok: false, message: `目标 DLG 不存在：${dlgRel}` });
            }
            fs.writeFileSync(dlgFull, dlg + '\n', 'utf8');
            const readBack = fs.readFileSync(dlgFull, 'utf8');
            if (readBack.replace(/\r\n/g, '\n') !== (dlg + '\n').replace(/\r\n/g, '\n')) {
                return res.status(500).json({ ok: false, message: 'DLG 写入后回读不一致，未保存', written: false });
            }
            let history = null;
            try {
                history = recordVersion(dlgRel, dlg + '\n', '确认写入');
            } catch (e) {
                history = { recorded: false, error: String(e.message || e) };
            }
            res.json({ ok: true, path: dlgRel, fullPath: dlgFull, written: true, history });
        } catch (e) {
            res.status(400).json({ ok: false, message: String(e.message || e) });
        }
    });
}
