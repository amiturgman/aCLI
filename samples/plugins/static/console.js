/**
 * Created by JetBrains WebStorm.
 * User: amitu
 * Date: 1/15/12
 * Time: 1:50 PM
 * To change this template use File | Settings | File Templates.
 */

$(function () {

    var env = {
        user: { type: 'string', value: '', description: 'The current user'}
    }

    var commands = getCommands();
  
    var opts = {
        environment: env,
        commands: commands,
        sid: 'aaaa',
        context: { some: 'object' },
        welcomeMessage: "Welcome to the console!<br/>Type <b>help</b> to start exploring the commands currently supported!<br/>"
    };

    var cli =  $(".cli-control").cli(opts);

    // get environment events broker
    var ebEnv = cli.cli('envEventsBroker');

    // bind to environment change events
    $(ebEnv).bind({
            userChanged: function(e, state) {
                updatePrompt();
            }
    });

    updatePrompt();

    // returns an array of ajaxOptions used by cli when broadcasting a request
    function broadcastUrlGenerator(ajaxRequestOptions) {

        // assuming there are 3 servers,
        // and that when adding their name to the query string the requests are redirected to the specific server
        var servers = ['server1', 'server2', 'server3'];

        var urlWithQuestionMark = ajaxRequestOptions.url.indexOf('?') > -1;

        var ajaxRequestsOptions = _.map(servers, function(server) {
            var serverRequest = $.extend(true, {}, ajaxRequestOptions,
                    {server: server, url: ajaxRequestOptions.url + (urlWithQuestionMark ? '&' : '?') + 'server='+server });
            return serverRequest;
        });
        return ajaxRequestsOptions;
    }

    function updatePrompt() {
        var prompt = cli_env('user') + '>';
        cli_prompt(prompt);
    }

    // create default anode commands
    function getCommands() {
        var commands = [];

        var addCommand = {
            name: 'add',
            description: 'add two numbers',
            usage: 'add num1 num2',
            example: 'add 4 5',
            params: [
                {
                    name: 'num1',
                    description: 'first number',
                    type: 'number'
                },
                {
                    name: 'num2',
                    description: 'second number',
                    type: 'number'
                }
            ],
            exec: function(args, context) {
                return args.num1 + args.num2;
            }
        }

        var asyncCommand = {
            name: 'async',
            description: 'simulates async command',
            usage: 'async [text]',
            example: 'async',
            params: [
                {
                    name: 'text',
                    description: 'some text to show',
                    type: 'string',
                    defaultValue: null // make this an optional  argument
                }
            ],
            exec: function(args, context) {
                var promise = context.createPromise();

                // simulating some async long-processing action
                setTimeout(function(){
                    var result = args.text || "you didn't enter text";
                    promise.resolve(result);
                }, 1000);

                return promise;
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

        // this is a group of commands, under the `group` name
        var groupCommand = {
            name: 'group',
            description: 'some group command'
        }
        var subCommand1 = {
            name: 'group command1',
            description: 'first command in group',
            usage: 'group command [param]',
            example: 'group command someParamValue',
            params: [{
                name: 'param',
                type: 'string',
                defaultValue: null // make it optional argument
            }],
            exec: function(args, context) {
                return args.param || 'param not provided';
            }
        }
        var subCommand2 = {
            name: 'group command2',
            description: 'second command in group',
            usage: 'group command2',
            example: 'group command2',
            exec: function(args, context) {
                return 'no parameters here, hello from exec method!';
            }
        }


        // See more commands in the cli code under the addDefaultCommands() method

        commands.push(addCommand);
        commands.push(asyncCommand);
        commands.push(sampleCommand);

        commands.push(groupCommand);
        commands.push(subCommand1);
        commands.push(subCommand2);
        return commands;
    }

    // help method for accessing cli env
    function cli_env(setting, val, appOriginated, setEmpty) {
        return cli.cli('env', setting, val, appOriginated, setEmpty);
    }

     // help method for accessing cli prompt
     function cli_prompt(val) {
         return cli.cli('prompt', val);
    }

});
