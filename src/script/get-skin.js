"use strict";
/**
 * 用户名获取皮肤（Java 版 / 基岩版 Xbox 用户名）
 * 获取方式参考 MCNeko-Forum/skinpack（minecraft-skin-pack-creator），
 * 取到 PNG 后复用 main.js 的 onSkinImported 走本地导入流程。
 */
{
    const editionButton = GetElement.id('getSkinEdition'),
        userInput = GetElement.id('getSkinName'),
        fetchButton = GetElement.id('getSkinButton'),
        buttonText = GetElement.selector('a', fetchButton);
    let isBedrock = false;

    // 下载 PNG 并校验文件签名（PNG 魔数 89 50 4E 47）
    const fetchSkinPng = async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`皮肤图片下载失败（HTTP ${response.status}）`);
        const data = new Uint8Array(await response.arrayBuffer());
        if (!(data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47)) {
            throw new Error('皮肤服务器返回的内容不是有效 PNG');
        }
        return data;
    };

    // Java 版：MineTools 查 UUID（Mojang 官方 API 无 CORS）→ 官方纹理地址下载
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

    // 基岩版：GeyserMC 用 Xbox 用户名查 xuid，再取该玩家被转换过的皮肤纹理
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

    // 尺寸校验，条件与 main.js 的 onSkinImported 保持一致（64×64 / 128×128）
    const isSupportedSize = (data) => {
        const view = new DataView(data.buffer, data.byteOffset);
        const width = view.getUint32(16), height = view.getUint32(20);
        return [64, 128].includes(width) && [64, 128].includes(height);
    };

    // 必须转成 data URL：main.js 导出时按 data.data.split(',')[1] 取 base64
    const toDataURL = (data) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(new Blob([ data ], { type: 'image/png' }));
    });

    const getSkin = async () => {
        // NFKC 规范化：全角字母/数字（如 Ｎｏｔｃｈ）自动转半角
        const name = userInput.value.trim().normalize('NFKC');
        if (!name) { alert(`请输入${isBedrock ? '基岩版（Xbox）' : 'Java 版'}用户名`); return; }
        fetchButton.disabled = true;
        buttonText.innerText = '获取中...';
        try {
            const data = isBedrock ? await fetchBedrockSkin(name) : await fetchJavaSkin(name);
            if (!isSupportedSize(data)) { alert(`${name} 的皮肤尺寸不受支持（仅支持 64×64 / 128×128）`); return; }
            onSkinImported(await toDataURL(data), `${name}.png`);
        } catch (error) {
            alert(error.message || '获取皮肤失败，请检查网络');
        } finally {
            fetchButton.disabled = false;
            buttonText.innerText = '获取皮肤';
        }
    };

    fetchButton.onclick = getSkin;
    userInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') getSkin(); });
    editionButton.onclick = () => {
        isBedrock = !isBedrock;
        GetElement.selector('a', editionButton).innerText = isBedrock ? '基岩版' : 'Java 版';
        userInput.placeholder = isBedrock ? ' Xbox 用户名...' : ' 用户名...';
    };
}
