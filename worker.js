var TS;
var documentRegistry = null;
var solutionCompletionFolder;
var defaultCompletionFolder;
var commonCompletionFolder;
var scripts;
var rootPath;
var step = 0;
var logs = [];
var store;

onconnect = function(event){

	var port = event.ports[ 0 ];
    
	port.onmessage = function(message){

        ///*DEBUG INFO*/this._logs.push("onmessage");

		var data  	 = message.data;
		var action 	 = data.type;
		var options  = data.data;
		var response = null;

        try
        {
            if(documentRegistry === null && action !== 'init')
            {
                port.postMessage({
                    "type" : "unknown"
                });
                
                return;
            }

            switch(action)
            {
                case 'init':
                        initAutoComplete(options);
                    break;
                case 'autocomplete':
                        response = getAutoCompletion(options);
                    break;
                case 'errors':
                        response = getErrors(options);
                    break;
                case 'updateFile':
                        updateFile(options);
                        break;
                case 'close':
                    close();
                    break;
                default:
                    port.postMessage({
                        "type" : "unknown",
                        "data" : data
                    });
                    return;
            }

            port.postMessage({
                "step" : step,
                "type" : action + "_response",
                "data" : response,
                "info" : logs.slice(0)
            });
        }
        catch(e)
        {
            port.postMessage({
                "type" : "error",
                "data" : {
                    "step" : step,
                    "message" : e.message,
                    "fileName" : e.fileName,
                    "lineNumber" : e.lineNumber
                },
                "info" : logs.slice(0)
            });

            return;
        }
	}
};

function initAutoComplete(options)
{
	///*DEBUG INFO*/this._logs.push("initAutoComplete");

    include(normalizePath(options.rootPath + "/typescript/typescriptServices.js"));
    
    TS               = ts;
    scripts          = {};
    store            = {};
    documentRegistry = TS.createDocumentRegistry();
    rootPath         = options.rootPath;

    solutionCompletionFolder = Folder(options.solutionPath + "completion/");
    defaultCompletionFolder  = Folder(options.rootPath + "completion/");
    commonCompletionFolder   = Folder(options.rootPath + "completion/common/");
};

function updateFile(options)
{
    ///*DEBUG INFO*/this._logs.push("updateFile");

    var isModelContext  = options.context==4;
    var script          = getScript(options, isModelContext);
    
    loadFile(options, script.host);
}

function getErrors(options)
{
    ///*DEBUG INFO*/this._logs.push("getErrors");

    var path            = options.path;
    var isModelContext  = options.context==4;
    var script          = getScript(options, isModelContext);
    var languageService = script.languageService;
    var result          = {"errors": []};

    loadFile(options, script.host);

    var sourceFile          = languageService.getSourceFile(path);
    var diagnostics         = languageService.getSyntacticDiagnostics(path);
    var semanticDiagnostics = languageService.getSemanticDiagnostics(path);

    if( diagnostics.length )
    {
        diagnostics.forEach(function(error){
            
            var position = TS.getLineAndCharacterOfPosition(sourceFile, error.start);

            result.errors.push({"line":position.line, "character":position.character, "length": error.length, "error":error.messageText, "type":"syntactic"});
        });
    }

    if( semanticDiagnostics.length )
    {
        semanticDiagnostics.forEach(function(error){
            
            var position = TS.getLineAndCharacterOfPosition(sourceFile, error.start);

            result.errors.push({"line":position.line, "character":position.character, "length": error.length, "error":error.messageText, "type":"semantic"});
        });
    }

    return result;
}

