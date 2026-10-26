/**
 * 皮肤列表：计数 / 空状态 / 新增与删除列表项
 * 从 app.js 拆出：依赖 skin-state.js、skin-texture.js、skin-editor.js（openSkinEditor）。
 */
'use strict';

/** 刷新皮肤计数 chip 与空状态占位 */
const updateSkinCounter = () => {
    const skinAmount = Object.keys(skinData).length;
    const counter = $('skinCounter');
    if (counter) {
        counter.textContent = skinAmount === 0
            ? '没有皮肤被上传！'
            : `${skinAmount} 张皮肤展开图已被上传！`;
    }
    // 空状态占位：有皮肤时隐藏（删除到 0 张时恢复显示）
    const empty = $('skinEmpty');
    if (empty) empty.style.display = skinAmount === 0 ? '' : 'none';
};

/**
 * 新增一条皮肤记录并渲染列表项
 * @param {string} data 皮肤预览图 dataURL（原始皮肤展开图）
 * @param {string} texture 图腾贴图 base64（不含前缀）
 * @param {string} name 皮肤名
 * @param {boolean} isSmallHand 细手臂
 * @param {boolean} isSize64 64×64 皮肤
 * @param {string} skinID 皮肤 ID
 */
const addSkin = (data, texture, name, isSmallHand, isSize64, skinID = randomSkinID()) => {
    skinData[skinID] = {
        name,
        data,
        texture,
        smallHand: isSmallHand,
        skinSize: isSize64,
        lightPixel: {}
    };
    updateSkinCounter();

    const container = $('skin-items-container');
    const item = document.createElement('div');
    item.className = 'skin-items';
    item.setAttribute('skinID', skinID);
    item.innerHTML = `
        <img id="skinPreview" draggable="false" src="${data}" alt="${name}">
        <input id="skinName" type="text" class="skinName" value="${name}" placeholder="Your skin name">
        <div class="skin-option-section">
            <mdui-card class="handTypeCard" clickable variant="filled" id="big_hand">粗手臂</mdui-card>
            <mdui-card class="handTypeCard" clickable variant="filled" id="small_hand">细手臂</mdui-card>
            <button type="button" class="removeTotem squareButton" id="remove" title="删除皮肤">
                <mdui-icon name="delete--rounded"></mdui-icon>
            </button>
        </div>
    `;

    const entry = skinData[skinID];
    const nameInput = item.querySelector('#skinName');
    const bigHand = item.querySelector('#big_hand');
    const smallHandBtn = item.querySelector('#small_hand');

    // 手臂类型：单选切换，同时重算图腾贴图（皮肤包导入的条目没有原始像素，无法重建）
    // 注意：预览图 #skinPreview 始终显示原始皮肤展开图，不随手臂类型变化（与原版一致）
    const applyHandType = async (smallHand) => {
        entry.smallHand = smallHand;
        bigHand.classList.toggle('handTypeCardActive', !smallHand);
        smallHandBtn.classList.toggle('handTypeCardActive', smallHand);
        if (entry.rawImageData) {
            entry.texture = await buildTotemTexture(entry.rawImageData, entry.skinSize, smallHand);
        }
    };
    bigHand.addEventListener('click', () => applyHandType(false));
    smallHandBtn.addEventListener('click', () => applyHandType(true));
    applyHandType(isSmallHand);

    // 命名写回
    nameInput.addEventListener('input', () => entry.name = nameInput.value);

    // 删除（带退场动画）
    item.querySelector('#remove').addEventListener('click', () => {
        delete skinData[skinID];
        updateSkinCounter();
        item.style.transition = 'opacity .15s ease, height .25s ease, padding .25s ease, margin .25s ease';
        item.style.overflow = 'hidden';
        item.style.opacity = '0';
        item.style.height = '0px';
        item.style.padding = '0px';
        item.style.margin = '0px';
        setTimeout(() => item.remove(), 300);
    });

    // 打开编辑器（skin-editor.js 的 openSkinEditor；入口按钮已按需求移除）

    container.appendChild(item);
};
