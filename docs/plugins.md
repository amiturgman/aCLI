Creating Management API For My App
==================================
__Note:__ Please make sure to read the _extend_ manual (type `man extend`) before you continue.  

Creating your own management API and integrating it into the console is as easy as extending the console, as described in the `extend` manual.
The only diffrence is that the API is implemented as part of your application and exposes the docRouter information as discussed earlier.  

In order to _plug-in_ the API into the console, use the `plugins install` command.  
In the following example, we're installing `mysample` API:

`
plugins install mysample http://mysample.com/!! -p
`

After executing this command, the console will get the docRouter data, compile the commands and add them to the commands available for execution.
Type `help` or `help mysample` to see how this command is now part of the console command list.  
The `-p` switch makes the plugin persistent. This means that next time when opening the console (from the same machine), the plugin will be automatically be integrated into the console. 
Not using this switch will make the command available only for this session. Closing and opening the console will not load this command.  

This feature allows you to create your own set of APIs integrated into the console.

 * In order to _uninstall_ a plugin, use the `plugins uninstall` command.
 * In order to remove all plugins currently installed, use the `plugins reset` command.

__Notes:__

* The API exposed to the console should be publicly available to the console. No authentication is currently supported.
* This works best in Chrome browser. IE for example has Cross Site Origin issue loading plugins from other domains.
