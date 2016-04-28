/* Copyright (c) Wakanda, 2015
*
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in
* all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
* THE SOFTWARE.
*/

var debug             = false;
var LOG_LEVEL_VERBOSE = false;
var LOG_LEVEL_INFO    = false;
var LOG_LEVEL_ERROR   = false;

var CONFIG       = {};
var actions      = {};
var rootPath     = studio.extension.getFolder().path;

/*
 * Configuration
 */
CONFIG.MAX_LENGTH     = 80 * 100;
CONFIG.MAX_WAIT       = 500;
CONFIG.MAX_WAIT_DEBUG = 5000;

/*
 * Entry Point For All Actions
 */
exports.handleMessage = function handleMessage(message){
    var startDate   = new Date();
    var action      = message.action;

    if( action )
    {
        var result = actions[action](message);
        var endDate = new Date();

        //LOG_LEVEL_INFO && log(action + " executed in " + (endDate - startDate).toString() + "ms" );

        return result;
    }
    else
    {
        return false;
    }
};

/*
 * Actions
 */
actions.initAutoComplete = function(message){
    //LOG_LEVEL_INFO && log("****************************");
    //LOG_LEVEL_INFO && log("> actions.initAutoComplete");

    var response = sendRequest({
        action : "init",
        data : {
            rootPath : rootPath,
            solutionPath : studio.currentSolution.getSolutionFile().parent.path
        }
    });

    //LOG_LEVEL_INFO && log("< actions.initAutoComplete");

    return true;
};

actions.onSolutionBeforeClosing = function(message){

    var response = sendRequest({
        action : "close"
    });

    return true;
};

function uselessCompletion(str, pos){

    if (pos == 0)
        return true;

    if (pos > str.length)
        pos = str.length;

    if ((str[pos - 1] == "\t") || (str[pos - 1] == " ") || str[pos - 1] == ";")
       return true;

    return false;
}

actions.onAutoComplete = function(message){
    //LOG_LEVEL_INFO && log("****************************");
    //LOG_LEVEL_INFO && log("> actions.onAutoComplete");

    var path      = message.source.data[1];    
    var content   = message.source.data[2];
    
    if(skipFile({"path" : path,"content" : content}) ){
        return;
    }
    
    // no autocompletion for json files
    if(path.substr(-5) === '.json') {
      return;
    }

    var context   = message.source.data[0];
    var line      = parseInt(message.source.data[3]);
    var character = parseInt(message.source.data[4]);
    var lineContent = message.source.data[5];

    // useless to ask autocomplete for an empty line (empty or contains only tabs and/or spaces)
    // or just after a blank or a ;
    if (uselessCompletion(lineContent, character))
        return;

    var project = getProjectPath();
    var request   = {
        action : "autocomplete",
        data : {
            project : project,
            context : context,
            path : path,
            content : content,
            line : line,
            character : character
        }
    };

    //LOG_LEVEL_VERBOSE && log("request : " + JSON.stringify(request) );
    
    var response = sendRequest(request);

    //LOG_LEVEL_VERBOSE && log("response : " + JSON.stringify(response) );

    //LOG_LEVEL_INFO && log("< actions.onAutoComplete");
        
    response.completion = filterCompletion(response.completion);
        
    return response;
};

actions.onGoToDefinition = function(message){
    var path      = message.source.data[1];    
    //var content   = message.source.data[2];
    var content = studio.currentEditor.getContent();

    if(skipFile({ path : path, content: content })) {
        return;
    }
    var selectionInfo = studio.currentEditor.getSelectionInfo();
    var line = selectionInfo.firstLineIndex;
    var character = selectionInfo.firstLineOffset;
    var context   = message.source.data[0];

    //var line      = parseInt(message.source.data[3]);
    //var character = parseInt(message.source.data[4]);

    var project = getProjectPath();
    var request = {
        action: 'gotodefinition',
        data: {
            project : project,
            context : context,
            path : path,
            content : content,
            line : line,
            character : character
        }
    };

    var response = sendRequest(request);

    // filter internal definitions
    if(response && response.length) {
        response = response.filter(function(res) {
            return res.path !== '__!!MODEL!!__.d.ts';
        });
    }
    return response;
};

actions.onCheckSyntax = function(message){

    //LOG_LEVEL_INFO && log("****************************");
    //LOG_LEVEL_INFO && log("> actions.onCheckSyntax");
   
    var path      = message.source.data[1];
    var content   = message.source.data[2];
    
    if(skipFile({"path" : path,"content" : content}) ){
        return;
    }
    
    var context   = message.source.data[0];    
    var project   = getProjectPath();
    var request   = {
        action : "errors",
        data : {
            project : project,
            context : context,
            path : path,
            content : content
        }
    };

    //LOG_LEVEL_VERBOSE && log("request : " + JSON.stringify(request) );

    var response = sendRequest(request);

    //LOG_LEVEL_VERBOSE && log("response : " + JSON.stringify(response) );
    //LOG_LEVEL_INFO && log("< actions.onCheckSyntax");

    return response;
};

