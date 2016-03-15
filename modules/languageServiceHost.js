var languageServiceHost = function(args){

    var ts               = this.ts = args.ts;
    this.CompilerOptions = args.CompilerOptions || ts.getDefaultCompilerOptions();
    this.files           = [];
    this.store           = args.store;
    this._logs           = args.logs || [];
    
    this.CompilerOptions.newLine = "\r";
    this.CompilerOptions.allowNonTsExtensions = true;
    this.CompilerOptions.module = 1;
    this.CompilerOptions.moduleResolution = 1;
    this.CompilerOptions.target = 2;
};



languageServiceHost.prototype.getCompilationSettings = function(){

    /*DEBUG INFO*///this._logs.push("getCompilationSettings");

    return this.CompilerOptions;
};



languageServiceHost.prototype.getScriptFileNames = function(){

    /*DEBUG INFO*///this._logs.push("getScriptFileNames");

    return this.files;
};



languageServiceHost.prototype.getScriptVersion = function(filename){
    /*DEBUG INFO*///this._logs.push("getScriptVersion");
    /*DEBUG INFO*///this._logs.push(filename);

    if(typeof this.store[filename] === "undefined")
    {
        this._addFile({
            path : filename,
            project : this._project
        });
    }
    
    /*DEBUG INFO*///this._logs.push("Version : " + this.store[filename].version);    

    return this.store[filename].version;
};



languageServiceHost.prototype.getScriptSnapshot = function(filename){

    /*DEBUG INFO*///this._logs.push("getScriptSnapshot");
    /*DEBUG INFO*///this._logs.push(filename);

    var file = this.store[filename];

    return {
        getText : function(start, end){

            return file.content.slice(start, end);
        },
        getLength : function(){

            return file.content.length;
        },
        getChangeRange : function getChangeRange(oldSnapshot){

            return undefined;
        }
    }
};

languageServiceHost.prototype.getDefaultLibFileName = function(CompilerOptions){

    /*DEBUG INFO*///this._logs.push("getDefaultLibFileName");

    return "lib.d.ts";
};

languageServiceHost.prototype.getCurrentDirectory = function(){

    /*DEBUG INFO*///this._logs.push("getCurrentDirectory");

    return "directory";
};

languageServiceHost.prototype._addFile = function(options){

    /*DEBUG INFO*///this._logs.push("_addFile");
    /*DEBUG INFO*///this._logs.push(options.path);

    var version;
    var filename = options.path;
    var content  = options.content;
    var project  = options.project;

    if(typeof content === "undefined")
    {   
        /*DEBUG INFO*///this._logs.push("READING NOT FOUND FILE : " + filename);       

        content = loadText(filename);

        /*DEBUG INFO*///this._logs.push(content.length);
    }

    if(this.store[filename])
    { 
        version = this.store[filename].version + 1;
    }
    else
    {
        version = 0;
    }
   
    this.store[filename] = {
        "content" : content,
        "version" : version,
        "project" : project
    }; 

    this._project = project;   

    if(this.files.indexOf(filename) === -1)
    {
        this.files.push(filename);
    }  

    /*DEBUG INFO*///this._logs.push("Version : " + version);    

    return version;
};

languageServiceHost.prototype.resolveModuleNames = function(moduleNames, containingFile){

    /*DEBUG INFO*///this._logs.push("resolveModuleNames");
    /*DEBUG INFO*///this._logs.push("ContainingFile : " + containingFile);
    /*DEBUG INFO*///this._logs.push("Modules : " + JSON.stringify(moduleNames));

    var that    = this;
    var results = [];
    var ext     = containingFile.match(/\.(ts|tsx)/i) ? ".ts" : ".js";

    moduleNames.forEach(function(modulePath){

        var project       = this.store[containingFile].project;
        var possiblePaths = [];
        var resolvedPath  = undefined;      

        if(modulePath.indexOf("./") === 0)
        {
            var parentPath   = (new File(containingFile)).parent.path;
            var possiblePath = normalizePath(parentPath + modulePath + ext);

            possiblePaths.push(possiblePath);
        }
        else
        {
            possiblePaths.push(normalizePath(project + "modules/" + modulePath + ext));
            possiblePaths.push(normalizePath(project + "Modules/" + modulePath + ext));
        }

        possiblePaths.some(function(path){

            that._logs.push("Possible Path : " + path);
            if(new File(path).exists)
            {
                resolvedPath = path;

                return true;
            }

            return false;
        });

        results.push({
            "resolvedFileName" : resolvedPath
        });
    });

    return results;
};

module.exports = languageServiceHost;

function normalizePath(path)
{
    return path.replace(new RegExp("(//|/\\./)","g"), "/");
}