jQuery customWindow
-------------------

Window plugin for jQuery. Can create multiple windows with support for close, maximize, minimize, restore, resize and drag. Easily customizable with an external CSS file and images.

Requires jQuery 1.3.2 or later.

Originally created by [Domenico Gigante](http://scripts.reloadlab.net/?p=19).

Usage example
-------------

    <script type=”text/javascript”>
        $(function() {
            var win = $.customWindow({
                title: 'My first window',
                onopen: function (content, obj) {
                    content.html(‘This is my first window’);
                }
            });
        });
    </script>

License
-------

Dual licensed under [MIT](http://www.opensource.org/licenses/mit-license.php) and [GPL](http://www.opensource.org/licenses/gpl-license.php) licenses.

