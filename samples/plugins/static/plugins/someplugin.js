/**
 * Created by JetBrains WebStorm.
 * User: amitu
 * Date: 1/15/12
 * Time: 1:50 PM
 * To change this template use File | Settings | File Templates.
 */

    //debugger;
    console.info('sample handler loaded');

    this.handler = function(error, response){
        if ($.query.get('debug')) debugger;
        var args = response.args;
        var context = response.context;
        var url = context.url;
        var env = context.env;
        var command = context.command;
        var data = response.data;

        var progress = 0;
        var intrvl = setInterval(function(){
            response.promise.setProgress(progress);
            if(progress==100) {
                clearInterval(intrvl);
                response.promise.resolve(
                        $("<div>").addClass('anode-sample').html(
                            'this is the client side plugin handler speaking.. got the following parametrs:' + JSON.stringify(args) +
                            '. got the following response: ' + JSON.stringify(data)));
            }
            progress+=10;
        }, 200);
    }

    this.htmlbcasthandler = function(response){
        if ($.query.get('debug')) debugger;
        var args = response.args;
        var context = response.context;
        var env = context.env;
        var command = context.command;
        var data = response.data;

        var res = $("<div>");
        _.each(data, function(instanceResult){
            var title = $("<div>").appendTo(res).html(instanceResult.instance);
            var data = $("<div>").appendTo(res).html(instanceResult.error || instanceResult.response);
        });
        response.promise.resolve(res);
    }

