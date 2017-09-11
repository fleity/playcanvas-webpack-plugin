
const _ = require('lodash')
const request = require('request-promise')

function PlayCanvasWebpackPlugin(options) {
    this.options = _.extend({
        files: {}
    }, options)
}

PlayCanvasWebpackPlugin.prototype.apply = function(compiler) {
    let options = this.options
    compiler.plugin('emit', (compilation, callback)=>{
        if(options.skipUpload) {
            callback()
            return
        }
        try {
            Object.keys(compilation.assets)
                .forEach(key => {
                    let asset = compilation.assets[key]
                    if (!asset || !asset.children) return
                    let filename = options.files[key]
                    if (filename) {
                        if (!options.project) {
                            throw new Error("No project, aborting " + filename.path)
                        }
                        if (!filename.assetId) {
                            throw new Error("No assetId aborting " + filename.path)
                        }
                        if (!options.bearer) {
                            throw new Error("No bearer token, aborting")
                        }

                        console.log("\nUpload", filename.path)
                        let content = asset.children.map(c => c._value ? c._value : c).join('\n')
                        if (options.legacy) {
                            request({
                                uri: `https://playcanvas.com/api/projects/${options.project}/repositories/directory/sourcefiles/${filename.path}`,
                                method: 'PUT',
                                json: true,
                                headers: {
                                    "Authorization": `Bearer ${options.bearer}`
                                },
                                body: {
                                    content,
                                    filename
                                }
                            }).then(() => callback(), () => callback())
                        } else {
                            let req = request({
                                uri: `https://playcanvas.com/api/assets`,
                                method: 'POST',
                                headers: {
                                    "Authorization": `Bearer ${options.bearer}`
                                }
                            })
                            let form = req.form()
                            form.append("project", "" + options.project)
                            form.append("name", "" + filename.path)
                            form.append("asset", "" + filename.assetId)
                            form.append("data", JSON.stringify({order: filename.priority || 100, scripts: {}}))
                            form.append("preload", "true")
                            form.append("file", content, {
                                filename: filename.path,
                                contentType: "text/javascript"
                            })
                            req.then(() => callback(), (e) => {
                                console.error(e)
                                callback()
                            })
                        }

                    }
                })
        } catch(e) {
            compilation.errors.push(e)
            callback()
        }
    })

}

module.exports = PlayCanvasWebpackPlugin
