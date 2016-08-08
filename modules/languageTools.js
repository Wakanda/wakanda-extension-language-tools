var TS;
var documentRegistry;
var scripts;
var extensionPath;
var store;
var cFolders;

var lTools = {};

lTools.init = function(options){
    TS               = options.ts;
    cFolders         = {};
    scripts          = {};
    store            = {};
    documentRegistry = TS.createDocumentRegistry();
    extensionPath    = options.extensionPath;
    
    for(var element in options.folders){
        cFolders[element] = options.folders[element];
    }
};

lTools.updateFile = function(options){
    var context         = parseInt(options.context, 10); 
    var isModelContext  = context === 4;
    var script          = getScript(options, isModelContext);
    options.path        = TS.normalizeSlashes(options.path);
    lTools.loadFile(options, script.host);
};

lTools.loadFile = function(options, host){
    options.path = normalizePath(options.path);
	host._addFile(options);
};

lTools.loadFolder = function loadFolder(folder, host){
	if(folder && folder.exists){
        folder.forEachFile(function(file){
            lTools.loadFile({
                path : file.path,
                content : file.toString()
            },
            host);
        });
    }
};

lTools.editFile = function(id, start, end, length, newText, content) {
    var file = store[id];

    store[id].content = content; 

    file.version ++;
    file.edits[file.version] = {
        newText: newText,
        span: {
            start: start,
            end: end,
            length: length
        },
        newLength: newText.length
    };
};

lTools.getAutoCompletion = function getAutoCompletion(options){
    var context         = parseInt(options.context, 10);
    var isModelContext  = context === 4;
    var script          = getScript(options, isModelContext);
    var languageService = script.languageService;
	var path 		    = options.path;
	var line 		    = options.line;
	var character 	    = options.character;
	var completion = { 
        offset: 0, 
        completion: []
    };

    var change = parseChange(options.content, options.path, options.line);
    if(! change.sameContent) {
        if (change.load) {
            lTools.loadFile(options, script.host);
        } else {
            lTools.editFile(options.path, change.diff.start, change.diff.end, change.diff.length, change.diff.newText, options.content);
        }
    }
    
    var sourceFile  = languageService.getNonBoundSourceFile(path);
    var position    = TS.getPositionOfLineAndCharacter(sourceFile, line, character);
    var results     = languageService.getCompletionsAtPosition(path, position);
    var fuzzaldrin  = getFuzzaldrin();
    // var kinds       = { keyword : "14", function : "55" };

    if( results && results.entries )
    {
        var entriesByPriority = priorizeCompletionResults(results.entries);
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
        return element.text.indexOf('__DS') !== 0 && element.text.indexOf('__Model') !== 0;
    });

    return completion;
};

lTools.getGoToDefinition = function getGoToDefinition(options) {
    var context         = parseInt(options.context, 10);
    var isModelContext  = context === 4;
    var script          = getScript(options, isModelContext);
    var languageService = script.languageService;
	var path 		    = options.path;
	var line 		    = options.line;
	var character 	    = options.character;
	var project 	    = options.project;

    lTools.loadFile(options, script.host);
    
    var sourceFile  = languageService.getNonBoundSourceFile(path);
    var position    = TS.getPositionOfLineAndCharacter(sourceFile, line, character);
    var results     = languageService.getDefinitionAtPosition(path, position);

    var responses = [];
    (results || []).forEach(function(result) {
        // check if the file is in the project path
        if(result.fileName.indexOf(project) === 0) {
             responses.push({
                path: result.fileName.substr(project.length),
                offset: result.textSpan.start,
                length: 0
            });
        }
    });

    return responses;
};

lTools.getErrors = function getErrors(options){
    var path            = options.path;
    var context         = parseInt(options.context, 10);
    var isModelContext  = context === 4;
    var script          = getScript(options, isModelContext);
    var languageService = script.languageService;
    var result          = {"errors": []};

    var change = parseChange(options.content, options.path, 0);
    if(! change.sameContent) {
        if (change.load) {
            lTools.loadFile(options, script.host);
        } else {
            lTools.editFile(options.path, change.diff.start, change.diff.end, change.diff.length, change.diff.newText, options.content);
        }
    }

    var sourceFile          = languageService.getNonBoundSourceFile(path);
    var diagnostics         = languageService.getSyntacticDiagnostics(path);
    var semanticDiagnostics = languageService.getSemanticDiagnostics(path);

    if( diagnostics.length ) {
        diagnostics.forEach(function(error){
            
            var position = TS.getLineAndCharacterOfPosition(sourceFile, error.start);

            result.errors.push({"line":position.line, "character":position.character, "length": error.length, "error":error.messageText, "type":"syntactic"});
        });
    }

    if( semanticDiagnostics.length ) {
        semanticDiagnostics.forEach(function(error){
            
            var position = TS.getLineAndCharacterOfPosition(sourceFile, error.start);

            result.errors.push({"line":position.line, "character":position.character, "length": error.length, "error":error.messageText, "type":"semantic"});
        });
    }

    return result;
};

