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

var actions      = {};
var rootPath     = studio.extension.getFolder().path;

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

actions.onAutoComplete = function(message){
    //LOG_LEVEL_INFO && log("****************************");
    //LOG_LEVEL_INFO && log("> actions.onAutoComplete");

    var context   = message.source.data[0];
    var path      = message.source.data[1];
    var content   = message.source.data[2];
    var line      = parseInt(message.source.data[3]);
    var character = parseInt(message.source.data[4]);
    var project   = getProjectPath();
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

    return response;
};

actions.onCheckSyntax = function(message){

    //LOG_LEVEL_INFO && log("****************************");
    //LOG_LEVEL_INFO && log("> actions.onCheckSyntax");

    var context   = message.source.data[0];
    var path      = message.source.data[1];
    var content   = message.source.data[2];
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

    var generator = requireModule("modules/modelGenerator");
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

function sendRequest(options)
{
    var path        = rootPath;
    var worker		= new SharedWorker( path + 'worker.js' , "languageTools" );
    var port	    = worker.port;
    var action      = options.action;
    var data        = options.data;
	var timeout     = options.timeout || 500;
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

/*
 * Actions to control logging level
 * Can be enhanced
 */
actions.logLevelVerbose = function(){
    debug = true;
    LOG_LEVEL_VERBOSE = true;
    LOG_LEVEL_INFO    = true;
    LOG_LEVEL_ERROR   = true;
};

actions.logLevelInfo = function(){
    debug = true;
    LOG_LEVEL_VERBOSE = false;
    LOG_LEVEL_INFO    = true;
    LOG_LEVEL_ERROR   = true;
};

actions.logLevelError = function(){
    debug = true;
    LOG_LEVEL_VERBOSE = false;
    LOG_LEVEL_INFO    = false;
    LOG_LEVEL_ERROR   = true;
};