function getAutoCompletion(options)
{
    ///*DEBUG INFO*/this._logs.push("getAutoCompletion");

    var isModelContext  = options.context==4;
    var script          = getScript(options, isModelContext);
    var languageService = script.languageService;
	var path 		    = options.path;
	var line 		    = options.line;
	var character 	    = options.character;
	var completion 	    = {"offset":0, "completion": []};

    loadFile(options, script.host);
    
    var sourceFile  = languageService.getSourceFile(path);
    var position    = TS.getPositionOfLineAndCharacter(sourceFile, line, character);
    var results     = languageService.getCompletionsAtPosition(path, position);
    var fuzzaldrin  = requireModule("fuzzaldrin");
    var kinds       = {
        "keyword" : "14",
        "function" : "55"
    };

    if( results && results.entries )
    {
        var entriesByPriority = priorityToRealElements(results.entries);
        var previousToken     = TS.findPrecedingToken(position, sourceFile);

        if(previousToken && previousToken.text)
        {
            completion.offset        = previousToken.text.length * -1;
            completion.previousToken = {
                text : previousToken.text,
                kind : previousToken.kind
            };
            
            completion.completion    = completion.completion.concat(
                fuzzaldrin.filter(entriesByPriority.top, previousToken.text, {"key" : "text"}),
                fuzzaldrin.filter(entriesByPriority.bottom, previousToken.text, {"key" : "text"})
            );
        }
        else
        {
            completion.completion = completion.completion.concat(
                entriesByPriority.top,
                entriesByPriority.bottom
            );
        }
    }

    completion.completion = completion.completion.filter(function(element) {
        return element.text.indexOf('__DS') !== 0;
    });

    return completion;
}

function priorityToRealElements(entries)
{
    var top = [];
    var bottom = [];
    var exclude = [];

    entries.forEach(function(entry){

        var element = {
            "displayText":entry.name,
            "text":entry.name,
            "_kind": entry.kind
        };

        if(element._kind === "interface" || element._kind === "type" || element._kind === "keyword")
        {
            bottom.push(element);
        }
        else if(element._kind === "warning")
        {
            exclude.push(element);
        }
        else
        {
            top.push(element);
        }
    });

    return {
        top : top,
        bottom : bottom
    };
}



function createScript(options, contextInsteadOfFile)
{
    ///*DEBUG INFO*/this._logs.push("createContext");

    var isDSRelated         = options.context == "4" || options.context == "2";
    var id                  = (contextInsteadOfFile) ? options.context : options.path;
    var LanguageServiceHost = requireModule("languageServiceHost");
    var host                = new LanguageServiceHost({
        ts : TS,
        CompilerOptions : null,
        logs : logs,
        store : store
    });
    var languageService    = TS.createLanguageService(host, documentRegistry);
    var script             = {
        host : host,
        languageService : languageService,
        context : options.context
    };
    
    var contextSolutionCompletionFolder = Folder(solutionCompletionFolder, options.context);
    var contextDefaultCompletionFolder  = Folder(defaultCompletionFolder, options.context);

    loadFolder(commonCompletionFolder, host);
    loadFolder(contextDefaultCompletionFolder, host);
    loadFolder(contextSolutionCompletionFolder, host);

    isDSRelated && loadDataStore(options, host);

    scripts[id] = script;

    return script;
}

function loadDataStore(options, host)
{
    var path    = normalizePath(options.project + "/__!!MODEL!!__.d.ts");
    var content = store[path] ? store[path].content : "declare var ds : Datastore;";

    loadFile({
        context : 2,
        path : path,
        project : options.project,
        content : content
    }, host);
}

function getScript(options, contextInsteadOfFile)
{
    ///*DEBUG INFO*/this._logs.push("getScript");

    var id = (contextInsteadOfFile) ? options.context : options.path;

    if(scripts[id])
    {
        return scripts[id];
    }
    else
    {
        var script = createScript(options, contextInsteadOfFile);

        return script;
    }
}

function loadFile(options, host)
{
    ///*DEBUG INFO*/this._logs.push("loadFile");

	options.path = normalizePath(options.path);
	host._addFile(options);
}

function loadFolder(folder, host)
{
    ///*DEBUG INFO*/this._logs.push("loadFolder");

	if(folder.exists)
    {
        folder.forEachFile(function(file)
        {
            loadFile({
                path : file.path,
                content : file.toString()
            },
            host);
        });
    }
}

function normalizePath(path)
{
    return path.replace(new RegExp("(//|/\\./)","g"), "/");
}

function requireModule(relPath)
{
  var path = normalizePath(rootPath+"/modules/"+relPath);
  
  return require(path);
}
