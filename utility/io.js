const batchPlay = require('photoshop').action.batchPlay
const psapi = require('../psapi')
const layer_util = require('../utility/layer')
async function snapShotLayer() {
    //snapshot layer with no mask
    let command = [
        // Select All Layers current layer
        {
            _obj: 'selectAllLayers',
            _target: [
                { _enum: 'ordinal', _ref: 'layer', _value: 'targetEnum' },
            ],
        },
        // Duplicate current layer
        // {"ID":[459,460,461,462,463,464,465,466,467,468,469,470,471,472,473,474,475,476,477,478,479,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494,495,496,497,498,499,500,501,502,503,504,505,506,507,508,509,510,511,512,513],"_obj":"duplicate","_target":[{"_enum":"ordinal","_ref":"layer","_value":"targetEnum"}],"version":5},
        {
            // ID: ids,
            _obj: 'duplicate',
            _target: [
                { _enum: 'ordinal', _ref: 'layer', _value: 'targetEnum' },
            ],
            // version: 5
        },

        // Merge Layers
        { _obj: 'mergeLayersNew' },
        // Make
        {
            _obj: 'make',
            at: { _enum: 'channel', _ref: 'channel', _value: 'mask' },
            new: { _class: 'channel' },
            using: { _enum: 'userMaskEnabled', _value: 'revealSelection' },
        },
        // Set Selection
        {
            _obj: 'set',
            _target: [{ _property: 'selection', _ref: 'channel' }],
            to: { _enum: 'ordinal', _ref: 'channel', _value: 'targetEnum' },
        },
        //make a group
        {
            _obj: 'make',
            _target: [
                {
                    _ref: 'layerSection',
                },
            ],
            from: {
                _ref: 'layer',
                _enum: 'ordinal',
                _value: 'targetEnum',
            },
            layerSectionStart: 512,
            layerSectionEnd: 513,
            name: 'Group 2',
            _options: {
                dialogOptions: 'dontDisplay',
            },
        },
        {
            _obj: 'mergeLayersNew',
            _options: {
                dialogOptions: 'dontDisplay',
            },
        },
    ]

    const result = await batchPlay(command, {
        synchronousExecution: true,
        modalBehavior: 'execute',
    })

    return result
}

async function snapShotLayerExe() {
    await executeAsModal(async () => {
        //create a fill layer above the background layer, so that it's present in the snapshot
        try {
            const selectionInfo = await psapi.getSelectionInfoExe()

            // const backgroundLayer = await app.activeDocument.backgroundLayer

            await psapi.createSolidLayer(255, 255, 255)
            const solid_layer = await app.activeDocument.activeLayers[0]
            // await psapi.unSelectMarqueeExe()//unselect the

            // await solid_layer.moveAbove(backgroundLayer)
            // await snapShotLayer() //create a layer with only the opaque pixels
            // await psapi.reSelectMarqueeExe(selectionInfo)
            // await solid_layer.delete()
        } catch (e) {
            console.warn(e)
        }
    })
    await executeAsModal(async () => {
        //create a fill layer above the background layer, so that it's present in the snapshot
        try {
            const solid_layer = await app.activeDocument.activeLayers[0]
            const backgroundLayer = await app.activeDocument.backgroundLayer
            await solid_layer.moveAbove(backgroundLayer)
            await psapi.unselectActiveLayersExe()
            await snapShotLayer() //create a layer with only the opaque pixels
            // await psapi.reSelectMarqueeExe(selectionInfo)
            // await psapi.unSelectMarqueeExe()//unselect the
            await solid_layer.delete()
        } catch (e) {
            console.warn(e)
        }
    })
}

class IO {
    // constructor() {}
    static async exportWebp(layer, export_width, export_height) {
        await executeAsModal(async () => {
            //we assume we have a valid layer rectangular image/layer, no transparency
            const doc_entry = await getCurrentDocFolder() //get the main document folder before we switch doc
            const layer_info = await layer_util.Layer.getLayerInfo(layer)
            //*) create a new document
            const new_doc = await IOHelper.createDocumentExe(
                export_width,
                export_height
            )
            const new_layer = await layer_util.Layer.duplicateToDoc(
                layer,
                new_doc
            )
            //*) resize the layer to the same dimension as the document

            await layer_util.Layer.scaleTo(
                new_layer,
                new_doc.width,
                new_doc.height
            ) //
            await layer_util.Layer.moveTo(new_layer, 0, 0) //move to the top left corner
            //
            await IOHelper.saveAsWebpExe(doc_entry) //save current document as .webp file, save it into doc_entry folder
            await new_doc.closeWithoutSaving()
        })
    }
    static async exportPng() {}
    static async exportDoc() {}
    static async exportLayer() {}

