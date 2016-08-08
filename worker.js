var lTools;

onconnect = function(event){

	var port = event.ports[ 0 ];
    
	port.onmessage = function(message){
        
		var data  	 = message.data;
		var action 	 = data.type;
		var options  = data.data;
		var response = null;

        try
        {
            if(!lTools && action !== "init"){
                return;
            }
            
            switch(action)
            {
                case 'init':
                        initAutoComplete(options);
                    break;
                case 'autocomplete':
                        response = lTools.getAutoCompletion(options);
                    break;
                case 'gotodefinition':
                        response = lTools.getGoToDefinition(options);
                    break;
                case 'errors':
                        response = lTools.getErrors(options);
                    break;
                case 'updateFile':
                        lTools.updateFile(options);
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
                "type" : action + "_response",
                "data" : response
            });
        } catch(e) {
            port.postMessage({
                "type" : "error",
                "data" : {
                    "message" : e.message,
                    "fileName" : e.fileName,
                    "lineNumber" : e.lineNumber
                }
            });

            return;
        }
	}
};

function initAutoComplete(options){
    include(normalizePath(options.extensionPath + "/typescript/typescriptServices.js"));
    
    var solutionCompletionFolder = Folder(options.solutionPath + "completion/");
    var defaultCompletionFolder  = Folder(options.extensionPath + "completion/");
    var commonCompletionFolder   = Folder(options.extensionPath + "completion/common/");
    
    options.ts      = ts;
    options.folders = {
        solutionCompletionFolder    : solutionCompletionFolder,
        defaultCompletionFolder     : defaultCompletionFolder,
        commonCompletionFolder      : commonCompletionFolder
    };
    
    //throw new Error(options.rootPath + "/modules/languageTools");
    
    lTools = require(normalizePath(options.extensionPath + "/modules/languageTools"));
    
    lTools.init(options);
};

function normalizePath(path){
    return path.replace(new RegExp("(//|/\\./)","g"), "/");
}
