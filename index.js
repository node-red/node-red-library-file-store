module.exports = function(RED) {
    const fs = require("fs-extra")
    const fspath = require("path")
    const PLUGIN_TYPE_ID = "node-red-library-file-store";

    class FileStorePlugin {
        constructor(config) {
            this.type = PLUGIN_TYPE_ID;
            this.id = config.id;
            this.label = config.label;
            this.path = config.path;
            if (!this.path) {
                throw RED._("runtime:library.invalidProperty",{prop:"path",value:this.path});
            }
        }
        async init() {
            return fs.ensureDir(this.path);
        }
        async getEntry(type,path) {
            const root = fspath.join(this.path,type);
            const rootPath = fspath.join(this.path,type,path);
            // don't create the folder if it does not exist - we are only reading....
            try {
                const stats = await fs.lstat(rootPath);
                if (stats.isFile()) {
                    return getFileBody(root,path);
                }
                if (path.substr(-1) == '/') {
                    path = path.substr(0,path.length-1);
                }
                const fns = await fs.readdir(rootPath);
                var dirs = [];
                var files = [];
                fns.sort().filter(fn => {
                    var fullPath = fspath.join(path,fn);
                    // we use fs.realpathSync to also resolve Symbolic Link
                    var absoluteFullPath = fs.realpathSync(fspath.join(root,fullPath));
                    if (fn[0] != ".") {
                        var stats = fs.lstatSync(absoluteFullPath);
                        if (stats.isDirectory()) {
                            dirs.push(fn);
                        } else {
                            var meta = getFileMeta(root,fullPath);
                            meta.fn = fn;
                            files.push(meta);
                        }
                    }
                });
                return dirs.concat(files);
            } catch(err) {
                // if path is empty or ends in /, then assume it was a folder, return empty
                if (path === "" || path.substr(-1) === '/') {
                    return [];
                }
                const reportedError = new Error(`ENOENT: no such file or directory, '${path}'`);
                reportedError.code = "ENOENT";
                reportedError.path = path;
                // else path was specified, but did not exist,
                // check for path.json as an alternative if flows
                if (type === "flows" && !/\.json$/.test(path)) {
                    return this.getEntry(type,path+".json").catch(e => {
                        throw reportedError;
                    })
                } else {
                    throw reportedError;
                }
            }
        }


        async saveEntry(type,path,meta,body) {
            if (type === "flows" && !path.endsWith(".json")) {
                path += ".json";
            }
            const fn = fspath.join(this.path, type, path);
            let headers = "";
            for (var i in meta) {
                if (meta.hasOwnProperty(i)) {
                    headers += "// "+i+": "+toSingleLine(meta[i])+"\n";
                }
            }
            if (type === "flows") {
                body = JSON.stringify(JSON.parse(body),null,4);
            }
            await fs.ensureDir(fspath.dirname(fn))
            return fs.writeFile(fn, headers+body);
        }
    }


    RED.plugins.registerPlugin(PLUGIN_TYPE_ID, {
        type: "node-red-library-source",
        class: FileStorePlugin
    })

    function toSingleLine(text) {
        if (typeof text === "string") {
            return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
        }
        return text;
    }

    function fromSingleLine(text) {
        var result = text.replace(/\\[\\n]/g, function(s) {
            return ((s === "\\\\") ? "\\" : "\n");
        });
        return result;
    }


    function getFileMeta(root, path) {
        var fn = fspath.join(root, path);
        var fd = fs.openSync(fn, 'r');
        var size = fs.fstatSync(fd).size;
        var meta = {};
        var read = 0;
        var length = 10;
        var remaining = Buffer.alloc(0);
        var buffer = Buffer.alloc(length);
        while (read < size) {
            read += fs.readSync(fd, buffer, 0, length);
            var data = Buffer.concat([remaining, buffer]);
            var index = data.lastIndexOf(0x0a);
            if (index !== -1) {
                var parts = data.slice(0, index).toString().split('\n');
                for (var i = 0; i < parts.length; i++) {
                    var match = /^\/\/ (\w+): (.*)/.exec(parts[i]);
                    if (match) {
                        meta[match[1]] = fromSingleLine(match[2]);
                    } else {
                        read = size;
                        break;
                    }
                }
                remaining = data.slice(index + 1);
            } else {
                remaining = data;
            }
        }
        fs.closeSync(fd);
        return meta;
    }

    function getFileBody(root, path) {
        var body = '';
        var fn = fspath.join(root, path);
        var data = fs.readFileSync(fn, 'utf8');
        var parts = data.split('\n');
        var scanning = true;
        for (var i = 0; i < parts.length; i++) {
            if (! /^\/\/ \w+: /.test(parts[i]) || !scanning) {
                body += (body.length > 0 ? '\n' : '') + parts[i];
                scanning = false;
            }
        }
        return body;
    }
}