    static async base64PngToPngFile(base64_png) {
        const arrayBuffer = _base64ToArrayBuffer(base64_png)

        const img_name = 'temp_base64Png.png'

        const folder = await storage.localFileSystem.getTemporaryFolder()
        const file = await folder.createFile(img_name, { overwrite: true })

        await file.write(arrayBuffer, { format: storage.formats.binary })
        return file
    }
    static async openImageFileAsDocument(file_entry) {
        const new_doc = await app.open(file_entry)
        return new_doc
    }
    static async base64PngToBase64Webp(base64_png) {
        let base64_webp
        try {
            await executeAsModal(async () => {
                try {
                    const main_doc_entry = await getCurrentDocFolder()
                    //save the base64_png to .png file
                    const png_file = await this.base64PngToPngFile(base64_png)
                    //load the .png file as a layer in new document
                    const new_doc = await this.openImageFileAsDocument(png_file)
                    //save document as .webp
                    const [_, webp_file] = await IOHelper.saveAsWebpExe(
                        main_doc_entry
                    ) //save current document as .webp file, save it into doc_entry folder
                    await new_doc.closeWithoutSaving()
                    //load/read the .webp file as an arraybuffer
                    const ArrayBufferWebp = await webp_file.read({
                        format: formats.binary,
                    })

                    //convert the arraybuffer to base64Webp string

                    base64_webp = _arrayBufferToBase64(ArrayBufferWebp)
                } catch (e) {
                    console.warn(e)
                }
            })
            return base64_webp
        } catch (e) {
            console.warn(e)
        }
    }
    static async base64WebpFromFile(file_entry) {
        //file_entry most be .webp
        let webp_base64
        try {
            await executeAsModal(async () => {
                const arrayBuffer = await file_entry.read({
                    format: formats.binary,
                })
                console.log('webp arrayBuffer:', arrayBuffer)

                const base64_image = _arrayBufferToBase64(arrayBuffer) //convert the buffer to base64
                console.log('base64_image:', base64_image)
                webp_base64 = base64_image
            })
            return [webp_base64, webp_arrayBuffer]
        } catch (e) {
            console.warn(e)
        }
    }
}

class IOHelper {
    static async saveAsWebp(doc_entry) {
        //doc_entry must be in dataFolder or tempFolder
        //save document as webp
        const document_id = app.activeDocument.id

        // doc_entry = await getCurrentDocFolder()
        const file_entry = await doc_entry.createFile('temp.webp', {
            overwrite: true,
        })

        const token = await fs.createSessionToken(file_entry)
        const result = await batchPlay(
            [
                {
                    _obj: 'save',
                    as: {
                        _obj: 'WebPFormat',
                        compression: {
                            _enum: 'WebPCompression',
                            _value: 'compressionLossless',
                        },
                        includeXMPData: false,
                        includeEXIFData: false,
                        includePsExtras: false,
                    },
                    in: {
                        _path: token,
                        _kind: 'local',
                    },
                    documentID: 59,
                    copy: true,
                    lowerCase: true,
                    saveStage: {
                        _enum: 'saveStageType',
                        _value: 'saveBegin',
                    },
                    _options: {
                        dialogOptions: 'dontDisplay',
                    },
                },
            ],
            {
                synchronousExecution: true,
                modalBehavior: 'execute',
            }
        )

        return [result, file_entry]
    }

    static async saveAsWebpExe(doc_entry) {
        let result
        let file_entry
        await executeAsModal(async () => {
            ;[result, file_entry] = await this.saveAsWebp(doc_entry)
        })
        return [result, file_entry]
    }
    static async createDocumentExe(width, height) {
        let new_doc
        try {
            await executeAsModal(async () => {
                new_doc = await app.documents.add({
                    width: width,
                    height: height,
                    resolution: await app.activeDocument.resolution,
                    mode: 'RGBColorMode',
                    fill: 'transparent',
                })
            })
        } catch (e) {
            console.warn(e)
        }
        return new_doc
    }
}

module.exports = {
    IO,
    snapShotLayerExe,
}
