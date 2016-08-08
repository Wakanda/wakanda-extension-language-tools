var tsconfig = {
    modulekind: {
        'None': 0,
        'CommonJS': 1,
        'AMD': 2,
        'UMD': 3,
        'System': 4,
        'ES6': 5,
        'ES2015': 5
    },
    newLineKind: {
        'CarriageReturnLineFeed': 0,
        'LineFeed': 1
    },
    scriptTarget: {
        'ES3': 0,
        'ES5': 1,
        'ES6': 2,
        'ES2015': 2,
        'Latest': 2
    },
    moduleResolutionKind: {
        'Classic': 1,
        'NodeJs': 2
    }
};

var defaultOptions = {
    target: tsconfig.scriptTarget.ES5,
    module: tsconfig.modulekind.CommonJS,
    moduleResolution: tsconfig.moduleResolutionKind.NodeJs,    
    sourceMap: true,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    removeComments: false,
    noImplicitAny: false,
    allowJs:true,
    noImplicitUseStrict: true,
    allowNonTsExtensions : true,
    newLine: "\r"
};

var LanguageServiceHost = function(args){
    var self = this;
    var ts = this.ts = args.ts;
    this.CompilerOptions = ts.getDefaultCompilerOptions();
    this.files = [];
    this.store = args.store;
    this._logs = args.logs || [];

    args.CompilerOptions = args.CompilerOptions || {};

    Object.keys(args.CompilerOptions).concat(Object.keys(defaultOptions)).forEach(function (option) {
        self.CompilerOptions[option] = args.CompilerOptions[option] || defaultOptions[option];
    });
};

LanguageServiceHost.prototype.getCompilationSettings = function(){
    return this.CompilerOptions;
};

LanguageServiceHost.prototype.getScriptFileNames = function(){
    return this.files;
};

LanguageServiceHost.prototype.getScriptVersion = function(filename){
    var file = this._getFile(filename);
    if(! file) {
        return;
    }
    return file.version;
};

LanguageServiceHost.prototype.getScriptSnapshot = function(filename){
    var file = this._getFile(filename);
    if(! file) {
        return null;
    }
    
    var edit = file.edits[file.version];
    
    return {
        getText: function(start, end) {        
            if(edit) {
                return edit.newText;
            }
            return file.content.slice(start, end);
        },
        getLength: function() {
            if(edit) {
                return edit.span.length;
            }
            return file.content.length;
        },
        getChangeRange: function getChangeRange(oldSnapshot) {
            var edit = file.edits[file.version];            
            if(edit) {
                return {
                    span: { 
                        start: edit.span.start, 
                        length: edit.span.length
                    }, 
                    newLength: edit.newLength 
                };
            }
            return undefined;
        }
    };
};

LanguageServiceHost.prototype.getDefaultLibFileName = function(CompilerOptions){
    return "lib.d.ts";
};

LanguageServiceHost.prototype.getCurrentDirectory = function(){
    return "";
};

LanguageServiceHost.prototype._getFile = function(filename) {
    if(! this.store[filename] && File(filename).exists) {
        var content = loadText(filename);
        
        this._addFile({
            path : filename,
            content : content,
            project : this._project
        });
    }
    
    return this.store[filename];
};

LanguageServiceHost.prototype._addFile = function(options){
    
    var version;
    var filename = options.path;
    var content  = options.content;
    var project  = options.project;   

    if(this.store[filename])
    { 
        version = this.store[filename].version + 1;
    }
    else
    {
        version = 0;
    }
   
    this.store[filename] = {
        content: content,
        version: version,
        project: project,
        edits: {}
    }; 

    this._project = project;   

    if(this.files.indexOf(filename) === -1)
    {
        this.files.push(filename);
    }

    return version;
};

LanguageServiceHost.prototype.resolveModuleNames = function(moduleNames, containingFile){
    var results = [];
    var ext     = containingFile.match(/\.(ts|tsx)/i) ? '.ts' : '.js';
    var file = this._getFile(containingFile);
    
    moduleNames.forEach(function(modulePath) {
        var project       = file.project;
        var possiblePaths = [];
        var resolvedPath;      
        
        ['d.ts', 'ts', 'js'].forEach(function(extension){		
		    possiblePaths.push(possiblePath + '.' + extension);
		});
        
        if(modulePath.indexOf("./") === 0)
        {
            var parentPath   = (new File(containingFile)).parent.path;
            var possiblePath = normalizePath(parentPath + modulePath + ext);

            possiblePaths.push(possiblePath);
        }
        else
        {
            possiblePaths.push(normalizePath(project + 'modules/' + modulePath + ext));
            possiblePaths.push(normalizePath(project + 'Modules/' + modulePath + ext));
        }
        
        possiblePaths.some(function(path){
            if(new File(path).exists)
            {
                resolvedPath = path;

                return true;
            }

            return false;
        });
        results.push(! resolvedPath ? undefined : { resolvedFileName: resolvedPath });
    });

    return results;
};


function normalizePath(path){
    return path.replace(new RegExp("(//|/\\./)","g"), "/");
}

if(typeof window === "undefined"){
    module.exports = LanguageServiceHost;
}