/**
 * ModuleJS is an asynchronous JavaScript and CSS file loader for performance driven websites
 * @author Sachin Singh
 * @version 0.1.0
 */
;
(function (w, d, setTimeout) {
    w.mod = w.mod || {};
    var uids = [],
        modules = {},
        settings = {},
        errorCodes = {
            "001": "Error loading script file: ",
            "002": "Error loading one or more modules",
            "003": "Error in path: ",
            "warnings": {
                "w001": "ModuleJS supports up to one anonymous module per set. Make sure to specify a module name to include multiple modules."
            }
        }
        regex = {
            jsSuffix: /\.js$/,
            cssSuffix: /\.css$/,
            currDirPrefix: /^\.\/[^\/\\:\*\?"\'<>\|]+/,
            rootDirPrefix: /^\/{1}[^\/\\:\*\?"\'<>\|]+/,
            namePrefix: /^[^\/\\:\*\?"\'<>\|]+/,
            schemePrefix: /^([a-zA-Z]+:\/{2}|\/{2})[^\/\\:\*\?"\'<>\|]+/,
            scheme: /^([a-zA-Z]+:\/{2}|\/{2})/
        };

    function Emitter() {
        var events = {};
        this.emit = function (eventName, eventData) {
            if (typeof eventName !== "string") {
                return;
            }
            if (events[eventName]) {
                events[eventName].data = eventData;
                each(events[eventName].handlers, function (index, fn) {
                    fn.call({
                        eventName: events[eventName].eventName,
                        data: events[eventName].data
                    });
                });
                delete events[eventName].data;
                events[eventName].handlers.length = 0;
            }
        };
        this.on = function (eventName, eventHandler) {
            if (typeof eventName !== "string" && typeof eventHandler !== "function") {
                return;
            }
            if (!events[eventName]) {
                events[eventName] = {
                    eventName: eventName,
                    handlers: []
                }
            }
            events[eventName].handlers.push(eventHandler);
            return this;
        };
        this.clearAllEvents = function () {
            events = {};
        };
    }
    
    function each(ob, callback) {
        var key = 0, result;
        if (typeof ob === "object") {
            for (key in ob) {
                result = callback && callback(index, ob[index]);
                if (typeof result === "boolean") {
                    if (!result) {
                        break;
                    } else {
                        continue;
                    }
                }
            }
        }
    }

    function filter(arr, fn) {
        var filteredArr = [];
        if (Array.isArray(arr) && typeof fn === "function") {
            each(arr, function (index, item) {
                if (fn(item)) {
                    filteredArr.push(item);
                }
            });
        }
        return filteredArr;
    }

    function clone(ob) {
        return ob && JSON.parse(JSON.stringify(ob));
    }

    function overrideSettings(conf) {
        if (typeof conf === "object") {
            each(conf, function (key, value) {
                settings[key] = value;
            });
        }
    }

    function validatePath(path) {
        var urlParts = path.split(regex.scheme),
            domainPart = urlParts.length === 1 ? urlParts[0] : urlParts[2],
            domainParts = domainPart.split("/"),
            error = false;
        each(domainParts, function (index, part) {
            if (!part || (/[\/\\:\*\?"\'<>\|]+/).test(part)) {
                error = true;
                return false;
            }
        });
        if (error) {
            return "";
        }
        return path;
    }

    function clean(url) {
        var path = url,
            urlParts = path.split(regex.scheme);
        if (urlParts.length === 1) {
            path = validatePath(path.replace(/\/{2,}/g, "/"));
        } else if (urlParts.length === 3) {
            urlParts[2] = urlParts[2].replace(/\/{2,}/g, "/");
            path = validatePath(urlParts.join(""));
        } else {
            path = "";
        }
        if (path.length === 0) {
            console.error(errorCodes["003"] + url);
        }
        return path;
    }

    function refinePath(path) {
        if (!regex.jsSuffix.test(path)) {
            path += ".js";
        }
        if (regex.schemePrefix.test(path) || regex.rootDirPrefix.test(path)) {
            return clean(path);
        }
        if (regex.namePrefix.test(path)) {
            return clean("./modules/" + path);
        }
        if (regex.currDirPrefix.test(path)) {
            return clean(path);
        }
        console.error("Error in path: " + path);
        return "";
    }

    function resolveAllPaths(pathList) {
        var clonePathList;
        if (typeof settings.paths === "object") {
            clonePathList = clone(pathList);
            pathList.length = 0;
            each(clonePathList, function (index, path) {
                var namedPathObject = settings.paths[path],
                    namedPath = "",
                    versioning = false;
                if (typeof namedPathObject === "object") {
                    namedPath = namedPathObject.path;
                    if (namedPathObject.version && !settings.cache) {
                        versioning = true;
                    }
                }
                clonePathList[index] = refinePath(namedPath || path);
                if (clonePathList[index] && versioning) {
                    clonePathList[index] += "?v=" + namedPathObject.version;
                }
            });
        }
        each(clonePathList, function (index, path) {
            if (path) {
                pathList.push(path);
            }
        });
    }

    function getPageScripts() {
        var scripts = document.getElementsByTagName("script");
        return {
            filter: function (pathList) {
                each(scripts, function (index, scr) {
                    var index = pathList.indexOf(scr.src);
                    if(~index) {
                        pathList.splice(index, 0);
                    }
                });
            },
            list: Array.prototype.slice.call(scripts, 0)
        };
    }

    function createScriptTags(pathList) {
        var scriptTags = [];
        each(pathList, function (index, path) {
            var scriptTag = document.createElement("script");
            scriptTag.type = "text/javascript";
            scriptTag.src = path;
            scriptTags.push(scriptTag);
        });
        return scriptTags;
    }

    function _get(path, emitter) {
        var pathList = [], scripts,
            addedScr = [],
            uid = (new Date()).getTime();
        if (!path) {
            return;
        }
        if (typeof path === "string") {
            pathList.push(path);
        } else {
            if (Array.isArray(path)) {
                pathList = clone(path);
            }
        }
        uids.push(uid);
        modules[uid] = [];
        resolveAllPaths(pathList);
        getPageScripts().filter(pathList);
        scripts = createScriptTags(pathList);
        availableScr = scripts.length;
        each(scripts, function (index, scr) {
            addedScr.push(new Promise(function (resolve, reject) {
                scr.onload = function () {
                    if (uid === uids[uids.length - 1]) {
                        resolve();
                    } else {
                        emitter.on("apiready", function () {
                            resolve();
                        })
                        .on("apierror", function () {
                            reject(errorCodes["002"]);
                        });
                    }
                };
                scr.onerror = function () {
                    reject(errorCodes["001"] + scr.src);
                };
                document.body.appendChild(scr);
            }));
        });
        
        return new Promise(function (resolve, reject) {
            Promise.all(addedScr).then(function () {
                emitter.emit("apiready");
                emitter.clearAllEvents();
                uids.pop();
            })
            .catch(function (reason) {
                emitter.emit("apierror");
                reject(reason);
            });
        });
    }

    function _create(name, dependencies, callback, exec) {
        if (Array.isArray(name)) {
            exec = callback;
            callback = dependencies;
            dependencies = name;
            name = _getUid();
            console.warn(errorCodes.warnings["w001"]);
        }
        if (typeof exec !== "boolean") {
            exec = true;
        }
        _get(dependencies).then(function (modules) {
            modules[_getUid()].push(_obj(name, _exec(callback, modules, exec)));
        })
        .catch(function (err) {
            console.error(err);
        });
    }

    function _getUid() {
        return uids[uids.length - 1];
    }

    function _obj(prop, value) {
        var ob = {};
        ob[prop] = value;
        return ob;
    }

    function _exec(fn, modules, exec) {
        if (typeof fn === "function" && exec) {
            return new fn(modules);
        }
        return fn;
    }

    mod = (function () {
        var emitter = new Emitter();
        var api = {
            config: function (conf) {
                overrideSettings(conf);
                return this;
            },
            get: function (path) {
                return _get(path, emitter);
            },
            create: function (name, dependencies, callback, exec) {
                _create(name, dependencies, callback, exec);
            }
        };
        return api;
    }());
}(window, window.document, window.setTimeout));