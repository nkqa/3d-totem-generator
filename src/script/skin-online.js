/**
 * 在线获取皮肤：Java 版（MineTools）/ 基岩版（GeyserMC）
 * 从 app.js 拆出：逻辑照搬原版 src/script/get-skin.js。
 */
'use strict';

const editionSelect = $('getSkinEdition'),
    userInput = $('getSkinName'),
    fetchButton = $('getSkinButton'),
    fetchText = fetchButton ? fetchButton.querySelector('a') : null;
let isBedrock = false;

/** 下载 PNG 并校验魔数 */
const fetchSkinPng = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`皮肤图片下载失败（HTTP ${response.status}）`);
    const data = new Uint8Array(await response.arrayBuffer());
    if (!(data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47)) {
        throw new Error('皮肤服务器返回的内容不是有效 PNG');
    }
    return data;
};

// Java 版：MineTools 查 UUID → 官方纹理地址
const fetchJavaSkin = async (name) => {
    const uuidResponse = await fetch(`https://api.minetools.eu/uuid/${encodeURIComponent(name)}`);
    if (!uuidResponse.ok) throw new Error('用户名查询服务暂时不可用');
    const uuidInfo = await uuidResponse.json();
    if (!uuidInfo.id || uuidInfo.status === 'ERR') throw new Error(`找不到用户 ${name}`);

    const profileResponse = await fetch(`https://api.minetools.eu/profile/${uuidInfo.id}`);
    if (!profileResponse.ok) throw new Error('无法获取该用户的皮肤资料');
    const profile = await profileResponse.json();
    const textureUrl = profile.decoded?.textures?.SKIN?.url;
    if (!textureUrl) throw new Error(`${name} 尚未设置 Java 版皮肤`);
    return fetchSkinPng(textureUrl.replace(/^http:\/\//, 'https://'));
};

// 基岩版：GeyserMC 查 xuid → 取转换后的皮肤纹理
const fetchBedrockSkin = async (name) => {
    const xuidResponse = await fetch(`https://api.geysermc.org/v2/xbox/xuid/${encodeURIComponent(name)}`);
    if (xuidResponse.status === 503) throw new Error('基岩版查询服务暂时不可用，请稍后再试');
    if (!xuidResponse.ok) throw new Error(`找不到基岩版玩家 ${name}`);
    const { xuid } = await xuidResponse.json();
    if (!xuid) throw new Error(`找不到基岩版玩家 ${name}`);

    const skinResponse = await fetch(`https://api.geysermc.org/v2/skin/${xuid}`);
    if (!skinResponse.ok) throw new Error('无法获取该玩家的皮肤资料');
    const skin = await skinResponse.json();
    if (!skin.texture_id) throw new Error(`${name} 暂无可用的基岩版皮肤（仅支持曾在基岩互通服务器出现过的玩家）`);
    return fetchSkinPng(`https://textures.minecraft.net/texture/${skin.texture_id}`);
};

/** PNG 尺寸校验（读 IHDR 的 width/height 字段） */
const isSupportedSize = (data) => {
    const view = new DataView(data.buffer, data.byteOffset);
    const width = view.getUint32(16), height = view.getUint32(20);
    return [64, 128].includes(width) && [64, 128].includes(height);
};

/** Uint8Array → dataURL */
const toDataURL = (data) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([data], { type: 'image/png' }));
});

/** 拉取皮肤并送入导入链 */
const getSkin = async () => {
    // NFKC 规范化：全角字母/数字自动转半角
    const name = userInput.value.trim().normalize('NFKC');
    if (!name) { toast(`请输入${isBedrock ? '基岩版（Xbox）' : 'Java 版'}用户名`); return; }
    fetchButton.disabled = true;
    if (fetchText) fetchText.textContent = '获取中...';
    try {
        const data = isBedrock ? await fetchBedrockSkin(name) : await fetchJavaSkin(name);
        if (!isSupportedSize(data)) { toast(`${name} 的皮肤尺寸不受支持（仅支持 64×64 / 128×128）`); return; }
        onSkinImported(await toDataURL(data), `${name}.png`);
    } catch (error) {
        toast(error.message || '获取皮肤失败，请检查网络');
    } finally {
        fetchButton.disabled = false;
        if (fetchText) fetchText.textContent = '获取皮肤';
    }
};

if (fetchButton) fetchButton.addEventListener('click', getSkin);
if (userInput) userInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') getSkin(); });
if (editionSelect) editionSelect.addEventListener('change', () => {
    isBedrock = editionSelect.value === 'bedrock';
    userInput.placeholder = isBedrock ? ' Xbox 用户名...' : ' 用户名...';
});
