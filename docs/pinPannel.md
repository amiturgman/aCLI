Managing The Pin Panel
=========================

_Pin Panel_ is a panel on the right side of the screen, letting you keep command results always visible to you.
Think of Performance monitor charts, long processing test execution commands, placing these manuals always-on and more.

To make the board visible, execute the `panel` command. Whenever executed, this command will toggle the visibility state of the board.

There are two ways to pin command results on _Pin Panel':

* After the command execution, type `panel --pin`. This will take the last result and move it to the _Pin Panel' panel.
* While pressing the `ctrl` key, double click the result item. This will make the item _draggable_. You are now able to drag the item and drop on _Pin Panel' panel.


Actions
-------
* To cancel an item from being _draggable_, just `ctrl`+double click on that item again.
* To delete an item from _Pin Panel' panel, `ctrl`+double click that item.


You can leave _Pin Panel' opened on screen, minimized or maximize by clicking the `panel` title.  
To close _Pin Panel' panel, click the X button which will apear when hovering the panel.

Example
-------
Try the following

```
panel
man pinPanel
pinPanel --pin
```

Notice that this manual is now always on in the _Pin Panel'.

Another Example
---------------
Type `set -o`. `ctrl`+double click the result and release the buttons. Now, drag the result panel to _Pin Panel' panel, and relase the mouse.  
Notice the settings panel is pinned on _Pin Panel' panel.  

Now try to change a setting variable, for example, change the application context by typing `set app console.sys`. 
Notice that the settings panel is updated and always displays the updated settings state.

Have fun!

