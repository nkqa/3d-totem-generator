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
        if (data.smallHand) {
            subpacks[key]['attachables'] = {
                'totem.json': JSON.stringify({
                    'minecraft:attachable': {
                        description: {
                            identifier: 'asa:totem',
                            geometry: {
                                totem_left: 'geometry.asa_small_totem_left',
                                totem_right: 'geometry.asa_small_totem_right'
                            }
                        }
                    }
                })
            };
        }
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
