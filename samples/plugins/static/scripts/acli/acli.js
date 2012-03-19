/**
 * Created by JetBrains WebStorm.
 * User: amitu
 * Date: 1/15/12
 * Time: 1:36 PM
 * To change this template use File | Settings | File Templates.
 */

(function( $ ){


    var defaultSessionIdCounter = 0;

    function invoke(context, method) {
        methods[method]()
    }

    var methods = {
        init: function(opts){

            // for each selected control, initialize.
            // return the wrapped collection
            return this.each(function(){

                var $this = $(this),
                    data = $this.data('cli');

                // control already initialized, return it
                if(data) return $this;

                var options = $.extend(true, {}, $.fn.cli.defaults, opts);

                if(!options.resultsContainer) throw new Error("please provide resultsContainer");
                if(!options.promptControl) throw new Error("please provide promptControl");

                // the plugin hasn't been initialized yet
                var sessionId = ($.query.get('sid') || options.sid || 'auto'+(defaultSessionIdCounter++)) + '_',
                    envStorageKey = sessionId + 'env',
                    pluginsStorageKey = sessionId + 'commands',
                    historyStorageKey = sessionId + "history",
                    resultsContainer = $("<div>").appendTo(options.resultsContainer),
                    promptControl = options.promptControl,
                    myBoard = new MyBoard(),
                    history = new History(),
                    env = new Environment(),
                    commands = new Commands(options.commands);

                data = {
                    input : $this,
                    options: options,
                    history: history,
                    commands: commands,
                    env: env,
                    writeMessage: writeMessage
                };

                // store control data
                $(this).data('cli', data);

                // register keyboard events
                $this.keydown(function(e) {
                    if(e.keyCode==9) { // ignore tab keys
                        e.preventDefault();
                        return;
                    }
                    handleKeyPress(e.keyCode);
                });

                writeMessage('info', options.welcomeMessage);
                writeMessage('info', '&nbsp;');

                addDefaultCommands();
                var storedPlugins = loadPluginsFromStorage();
                var plugins = options.plugins ? options.plugins.concat(storedPlugins) : storedPlugins;
                loadPlugins(plugins);

                $this.focus();

                console.log("cli control initialized");


                // *********************
                // private methods
                // *********************

                function writeMessage(type, msg) {
                    $("<div>").addClass('cli-output-'+type).html(msg).appendTo(resultsContainer);
                    scrollDown();
                }

                function handleKeyPress(key) {
                    switch(key) {
                        case 9: // tab- do nothing
                            break
                        case 13: // enter
                            var command = getCommand();
                            if(!command) return;
                            var row = $("<div class='cli-commandRow'>")
                                .append($("<span class='cli-promptText'>").html(new Date().toLocaleTimeString() +' ' + $this.cli('prompt')))
                                .append($("<span class='cli-commandText'>").html(command));
                            resultsContainer.append(row);
                            scrollDown();
                            history.add(command);
                            // todo: validate command
                            clearCommand();
                            parseAndExecuteCommand(command);
                            break;
                        case 27: // esc
                            clearCommand();
                            break;
                        case 38: // up in history
                            setCommand(history.getPrevious());
                            break;
                        case 40: // down in history
                            setCommand(history.getNext());
                            break;
                        default:
                            //alert(e.keyCode);
                    }
                }

                function getCommand() {
                    return $this.val().trim();
                }

                function setCommand(command) {

                    $this.focus().val('');
                    setTimeout(function(){
                        $this.val(command);
                    }, 1);

                    /*
                    setTimeout(function(){
                        $this.focus();

                        var tb = $this[0];

                        // If this function exists...
                        if (tb.setSelectionRange)
                        {
                            var len = $this.val().length * 2;
                            tb.setSelectionRange(len, len);
                        }
                        else
                        {
                            console.warn('setSelectionRange not supported');
                            // ... otherwise replace the contents with itself
                            // (Doesn't work in Google Chrome)
                            $this.val($this.val());
                        }
                    }, 1);
                    */
                }

                function clearCommand() {
                    $this.val("");
                }

                function scrollDown() {
                    resultsContainer.parent().animate({scrollTop: resultsContainer.height()}, 0);

                    // remove rows based on maxResults
                    var maxResults = parseInt(env.env('maxResults'));
                    var rows = resultsContainer.find('.cli-commandRow');
                    while(rows.length > maxResults) {
                        removeLastLine();
                        rows = resultsContainer.find('.cli-commandRow');
                    }

                    function removeLastLine() {
                        resultsContainer.find('div').first().remove();
                    }
                }

                function parseAndExecuteCommand(commandLine) {

                    var commandInfo;
                    try {
                        commandInfo = parseCommand(commandLine);
                        if(commandInfo) {
                            executeCommand(commandInfo.command, commandInfo.args);
                        }
                    }
                    catch(error) {
                        console.error(error.message);
                        writeMessage('error', error.message);
                        return;
                    }
                }

                function parseCommand(commandLine) {
                    console.log('parsing command line:', commandLine);

                    var tokens = tokenize(commandLine),
                        commandName = tokens[0],
                        command = commands.get(commandName),
                        isGroupCommand = command && !command.exec;

                    // check if this is a sub-command
                    if(isGroupCommand) {
                        if(tokens.length<2) {
                            writeMessage('info', 'please select command for: '+commandName);
                            parseAndExecuteCommand('help '+commandName);
                            return;
                        }
                        commandName += ' ' +tokens[1];
                        command = commands.get(commandName);
                    }

                    if(!command) {
                        writeMessage('error', "command '<b>"+commandName+"</b>' not found");
                        return;
                    }

                    var args = {}, paramsFromCommand = {};
                    tokens = tokens.slice(isGroupCommand ? 2 : 1);
                    console.log(command, tokens);

                    var i =0;

                    // get params from command line
                    while(i<tokens.length) {
                        var token = tokens[i];
                        var type;

                        if(token.indexOf('--')==0) type = 'name'; // named param
                        else if(token.indexOf('-')==0) type = 'short'; // short param
                        else type = 'indexed';

                        var paramInfo = extractParamValue(type, token, i);
                        console.log('param', paramInfo.param.name, ':', paramInfo.value);
                        if(paramsFromCommand[paramInfo.param.name])
                            throw new Error('param name ' + paramInfo.param.name + ' was set more than once')
                        paramsFromCommand[paramInfo.param.name] = paramInfo;

                        // boolean param never gets value. its existance implies it is true
                        if(paramInfo.param.type == 'boolean' || type==='indexed') i++; else i+=2;
                    }

                    // add values from command line to args
                    // and merge with default vaulues for params without gived value
                    for(var i=0; command.params && i<command.params.length; i++) {
                        var param = command.params[i],
                            paramFromCommand = paramsFromCommand[param.name],
                            paramVal;

                        var _env = env.env();
                        if(paramFromCommand) {
                            // take actual value
                            paramVal = paramFromCommand.value;
                        }
                        else if(param.defaultEnvVar && _env.hasOwnProperty(param.defaultEnvVar) && _env[param.defaultEnvVar]&& _env[param.defaultEnvVar].value) {
                            var envValue = _env[param.defaultEnvVar].value;
                            console.log('taking var name', param.name, 'from environment:', param.defaultEnvVar, envValue);
                            paramVal = envValue;
                        }
                        // boolean value that was not provided defaults to false
                        else if(param.type == 'boolean')
                            paramVal = false;
                        else if(param.hasOwnProperty('defaultValue'))
                            paramVal = param.defaultValue;
                        // this must be a required param wit no value (an indexed param with no defaultValue)
                        else throw new Error("please provide a value for a required parameter '" + param.name + "'");

                        args[param.name] = paramVal;
                    }

                    return { command: command, args: args};

                    function tokenize(commandLine) {

                        if (!commandLine)  return [];

                        var state = { Whitespace: 1, Text: 2, Apostrophe: 3, Doublequote: 4 },
                            mode = state.Whitespace,
                            text = escape(commandLine),
                            i = 0,
                            begin = 0,
                            tokens = [],
                            ch,
                            str;

                        while (i<text.length) {
                            ch = text[i];

                            switch (mode) {

                                case state.Whitespace:
                                    switch(ch) {
                                        case '\'' :
                                            mode = state.Apostrophe;
                                            begin = i + 1;
                                            break;
                                        case '"':
                                            mode = state.Doublequote;
                                            begin = i + 1;
                                            break;
                                        case ' ':
                                            // whitespace, nothing to do
                                            break;
                                        default:
                                            mode = state.Text;
                                            begin = i;
                                    }
                                    break;

                                case state.Text:
                                    if (ch === ' ') pushArg(state.Whitespace, i);
                                    break;

                                case state.Apostrophe:
                                    if (ch === '\'') pushArg(state.Whitespace, i+1);
                                    break;

                                case state.Doublequote:
                                    if (ch === '"') pushArg(state.Whitespace, i+1);
                                    break;
                            }
                            i++;
                        }

                        // loop ended, push last argument
                        if (mode!==state.Whitespace) pushArg();

                        console.log('command tokens:', tokens);
                        return tokens;

                        function pushArg(newState, newBegin) {
                            str = unescape(text.substring(begin, i));
                            tokens.push(str);
                            mode = newState;
                            begin = newBegin;
                        }

                        function escape(str) {
                            // https://developer.mozilla.org/en/JavaScript/Guide/Values%2C_variables%2C_and_literals#Unicode_escape_sequences
                            return str
                                  .replace(/\\\\/g, '\\')
                                  .replace(/\\b/g, '\b')
                                  .replace(/\\f/g, '\f')
                                  .replace(/\\n/g, '\n')
                                  .replace(/\\r/g, '\r')
                                  .replace(/\\t/g, '\t')
                                  .replace(/\\v/g, '\v')
                                  .replace(/\\n/g, '\n')
                                  .replace(/\\r/g, '\r')
                                  .replace(/\\ /g, '\uF000')
                                  .replace(/\\'/g, '\uF001')
                                  .replace(/\\"/g, '\uF002')
                                  .replace(/\\{/g, '\uF003')
                                  .replace(/\\}/g, '\uF004');
                        }

                        function unescape(escaped) {
                            return escaped
                                .replace(/\uF000/g, ' ')
                                .replace(/\uF001/g, '\'')
                                .replace(/\uF002/g, '"')
                                .replace(/\uF003/g, '{')
                                .replace(/\uF004/g, '}');
                          }
                    }

                    function extractParamValue(type, token, index) {
                        var param, name, val;

                        // find param definition
                        switch(type){
                            // index params can only be at the begining od of the command.
                            // they should never by after switch or named params
                            case 'indexed':
                                if(command.params.length<=index) throw new Error('parameter at index ' + (index+1) + ' is not defined for this command');
                                param = command.params[index];
                                name = param.name;
                                if(param.type == 'boolean') {
                                    var usage = '--'+name;
                                    if(param.short) usage += ' or -' + param.short;
                                    throw new Error('boolean param ' + name + ' should only be used with ' + usage + ' to set it on');
                                }
                                val = token;
                                break;
                            case 'name':
                                name = token.substring(2);
                                param = getParamBy(type, name);
                                if(!param) throw new Error('param name ' + name + ' is not specified for this command');
                                if(param.type == 'boolean') val = true;
                                else {
                                    if(tokens.length<index+1) throw new Error('param value was not provided for named param ' + name);
                                    val= tokens[index+1];
                                }
                                break;
                            case 'short':
                                name = token.substring(1);
                                param = getParamBy(type, name);
                                if(!param) throw new Error('param switch ' + name + ' is not specified for this command');
                                if(param.type == 'boolean') val = true;
                                else {
                                    if(tokens.length<index+1) throw new Error('param value was not provided for switch param ' + name);
                                    val=tokens[index+1];
                                }
                                break;
                        }

                         // check if environment variable requested
                        if(val.toString().charAt(0)=='$') {
                            // how do we want it to behave if the environment variable does not exists?
                            // get ''? the actual string ($xxx) or should we raise an error?
                            // right now i'm gonna raise an error just to be on the safe side
                            var envVarName = val.toString().substring(1);
                            if(!env.env().hasOwnProperty(envVarName)) throw new Error('Environment variable \'' + envVarName +'\' does not exist');

                            val = env.env(envVarName);
                            if(!val) throw new Error('Environment variable \'' + envVarName +'\' is empty');
                        }

                        var paramDetails = {param: param, value: val};
                        setParamType(paramDetails);

                        return paramDetails;
                    }

                    function getParamBy(field, name) {
                        for(var j=0; j<command.params.length;j++) {
                            var cmd = command.params[j];
                            if(cmd[field]===name){
                                return cmd;
                            }
                        }
                        return null;
                    }

                    function setParamType(paramDetails) {

                        switch(paramDetails.param.type) {

                            case 'string':
                                // value is already string
                                break;
                            case 'boolean':
                                // value is already bool
                                break;
                            case 'number':
                                try{
                                    var val = parseInt(paramDetails.value);
                                    if(_.isNaN(val))
                                    {
                                        console.log('NaN');
                                        throw new Error('NaN');
                                    }
                                    paramDetails.value = val;
                                } catch(e) { throw new Error('value provided for ' +paramDetails.param.name+ ' is not a number: ' + paramDetails.value); }
                                break;
                        }
                    }
                }

                function executeCommand(command, args) {

                    var resultContainer = $("<div class='cli-commandResult'>").appendTo(resultsContainer)

                        // todo: move following code to MyBoard class
                        .dblclick(function(e) {
                            if(!e.ctrlKey) return;

                            if($(this).parent().is('.cli-my-board-item')) {
                                $(this).remove();
                            }
                            else
                            {
                                if($(this).data("isDraggable")) {
                                    $(this).draggable('destroy');
                                    $(this).data("isDraggable", false);
                                }
                                else
                                {
                                   $(this)
                                    .draggable({
                                        appendTo: 'body',
                                        containment: 'window',
                                        scroll: false,
                                        helper: 'clone',
                                        cursorAt: { right: 0, top: 0 },
                                        delay: 100,
                                        opacity: 0.5,
                                        revert: 'invalid',
                                        revertDuration: 300
                                    });
                                    $(this).data("isDraggable", true);
                                }
                            }
                        });

                    var progressControl = $("<span>");
                    var promise = {
                        resolve: function(result) {
                           appendExecutionResult(result);
                        },
                        setProgress: function(progress) {
                            progressControl.html( (progress*100).toString().substr(0, 2) + '% completed... ');
                        }
                    };

                    var execContext = { appcontext: options.context }
                    execContext.createPromise = function() {
                        return promise;
                    }

                    // we copy the command so that handlers will not be able to change its properties
                    execContext.command = jQuery.extend(true, {}, command);
                    execContext.env = jQuery.extend(true, {}, env.env());

                    var res =  command.exec(args, execContext);
                    var img = $("<img>").attr('src', $.fn.cli.images.processing);

                    if(res!==promise)
                        appendExecutionResult(res);
                    else
                        appendExecutionResult($("<div>").html('processing... ')
                            .append(progressControl)
                            .append(img));

                    function appendExecutionResult(result) {

                        if(typeof result == 'object' && !(result instanceof jQuery))
                            result = jsonToHtml(result, true);

                        resultContainer.html("").append(result);
                        scrollDown();
                    }
                }

                function addDefaultCommands() {

                    var helpCommand = {
                        name: 'help',
                        description: 'Gets help for working with the console',
                        usage: 'help [command name]',
                        manual: '',
                        params: [
                            {
                                name: 'command',
                                description: 'The command to get help for',
                                type: 'string',
                                defaultValue: ''
                            },
                            {
                                name: 'subCommand',
                                description: 'The sub-command to get help for',
                                type: 'string',
                                defaultValue: ''
                            }
                        ],
                        exec: function(args, context) {

                            var tbl = $("<table border='1' cellpadding='0' cellspacing='0' class='cli-table'>");

                            // if someone for some reason uses the named version, this should be checked...
                            if(args.subCommand && !args.command) {
                                return "please specify command group name in addition to sub-command '<b>"+args.subCommand+"</b>'";
                            }

                            var commandName = args.command + (args.subCommand ? ' ' + args.subCommand : '');

                            if(commandName) {
                                var command = commands.get(commandName);

                                if(!command) {
                                    return "command '<b>"+commandName+"</b>' not found";
                                }

                                if(command.exec) { // this is a regular command

                                    var descr = command.description || '';
                                    if(options.descriptionHandler) descr = options.descriptionHandler(command, descr);
                                    tbl.append($("<tr>").append($("<td>").html('Description')).append($("<td>").html(descr)));

                                    tbl.append($("<tr>").append($("<td>").html('Usage')).append($("<td>").html(command.usage || '')));
                                    tbl.append($("<tr>").append($("<td>").html('Example')).append($("<td>").html(command.example || '')));

                                    if(command.params && command.params.length) {

                                        var paramsTbl = $("<table border='1' cellpadding='0' cellspacing='0' class='cli-table'>");

                                        paramsTbl.append($("<tr>")
                                            .append($("<th>").html('Name'))
                                            .append($("<th>").html('Description'))
                                            .append($("<th>").html('Type'))
                                            .append($("<th>").attr("nowrap", "nowrap").html('Default Value'))
                                            .append($("<th>").attr("nowrap", "nowrap").html('Default Env Var'))
                                            .append($("<th>").html('Optional'))
                                            .append($("<th>").html('Switch')));

                                        for(var i=0; i<command.params.length; i++) {
                                            var param = command.params[i];
                                            var row = $("<tr>")
                                                .append($("<td>").html(param.name))
                                                .append($("<td>").html(param.description || ''))
                                                .append($("<td>").html(param.type))
                                                .append($("<td>").html(param.hasOwnProperty('defaultValue') ? param.defaultValue : (param.type=='boolean' ? 'false' : '')))
                                                .append($("<td>").html(param.hasOwnProperty('defaultEnvVar') ? '$' + param.defaultEnvVar : ''))
                                                .append($("<td>").html(param.hasOwnProperty('defaultValue') || param.type=='boolean' ? 'optional' : 'required'))
                                                .append($("<td>").html(param.short || ''));

                                            row.appendTo(paramsTbl);
                                        }

                                        tbl.append($("<tr>").append($("<td>").html('Parameters')).append($("<td>").append(paramsTbl)));

                                    }
                                }
                                else { // this is a group command

                                    tbl.append($("<tr>")
                                        .append($("<th>").html('Sub Command'))
                                        .append($("<th>").html('Description')));

                                    var cmds = getSortedCommands();
                                    for(var i=0; i<cmds.length; i++) {
                                        var command = cmds[i];
                                        if(command.name.indexOf(args.command+' ') == 0)
                                        { // this is a sub command of args.command
                                            var row = $("<tr>")
                                              .append($("<td>").html(command.name))
                                              .append($("<td>").html(command.description || ''));

                                            row.appendTo(tbl);
                                        }
                                    }
                                }
                            }
                            else { // list all commands

                                tbl.append($("<tr>")
                                    .append($("<th>").html('Command'))
                                    .append($("<th>").html('Description'))
                                    .append($("<th>").html('Usage')));

                                var sortedArray = getSortedCommands();

                                for(var i=0;i<sortedArray.length; i++) {
                                    var command = sortedArray[i];
                                    if(!command.hidden) {
                                        if(command.name.split(' ').length==1) {
                                            var row = $("<tr>")
                                                .append($("<td>").html(command.name))
                                                .append($("<td>").html(command.description))
                                                .append($("<td>").html(command.usage || ''));

                                            row.appendTo(tbl);
                                        }
                                    }
                                }
                            }

                            return tbl;
                            /*
                            setTimeout(function(){
                                onAsyncActionComplete(tbl);
                            }, 2000);
                            */


                            function getSortedCommands() {
                                return _.toArray(commands.get()).sort(function(a,b) {
                                        if(a.name > b.name) return 1;
                                        if(a.name < b.name) return -1;
                                        return 0;
                                    }
                                );
                            }
                        }
                    }

                    var clsCommand = {
                        name: 'cls',
                        description: 'Clears the console',
                        usage: 'cls',
                        example: 'cls',
                        exec: function() {
                            resultsContainer.html("");
                            writeMessage('info', options.welcomeMessage);
                            writeMessage('info', '&nbsp;');
                        }
                    }

                    var clearCommand = {
                        name: 'clear',
                        description: 'Clears the console',
                        usage: 'clear',
                        example: 'clear',
                        exec: function() {
                            resultsContainer.html("");
                            writeMessage('info', options.welcomeMessage);
                            writeMessage('info', '&nbsp;');
                        }
                    }

                    var myboardCommand = {
                        name: 'myboard',
                        description: 'Manages My Board Panel. Using with no params will toggle the board visibility.',
                        usage: 'myboard [--off] [--on] [--put]',
                        example: 'myboard',
                        params: [
                            {
                                name: 'off',
                                description: 'turn my board off',
                                type: 'boolean'
                            },
                            {
                                name: 'on',
                                description: 'turn my board on',
                                type: 'boolean'
                            }
                            ,
                            {
                                name: 'put',
                                description: 'move last result to my board panel',
                                type: 'boolean'
                            }
                        ],
                        //hidden: true,
                        exec: function(args) {

                            if(!args.on && !args.off && !args.put) {
                                if ($(".cli-my-board").css("display")=='none')
                                    args.on = true;
                                else args.off = true;
                            }

                            if(args.off) {
                                $(".cli-my-board").hide();
                            }
                            else if (args.on)
                                $(".cli-my-board").show();
                            else if(args.put) {
                                var item = resultsContainer.find(".cli-commandResult").last().prevAll(".cli-commandResult")[0];
                                myBoard.addItemToMyBoard(item);
                            }
                        }
                    }

                    var sampleCommand = {
                        name: 'sample',
                        description: 'Sample command',
                        usage: 'sample [requiredString1] [requiredString2]  [requiredNumber1] [optionalNumber1] [optionalNumber2]',
                        example: 'sample aa bb 444 333 -l ffff -r',
                        params: [
                            {
                                name: 'requiredString1',
                                description: 'required string 1',
                                type: 'string'
                            },
                            {
                                name: 'requiredString2',
                                description: 'required string 2',
                                type: 'string'
                            },
                            {
                                name: 'requiredNumber1',
                                description: 'required number 1',
                                type: 'number'
                            },
                            {
                                name: 'optString1',
                                description: 'optional string 1',
                                type: 'string',
                                defaultValue: 'optString1'
                            },
                            {
                                name: 'optString2',
                                short: 'a',
                                description: 'optional string 2',
                                type: 'string',
                                defaultValue: 'optString2'
                            },
                            {
                                name: 'optionalNumber1',
                                short: 'b',
                                description: 'optional number 1',
                                type: 'number',
                                defaultValue: 1234
                            },
                            {
                                name: 'optionalNumber2',
                                short: 'c',
                                description: 'optional number 2',
                                type: 'number',
                                defaultValue: 222
                            },
                            {
                                name: 'optionalNullNumber',
                                short: 'd',
                                description: 'optional null number 1',
                                type: 'number',
                                defaultValue: null
                            },
                            {
                                name: 'switchBool1',
                                short: 'e',
                                description: 'boolean switch',
                                type: 'boolean'
                            },
                            {
                               name: 'switchBool2',
                               short: 'f',
                               description: 'boolean switch',
                               type: 'boolean'
                           }

                        ],
                        exec: function(args, context) {
                            return "sample command args: " + JSON.stringify(args);
                        }
                    }

                    // group commands does not have an exec method
                    var sampleGroupCommand = {
                        name: "group",
                        description: "group of commands",
                        usage: "type 'help group' for sub-commands"
                    }

                    var sampleGroupCommand1 = {
                        name: "group action1",
                        description: "action1 of group of commands",
                        usage: 'group action1 requiredString1 [--boolParam]',
                        example: 'group action1 "some string" --boolParam',
                        params: [
                            {
                                name: 'requiredString1',
                                description: 'required string 1',
                                type: 'string'
                            },
                            {
                                name: 'boolParam',
                                short: 'b',
                                description: 'bool param',
                                type: 'boolean'
                            }
                        ],
                        exec: function(args, context) {
                            return "action1 of group of commands: " + JSON.stringify(args);
                        }
                    }

                    var sampleGroupCommand2 = {
                        name: "group action2",
                        description: "action2 of group of commands",
                        usage: 'group action2 [optionalStr] [numberParam]',
                        example: 'group action2 "optional string" 11',
                        params: [
                            {
                                name: 'optionalStr',
                                short: 'o',
                                description: 'optional string 1',
                                type: 'string',
                                defaultValue: 'default!!!'
                            },
                            {
                                name: 'numberParam',
                                short: 'n',
                                description: 'number param',
                                type: 'number',
                                defaultValue: 33
                            }
                        ],
                        exec: function(args, context) {
                            return "action2 of group of commands: " + JSON.stringify(args);
                        }
                    }

                    var pluginsGroupCommand = {
                        name: "plugins",
                        description: "Manages plugins",
                        usage: "type 'help plugins' for more info"
                    }

                    var installPluginCommand = {
                        name: "plugins install",
                        description: "Installs a plugin from remote url",
                        usage: 'plugins install name url [--persist/-p]',
                        example: 'plugins install management http://some.url/management -p',
                        params: [
                            {
                                name: 'name',
                                description: 'commands group name',
                                type: 'string'
                            },
                            {
                                name: 'url',
                                description: 'commands url (docrouter metadata)',
                                type: 'string'
                            },
                            {
                                name: 'persist',
                                short: 'p',
                                description: 'persists plugin and automatically load next time the console is started',
                                type: 'boolean'
                            }
                        ],
                        exec: function(args, context) {

                            var resp = $("<div>");

                            var plugin = { url: args.url, userCommand: true };
                            if(args.name) plugin.groupCommandName = args.name;

                            if(commands.get(args.name)) {
                                resp.addClass('cli-output-error').html('plugin name \''+args.name+'\' already exists, please choose another plugin name');
                                return resp;
                            }

                            var promise = context.createPromise();
                            getPluginCommands(plugin, function(err,response){
                                if(err) {
                                    resp.addClass('cli-output-error').html('couldn\'t load plugin from ' + plugin.url + '. Error: '+err);
                                    promise.resolve(resp);
                                    return;
                                }

                                var newCommands = compilePlugin(response);
                                _.each(newCommands, function(cmd) {
                                    commands.add(cmd);
                                });

                                if(args.persist) {
                                    storePlugin(plugin);
                                }

                                resp.addClass('cli-output-info').html('plugin loaded successfully, type \'help '+args.name+'\' to see list of commands');
                                promise.resolve(resp);
                            });

                            return promise;
                        }
                    }

                    var uninstallPluginCommand = {
                        name: "plugins uninstall",
                        description: "Uninstalls a plugin",
                        usage: 'plugins uninstall name',
                        example: 'plugins uninstall management',
                        params: [
                            {
                                name: 'name',
                                description: 'name of plugin to uninstall',
                                type: 'string'
                            }
                        ],
                        exec: function(args, context) {

                            if(!commands.get(args.name)) {
                                writeMessage('error', 'plugin \''+args.name+'\' does not exist');
                                return;
                            }

                            try {
                                commands.delete(args.name);
                            }
                            catch(err) {
                                writeMessage('error', err.message);
                                return;
                            }

                            // delete from local storage
                            removeStoredCommand(args.name);

                            writeMessage('info', 'plugin \''+args.name+'\' uninstalled successfully');
                        }
                    }

                    var resetPluginsCommand = {
                        name: "plugins reset",
                        description: "Uninstalls all installed plugins",
                        usage: 'plugins reset',
                        example: 'plugins reset',
                        params: [],
                        exec: function(args, context) {
                            var userCommands = loadPluginsFromStorage();

                            try {
                                for(var i=0; i<userCommands.length; i++)
                                    commands.delete(userCommands[i].groupCommandName);
                            }
                            catch(err) {
                                writeMessage('error', err.message);
                                return;
                            }

                            // delete all local storage
                            clearStoredCommands();

                            writeMessage('info', 'plugins uninstalled successfully');
                        }
                    }

                    var setCommand = {
                        name: 'set',
                        description: "Manages environment variables",
                        usage: 'set [name] [value]',
                        example:'<b>set</b>: display the list of all environment variables<br/>' +
                                '<b>set app</b>: display current value of app environment variable<br/>'+
                                '<b>set app appname</b>: set current value of app environment variable to appname<br/>'+
                                '<b>set xxx -c</b>: sets variable xxx to an empty value<br/>'+
                                '<b>set xxx -d</b>: deletes the xxx environment variable<br/>',
                        params: [
                            {
                                name: 'name',
                                description: 'the name of the environment variable',
                                type: 'string',
                                defaultValue: null
                            },
                            {
                                name: 'value',
                                description: 'the value of the setting',
                                isOptional: true,
                                type: 'dynamic',
                                defaultValue: null
                            },
                            {
                                short: 'r',
                                name: 'restore',
                                description: 'restores env variables and ignores the rest of the parameters if provided',
                                type: 'boolean'
                            },
                            {
                                short: 'x',
                                name: 'extend',
                                description: 'displays extended information about the environment variables',
                                type: 'boolean'
                            },
                            {
                                short: 'c',
                                name: 'clear',
                                description: 'delete the variable value- make it empty',
                                type: 'boolean'
                            },
                            {
                                short: 'd',
                                name: 'delete',
                                description: 'remove the variable from the environment collection',
                                type: 'boolean'
                            },
                            {
                                short: 'o',
                                name: 'online',
                                description: 'presents a real-time settings pannel when used alone (set -o)',
                                type: 'boolean'
                            }
                        ],
                        exec: function(args) {

                            if(args.restore) env.reset();
                            if(args.value=='') {
                                args.clear = true;
                            }

                            if(args.clear || args.delete) {
                                if(!args.name) {
                                    writeMessage('error', 'plsease spcify a param name');
                                    return;
                                }

                                if(args.clear) env.clear(args.name);
                                if(args.delete) env.delete(args.name);
                            }

                            var res = {};
                            if(!args.name && !args.value) {

                                if(!args.extend) {
                                    var _env = env.env();
                                    for(var key in _env) {
                                        res[key] = _env[key].value;
                                    }
                                }
                                else res = env.env();

                                var container = $("<div>").append(jsonToHtml(res, true));
                                if(args.online)
                                {
                                    $(env.events).bind('state', function(e, state){
                                        var res = {};
                                        var _env = env.env();
                                        for(var key in _env) {
                                            res[key] = _env[key].value;
                                        }
                                        container.html('').append(jsonToHtml(res, true));
                                    });
                                }
                                return container;
                            }

                            if(args.name && args.value) { // set
                                env.env(args.name, args.value);
                            }

                            res[args.name] = !args.extend ? env.env(args.name) : env.env()[args.name];
                            return res;
                        }
                    }

                    var tabCommand = {
                        name: 'tab',
                        description: "Creates a console session in a new tab",
                        usage: 'tab name',
                        example: 'tab myNewSessionName',
                        params: [
                            {
                                name: 'name',
                                description: 'The name of the new tab. When used, all storage (history, plugins, environment variables) '+
                                             'is automatically persisted under this name and can be restored the next time the tab is opened with this name.',
                                type: 'string',
                                defaultValue: null
                            }
                        ],
                        exec: function(args, context) {
                            var query = $.query.load(window.location.href);
                            query = args.name ? query.set('sid',args.name) : query.remove('sid');

                            var path = window.location.origin + window.location.pathname + query.toString();
                            window.open(path);
                        }
                    }

                    var getCommand = {
                        name: 'get',
                        description: "Invokes a web GET request to a url that returns json object",
                        usage: 'get url',
                        example: 'get http://some.url.that.returns.json',
                        params: [
                            {
                                 short: 'u',
                                 name: 'url',
                                 description: 'Url that returns json object',
                                 type: 'string'
                            }
                        ],
                        exec: function(args, context) {
                            var promise = context.createPromise();

                            if(!args.url) return 'please provide a url';

                            getJson(args.url, function(error, data) {
                                if(error){
                                    promise.resolve($("<div class='cli-output-error'>").html('Error getting json: '+error));
                                    return;
                                }

                                var jsonView = jsonToHtml(data);
                                promise.resolve(jsonView);
                            });

                            return promise;
                        }
                    }

                    commands.add(tabCommand);
                    commands.add(helpCommand);
                    commands.add(clsCommand);
                    commands.add(clearCommand);
                    commands.add(setCommand);
                    commands.add(getCommand);
                    commands.add(pluginsGroupCommand);
                    commands.add(installPluginCommand);
                    commands.add(uninstallPluginCommand);
                    commands.add(resetPluginsCommand);
                    commands.add(myboardCommand);
                    //commands.add(sampleCommand);
                    //commands.add(sampleGroupCommand);
                    //commands.add(sampleGroupCommand1);
                    //commands.add(sampleGroupCommand2);
                }

                function loadPlugins(plugins) {
                    $(plugins).each(function(index ,plugin) {
                        writeMessage('info', 'loading plugin ' + plugin.url);

                        getPluginCommands(plugin, function(error, commandsInfo){
                            if(plugin.options){
                                for(var name in plugin.options){
                                    var cmd = _.find(commandsInfo.commands, function(item) {
                                        return item.name === name;
                                    });
                                    cmd.options = plugin.options[name];
                                }
                            }
                            var newCommands = compilePlugin(commandsInfo);
                            _.each(newCommands, function(cmd) {
                                commands.add(cmd);
                            });
                        });
                    });
                }

                    //commandsInfo: {url: url, plugin: plugin, commands: data}
                function compilePlugin(commandsInfo) {

                    var newCommands = {};
                     var cmds = commandsInfo.commands;
                     if(!cmds || !cmds.length) return;

                     // group command is the last element of the url
                     var commandRootUrl = commandsInfo.url.replace('/!!','');
                     var commandName = commandsInfo.plugin.groupCommandName || commandRootUrl.split('/').pop();

                     // we create group for apis with more than 1 command or
                     // for remote commads which were loaded by the user
                     var isGroup = cmds.length > 1 || commandsInfo.plugin.userCommand;
                     if(isGroup) {
                         var gCommand = createGroupCommand(commandName);
                         if(commandsInfo.plugin.userCommand) gCommand.userCommand=true;
                         newCommands[commandName] = gCommand;
                     }

                     var autoSubCommandNameIndex = 1;
                     for(var i=0; i<cmds.length; i++) {
                         var cmd = cmds[i];
                         var cmdName = commandName;

                         // construct command name
                         // try getting name --> id --> create auto name
                         if(isGroup) {
                             var subCommandName = cmd.name || cmd.id || ('autoCommand'+(autoSubCommandNameIndex++));
                             cmdName += ' ' + subCommandName.toLowerCase();
                         }
                         newCommands[cmdName] = createCommand(cmdName, cmd, commandRootUrl, commandsInfo.plugin);
                     }

                     return newCommands;

                     function createCommand(name, cmd, rootUrl, plugin) {

                         //plugin.options = plugin.options || {};
                         //var exclueAndOverride = plugin.options[name] ?  plugin.options[name].excludeAndOverideParams : {};

                         var exclueAndOverride = cmd.options ? cmd.options.excludeAndOverideParams : {};

                         var newCommand = {
                             name: name,
                             usage: cmd.usage,
                             example: cmd.example,
                             response: cmd.response || 'json',
                             method: cmd.method,
                             rootUrl: rootUrl,
                             path: rootUrl + cmd.path,
                             plugin: plugin,
                             ignoredParams: {},
                             options: cmd.options
                         }

                         if(cmd.hasOwnProperty('doc')) newCommand.description = cmd.doc;
                         if(cmd.hasOwnProperty('usage')) newCommand.usage = cmd.usage;
                         if(cmd.hasOwnProperty('example')) newCommand.example = cmd.example;

                         var params = [];
                         for(var paramName in cmd.params) {
                             var param = cmd.params[paramName];
                             var newParam =
                             {
                                 name: paramName,
                                 type: getType(param.type),
                                 style: param.style
                             }
                             if(param.hasOwnProperty('doc')) newParam.description = param.doc;
                             if(param.hasOwnProperty('options')) newParam.options = param.options;
                             if(param.hasOwnProperty('short')) newParam.short = param.short;
                             if(param.hasOwnProperty('defaultEnvVar')) newParam.defaultEnvVar = param.defaultEnvVar;
                             if(param.hasOwnProperty('defaultValue'))
                                 newParam.defaultValue = param.defaultValue;
                             else if(!param.required) newParam.defaultValue = null;

                             if(!exclueAndOverride || !exclueAndOverride[paramName])
                                 params.push(newParam);
                             else
                                 newCommand.ignoredParams[newParam.name] = newParam;
                         }
                         newCommand.params = params;

                         // add the rest of the command fields
                         for(var field in cmd) {
                             if(!newCommand.hasOwnProperty(field))
                                 newCommand[field] = cmd[field];
                         };

                         if(newCommand.controller) {

                             if(newCommand.controller.url) {

                                 var initPath = rootUrl + '/' + newCommand.controller.url,
                                      scriptName = initPath.replace(/\//g, '_').replace(/\./g, '__').replace(/:/g, '___').replace(/-/g, '____'),
                                      scriptNameObj = 'obj' + scriptName,
                                      handlerName = newCommand.controller.handler || (newCommand.name.split(' ').length == 2 ? newCommand.name.split(' ')[1] :  newCommand.name),
                                      scriptUrl = newCommand.controller.url.indexOf('http')==0 ? newCommand.controller.url : '';

                                  if(!scriptUrl) scriptUrl=initPath;

                                  if(!newCommand.options) newCommand.options = {};

                                 if(window.hasOwnProperty(scriptNameObj)) {
                                      newCommand.options.handler = window[scriptNameObj][handlerName];
                                 }
                                 else
                                 {
                                     $.get(scriptUrl, function (responseText, textStatus, xhr){

                                         if(xhr.status!=200 || !responseText){
                                               var msg = 'got status code:' + xhr.status + ';status text:'+xhr.statusText+'; response:' + xhr.responseText;
                                               console.error("can't load plugin from ", newCommand.controller.url, ': ', msg);
                                           }
                                          else
                                          {
                                              if(!window.hasOwnProperty(scriptNameObj)) {
                                                  var str = 'function '+scriptName+'() {' + responseText + '}';
                                                  $("<script>").html(str).appendTo("head");
                                                  var context = {};
                                                  window[scriptName].call(context);
                                                  window[scriptNameObj] = context;
                                                  console.log('added handler script:', scriptName);
                                              }
                                              newCommand.options.handler = window[scriptNameObj][handlerName];
                                          }
                                     });
                                 }
                             }

                             if(newCommand.controller.cssUrl){
                                 var cssUrl = newCommand.controller.cssUrl.indexOf('http')==0 ? newCommand.controller.cssUrl : '';
                                 if(!cssUrl) cssUrl = rootUrl + '/' + newCommand.controller.cssUrl;

                                 loadCss(cssUrl);
                             }

                             if(newCommand.controller.css) addCss(newCommand.controller.css);
                         }

                         newCommand.exec = function(args, context) {
                             console.log(args, this);

                             // construct url
                             var url = this.path;
                             var body = null;
                             var method = this.method;

                             for(var i=0; i<this.params.length; i++) {
                                 var param = this.params[i];
                                 if(!args[param.name]) continue;

                                 addParam(param, args[param.name]);
                             }

                             // override params
                             var exclueAndOverride = this.options ? this.options.excludeAndOverideParams : {};
                             //var exclueAndOverride = this.plugin.options[this.name] ?  this.plugin.options[this.name].excludeAndOverideParams : {};
                             for(var paramName in exclueAndOverride){
                                 addParam(this.ignoredParams[paramName], exclueAndOverride[paramName]);
                             }

                             function addParam(param, value) {
                                 switch(param.style) {
                                     case 'template' :
                                         url = url.replace(':'+param.name, value);
                                         break;
                                     case 'query' :
                                         var qsParam = param.name+'='+value;
                                         if(url.indexOf('?')<0) url+='?'+qsParam;
                                         else url+='&'+qsParam;
                                         break;
                                     case 'body' :
                                         if(!body) body={};
                                         body[param.name] = value;
                                         break;
                                 }
                             }

                             // add $ variables from environment
                             url = addDefaultQueryVariables(url, context.env);

                            var handler = this.options && this.options.handler ? this.options.handler : null;

                            // check if this is a broadcast command
                            if(this.broadcast) {

                                if(!options.broadcastUrlGenerator) throw new Error('please initialize cli with broadcastUrlGenerator(url) handler');
                                var urls = options.broadcastUrlGenerator(url);

                                var promise = context.createPromise(),
                                    responses = [],
                                    jsonResponse = true;
                                _.each(urls, function(urlDetails) {
                                    var url = urlDetails.url;
                                    $.ajax(
                                   {
                                       url: url,
                                       type: method,
                                       data: body,
                                       success: function(data, success, xhr) {
                                            response = {data: data, args: args, context:context, promise: promise};

                                            if(xhr.status!=200 || !data){
                                                var msg = 'got status code:' + xhr.status + ';status text:'+xhr.statusText+'; response:' + xhr.responseText;
                                                responses.push({instance: url, error: msg});
                                                $(promise).trigger('error', msg);
                                            }
                                            else
                                            {
                                                if(xhr.getResponseHeader('content-type').indexOf('json')<0)
                                                    jsonResponse = false;

                                                responses.push({instance: urlDetails.name, response: data});
                                                $(promise).trigger('data', data);
                                            }
                                       },
                                       error: function(xhr){
                                            var msg = 'error: status code:' + xhr.status +' status text:' + xhr.statusText+' response text:' + xhr.responseText;
                                            responses.push({instance: urlDetails.name, error: msg});
                                       },
                                       complete: function(xhr, textStatus) {

                                           promise.setProgress(_.size(responses)/urls.length);

                                           if(_.size(responses)==urls.length) {
                                               // sort responses
                                               responses.sort(function(a,b){
                                                   if(a.instance>b.instance) return 1;
                                                   if(b.instance>a.instance) return -1;
                                                   return 0;
                                               });

                                               var response = {data: responses, args: args, context:context, promise: promise};
                                               if(handler) return handler(response);
                                               else
                                               {
                                                   if(jsonResponse)
                                                        promise.resolve(response.data);
                                                   else
                                                   // just combine the html blocks
                                                       promise.resolve(
                                                           _.map(responses, function(resp) {
                                                               return resp.error || resp.response;
                                                           }).join('')
                                                       );
                                               }
                                           }
                                       }
                                   });

                                });
                                return promise;
                            }
                            else
                            {
                                 var response = {};

                                 if(handler && this.options.returnBeforeInvoke) {
                                     context.url = url;
                                     response = {args: args, context:context};
                                     return handler(response);
                                 }

                                var promise = context.createPromise();

                                 $.ajax(
                                 {
                                     url: url,
                                     type: method,
                                     data: body,
                                     success: function(data, success, xhr) {
                                         response = {data: data, args: args, context:context, promise: promise};

                                         if(xhr.status!=200 || !data){
                                             var msg = 'got status code:' + xhr.status + ';status text:'+xhr.statusText+'; response:' + xhr.responseText;
                                             if(handler) handler(msg, response);
                                             else promise.resolve(msg);
                                             return;
                                         }

                                         if(handler)
                                             handler(null, response);
                                         else
                                             promise.resolve(data);
                                     },
                                     error: function(xhr){
                                         var msg = 'error: status code:' + xhr.status +' status text:' + xhr.statusText+' response text:' + xhr.responseText;
                                         response = {args: args, context:context, promise: promise};
                                         if(handler) handler(msg, response);
                                         else promise.resolve(msg);
                                    }
                                 });

                                return promise;
                            }
                         }

                         function getType(type) {
                             switch(type) {
                                 case 'bool': return 'boolean';
                                 case 'date':
                                 case 'text': return 'string';
                                 case 'int': return 'number';

                                 default: return type;
                             }
                         }

                         function addDefaultQueryVariables(url, env) {
                                 // TODO: change to use url plugin
                                 for(var envVarName in env) {
                                     var envVar = env[envVarName];
                                     if(envVar.useAtQuery && envVar.value) {
                                         addVariable(envVarName, envVar.value);
                                     }
                                 }

                                 return url;

                                 function addVariable(name, value) {
                                     var pair = '$' + name+'='+value;
                                     if(url.indexOf("?")>0)
                                         url+='&'+pair;
                                     else
                                         url+='?'+pair;
                                 }
                             }

                         return newCommand;
                     }

                     function createGroupCommand(name) {
                         return {
                             name: name,
                             description: "Group of commands for " + name,
                             usage: "type 'help "+name+"' for sub-commands"
                         }

                     }
                 }

                function storePlugin(plugin) {
                    var commands = loadPluginsFromStorage();
                    commands.push(plugin);
                    localStorage.setItem(pluginsStorageKey, JSON.stringify(commands));
                }

                function loadPluginsFromStorage() {
                    var commandsStr = localStorage.getItem(pluginsStorageKey);
                    var commands = commandsStr ? JSON.parse(commandsStr) : [];
                    return commands;
                }

                function removeStoredCommand(name) {
                    var cmds = loadPluginsFromStorage();
                    var newCmds = _.filter(cmds, function(c) { return c.groupCommandName!=name; });
                    localStorage.setItem(pluginsStorageKey, JSON.stringify(newCmds));
                }

                function clearStoredCommands() {
                    localStorage.setItem(pluginsStorageKey, JSON.stringify([]));
                }

                function jsonToHtml(obj, ignoreJQuery) {

                    var html = _jsonToHtml(obj, ignoreJQuery);

                    var level = env.env('jsonViewCollapseLevel');
                    html.find("table").each(function(){
                        var field = $(this).parent("td.metadataValue").prev("td.metadataField")
                            .click(function(){
                                console.log('here');
                                $(this).next("td.metadataValue").toggle();
                                $(this).toggleClass("metadataFieldCollapsed");
                            })
                            .attr("title", 'click to toggle');

                        if(field.parents("table").length>level) {
                            field.addClass('metadataFieldCollapsed');
                            field.next("td.metadataValue").hide();
                        }
                    });

                    return $("<div>").addClass('cli-jsonview-control').append(html);

                    function _jsonToHtml(obj, ignoreJQuery) {

                           var tbl = $("<table cellpadding='0' cellspacing='0' border='0'>");
                           for (var key in obj)
                           {
                               if(key.indexOf('jQuery')==0 || typeof obj[key] == 'function')
                                   continue;

                               var val = obj[key] ? (typeof obj[key] == 'object' ? _jsonToHtml(obj[key], ignoreJQuery) : obj[key]) : "";

                               $("<tr>")
                                  .append($("<td class='metadataField'>").html(key))
                                  .append($("<td class='metadataValue'>").append(val))
                                  .appendTo(tbl);
                           }

                           return tbl;
                    }
                }


                // *********************
                // private classes
                // *********************

                // manages commands history
                function History(){

                    var self = this;
                    this.commands = loadHistory();
                    var currIndex = this.commands.length;

                    this.add = function(command) {
                        if(command == _.last(this.commands)) {
                            currIndex = this.commands.length;
                            return;
                        }
                        this.commands.push(command);
                        var maxHistory = parseInt(env.env('maxHistory')) || $.fn.cli.env.maxHistory;
                        if(this.commands.length > maxHistory){
                            this.commands = _.last(this.commands, maxHistory);
                        }
                        currIndex = this.commands.length;
                        saveHistory();
                    }

                    this.getPrevious = function() {
                        if(currIndex>=0) currIndex--;
                        return (this.commands.length && currIndex > -1) ? this.commands[currIndex] : null;
                    }

                    this.getNext = function() {
                        if(currIndex<(this.commands.length)) currIndex++;
                        return  (this.commands.length && currIndex < this.commands.length) ? this.commands[currIndex] : null;
                    }

                    function saveHistory () {
                        localStorage.setItem(historyStorageKey, JSON.stringify(self.commands));
                    }
                    function loadHistory () {
                        var history = localStorage.getItem(historyStorageKey);
                        return history ? JSON.parse(history) : [];
                    }
                }

                // manages commands
                function Commands(commands) {
                    this.commands = {};

                    this.add = function(command) {
                        // todo: validate command parameters
                        this.commands[command.name] = command;
                    }

                    this.delete = function(name) {
                        if(this.commands.hasOwnProperty(name)) {
                            var cmd = this.commands[name];
                            if(cmd.userCommand)
                            {
                                if(cmd.exec) {
                                    throw new Error('Can not delete sub command, only group command');
                                }

                                // delete all sub commands
                                for(var c in this.commands) {
                                    if(c.indexOf(name+' ')==0)
                                        delete this.commands[c];
                                }
                                //delete group command
                                delete this.commands[name];
                            }
                            else
                                throw new Error('Can not delete command that was not added by you');
                        }

                    }


                    for(var i=0; commands && i<commands.length; i++) {
                        this.add(commands[i])
                    }

                    this.get = function(command) {
                        return command ?  this.commands[command] : this.commands;
                    }
                }

                // environment manager
                function Environment() {

                    var envEvents = this.events = {};
                    var _env;

                    registerEnvEvents();
                    initializeEnv();

                    this.env = function(setting, val, appOriginated, setEmpty) {

                        if(appOriginated && setEmpty && !val) {
                            _env[setting].value = val;
                            updateStateChange(setting, val);
                        }
                        else if(setting && val) { // set
                            if(_env.hasOwnProperty(setting))
                            {
                                if(_env[setting].userReadOnly && !appOriginated)
                                    throw new Error('Environment variable \''+setting+'\' is read-only and can not be set');

                                // validate value according to type
                                var typeDef = _env[setting],
                                    type = typeDef.type;

                                if(type) {
                                    var isValid;
                                    switch(type) {
                                        case 'number':
                                            val = parseInt(val);
                                            isValid = !isNaN(val);
                                            if(isValid && typeDef.hasOwnProperty('min') && val<typeDef.min) throw new Error('value should be >= ' + typeDef.min);
                                            if(isValid && typeDef.hasOwnProperty('max') && val>typeDef.max) throw new Error('value should be <= ' + typeDef.max);
                                            break;
                                        case 'boolean':
                                            var validTrue = (val === true || val.toLowerCase() === 'true' || val === 1 || val === '1');
                                            var validFalse = ( val === false || val.toLowerCase() === 'false' || val === 0 || val === '0' || val==='');
                                            isValid = validTrue || validFalse;
                                            if(validTrue) val = 'true';
                                            if(validFalse) val = 'false';
                                            break;
                                        default: // string or dynamic
                                            isValid = true;
                                    }
                                    if(!isValid) throw new Error('value should be of type ' + type); // value is not valid
                                }
                                var options = _env[setting].options;
                                if(options) {
                                    var exists = false;
                                    for(var i=0; i<options.length; i++) {
                                        if(options[i]===val) {
                                            exists = true;
                                            break;
                                        }
                                    }
                                    if(!exists) throw new Error('value should be on of the following: [' + options.join(', ')+']');
                                }

                                _env[setting].prevValue = _env[setting].value;
                                _env[setting].value = val;
                            }
                            // this is a new environment variable, we don't know its type
                            else _env[setting] = { value: val};

                            updateStateChange(setting, val);
                        }
                        else if (setting && !val) // get
                            return _env.hasOwnProperty(setting) ? _env[setting].value : null;

                        // return a copy of the current env collection
                        return $.extend(true, {}, _env);
                    }

                    this.reset = function() {
                        initializeEnv(true);
                        setEnvStorage();
                        $(envEvents).trigger('state', $.extend(true, {}, _env));
                    }

                    this.revert = function(setting) {
                        var tmp = _env[setting].value;
                        _env[setting].value = _env[setting].prevValue;
                        _env[setting].prevValue = tmp;
                    }

                    this.delete = function(setting) {

                        if(!_env.hasOwnProperty(setting)) {
                            writeMessage('error', 'Variable not found');
                            return;
                        }

                        var envVar = _env[setting];

                        if(envVar.type) {
                            writeMessage('error', 'Only environment variables created by you can be deleted');
                            return;
                        }
                        else{
                            delete _env[setting];
                            writeMessage('info', 'Environment variable \''+setting+'\' deleted');
                            updateStateChange(setting, '');
                        }

                    }

                    this.clear = function(setting) {

                        if(!_env.hasOwnProperty(setting)) {
                            writeMessage('error', 'Variable not found');
                            return;
                        }

                        _env[setting].value = '';
                        updateStateChange(setting, '');
                    }

                    function updateStateChange(setting, val) {
                        setEnvStorage();
                        $(envEvents).trigger(setting+'Changed', val);
                        $(envEvents).trigger('state', $.extend(true, {}, _env));
                    }

                    function initializeEnv(reset) {

                        // deep copy + target object is {} to prevent
                        // override of the cli.env global variable
                        _env = $.extend(true, {}, $.fn.cli.env, opts.environment || {});

                        if(reset)
                            deleteEnvStorage();

                        var dataFromStorage = getEnvFromStorage();
                        for(var envVarName in dataFromStorage) {
                            if(_env.hasOwnProperty(envVarName))
                                _env[envVarName].value = dataFromStorage[envVarName];
                            else _env[envVarName] = { value : dataFromStorage[envVarName] };
                        }

                        // trigger on-change events for registered listeners
                        for (var setting in _env) {
                            $(envEvents).trigger(setting+'Changed', _env[setting].value);
                        }
                    }

                    function setEnvStorage() {
                        var data = {};
                        for(var envVarName in _env) {
                            data[envVarName] = _env[envVarName].value;
                        }
                        localStorage.setItem(envStorageKey, JSON.stringify(data));
                    }

                    function getEnvFromStorage() {
                        var storedEnv = localStorage.getItem(envStorageKey);
                        var data = storedEnv ? JSON.parse(storedEnv) : {};
                        return data;
                    }

                    function deleteEnvStorage() {
                        localStorage.removeItem(envStorageKey);
                    }

                    function registerEnvEvents() {
                        $(envEvents).bind(
                        {
                            bgColorChanged: function(e, color) {
                                resultsContainer.css('background-color', color);
                            },
                            fontColorChanged: function(e, color) {
                                resultsContainer.css('color', color);
                            }
                        });
                    }
                }

                // my board
                function MyBoard() {

                    var self = this;
                    var board = options.myBoard;
                    board.find(".cli-my-board-title").data('on', true)
                        .click(function(){
                            if($(this).data('on')) {
                                $(this).parent().css({"height": "28px", "overflow" : "hidden"});
                                $(this).data('on', false);
                            } else{
                                $(this).parent().css({"height": resultsContainer.parent().height(), "overflow":"auto"});
                                $(this).data('on', true);
                            }
                        });

                    $(window).resize(function(){
                        board.css('height', resultsContainer.parent().height());
                    });

                    /*
                    $(".cli-my-board-title").hover(
                        function(){
                            $(this).parent('.cli-my-board').draggable().draggable( "option", "disabled", false);
                        },
                        function(){
                            $(this).parent('.cli-my-board').draggable( "option", "disabled", true );
                        }
                    );

                    $(".cli-my-board-title").click(
                        function(){
                            $(this).parent(".cli-my-board").find(".cli-my-board-item").toggle();
                        }
                    );
                    */

                    board
                        //.resizable()
                        .droppable({
                        drop: function( event, ui ) {
                            self.addItemToMyBoard(ui.draggable);
                        }
                    });

                    this.addItemToMyBoard = function(item){
                        var conatiner = $("<div class='cli-my-board-item'>").appendTo(board);

                        $(item).appendTo(conatiner);
                        setTimeout(function(){
                            $(item).draggable('destroy');
                        }, 500);
                    }

                    board.find(".cli-my-board-close").click(function(){
                        board.hide();
                    });

                }
            });
        },

        // get or set environment variable
        // get          :   env('setting')
        // set          :   env('setting', 'value', appOriginated, isEmpty)
        // get env hash :   env()
        env: function(setting, val, appOriginated, isEmpty) {
            return $(this).data('cli').env.env(setting, val, appOriginated, isEmpty);
        },

        // get environment events broker
        envEventsBroker: function() {
            return $(this).data('cli').env.events;
        },

        /*
        // add plugin external handler
        addPluginHandler: function(id, handler) {

            var handlers = $(this).data('cli').handlers;
            if(handlers.hasOwnProperty(id))
                throw new Error('script handler already exists', id, ' not loading script');

            handlers[id] = handler;
        },
        */

        // get or set the prompt value
        // get          :   prompt()
        // set          :   prompt('value')
        prompt: function(val) {
            var promptControl = $(this).data('cli').options.promptControl;
            if(val) { // set
                promptControl.html(val);
            }

            return promptControl.html();
        },

        writeMessage: function(type, msg) {
            var writeMessage = $(this).data('cli').writeMessage;
            writeMessage(type, msg);
        },

        loadCss: function(url) {
            loadCss(url);
        },

        addCss: function(css) {
            addCss(css);
        },

        getJson: function(url, callback) {
            getJson(url, callback);
        }
    }

        /*
    function loadScript(scriptUrl, callback){

        if(($("script[src='"+scriptUrl+"']")).length)
        {
            console.warn('script already loaded', scriptUrl);
            return; // script already loaded
        }

        // for some reason, when using jquery to embed the script, it is loaded, but can't be seen
        // in the debugger and allow debugging...

        //$("<script>").attr({
        //    type: 'text/javascript',
        //    src: scriptUrl
        //}).appendTo("head");

        //return;

        var script = document.createElement('script');
        script.type='text/javascript';
        script.onload = function(){
            callback();
                callback = function(){};

        }
        script.onreadystatechange = function () {
            if(script.readyState === 'loaded' || script.readyState === 'complete'){
                callback();
                        callback = function(){};
            }
        }
        script.src = scriptUrl;
        document.getElementsByTagName('head').item(0).appendChild(script);
    }
    */

    function loadCss(url){
         if(($("link[href='"+url+"']")).length){
             console.warn('css already loaded', url);
             return; // script already loaded
         }

        $("<link>").attr({
            rel: 'stylesheet',
            type: 'text/css',
            href: url
        }).appendTo("head");
     }

    function addCss(css) {
        $("<style>").html(css).appendTo("head");
    }

    function getJson(url, callback) {

        $.getJSON(url, function(data, success, xhr) {
            if(xhr.status!=200){
                callback('got status code:' + xhr.status + '; response:' + xhr.responseText);
                return;
            }

            if(!data) {
                callback('response without data: status:' + xhr.statusText);
                return;
            }

            callback(null, data);
        })
        .error(function(xhr) {
            var msg = 'error: status code:' + xhr.status +' status text:' + xhr.statusText+' response text:' + xhr.responseText;
            console.error(msg);
            callback(msg);
        });
    }

    // plugin: { url: url }
    // returns {url: url, plugin: plugin, commands: data}
    function getPluginCommands(plugin, callback) {
        var url = plugin.url;
        console.info('loading plugins from ', url);

        getJson(url, function(err, resp){
            if(err)
                callback(err);
            else
                callback(null, {url: url, plugin: plugin, commands: resp});
        });
    }

    $.fn.cli = function(method){

            if(methods[method]){
                return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
            } else if(typeof method === 'object' || ! method){
                return methods.init.apply( this, arguments );
            } else {
                $.error( 'Method ' +  method + ' does not exist on jQuery.cli' );
            }
        };

    $.fn.cli.defaults = {
        prompt: '> ',
        welcomeMessage: 'Welcome to the console!'
    };

    $.fn.cli.env = {
        maxResults: { type:'number', min: 10, max: 1000, value: 20, description: 'used to control the max number of results being displayed' },
        maxHistory: { type:'number', min: 10, max: 100, value: 100, description: 'used to control the max number of commands kept in history' },
        jsonViewCollapseLevel: { type:'number', min: 0, max: 5, value: 2, description: 'used to control the level of depth after which the result in a json-view control are collapsed automatically' }
        //fontColor: { type: 'string', value: 'black' },
        //bgColor: { type: 'string', value: 'white' }
    };

    $.fn.cli.images = {
        processing: 'data:image/gif;base64,'+
                            'R0lGODlhEAAQAPIAAP///wAAAMLCwkJCQgAAAGJiYoKCgpKSkiH/C05FVFNDQVBFMi4wAwEAAAAh/hpDcmVhdGVkIHdpdGggYWpheGxvYWQuaW5mbwAh+QQJ'+
                            'CgAAACwAAAAAEAAQAAADMwi63P4wyklrE2MIOggZnAdOmGYJRbExwroUmcG2LmDEwnHQLVsYOd2mBzkYDAdKa+dIAAAh+QQJCgAAACwAAAAAEAAQAAADNAi6'+
                            '3P5OjCEgG4QMu7DmikRxQlFUYDEZIGBMRVsaqHwctXXf7WEYB4Ag1xjihkMZsiUkKhIAIfkECQoAAAAsAAAAABAAEAAAAzYIujIjK8pByJDMlFYvBoVjHA70'+
                            'GU7xSUJhmKtwHPAKzLO9HMaoKwJZ7Rf8AYPDDzKpZBqfvwQAIfkECQoAAAAsAAAAABAAEAAAAzMIumIlK8oyhpHsnFZfhYumCYUhDAQxRIdhHBGqRoKw0R8D'+
                            'YlJd8z0fMDgsGo/IpHI5TAAAIfkECQoAAAAsAAAAABAAEAAAAzIIunInK0rnZBTwGPNMgQwmdsNgXGJUlIWEuR5oWUIpz8pAEAMe6TwfwyYsGo/IpFKSAAAh'+
                            '+QQJCgAAACwAAAAAEAAQAAADMwi6IMKQORfjdOe82p4wGccc4CEuQradylesojEMBgsUc2G7sDX3lQGBMLAJibufbSlKAAAh+QQJCgAAACwAAAAAEAAQAAAD'+
                            'Mgi63P7wCRHZnFVdmgHu2nFwlWCI3WGc3TSWhUFGxTAUkGCbtgENBMJAEJsxgMLWzpEAACH5BAkKAAAALAAAAAAQABAAAAMyCLrc/jDKSatlQtScKdceCAjD'+
                            'II7HcQ4EMTCpyrCuUBjCYRgHVtqlAiB1YhiCnlsRkAAAOwAAAAAAAAAAAA=='

    }

})(jQuery);
