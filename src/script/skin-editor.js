/**
 * 像素编辑器：mdui-dialog 原生 open 属性 + 原生鼠标事件
 * 从 app.js 拆出：不依赖 HTMNode 的 Dialog 封装。
 */
'use strict';

const editorDialog = $('skinEditorDialog');
let editorEntry = null;

/** 打开编辑器并重绘已点亮的像素 */
const openSkinEditor = (entry) => {
    if (!editorDialog) return;
    editorEntry = entry;
    $('title').textContent = `Light Totem Editor - ${entry.name}`;
    $('editorImage').src = entry.data;

    const pxSelect = $('imagePixelSelected');
    const hoverPixel = $('pixelHover');
    const renderer = $('rendererElement');

    // 清理上一轮残留
    pxSelect.querySelectorAll('[name="lightPixel"]').forEach(node => node.remove());
    renderer.style.height = '100%';
    renderer.style.transform = 'translateX(-50%)translateY(-50%)';

    const cell = (1 / (entry.skinSize ? 64 : 128)) * 100;
    hoverPixel.style.width = `calc(${cell}% - 2px)`;
    hoverPixel.style.height = `calc(${cell}% - 2px)`;

    const pixelSize = entry.skinSize ? 64 : 128;

    const drawLight = (x, y, width, height, index) => {
        if (entry.lightPixel[`${index}`]) return;
        entry.lightPixel[`${index}`] = 1;
        const pixel = document.createElement('div');
        pixel.setAttribute('name', 'lightPixel');
        pixel.setAttribute('index', index);
        Object.assign(pixel.style, {
            pointerEvents: 'none',
            backgroundColor: 'rgba(0, 255, 255, 0.5)',
            position: 'absolute',
            width: `${width}%`,
            height: `${height}%`,
            left: `${x}%`,
            top: `${y}%`
        });
        pxSelect.appendChild(pixel);
    };

    // 重绘已点亮的像素
    for (const index of Object.keys(entry.lightPixel).map(Number)) {
        const [x, y] = [index % pixelSize, Math.floor(index / pixelSize)];
        drawLight((x / pixelSize) * 100, (y / pixelSize) * 100, cell, cell, index);
    }

    editorDialog.open = true;
};

/** 关闭编辑器并清理绘制层 */
const closeSkinEditor = () => {
    if (!editorDialog) return;
    editorDialog.open = false;
    $('imagePixelSelected').querySelectorAll('[name="lightPixel"]').forEach(node => node.remove());
    editorEntry = null;
};

if (editorDialog) {
    editorDialog.addEventListener('closed', () => {
        $('imagePixelSelected').querySelectorAll('[name="lightPixel"]').forEach(node => node.remove());
        editorEntry = null;
    });
    $('close').addEventListener('click', closeSkinEditor);
    $('editorFinish').addEventListener('click', closeSkinEditor);

    // ---- 画布交互：左键绘制 / 右键拖拽 / Ctrl+滚轮缩放 ----
    const editorArea = $('editor'),
        pxSelect = $('imagePixelSelected'),
        hoverPixel = $('pixelHover'),
        renderer = $('rendererElement');

    let zoom = 100, isDragging = false, isDraw = false, isFirstTick = false,
        rendererWidth = 0, rendererHeight = 0,
        offsetCurrent = { x: 0, y: 0 };

    const pixelSize = () => editorEntry ? (editorEntry.skinSize ? 64 : 128) : 64;
    const cellPercent = () => (1 / pixelSize()) * 100;

    const drawAt = (clientX, clientY) => {
        if (!editorEntry) return;
        const { width, height } = pxSelect.getBoundingClientRect(),
            [x, y] = [
                Math.floor(((clientX - pxSelect.getBoundingClientRect().left) / width) * pixelSize()),
                Math.floor(((clientY - pxSelect.getBoundingClientRect().top) / height) * pixelSize())
            ];
        if (x < 0 || y < 0 || x >= pixelSize() || y >= pixelSize()) return;
        const light = document.createElement('div');
        light.setAttribute('name', 'lightPixel');
        light.setAttribute('index', x + y * pixelSize());
        Object.assign(light.style, {
            pointerEvents: 'none',
            backgroundColor: 'rgba(0, 255, 255, 0.5)',
            position: 'absolute',
            width: `${cellPercent()}%`,
            height: `${cellPercent()}%`,
            left: `${(x / pixelSize()) * 100}%`,
            top: `${(y / pixelSize()) * 100}%`
        });
        editorEntry.lightPixel[`${x + y * pixelSize()}`] = 1;
        pxSelect.appendChild(light);
    };

    const hoverAt = (clientX, clientY) => {
        const { width, height, left, top } = pxSelect.getBoundingClientRect(),
            [x, y] = [
                Math.floor(((clientX - left) / width) * pixelSize()),
                Math.floor(((clientY - top) / height) * pixelSize())
            ];
        if (x < 0 || y < 0 || x >= pixelSize() || y >= pixelSize()) {
            hoverPixel.style.display = 'none';
            return;
        }
        hoverPixel.style.display = 'block';
        hoverPixel.style.left = `${(x / pixelSize()) * 100}%`;
        hoverPixel.style.top = `${(y / pixelSize()) * 100}%`;
    };

    pxSelect.addEventListener('mousemove', (e) => {
        hoverAt(e.clientX, e.clientY);
        if (isDraw) drawAt(e.clientX, e.clientY);
    });
    pxSelect.addEventListener('mousedown', (e) => {
        if (e.button === 0) { drawAt(e.clientX, e.clientY); isDraw = true; }
    });
    pxSelect.addEventListener('mouseup', (e) => { if (e.button === 0) isDraw = false; });
    pxSelect.addEventListener('mouseleave', () => { isDraw = false; hoverPixel.style.display = 'none'; });

    editorArea.addEventListener('contextmenu', (e) => e.preventDefault());
    editorArea.addEventListener('mousedown', (e) => {
        isFirstTick = true;
        if (e.button === 2) {
            editorArea.style.cursor = 'grabbing';
            renderer.style.pointerEvents = 'none';
            isDragging = true;
        }
    });
    editorArea.addEventListener('mouseup', (e) => {
        if (e.button === 2) {
            editorArea.style.cursor = 'default';
            renderer.style.pointerEvents = 'auto';
            isDragging = false;
        }
    });
    editorArea.addEventListener('mousemove', (e) => {
        const [deltaX, deltaY] = [offsetCurrent.x - e.offsetX, offsetCurrent.y - e.offsetY];
        offsetCurrent = { x: e.offsetX, y: e.offsetY };
        if (isDragging && !isFirstTick) {
            rendererWidth -= deltaX;
            rendererHeight -= deltaY;
            renderer.style.transform = `translateX(calc(-50% + ${rendererWidth}px))translateY(calc(-50% + ${rendererHeight}px))`;
        }
        isFirstTick = false;
    });
    editorArea.addEventListener('mouseleave', () => {
        editorArea.style.cursor = 'default';
        renderer.style.pointerEvents = 'auto';
        isDragging = false;
    });
    editorArea.addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        hoverPixel.style.display = 'none';
        zoom -= (e.deltaY / 10) + ((e.deltaY / 100) * (zoom / 20));
        renderer.style.height = `${zoom}%`;
    }, { passive: false });
}
