/**
 * 共享状态与通用工具
 * 从 app.js 拆出：全局状态、皮肤数据、DOM 快捷查询、toast 提示。
 * 本文件与其它分片同为经典脚本（顶层声明在全局作用域互相可见）。
 */
'use strict';

/** 包级配置：isJava=true 表示在线取皮走 Java 版通道 */
const skinOptions = {
    isJava: true,
    packname: 'Pack name...'
};

/**
 * 皮肤数据表：skinID → 皮肤条目
 * @typedef {Object} SkinEntry
 * @property {string} name 皮肤名
 * @property {string} data 皮肤预览图 dataURL（原始皮肤展开图）
 * @property {string} texture 图腾贴图 base64（不含 data: 前缀）
 * @property {boolean} smallHand true=细手臂（slim）
 * @property {boolean} skinSize true=64×64 皮肤（false=128×128）
 * @property {Object} lightPixel 已点亮像素表：index → 1
 * @property {?Uint8Array|?Array} rawImageData 原始像素（皮肤包导入时为 null，无法重建贴图）
 */
/** @type {Record<string, SkinEntry>} */
const skinData = {};

/** DOM 快捷查询 */
const $ = (id) => document.getElementById(id);

/** mdui-snackbar 提示，SDK 缺失时回退 alert */
const toast = (message) => {
    if (typeof mdui !== 'undefined' && typeof mdui.snackbar === 'function') {
        mdui.snackbar({ message, timeout: 3000 });
    } else {
        alert(message);
    }
};

/** 15 位随机皮肤 ID（原版 skinID 生成规则） */
const randomSkinID = () =>
    Array.from({ length: 15 }, () => Math.floor(Math.random() * 15).toString(15)).join('');