actions.onCatalogUpdate = function(event){
    //LOG_LEVEL_INFO && log("****************************");
    //LOG_LEVEL_INFO && log("> actions.onCatalogUpdate");

    var args      = event.source.data;
    var path      = args[0];//.replace(/:/g, '/');
    var modelJson = args[1];
    //var path      = modelFile.path;// + ".ts";
    var context   = "4"; //standing for the Model context
    var project   = getProjectPath(); //Is this always true ?

    try
    {
        var dataclasses = JSON.parse(modelJson).dataClasses;
    }
    catch(e)
    {
        //LOG_LEVEL_ERROR && log("Error while parsing the model definition");
        return;
    }

    if(!dataclasses || dataclasses.length == 0)
    {
        return;
    }

    var generator = require("modelGenerator");    
    var content   = generator.generateModel(dataclasses);
    var request   = {
        action : "updateFile",
        data : {
            project : project,
            context : context,
            path : path,
            content : content
        }
    };

    //LOG_LEVEL_VERBOSE && log("request update MODEL: " + JSON.stringify(request) );
    var response  = sendRequest(request);
    //LOG_LEVEL_VERBOSE && log("response update MODEL: " + JSON.stringify(response) );

    content = generator.generateDS(dataclasses);
    request = {
        action : "updateFile",
        data : {
            project : project,
            context : context,
            path : project + "/__!!MODEL!!__.d.ts",
            content : content
        }
    };

    //LOG_LEVEL_VERBOSE && log("request update DS: " + JSON.stringify(request) );
    response  = sendRequest(request);
    //LOG_LEVEL_VERBOSE && log("response update DS: " + JSON.stringify(response) );

    //LOG_LEVEL_INFO && log("< actions.onCatalogUpdate");

    return response;
};

/*
 * Helper Functions
 */
function sendRequest(options)
{
    var path        = rootPath;
    var worker		= new SharedWorker( path + 'worker.js' , "wakanda-extension-language-tools" );
    var port	    = worker.port;
    var action      = options.action;
    var data        = options.data;
	var timeout     = options.timeout || (studio.isDebug() ? CONFIG.MAX_WAIT_DEBUG : CONFIG.MAX_WAIT);
    var isTimeout   = true;
    var response    = null;
    var request     = {
    	"type"	: action,
    	"data"	: data
    };

    //LOG_LEVEL_VERBOSE && log("request : " + JSON.stringify(request) );

    port.onmessage	= function(event) {

        response = event.data;

        //LOG_LEVEL_INFO && log(action + " response received");
        //LOG_LEVEL_VERBOSE && log(JSON.stringify(response));

        exitWait();

        isTimeout = false;
    };

    port.postMessage(request);
    //LOG_LEVEL_INFO && log("request sent");

    wait( timeout );

    //isTimeout && LOG_LEVEL_INFO && log("!!!TIMEOUT!!!");

    //LOG_LEVEL_VERBOSE && logSharedWorkerInfo(request, response);
    //LOG_LEVEL_ERROR && logSharedWorkerErrors(request, response);

    if(response && response.data){
        //LOG_LEVEL_VERBOSE && log(JSON.stringify(response.data));
        return response.data;
    }

    return response;
}

function logSharedWorkerInfo(request, response)
{
    if (response && response.info)
    {
        var content = ""
        response.info.forEach(function(line){
            content += "[SW INFO] : " + line + "\n";
        });
        log(content);
    }
}

function logSharedWorkerErrors(request, response)
{
    if (response && response.type === "error")
    {
        log("[SW ERROR] : action - " + request.action);
        log("[DETAILS] : " + JSON.stringify(response.data));
    }
}

function log(message)
{
    debug && studio.log(message);
}

function getProjectPath()
{
    return studio.getSelectedProjects().length > 0 ? File(studio.getSelectedProjects()[0]).parent.path : null;
}

function normalizePath(path)
{
    return path.replace(new RegExp("(//|/\\./)","g"), "/");
}

function requireModule(relPath)
{
  var path = normalizePath(rootPath+"/"+relPath);
  return require(path);
}

function belongsToSolution(path) {
    if(!studio.currentSolution.getSolutionFile()){
      return false;
    }

    var solutionPath = studio.currentSolution.getSolutionFile().parent.parent.path;
    if(path.indexOf(solutionPath) !== 0){
      return false;
    }

    return true;
}

function skipFile(params){
    if(!belongsToSolution(params.path)){
        return true;
    }    
    
    if(params.content.length > CONFIG.MAX_LENGTH ){
        return true;
    }
    
    return false;
}

function filterCompletion(list){
    var filterdList = [];
    
    list.forEach(function(element){
        
        if(element.text.indexOf("__DS") !== 0){
            
            filterdList.push(element);
        }
    });
   
    return filterdList;
}
