var TEST_FILES;
var TEST_FOLDERS;
var DEBUG = false;

var File = function(){
    var relPath = "";
    var path;
    var relFolder;
    var self;
    
    if(arguments[0] instanceof Folder){
        relFolder = arguments[0];
        relPath   = relFolder.path;
        path      = arguments[1];
    } else if(typeof arguments[0] === "string"){
        path = arguments[0];
    }
    
    path = normalizePath(relPath + path);
    
    if(!(this instanceof File)){
        self = new File(path);
    } else {
        self = this;
    }
    
    DEBUG && console.log(path);
    
    self.path   = path;
    /**
     * TODO : should be a property getter and not a function
     */
    self.parent = function(){
        var lastSlashPos = self.path.lastIndexOf("/");
        
        if(lastSlashPos === self.path.length - 1){
            throw {
                code : "NOT_A_FILE_PATH"
            }
        } else {
            return Folder(self.path.substring(0,lastSlashPos));
        }
    };
    
    self.toString = function(){
        return (TEST_FILES[path]) ? loadText(path) : "";
    };
    
    self.exists = (TEST_FILES[path]) ? true : false;
    
    return self;
};

var Folder = function(){
    var relPath = "";
    var path;
    var relFolder;
    var self;
    
    if(arguments[0] instanceof Folder){
        relFolder = arguments[0];
        relPath   = relFolder.path;
        path      = arguments[1] + "";
    } else if(typeof arguments[0] === "string"){        
        path = arguments[0];
    } else {
        throw "Wrong parameters";
    }
    
    path = normalizePath(relPath + path + "/");
    
    DEBUG && console.log(path);
    
    if( !(this instanceof Folder) ){
        self = new Folder(path);
    } else {
        self = this;
    }
    
    if(TEST_FOLDERS[path]){
        self.__internal = TEST_FOLDERS[path];
        self.files      = self.__internal.files.map(function(file){
            var filePath = normalizePath(path + "/" + file.name);
            return File(filePath);
        });
        self.folders    = self.__internal.folders.map(function(folder){
            var folderPath = normalizePath(path + "/" + folder.name);
            return Folder(folderPath);
        });
        self.exists = true;
        self.forEachFile   = function(callback){
            self.files.forEach(callback);
        };
        self.forEachFolder =  function(callback){
            self.folders.forEach(callback);
        };
    }else{
        self.exists        = false;
        self.forEachFile   = function(){};
        self.forEachFolder = function(){};
    }
    
    self.path   = path;   
    
    return self;
}

function loadText(path){
    return TEST_FILES[path].content;
}

function normalizePath(path){
    return path.replace(new RegExp("(//|/\\./)","g"), "/");
}

function createFile(manifest) {
    var name     = manifest.name;
    var path     = manifest.path;
    var parent   = manifest.parent;
    var realPath = manifest.realPath;
    var currentFile;
    
    if (!path) {
        if (!parent) {
            throw "if no path specified a parent is mandatory";
        }

        path = normalizePath(parent.path + "/" + name);
    }

    if (!realPath) {
        if (!parent) {
            throw "if no realPath specified a parent is mandatory";
        }

        realPath = normalizePath(parent.realPath + "/" + name);
    }
    
    return loadFile(realPath)
    .then(function(content){
        currentFile = {
            name : name,
            path : path,
            realPath : realPath,
            content : content
        };
        
        TEST_FILES[path] = currentFile;
    });
}

function createFolder(manifest) {
    var name     = manifest.name;
    var path     = manifest.path;
    var parent   = manifest.parent;
    var realPath = manifest.realPath;
    var files;
    var folders;
    var promises = [];
    var currentFolder;

    if (!path) {
        if (!parent) {
            throw "if no path specified a parent is mandatory";
        }

        path = normalizePath(parent.path + "/" + name + "/");
    }

    if (!realPath) {
        if (!parent) {
            throw "if no realPath specified a parent is mandatory";
        }

        realPath = normalizePath(parent.realPath + "/" + name + "/");
    }

    files   = manifest.files || [];
    folders = manifest.folders || [];

    currentFolder = TEST_FOLDERS[path] = {
        "name": name,
        "path": path,
        "realPath": realPath,
        "files": files,
        "folders": folders
    };

    files.forEach(function (file) {
        file.parent = currentFolder;

        promises.push(
            createFile(file)
        );
    })

    folders.forEach(function (folder) {
        folder.parent = currentFolder;

        promises.push(
            createFolder(folder)
        );
    });

    return Promise.all(promises);
}

function readManifest(realPath) {
    var promise = new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", normalizePath(realPath + "/manifest.json"), true);
        xhr.responseType = "json";
        xhr.onload = function onload(params) {
            resolve(xhr.response);
        };
        xhr.send();
    });

    return promise;
}

function loadFile(realPath) {
    var promise = new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        var path = normalizePath(realPath);

        xhr.open("GET", path, true);
        xhr.onload = function onload(params) {
            var content = xhr.response;

            resolve(content);
        }

        xhr.send();
    });

    return promise;
}

function loadFolder(realPath) {
    var _manifest;
    return readManifest(realPath)
    .then(function(manifest){
        _manifest = manifest;
        return createFolder(manifest);
    })
    .then(function(){
        return _manifest;
    });
}

function getTestFunc(name) {
    var promise = new Promise(function (resolve, reject) {
        loadFile("./tests/" + name + "/run.js")
        .then(function (content) {
            try {
                var func = eval(content);

                resolve(func);
            } catch (e) {
                reject(e);
            }
        });
    });

    return promise;
}

function loadTest(name) {
    return loadFolder("./tests/" + name);
}

function loadCompletionFolder() {
    return loadFolder("./completion");
};

function initTest(name) {
    
    var projectPath;
    
    TEST_FILES = {};
    TEST_FOLDERS = {};    
    
    return loadCompletionFolder()
    .then(function(){
        return loadTest(name);
    })    
    .then(function(manifest){
        /**
         * init language-tools
         */
        projectPath = manifest.path;        
        lTools.init({
            projectPath: projectPath,
            extensionPath: "/Users/hamzahik/wakanda-extension-language-tools/",
            ts: ts,
            folders : {
                defaultCompletionFolder : Folder("/Users/hamzahik/wakanda-extension-language-tools/completion/"),
                commonCompletionFolder : Folder("/Users/hamzahik/wakanda-extension-language-tools/completion/common/"),
                solutionCompletionFolder : Folder("dsjkfhaeiohncvmswlkdoqsdk")
            }
        });
        
        return projectPath;
    });
}