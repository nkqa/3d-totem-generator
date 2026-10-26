/**
 * 页面杂项：包名输入 / 顶栏跳转按钮 / 暗色主题 / 初始化
 * 从 app.js 拆出。
 */
'use strict';

/** 包名输入写回配置 */
const packNameInput = $('packName');
if (packNameInput) {
    packNameInput.addEventListener('input', () => {
        skinOptions.packname = packNameInput.value === '' ? 'Pack name...' : packNameInput.value;
    });
}

/** 顶栏「获取皮肤」按钮：滚动到对应卡片 */
const getSkinJump = $('getSkinJump');
if (getSkinJump) {
    getSkinJump.addEventListener('click', () => {
        $('get-skin-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
}

/** 暗色主题 + 初始计数刷新 */
updateSkinCounter();
document.documentElement.classList.add('mdui-theme-dark');
document.body.classList.add('mdui-theme-dark');
