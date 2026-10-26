/**
 * 皮肤展开图 → 图腾贴图的裁切映射
 * 从 app.js 拆出：沿用原版 src/script/main.js 的裁切算法（保证导出结果一致）。
 */
'use strict';

/** 生成 size 大小的坐标网格，起点 startPos */
const getPositionArray = (size = [1, 1], startPos = [0, 0]) =>
    Array.from({ length: size[1] }, (v, _) => Array.from({ length: size[0] }, (v, i) => [startPos[0] + i, startPos[1] + _]))
        .reduce((p, c) => [...p, ...c], []);

/** 把多组 [尺寸, 起点] 展平为一维坐标数组 */
const getArrayOfPositon = (pos = [[], []]) =>
    Array.from(pos, (v, k) => getPositionArray(v[0], v[1])).reduce((p, c) => [...p, ...c], []);

/** 按像素复制（alpha 为 0 的像素跳过） */
const pasteImagePixel = (editImageArray, copyImageArray, editImgWidth, imgWidth, position = [[0, 0]], drawPosition = [[0, 0]]) => {
    position.forEach((pos, index) => {
        const [r, g, b, a] = ImageHandle.getPixel(copyImageArray, pos[1] * imgWidth + pos[0]);
        if (a !== 0) {
            let px = drawPosition[index][1] * editImgWidth + drawPosition[index][0];
            editImageArray[px * 4] = r;
            editImageArray[px * 4 + 1] = g;
            editImageArray[px * 4 + 2] = b;
            editImageArray[px * 4 + 3] = a;
        }
    });
    return editImageArray;
};

/**
 * 依据皮肤像素重建 16×16（64 皮肤）或 32×32（128 皮肤）图腾贴图
 * 注意 1：ImageHandle.dataToImage 是回调式 API，返回值恒为 undefined，
 *         必须用 Promise 包装，否则会把 "undefined" 当 base64 用。
 * 注意 2：pasteImagePixel 的第 4 参 imgWidth 是源图像素数据的行 stride，
 *         128×128 皮肤必须传 128；且源坐标表以 64 皮肤为基准，
 *         128 皮肤需整体乘 2，否则会读到错误的像素块。
 * @param {Uint8Array|Array} imageData 皮肤展开图像素数据
 * @param {boolean} isSize64 是否为 64×64 皮肤
 * @param {boolean} smallHand true=细手臂（slim）
 * @returns {Promise<string>} 图腾贴图 base64（不含 data: 前缀）
 */
const buildTotemTexture = (imageData, isSize64, smallHand) => {
    const editWidth = isSize64 ? 16 : 32;
    // 128×128 皮肤与 64×64 皮肤的坐标是 2 倍关系
    const scale = isSize64 ? 1 : 2;
    const srcWidth = 64 * scale;
    const editArray = pasteImagePixel(
        Array.from({ length: editWidth ** 2 * 4 }, () => 0),
        imageData,
        editWidth,
        srcWidth,
        getArrayOfPositon([
                [[6, 1], [9, 8]],
                [[8, 7], [8, 9]],
                [[3, 4], [20, 50]],
                [[3, 4], [5, 18]],
                [[2, 1], [20, 63]],
                [[2, 1], [6, 31]],
                [[3, 2], [40, 20]],
                [[3, 2], [39, 52]],
                [[2, 1], [40, 31]],
                [[2, 1], [40, 62]],

                [[8, 7], [40, 10]],
                [[6, 2], [41, 9]],
                [[8, 2], [20, 21]],
                [[8, 2], [20, 39]],
                [[8, 2], [20, 29]]
            ]).map(([x, y]) => [x * scale, y * scale]),
            [
                ...getArrayOfPositon([
                    [[6, 1], [5, 1]],
                    [[8, 7], [4, 2]],
                    [[3, 4], [8, 11]],
                    [[3, 4], [5, 11]],
                    [[2, 1], [8, 15]],
                    [[2, 1], [6, 15]]
                ]),
                [3, 8], [3, 9], [3, 10], [2, 8], [2, 9], [2, 10],
                [12, 10], [12, 9], [12, 8], [13, 10], [13, 9], [13, 8],
                [1, 8], [1, 9], [14, 9], [14, 8],

                ...getArrayOfPositon([
                [[8, 7], [4, 3]],
                [[6, 2], [5, 1]],
                [[8, 2], [4, 9]],
                [[8, 2], [4, 9]],
                [[8, 2], [4, 11]]
            ])
        ].map(([x, y]) => (smallHand ? [x + (x >= 9 ? 1 : 0), y] : [x, y]))
    );
    return new Promise((resolve) => {
        ImageHandle.dataToImage(editArray, { width: editWidth, height: editWidth }, (base64) => resolve(base64));
    });
};