function getScript(options, contextInsteadOfFile){
    var id = (contextInsteadOfFile) ? options.context : options.path;

    if(scripts[id]) {
        return scripts[id];
    } else {
        var script = createScript(options, contextInsteadOfFile);

        return script;
    }
}

function normalizePath(path){
    return path.replace(new RegExp("(//|/\\./)","g"), "/");
}

function createScript(options, contextInsteadOfFile){
    var isDSRelated         = options.context == 4 || options.context == 2;
    var id                  = (contextInsteadOfFile) ? options.context : options.path;
    var LanguageServiceHost = getLanguageServiceHostConstructor();
    var host                = new LanguageServiceHost({
        ts : TS,
        CompilerOptions : null,
        store : store
    });

    if(! isDSRelated && host.resolveModuleNames) {
        delete host.resolveModuleNames;
        host.resolveModuleNames = undefined;
    }

    var languageService    = TS.createLanguageService(host, documentRegistry);

    var script             = {
        host : host,
        languageService : languageService,
        context : options.context
    };
    
    var contextSolutionCompletionFolder = Folder(cFolders.solutionCompletionFolder, options.context);
    var contextDefaultCompletionFolder  = Folder(cFolders.defaultCompletionFolder, options.context);

    lTools.loadFolder(cFolders.commonCompletionFolder, host);
    lTools.loadFolder(contextDefaultCompletionFolder, host);
    lTools.loadFolder(contextSolutionCompletionFolder, host);

    isDSRelated && loadDataStore(options, host);

    scripts[id] = script;

    return script;
}

function getLanguageServiceHostConstructor(){
    if(typeof window === "undefined"){
        return requireModule("languageServiceHost");
    } else {
        return LanguageServiceHost;
    }
}
function getFuzzaldrin(){
    if(typeof window === "undefined"){
        return requireModule("fuzzaldrin");
    } else {
        return fuzzaldrin;
    }
}

function requireModule(relPath){
    var path = normalizePath(extensionPath + "/modules/" +  relPath);

    return require(path);
}

function loadDataStore(options, host){
    var path    = normalizePath(options.project + "/__!!MODEL!!__.d.ts");
    var content = store[path] ? store[path].content : "declare var ds : Datastore;";

    lTools.loadFile({
        context : 2,
        path : path,
        project : options.project,
        content : content
    }, host);
}

function priorizeCompletionResults(entries){
    var top = [];
    var bottom = [];
    var exclude = [];

    entries.forEach(function(entry){
        var element = {
            "displayText":entry.name,
            "text":entry.name,
            "_kind": entry.kind
        };

        if(element._kind === "interface" || element._kind === "type" || element._kind === "keyword"){
            bottom.push(element);
        } else if(element._kind === "warning") {
            exclude.push(element);
        } else {
            top.push(element);
        }
    });

    return {
        top : top,
        bottom : bottom
    };
}

function parseChange(newContent, path, line) {
    if (!store[path] || !store[path].content) {
        return {
            load: true
        };
    }
    var oldContent = store[path].content;
    if(newContent === oldContent) {
        return {
            sameContent: true
        };
    }

    var oldLineInfo = getLineInfo(oldContent, line);
    var newLineInfo = getLineInfo(newContent, line);

    if (oldLineInfo.prefix !== newLineInfo.prefix || oldLineInfo.suffix !== newLineInfo.suffix) {
        return {
            load: true
        };
    }

    return {
        load: false,
        diff: {
            start: newLineInfo.start,
            end: oldLineInfo.end,
            newText: newLineInfo.text,
            length: oldLineInfo.text.length
        }
    };
}
function getLineInfo(content, line) { // we consider that line is changed
    var lineStarts = TS.computeLineStarts(content);
    if (!lineStarts.length) {
        return {};
    }

    if (lineStarts.length === 1) {
        return {
            prefix: undefined,
            suffix: undefined,
            start: 0,
            end: content.length,
            text: content.substr(lineStarts[line])
        };
    }

    if (line === 0) { // first row
        return {
            prefix: undefined,
            suffix: content.substr(lineStarts[1]),
            start: 0,
            end: lineStarts[line + 1] - 1,
            text: content.substr(lineStarts[line], lineStarts[line + 1])
        };
    } else if (line + 1 === lineStarts.length) { // last row
        return {
            prefix: content.substr(0, lineStarts[line]),
            suffix: undefined,
            start: lineStarts[line],
            end: content.length - 1,
            text: content.substr(lineStarts[line])
        };
    } else {
        return {
            prefix: content.substr(0, lineStarts[line]),
            suffix: content.substr(lineStarts[line + 1]),
            start: lineStarts[line],
            end: lineStarts[line + 1] - 1,
            text: content.substr(lineStarts[line], lineStarts[line + 1])
        };
    }
}

if(typeof window === "undefined"){
    module.exports = lTools;
}