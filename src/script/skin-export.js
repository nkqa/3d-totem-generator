/**
 * 导出 .mcpack 材质包
 * 从 app.js 拆出：依赖 skin-state.js、skin-texture.js。
 */
'use strict';

const buildPack = () => {
    const keys = Object.keys(skinData);
    if (keys.length === 0) { toast('请先上传一张皮肤展开图再进行下载'); return; }

    const packname = skinOptions.packname === 'Pack name...'
        ? `${skinData[keys[0]].name}-3D图腾`
        : skinOptions.packname;

    const uuid = "$$$$$$$$-$$$$-$$$$-$$$$-$$$$$$$$$$$$".replaceAll(/\$/g, () => Math.floor(Math.random() * 16).toString(16));

    const subpacks = {};
    keys.forEach((key) => {
        const data = skinData[key];
        subpacks[key] = {
            'totem.png': [data.data.split(',')[1]],
            'texts': { 'en_US.lang': `item.totem.name=${data.name}` },
            'textures': { items: { 'totem.png': [data.texture] } }
        };
    });

    // multiFetch 的第二个参数是路径基准；本页位于仓库根目录，用 '.' 即可。
    return multiFetch({
        bedrockSrc: {
            packs: {
                'manifest.json': async (v) => {
                    const data = await v.json();
                    keys.forEach((key) => {
                        data.subpacks.push({
                            folder_name: key,
                            name: skinData[key].name,
                            memory_tier: 1
                        });
                    });
                    data.header.name = packname;
                    data.header.uuid = uuid;
                    return JSON.stringify(data);
                },
                animations: {
                    'totem_firstperson.json': async (v) => JSON.stringify(await v.json()),
                    'totem.json': async (v) => JSON.stringify(await v.json())
                },
                attachables: {
                    'totem.json': async (v) => JSON.stringify(await v.json())
                },
                render_controllers: {
                    'totem.render_controllers.json': async (v) => JSON.stringify(await v.json())
                }
            },
            model: {
                'totem_left_slim.geo.json': async (v) => JSON.stringify(await v.json()),
                'totem_left_small.geo.json': async (v) => JSON.stringify(await v.json()),
                'totem_right_slim.geo.json': async (v) => JSON.stringify(await v.json()),
                'totem_right_small.geo.json': async (v) => JSON.stringify(await v.json())
            }
        }
    }, '.').then((v) => {
        // 按手臂类型覆盖 attachable 的 geometry：
        // 细手臂(slim)用默认的 asa_slim_*（bedrockSrc/packs/attachables/totem.json 即指向 slim），
        // 粗手臂(small)才需要覆盖为 asa_small_*。
        keys.forEach((key) => {
            const data = skinData[key];
            if (!data.smallHand) {
                const totem = JSON.parse(v.bedrockSrc.packs.attachables['totem.json']);
                totem['minecraft:attachable'].description.geometry = {
                    totem_left: 'geometry.asa_small_totem_left',
                    totem_right: 'geometry.asa_small_totem_right'
                };
                subpacks[key]['attachables'] = {
                    'totem.json': JSON.stringify(totem)
                };
            }
        });
        return new ObjectToZip({
            ...v.bedrockSrc.packs,
            models: { entity: { ...v.bedrockSrc.model } },
            'pack_icon.png': [skinData[keys[0]].texture],
            subpacks
        }).generateAsync();
    }).then((blob) => {
        // application/octet-stream 让浏览器保留 .mcpack 扩展名
        HTML.downloadFile(new Blob([blob], { type: 'application/octet-stream' }), `${packname}.mcpack`);
    });
};

['download', 'downloadBottom'].forEach((id) => {
    const button = $(id);
    if (button) button.addEventListener('click', buildPack);
});
