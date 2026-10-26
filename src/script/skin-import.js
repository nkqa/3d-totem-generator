/**
 * 皮肤导入：PNG 皮肤展开图 / .mcpack / .zip 皮肤包
 * 从 app.js 拆出：依赖 skin-state.js、skin-texture.js、skin-list.js。
 */
'use strict';

/**
 * 导入 PNG 皮肤展开图
 * @param {string} data 皮肤 dataURL
 * @param {string} name 文件名
 */
const importPngSkin = async (data, name) => {
    ImageHandle.getImageData(data, async (imageData, size) => {
        if (!([64, 128].includes(size.width) && [64, 128].includes(size.height))) {
            toast(`${name} 的尺寸不受支持（仅支持 64×64 / 128×128）`);
            return;
        }
        const isSize64 = size.width === 64;

        // 粗/细手臂检测：遍历右臂 8×12 与左臂 8×12 区域，存在全透明像素即细手臂
        let isSmallHand = false;
        for (let i = 0; i < 48 * isSize64; i++) {
            const isSecond = Math.floor(i / (2 * isSize64)) > (12 * isSize64 - 1),
                [x, y] = [i % (2 * isSize64), Math.floor(i / (2 * isSize64)) - isSecond * (12 * isSize64)];
            if (isSmallHand = isSmallHand || (imageData[(((isSecond ? (20 * isSize64) : (52 * isSize64)) + y) * (64 * isSize64) + (isSecond ? (54 * isSize64) : (46 * isSize64)) + x) * 4 + 3] === 0)) break;
        }

        const texture = await buildTotemTexture(imageData, isSize64, isSmallHand);
        const skinID = randomSkinID();
        addSkin(data, texture, name.replace(/\.[^/.]+$/g, ''), isSmallHand, isSize64, skinID);
        skinData[skinID].rawImageData = imageData;
    });
};

/**
 * 导入 .mcpack / .zip 皮肤包
 * @param {string} data 皮肤包 dataURL
 * @param {string} name 文件名
 */
const importPackFile = async (data, name) => {
    try {
        const blob = await fetch(data).then(res => res.blob());
        const zip = await new JSZip().loadAsync(blob);
        const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
        if (!(manifest.header.version[0] >= 2)) {
            toast('您只可以上传 2.0.0 版本的资源包');
            return;
        }
        // 清空旧列表（与原版一致）
        Object.keys(skinData).forEach(key => delete skinData[key]);
        $('skin-items-container').innerHTML = '';
        skinOptions.packname = manifest.header.name;
        const packNameInput = $('packName');
        if (packNameInput) packNameInput.value = skinOptions.packname;

        for (const skin of manifest.subpacks) {
            const { name: subName, folder_name } = skin,
                skinFolder = zip.folder('subpacks').folder(folder_name),
                skinBlob = await skinFolder.file('totem.png').async('blob'),
                textureBlob = await skinFolder.folder('textures').folder('items').file('totem.png').async('blob');

            const skinURL = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(skinBlob);
            });
            const img = new Image();
            img.src = skinURL;
            await new Promise(resolve => img.onload = resolve);

            const textureURL = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(textureBlob);
            });

            const hasSlim = skinFolder.folder('attachables').file('totem.json') !== null;
            const skinID = randomSkinID();
            addSkin(skinURL, textureURL.split(',')[1], subName, hasSlim, img.width === 64, skinID);
            // 导入的皮肤包不含原始展开图像素，禁用重建（切手臂时保留原贴图）
            skinData[skinID].rawImageData = null;
        }
        updateSkinCounter();
    } catch (error) {
        toast(`皮肤包导入失败：${error.message || error}`);
    }
};

/** 按扩展名分发导入入口 */
const onSkinImported = (data, name) => {
    const fTyp = (name.match(/\.[^/.]+$/g) || [''])[0].toLowerCase();
    if (fTyp === '.png') importPngSkin(data, name);
    else if (['.mcpack', '.zip'].includes(fTyp)) importPackFile(data, name);
};

// 整页拖放导入（ImportFile.setup 对非 input 元素只绑 drop 事件）
ImportFile.setup(
    document.body,
    onSkinImported,
    undefined,
    false,
    false,
    80,
    () => { $('drop-file-here').style.display = 'block'; },
    () => { $('drop-file-here').style.display = 'none'; }
);

// 按钮触发文件选择
// 注意：ImportFile.setup 只对原生 <input type="file"> 生效（内部读 element.type === 'file'），
// 挂在 mdui-button 上只会绑拖放而不会弹出系统选择框，因此必须放一个隐藏 input，
// 并让按钮点击时转发给 input.click()。
const importButton = $('importImage');
if (importButton) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'skinFileInput';
    fileInput.multiple = true;
    fileInput.accept = '.png,.mcpack,.zip';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    ImportFile.setup(fileInput, onSkinImported, undefined, false, true, 80);
    importButton.addEventListener('click', () => fileInput.click());
}
